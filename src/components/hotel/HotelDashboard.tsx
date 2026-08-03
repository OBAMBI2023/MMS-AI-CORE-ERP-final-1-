import { lazy, Suspense, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  DoorOpen,
  FileBarChart,
  LogIn,
  LogOut,
  Plus,
  Receipt,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/mms/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/mms/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";

type HotelData = { rooms: any[]; reservations: any[]; expenses: any[]; payments: any[] };
type HotelDataKey = keyof HotelData;
type HotelErrors = Partial<Record<HotelDataKey, string>>;
const HotelDashboardCharts = lazy(() => import("./HotelDashboardCharts"));
const gold = "#C9A227";
const navy = "#0F172A";
const keyOf = (date: Date) => date.toISOString().slice(0, 10);

export function HotelDashboardPage() {
  const queryClient = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const { data, isLoading } = useQuery({
    queryKey: ["hotel-overview", tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant hôtel introuvable");
      const db = supabase as any;
      const request = async (query: PromiseLike<{ data: any[] | null; error: any }>) => {
        const result = await query;
        if (result.error) throw result.error;
        return result.data ?? [];
      };
      const results = await Promise.allSettled([
        request(db.from("hotel_rooms").select("id,status").eq("tenant_id", tenantId)),
        request(db.from("hotel_reservation_balances").select("id,status,check_in,check_out,nights,grand_total,paid_total").eq("tenant_id", tenantId)),
        request(db.from("depenses").select("amount,paid_at").eq("tenant_id", tenantId)),
        request(db.from("hotel_reservation_payments").select("reservation_id,amount,paid_at").eq("tenant_id", tenantId)),
      ]);
      const keys: HotelDataKey[] = ["rooms", "reservations", "expenses", "payments"];
      const nextData = { rooms: [], reservations: [], expenses: [], payments: [] } as HotelData;
      const errors: HotelErrors = {};
      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === "fulfilled") nextData[key] = result.value;
        else errors[key] = result.reason instanceof Error ? result.reason.message : "Données indisponibles";
      });
      return { data: nextData, errors };
    },
    enabled: !tenantLoading && Boolean(tenantId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: (previous) => previous,
  });
  useEffect(() => {
    if (!tenantId) return;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["hotel-overview", tenantId] });
    const channel = supabase
      .channel("hotel-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservations", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservation_payments", filter: `tenant_id=eq.${tenantId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tenantId]);
  return (
    <AppShell title="Tableau de bord" subtitle="Pilotage de votre établissement en temps réel">
      <HotelDashboard data={data?.data} errors={data?.errors} isLoading={isLoading || tenantLoading} />
    </AppShell>
  );
}

export function HotelDashboard({ data, errors, isLoading = false }: { data?: HotelData; errors?: HotelErrors; isLoading?: boolean }) {
  const today = keyOf(new Date());
  const rooms = data?.rooms ?? [],
    reservations = data?.reservations ?? [],
    expenses = data?.expenses ?? [],
    payments = data?.payments ?? [];
  const valid = reservations.filter((item) => !["cancelled", "no_show"].includes(item.status));
  const occupied = valid.filter((item) => item.check_in <= today && item.check_out > today).length;
  const arrivals = valid.filter((item) => item.check_in === today);
  const departures = valid.filter((item) => item.check_out === today);
  const revenue = reservations.reduce((sum, item) => sum + Number(item.paid_total ?? 0), 0);
  const validIds = new Set(valid.map((item) => item.id));
  const paymentRevenue = (day: string) =>
    payments
      .filter(
        (item) => validIds.has(item.reservation_id) && String(item.paid_at).slice(0, 10) === day,
      )
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const todayRevenue = paymentRevenue(today);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const adr = occupied ? todayRevenue / occupied : 0;
  const revPar = rooms.length ? todayRevenue / rooms.length : 0;
  const history = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - 6 + index);
        const day = keyOf(date);
        const active = valid.filter((item) => item.check_in <= day && item.check_out > day).length;
        return {
          day: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit" })
            .format(date)
            .replace(".", ""),
          revenus: paymentRevenue(day),
          occupation: rooms.length ? Math.round((active / rooms.length) * 100) : 0,
        };
      }),
    [reservations, payments, rooms.length],
  );
  const distribution = [
    {
      name: "Disponible",
      value: rooms.filter((r) => r.status === "available").length,
      color: "#2E8B73",
    },
    {
      name: "Occupée",
      value: rooms.filter((r) => r.status === "occupied").length || occupied,
      color: gold,
    },
    {
      name: "Nettoyage",
      value: rooms.filter((r) => r.status === "cleaning").length,
      color: "#6B8EC9",
    },
    {
      name: "Maintenance",
      value: rooms.filter((r) => ["maintenance", "out_of_service"].includes(r.status)).length,
      color: "#D87869",
    },
  ];
  const cards = [
    [
      "Chambres libres",
      Math.max(0, rooms.length - occupied),
      `sur ${rooms.length} chambres`,
      BedDouble,
      "emerald",
    ],
    ["Chambres occupées", occupied, `${occupancy}% d’occupation`, DoorOpen, "gold"],
    ["Arrivées du jour", arrivals.length, "check-in attendus", CalendarCheck, "blue"],
    ["Départs du jour", departures.length, "check-out prévus", CalendarClock, "violet"],
    ["Taux d’occupation", `${occupancy}%`, "performance du jour", Users, "rose"],
    ["Revenus aujourd’hui", formatCurrency(todayRevenue), "encaissé", CircleDollarSign, "gold"],
  ] as const;
  const quickActions = [
    ["Nouvelle réservation", "/hotel/reservations", CalendarCheck],
    ["Check-in", "/hotel/reservations", LogIn],
    ["Check-out", "/hotel/reservations", LogOut],
    ["Ajouter un voyageur", "/hotel/voyageurs", UserPlus],
    ["Ajouter une chambre", "/hotel/logements", BedDouble],
    ["Ajouter une dépense", "/depenses", Plus],
    ["Voir le planning", "/hotel/reservations", CalendarClock],
    ["Générer un rapport", "/hotel/rapports", FileBarChart],
  ] as const;

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl bg-[#0F172A] px-5 py-5 text-white shadow-[0_18px_50px_rgba(15,23,42,.16)] sm:px-7">
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-[#C9A227]/15 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.22em] text-[#E3C75E]">
              <Sparkles className="size-3.5" />
              Vue d’ensemble
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Bonjour, prêt pour une belle journée ?
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              Votre établissement en un coup d’œil, des arrivées aux revenus.
            </p>
          </div>
          <Link
            to="/hotel/reservations"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#C9A227] px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#E0BD3B]"
          >
            Voir les réservations
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, note, Icon, tone]) => (
          <div
            key={label}
            className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900"
          >
            <div className={`hotel-icon hotel-icon-${tone}`}>
              <Icon className="size-[18px]" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">
              {label}
            </p>
            {isLoading ? <><Skeleton className="mt-2 h-7 w-20" /><Skeleton className="mt-2 h-3 w-24" /></> : <><p className="mt-1 truncate text-xl font-bold tracking-tight text-[#0F172A] dark:text-white sm:text-2xl">{value}</p><p className="mt-1 truncate text-[11px] text-slate-400">{note}</p></>}
          </div>
        ))}
      </section>

      {(errors?.rooms || errors?.reservations || errors?.payments) && <WidgetError message="Certains indicateurs d’activité sont temporairement indisponibles." />}

      <Panel title="Actions rapides" subtitle="Accédez aux opérations les plus courantes">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {quickActions.map(([label, to, Icon]) => (
            <Link
              key={label}
              to={to}
              className="group flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 bg-[#F8F9FB] p-3.5 text-sm font-medium transition hover:-translate-y-0.5 hover:border-[#C9A227] hover:bg-amber-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-[#C9A227]"
            >
              <Icon className="size-5 text-[#B08B13]" />
              <span className="mt-3 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.72fr)]">
        <div className="space-y-5">
          <Suspense fallback={<ChartsSkeleton />}>
            <HotelDashboardCharts history={history} revenue={revenue} occupancy={occupancy} />
          </Suspense>
          <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <Panel title="Répartition des chambres" subtitle="État actuel du parc">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="grid size-36 shrink-0 place-content-center rounded-full border-[18px] border-amber-200 text-center dark:border-amber-500/30">
                  <b className="text-2xl dark:text-white">{rooms.length}</b>
                  <span className="text-[9px] uppercase text-slate-400">chambres</span>
                </div>
                <div className="w-full space-y-3">
                  {distribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <i className="size-2.5 rounded-full" style={{ background: item.color }} />
                        {item.name}
                      </span>
                      <b>{item.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Performance du jour" subtitle="Indicateurs hôteliers essentiels">
              {errors?.expenses && <div className="mb-3"><WidgetError message="Les dépenses sont temporairement indisponibles." /></div>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["ADR", formatCurrency(adr), "Tarif moyen", ArrowUpRight],
                  ["RevPAR", formatCurrency(revPar), "Revenu / chambre", ArrowUpRight],
                  ["Réservations", valid.length, "Actives", CalendarCheck],
                  ["Dépenses", formatCurrency(totalExpenses), "Cumul", Receipt],
                ].map(([label, value, note, Icon]: any) => (
                  <div key={label} className="rounded-xl bg-[#F8F9FB] p-4 dark:bg-white/5">
                    <Icon className="mb-3 size-4 text-[#C9A227]" />
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold dark:text-white">{value}</p>
                    <p className="text-[10px] text-slate-400">{note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
        <aside>
          <Panel
            title="Mouvements du jour"
            subtitle={`${arrivals.length + departures.length} séjour(s) à suivre`}
          >
            <Movement title="Arrivées" items={arrivals} />
            <div className="my-5 h-px bg-slate-100 dark:bg-white/10" />
            <Movement title="Départs" items={departures} />
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-semibold">Performance du jour</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {occupancy >= 75
                  ? "Occupation soutenue : anticipez les rotations."
                  : `${Math.max(0, rooms.length - occupied)} chambre(s) restent disponibles à la vente.`}
              </p>
            </div>
          </Panel>
        </aside>
      </section>

      <Panel title="Activité récente" subtitle="Derniers mouvements de l’établissement">
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {valid
            .slice()
            .sort((a, b) => String(b.check_in).localeCompare(String(a.check_in)))
            .slice(0, 5)
            .map((item, index) => (
              <div key={item.id ?? index} className="flex items-center gap-3 py-3">
                <div className="hotel-icon bg-slate-100 text-slate-600 dark:bg-white/10">
                  <CalendarCheck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Nouvelle réservation · {item.nights ?? "—"} nuit(s)
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.check_in} → {item.check_out}
                  </p>
                </div>
                <b className="text-sm">{formatCurrency(Number(item.grand_total ?? 0))}</b>
              </div>
            ))}
          {!valid.length && (
            <p className="py-8 text-center text-sm text-slate-400">Aucune activité récente.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ChartsSkeleton() { return <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-[310px] rounded-2xl" /><Skeleton className="h-[310px] rounded-2xl" /></div>; }
function WidgetError({ message }: { message: string }) { return <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>; }
function Panel({ title, subtitle, children }: any) {
  return (
    <div className="hotel-panel">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Movement({ title, items }: any) {
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full bg-amber-50 px-2 text-xs font-bold text-amber-700">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map((item: any, index: number) => (
          <div
            key={item.id ?? index}
            className="flex items-center gap-3 rounded-xl bg-[#F8F9FB] p-3 dark:bg-white/5"
          >
            <div className="hotel-icon bg-white shadow-sm dark:bg-white/10">
              <Users className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                Séjour #{String(item.id ?? index).slice(0, 6)}
              </p>
              <p className="text-[11px] text-slate-400">{item.nights ?? 1} nuit(s)</p>
            </div>
            <ArrowRight className="size-4 text-slate-300" />
          </div>
        ))}
        {!items.length && (
          <p className="rounded-xl bg-[#F8F9FB] py-5 text-center text-xs text-slate-400 dark:bg-white/5">
            Aucun mouvement prévu
          </p>
        )}
      </div>
    </div>
  );
}
