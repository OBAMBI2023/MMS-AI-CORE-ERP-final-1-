import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { startOfMonth, subMonths, startOfWeek, subWeeks, endOfWeek, format, subDays } from "date-fns";
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

function num(v: unknown): number {
  return Number(v) || 0;
}

// The 8 trailing ISO weeks (Monday start), oldest first — matches the previous
// client-side buildWeeklySpark() loop exactly so week boundaries/labels are
// byte-for-byte identical to before.
function weekWindows(weeks = 8) {
  const now = new Date();
  const out: { start: Date; end: Date; label: string }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const end = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    out.push({ start, end, label: format(start, "dd/MM") });
  }
  return out;
}

// The 6 trailing calendar months, oldest first — matches buildMonthlySeries().
function monthWindows(months = 6) {
  const now = new Date();
  const out: { start: Date; end: Date; label: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = startOfMonth(subMonths(now, i - 1));
    out.push({ start, end, label: format(start, "MMM", { locale: fr }) });
  }
  return out;
}

type KpiTotals = {
  revenue_total: number;
  revenue_month: number;
  revenue_prev_month: number;
  depenses_total: number;
  depenses_month: number;
  depenses_prev_month: number;
  depenses_count_total: number;
  achats_total: number;
  achats_month: number;
  achats_prev_month: number;
  achats_count_total: number;
  clients_total: number;
  clients_month: number;
  clients_prev_month: number;
  fournisseurs_total: number;
  fournisseurs_month: number;
  fournisseurs_prev_month: number;
  ventes_total: number;
  ventes_month: number;
  ventes_prev_month: number;
  services_total: number;
  services_month: number;
  services_prev_month: number;
  devis_count_total: number;
  devis_pending_count: number;
  devis_pending_total: number;
};

type WeeklyTrendRow = {
  idx: number;
  revenue: number;
  depenses: number;
  achats: number;
  benefice: number;
  clients_count: number;
  fournisseurs_count: number;
  ventes_count: number;
  services_count: number;
};

type MonthlySeriesRow = { idx: number; ca: number; depenses: number; achats: number };

type RecentVente = {
  id: string;
  client_name: string | null;
  total: number;
  subtotal: number;
  payment_method: string;
  created_at: string;
};
type RecentAchat = { id: string; fournisseur_name: string | null; total: number; created_at: string };
type RecentDepense = {
  id: string;
  description: string | null;
  category: string;
  amount: number;
  paid_at: string;
  created_at: string;
};
type RecentClient = { id: string; name: string; created_at: string };
type RecentFournisseur = { id: string; name: string; created_at: string };

const RECENT_LIMIT = 8;

export function useDashboardData() {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const userId = profile?.id;

  return useQuery({
    // Tenant and user both belong in the cache key: accounts in the same tenant
    // must never render each other's cached session or greeting.
    // v4: server-side aggregates (get_dashboard_kpi_totals/_weekly_trend/
    // _monthly_series + get_ventes_by_payment_method/get_depenses_by_category)
    // replace 7 unbounded per-tenant table fetches (~126,000 rows at MEDIUM
    // volume) with a handful of aggregated round trips + 5 bounded (limit 8)
    // "recent items" fetches. Every derived number below is computed with the
    // exact same formula the old client-side reduce used; see the RPCs'
    // migration comments for the line-by-line mapping.
    queryKey: ["dashboard-data-v4", tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) {
        throw new Error("Profil authentifié introuvable");
      }

      const now = new Date();
      const monthStart = startOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const weeks = weekWindows(8);
      const months = monthWindows(6);

      const [
        totalsRes,
        weeklyRes,
        monthlyRes,
        paymentMethodRes,
        depenseCategoryRes,
        catalogBreakdownRes,
        recentVentesRes,
        recentAchatsRes,
        recentDepensesRes,
        recentClientsRes,
        recentFournisseursRes,
        sessionRes,
      ] = await Promise.all([
        (supabase.rpc as any)("get_dashboard_kpi_totals", {
          p_prev_month_start: prevMonthStart.toISOString(),
          p_month_start: monthStart.toISOString(),
          p_now: now.toISOString(),
        }) as Promise<{ data: KpiTotals | null; error: Error | null }>,
        (supabase.rpc as any)("get_dashboard_weekly_trend", {
          p_week_starts: weeks.map((w) => w.start.toISOString()),
          p_week_ends: weeks.map((w) => w.end.toISOString()),
        }) as Promise<{ data: WeeklyTrendRow[] | null; error: Error | null }>,
        (supabase.rpc as any)("get_dashboard_monthly_series", {
          p_month_starts: months.map((m) => m.start.toISOString()),
          p_month_ends: months.map((m) => m.end.toISOString()),
        }) as Promise<{ data: MonthlySeriesRow[] | null; error: Error | null }>,
        (supabase.rpc as any)("get_ventes_by_payment_method") as Promise<{
          data: { method: string; total: number }[] | null;
          error: Error | null;
        }>,
        (supabase.rpc as any)("get_depenses_by_category") as Promise<{
          data: { category: string; total: number }[] | null;
          error: Error | null;
        }>,
        (supabase.rpc as any)("get_ventes_catalog_breakdown") as Promise<{
          data: { item_type: string; revenue: number; quantity: number }[] | null;
          error: Error | null;
        }>,
        supabase
          .from("ventes")
          .select("id, client_name, total, subtotal, payment_method, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("achats")
          .select("id, fournisseur_name, total, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("depenses")
          .select("id, description, category, amount, paid_at, created_at")
          .eq("tenant_id", tenantId)
          .order("paid_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("clients")
          .select("id, name, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase
          .from("fournisseurs")
          .select("id, name, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),
        supabase.auth.getSession(),
      ]);

      const queryError = [
        totalsRes.error,
        weeklyRes.error,
        monthlyRes.error,
        paymentMethodRes.error,
        depenseCategoryRes.error,
        catalogBreakdownRes.error,
        recentVentesRes.error,
        recentAchatsRes.error,
        recentDepensesRes.error,
        recentClientsRes.error,
        recentFournisseursRes.error,
        sessionRes.error,
      ].find(Boolean);
      if (queryError) throw queryError;
      if (!totalsRes.data) throw new Error("Agrégats du tableau de bord indisponibles");

      const totals = totalsRes.data;
      const weekly = weeklyRes.data ?? [];
      const monthly = monthlyRes.data ?? [];
      const ventes = (recentVentesRes.data ?? []) as RecentVente[];
      const achats = (recentAchatsRes.data ?? []) as RecentAchat[];
      const depenses = (recentDepensesRes.data ?? []) as RecentDepense[];
      const clients = (recentClientsRes.data ?? []) as RecentClient[];
      const fournisseurs = (recentFournisseursRes.data ?? []) as RecentFournisseur[];

      // idx from the RPC is 1-based (WITH ORDINALITY); weeks[]/months[] are 0-based.
      const weeklyByIdx = new Map(weekly.map((w) => [w.idx, w]));
      const sparkFor = (pick: (w: WeeklyTrendRow) => number): SparkPoint[] =>
        weeks.map((w, i) => ({ label: w.label, value: num(pick(weeklyByIdx.get(i + 1) ?? ({} as WeeklyTrendRow))) }));

      const beneficeTotal = totals.revenue_total - totals.depenses_total - totals.achats_total;
      const beneficeMonth = totals.revenue_month - totals.depenses_month - totals.achats_month;
      const beneficePrevMonth = totals.revenue_prev_month - totals.depenses_prev_month - totals.achats_prev_month;

      const kpis = {
        revenue: {
          value: totals.revenue_total,
          trend: pctChange(totals.revenue_month, totals.revenue_prev_month),
          spark: sparkFor((w) => w.revenue),
        },
        depenses: {
          value: totals.depenses_total,
          trend: pctChange(totals.depenses_month, totals.depenses_prev_month),
          spark: sparkFor((w) => w.depenses),
        },
        achats: {
          value: totals.achats_total,
          trend: pctChange(totals.achats_month, totals.achats_prev_month),
          spark: sparkFor((w) => w.achats),
        },
        benefice: {
          value: beneficeTotal,
          trend: pctChange(beneficeMonth, beneficePrevMonth),
          spark: sparkFor((w) => w.benefice),
        },
        clients: {
          value: totals.clients_total,
          trend: pctChange(totals.clients_month, totals.clients_prev_month),
          spark: sparkFor((w) => w.clients_count),
        },
        fournisseurs: {
          value: totals.fournisseurs_total,
          trend: pctChange(totals.fournisseurs_month, totals.fournisseurs_prev_month),
          spark: sparkFor((w) => w.fournisseurs_count),
        },
        ventes: {
          value: totals.ventes_total,
          trend: pctChange(totals.ventes_month, totals.ventes_prev_month),
          spark: sparkFor((w) => w.ventes_count),
        },
        services: {
          value: totals.services_total,
          trend: pctChange(totals.services_month, totals.services_prev_month),
          spark: sparkFor((w) => w.services_count),
        },
      };

      const monthlyByIdx = new Map(monthly.map((m) => [m.idx, m]));
      const monthlySeries: MonthPoint[] = months.map((m, i) => {
        const row = monthlyByIdx.get(i + 1);
        return { label: m.label, ca: num(row?.ca), depenses: num(row?.depenses), achats: num(row?.achats) };
      });

      const ventesByMethod: SlicePoint[] = (paymentMethodRes.data ?? [])
        .map((r) => ({ name: r.method, value: num(r.total) }))
        .sort((a, b) => b.value - a.value);
      const depensesByCategory: SlicePoint[] = (depenseCategoryRes.data ?? [])
        .map((r) => ({ name: r.category, value: num(r.total) }))
        .sort((a, b) => b.value - a.value);

      const catalogBreakdown = catalogBreakdownRes.data ?? [];
      const typedRevenue = (type: "product" | "service") =>
        Number(catalogBreakdown.find((row) => row.item_type === type)?.revenue ?? 0);
      const typedQuantity = (type: "product" | "service") =>
        Number(catalogBreakdown.find((row) => row.item_type === type)?.quantity ?? 0);

      const activity: ActivityItem[] = [
        ...ventes.slice(0, 8).map((v): ActivityItem => ({
          id: `vente-${v.id}`,
          type: "vente",
          title: v.client_name || "Client comptant",
          subtitle: "Nouvelle vente",
          amount: num(v.total),
          date: v.created_at,
          route: "/ventes",
        })),
        ...achats.slice(0, 8).map((a): ActivityItem => ({
          id: `achat-${a.id}`,
          type: "achat",
          title: a.fournisseur_name || "Fournisseur",
          subtitle: "Nouvel achat",
          amount: num(a.total),
          date: a.created_at,
          route: "/achats",
        })),
        ...depenses.slice(0, 8).map((d): ActivityItem => ({
          id: `depense-${d.id}`,
          type: "depense",
          title: d.description || d.category,
          subtitle: "Nouvelle dépense",
          amount: num(d.amount),
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
          ventes: totals.ventes_total,
          achats: totals.achats_count_total,
          depenses: totals.depenses_count_total,
          clients: totals.clients_total,
          fournisseurs: totals.fournisseurs_total,
          services: totals.services_total,
        },
        secondary: {
          devisCount: totals.devis_count_total,
          facturesImpayeesCount: totals.devis_pending_count,
          facturesImpayeesTotal: totals.devis_pending_total,
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
