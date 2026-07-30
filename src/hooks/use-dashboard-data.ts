import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import {
  startOfMonth,
  subMonths,
  startOfWeek,
  subWeeks,
  isWithinInterval,
  endOfWeek,
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { resolveUserDisplayName } from "@/lib/user-display-name";

export type SparkPoint = { label: string; value: number };
export type MonthPoint = { label: string; ca: number; depenses: number; achats: number };
export type SlicePoint = { name: string; value: number };

export type ActivityItem = {
  id: string;
  type: "vente" | "achat" | "depense" | "client" | "fournisseur";
  title: string;
  subtitle: string;
  amount?: number;
  date: string;
  route: string;
};

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// Builds a sparkline of the last N weeks by summing (or counting) records whose date field falls in each week.
function buildWeeklySpark<T>(
  rows: T[],
  dateField: (r: T) => string | null | undefined,
  valueField?: (r: T) => number,
  weeks = 8,
): SparkPoint[] {
  const now = new Date();
  const points: SparkPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    let total = 0;
    for (const r of rows) {
      const raw = dateField(r);
      if (!raw) continue;
      const d = parseISO(raw);
      if (isNaN(d.getTime())) continue;
      if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
        total += valueField ? valueField(r) : 1;
      }
    }
    points.push({ label: format(weekStart, "dd/MM"), value: total });
  }
  return points;
}

function sumInMonth<T>(
  rows: T[],
  dateField: (r: T) => string | null | undefined,
  valueField: (r: T) => number,
  monthStart: Date,
  monthEnd: Date,
) {
  let total = 0;
  for (const r of rows) {
    const raw = dateField(r);
    if (!raw) continue;
    const d = parseISO(raw);
    if (isNaN(d.getTime())) continue;
    if (d >= monthStart && d < monthEnd) total += valueField(r);
  }
  return total;
}

function countInMonth<T>(
  rows: T[],
  dateField: (r: T) => string | null | undefined,
  monthStart: Date,
  monthEnd: Date,
) {
  return sumInMonth(rows, dateField, () => 1, monthStart, monthEnd);
}

function buildMonthlySeries(
  ventes: { total: number; created_at: string }[],
  depenses: { amount: number; paid_at: string }[],
  achats: { total: number; created_at: string }[],
  months = 6,
): MonthPoint[] {
  const now = new Date();
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const mStart = startOfMonth(subMonths(now, i));
    const mEnd = startOfMonth(subMonths(now, i - 1));
    out.push({
      label: format(mStart, "MMM", { locale: fr }),
      ca: sumInMonth(
        ventes,
        (v) => v.created_at,
        (v) => Number(v.total) || 0,
        mStart,
        mEnd,
      ),
      depenses: sumInMonth(
        depenses,
        (d) => d.paid_at,
        (d) => Number(d.amount) || 0,
        mStart,
        mEnd,
      ),
      achats: sumInMonth(
        achats,
        (a) => a.created_at,
        (a) => Number(a.total) || 0,
        mStart,
        mEnd,
      ),
    });
  }
  return out;
}

function groupSum<T>(
  rows: T[],
  keyField: (r: T) => string | null | undefined,
  valueField: (r: T) => number,
): SlicePoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = keyField(r) || "Autre";
    map.set(key, (map.get(key) || 0) + valueField(r));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function useDashboardData() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const userId = profile?.id;

  return useQuery({
    // Tenant and user both belong in the cache key: accounts in the same tenant
    // must never render each other's cached session or greeting.
    queryKey: ["dashboard-data-v3", tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) {
        throw new Error("Profil authentifié introuvable");
      }

      const [
        ventesRes,
        achatsRes,
        depensesRes,
        clientsRes,
        fournisseursRes,
        servicesRes,
        devisRes,
        sessionRes,
      ] = await Promise.all([
        supabase
          .from("ventes")
          .select("id, client_name, total, subtotal, payment_method, created_at, vente_items(item_type, qty, line_total)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("achats")
          .select("id, fournisseur_name, total, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("depenses")
          .select("id, description, category, amount, paid_at, created_at")
          .eq("tenant_id", tenantId)
          .order("paid_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id, name, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("fournisseurs")
          .select("id, name, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("id, name, active, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("devis")
          .select("id, status, total, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase.auth.getSession(),
      ]);

      const queryError = [
        ventesRes.error,
        achatsRes.error,
        depensesRes.error,
        clientsRes.error,
        fournisseursRes.error,
        servicesRes.error,
        devisRes.error,
        sessionRes.error,
      ].find(Boolean);
      if (queryError) throw queryError;

      const ventes = ventesRes.data ?? [];
      const achats = achatsRes.data ?? [];
      const depenses = depensesRes.data ?? [];
      const clients = clientsRes.data ?? [];
      const fournisseurs = fournisseursRes.data ?? [];
      const services = servicesRes.data ?? [];
      const devis = (devisRes.data ?? []).filter((d) => d.status === "accepté");

      const now = new Date();
      const monthStart = startOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));

      const revenueFromVentes = ventes.reduce((s, v) => s + (Number(v.total) || 0), 0);
      const typedRevenue = (type: "product" | "service") =>
        ventes.reduce((sum, sale) => {
          const factor = Number(sale.subtotal) > 0 ? Number(sale.total) / Number(sale.subtotal) : 0;
          return sum + (sale.vente_items ?? [])
            .filter((item) => item.item_type === type)
            .reduce((lineSum, item) => lineSum + Number(item.line_total) * factor, 0);
        }, 0);
      const typedQuantity = (type: "product" | "service") =>
        ventes.reduce(
          (sum, sale) =>
            sum +
            (sale.vente_items ?? [])
              .filter((item) => item.item_type === type)
              .reduce((lineSum, item) => lineSum + Number(item.qty), 0),
          0,
        );
      const revenueFromDevis = devis.reduce((s, d) => s + (Number(d.total) || 0), 0);
      const revenue = revenueFromVentes + revenueFromDevis;

      const totalDepenses = depenses.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const totalAchats = achats.reduce((s, a) => s + (Number(a.total) || 0), 0);
      const benefice = revenue - totalDepenses - totalAchats;

      const revenueMonth =
        sumInMonth(
          ventes,
          (v) => v.created_at,
          (v) => Number(v.total) || 0,
          monthStart,
          now,
        ) +
        sumInMonth(
          devis,
          (d) => d.created_at,
          (d) => Number(d.total) || 0,
          monthStart,
          now,
        );
      const revenuePrevMonth =
        sumInMonth(
          ventes,
          (v) => v.created_at,
          (v) => Number(v.total) || 0,
          prevMonthStart,
          monthStart,
        ) +
        sumInMonth(
          devis,
          (d) => d.created_at,
          (d) => Number(d.total) || 0,
          prevMonthStart,
          monthStart,
        );
      const depensesMonth = sumInMonth(
        depenses,
        (d) => d.paid_at,
        (d) => Number(d.amount) || 0,
        monthStart,
        now,
      );
      const depensesPrevMonth = sumInMonth(
        depenses,
        (d) => d.paid_at,
        (d) => Number(d.amount) || 0,
        prevMonthStart,
        monthStart,
      );
      const achatsMonth = sumInMonth(
        achats,
        (a) => a.created_at,
        (a) => Number(a.total) || 0,
        monthStart,
        now,
      );
      const achatsPrevMonth = sumInMonth(
        achats,
        (a) => a.created_at,
        (a) => Number(a.total) || 0,
        prevMonthStart,
        monthStart,
      );
      const beneficeMonth = revenueMonth - depensesMonth - achatsMonth;
      const beneficePrevMonth = revenuePrevMonth - depensesPrevMonth - achatsPrevMonth;

      const clientsMonth = countInMonth(clients, (c) => c.created_at, monthStart, now);
      const clientsPrevMonth = countInMonth(
        clients,
        (c) => c.created_at,
        prevMonthStart,
        monthStart,
      );
      const fournisseursMonth = countInMonth(fournisseurs, (f) => f.created_at, monthStart, now);
      const fournisseursPrevMonth = countInMonth(
        fournisseurs,
        (f) => f.created_at,
        prevMonthStart,
        monthStart,
      );
      const ventesMonth = countInMonth(ventes, (v) => v.created_at, monthStart, now);
      const ventesPrevMonth = countInMonth(ventes, (v) => v.created_at, prevMonthStart, monthStart);
      const servicesMonth = countInMonth(services, (s) => s.created_at, monthStart, now);
      const servicesPrevMonth = countInMonth(
        services,
        (s) => s.created_at,
        prevMonthStart,
        monthStart,
      );

      const kpis = {
        revenue: {
          value: revenue,
          trend: pctChange(revenueMonth, revenuePrevMonth),
          spark: buildWeeklySpark(
            [
              ...ventes.map((v) => ({ total: Number(v.total) || 0, created_at: v.created_at })),
              ...devis.map((d) => ({ total: Number(d.total) || 0, created_at: d.created_at })),
            ],
            (r) => r.created_at,
            (r) => Number(r.total) || 0,
          ),
        },
        depenses: {
          value: totalDepenses,
          trend: pctChange(depensesMonth, depensesPrevMonth),
          spark: buildWeeklySpark(
            depenses,
            (d) => d.paid_at,
            (d) => Number(d.amount) || 0,
          ),
        },
        achats: {
          value: totalAchats,
          trend: pctChange(achatsMonth, achatsPrevMonth),
          spark: buildWeeklySpark(
            achats,
            (a) => a.created_at,
            (a) => Number(a.total) || 0,
          ),
        },
        benefice: {
          value: benefice,
          trend: pctChange(beneficeMonth, beneficePrevMonth),
          spark: buildWeeklySpark(
            ventes,
            (v) => v.created_at,
            (v) => Number(v.total) || 0,
          ),
        },
        clients: {
          value: clients.length,
          trend: pctChange(clientsMonth, clientsPrevMonth),
          spark: buildWeeklySpark(clients, (c) => c.created_at),
        },
        fournisseurs: {
          value: fournisseurs.length,
          trend: pctChange(fournisseursMonth, fournisseursPrevMonth),
          spark: buildWeeklySpark(fournisseurs, (f) => f.created_at),
        },
        ventes: {
          value: ventes.length,
          trend: pctChange(ventesMonth, ventesPrevMonth),
          spark: buildWeeklySpark(ventes, (v) => v.created_at),
        },
        services: {
          value: services.length,
          trend: pctChange(servicesMonth, servicesPrevMonth),
          spark: buildWeeklySpark(services, (s) => s.created_at),
        },
      };

      const monthlySeries = buildMonthlySeries(
        [
          ...ventes.map((v) => ({ total: Number(v.total) || 0, created_at: v.created_at })),
          ...devis.map((d) => ({ total: Number(d.total) || 0, created_at: d.created_at })),
        ],
        depenses.map((d) => ({ amount: Number(d.amount) || 0, paid_at: d.paid_at })),
        achats.map((a) => ({ total: Number(a.total) || 0, created_at: a.created_at })),
      );

      const ventesByMethod = groupSum(
        ventes,
        (v) => v.payment_method,
        (v) => Number(v.total) || 0,
      );
      const depensesByCategory = groupSum(
        depenses,
        (d) => d.category,
        (d) => Number(d.amount) || 0,
      );

      const activity: ActivityItem[] = [
        ...ventes.slice(0, 8).map((v): ActivityItem => ({
          id: `vente-${v.id}`,
          type: "vente",
          title: v.client_name || "Client comptant",
          subtitle: "Nouvelle vente",
          amount: Number(v.total),
          date: v.created_at,
          route: "/ventes",
        })),
        ...achats.slice(0, 8).map((a): ActivityItem => ({
          id: `achat-${a.id}`,
          type: "achat",
          title: a.fournisseur_name || "Fournisseur",
          subtitle: "Nouvel achat",
          amount: Number(a.total),
          date: a.created_at,
          route: "/achats",
        })),
        ...depenses.slice(0, 8).map((d): ActivityItem => ({
          id: `depense-${d.id}`,
          type: "depense",
          title: d.description || d.category,
          subtitle: "Nouvelle dépense",
          amount: Number(d.amount),
          date: d.paid_at,
          route: "/depenses",
        })),
        ...clients.slice(0, 8).map((c): ActivityItem => ({
          id: `client-${c.id}`,
          type: "client",
          title: c.name,
          subtitle: "Nouveau client",
          date: c.created_at,
          route: "/clients",
        })),
        ...fournisseurs.slice(0, 8).map((f): ActivityItem => ({
          id: `fournisseur-${f.id}`,
          type: "fournisseur",
          title: f.name,
          subtitle: "Nouveau fournisseur",
          date: f.created_at,
          route: "/fournisseurs",
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const session = sessionRes.data?.session ?? null;
      if (!session || session.user.id !== userId) {
        throw new Error("La session active ne correspond pas au profil chargé");
      }
      const metadata = session.user.user_metadata;

      return {
        kpis,
        catalogSummary: {
          productRevenue: typedRevenue("product"),
          serviceRevenue: typedRevenue("service"),
          productQuantity: typedQuantity("product"),
          serviceQuantity: typedQuantity("service"),
        },
        monthlySeries,
        ventesByMethod,
        depensesByCategory,
        lists: {
          ventes: ventes.slice(0, 5),
          achats: achats.slice(0, 5),
          depenses: depenses.slice(0, 5),
          clients: clients.slice(0, 5),
          fournisseurs: fournisseurs.slice(0, 5),
        },
        activity: activity.slice(0, 10),
        counts: {
          ventes: ventes.length,
          achats: achats.length,
          depenses: depenses.length,
          clients: clients.length,
          fournisseurs: fournisseurs.length,
          services: services.length,
        },
        session: session
          ? {
              email: profile.email ?? session.user.email ?? "",
              displayName: resolveUserDisplayName({
                full_name: profile.full_name,
                first_name: metadata?.first_name,
                last_name: metadata?.last_name,
                display_name: metadata?.display_name,
                email: profile.email ?? session.user.email,
              }),
              lastSignInAt: session.user.last_sign_in_at ?? null,
            }
          : null,
      };
    },
    enabled: !tenantLoading && Boolean(tenantId) && Boolean(userId),
    staleTime: 30_000,
  });
}
