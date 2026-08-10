import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { startOfDay, startOfMonth, endOfMonth, subDays, subMonths, addDays } from "date-fns";
import {
  Percent,
  LogIn,
  LogOut,
  CalendarPlus,
  ArrowLeftRight,
  Wallet,
  Building2,
  ArrowRight,
  Ban,
  History,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { HotelAvailabilityCalendar } from "@/components/hotel/HotelAvailabilityCalendar";
import { formatCurrency, formatCurrencyCompact } from "@/lib/mms/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useHotelBillingData } from "@/hooks/use-hotel-billing";

const db = supabase as any;

type ActionColor = "primary" | "emerald" | "sky" | "amber";

const ACTION_COLOR_CLASSES: Record<ActionColor, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const QUICK_ACTIONS = [
  { title: "Nouvelle réservation", subtitle: null as string | null, icon: CalendarPlus, route: "/hotel/reservations", color: "primary" as ActionColor },
  { title: "Arrivées / Départs", subtitle: "Check-in & Check-out", icon: ArrowLeftRight, route: "/hotel/checkin-checkout", color: "sky" as ActionColor },
];

type RevenuePeriod = "today" | "week" | "month";

const REVENUE_PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "7 jours" },
  { key: "month", label: "Ce mois" },
];

const RESERVATION_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "En séjour",
  checked_out: "Terminée",
  completed: "Terminée",
  cancelled: "Annulée",
  no_show: "Non présenté",
};

type HistoryFilter = "all" | "reservations" | "payments" | "checkin_checkout";

const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "reservations", label: "Réservations" },
  { key: "payments", label: "Encaissements" },
  { key: "checkin_checkout", label: "Arrivées / Départs" },
];

type ActivityEvent = {
  id: string;
  category: Exclude<HistoryFilter, "all">;
  icon: typeof LogIn;
  iconClass: string;
  title: string;
  guestName: string;
  roomNumber: string | null;
  amount: number | null;
  at: string;
};

const RESERVATION_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  confirmed: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  checked_in: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  checked_out: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  completed: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
  no_show: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const CARD_CLASS = "rounded-[24px] dark:bg-[#0F2E28] dark:border-white/5";
const MAX_TODAY_LIST_ITEMS = 5;

function formatFrTime(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1);
}

const OCCUPANCY_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);

function HotelDashboard() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("today");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

  const roomsQuery = useQuery({
    queryKey: ["hotel_rooms", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_rooms")
        .select("*,hotel_room_types(name,amenities)")
        .eq("tenant_id", tenantId)
        .order("number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; status: string }[];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["hotel-payments-dashboard", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_reservation_payments")
        .select("id,amount,paid_at,reservation_id,reference")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        amount: number;
        paid_at: string;
        reservation_id: string;
        reference: string | null;
      }[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`hotel-payments-dashboard-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hotel_reservation_payments", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["hotel-payments-dashboard", tenantId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  const totalRooms = roomsQuery.data?.length ?? 0;
  const occupiedRooms = (roomsQuery.data ?? []).filter((r) => r.status === "occupied").length;
  const availableRooms = (roomsQuery.data ?? []).filter((r) => r.status === "available").length;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const revenueByPeriod = useMemo(() => {
    const payments = paymentsQuery.data ?? [];
    const sumBetween = (start: Date, end: Date) =>
      payments.reduce((sum, p) => {
        const t = new Date(p.paid_at).getTime();
        return t >= start.getTime() && t < end.getTime() ? sum + Number(p.amount || 0) : sum;
      }, 0);

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const yesterdayStart = subDays(todayStart, 1);
    const sevenDaysAgoStart = subDays(todayStart, 6);
    const prevSevenStart = subDays(sevenDaysAgoStart, 7);
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));

    return {
      today: { value: sumBetween(todayStart, tomorrowStart), previous: sumBetween(yesterdayStart, todayStart) },
      week: { value: sumBetween(sevenDaysAgoStart, tomorrowStart), previous: sumBetween(prevSevenStart, sevenDaysAgoStart) },
      month: { value: sumBetween(monthStart, tomorrowStart), previous: sumBetween(prevMonthStart, monthStart) },
    };
  }, [paymentsQuery.data]);

  const activeRevenue = revenueByPeriod[revenuePeriod];
  const revenueTrend = activeRevenue.previous > 0
    ? ((activeRevenue.value - activeRevenue.previous) / activeRevenue.previous) * 100
    : null;

  const billing = useHotelBillingData();
  const reservations = billing.data?.reservations ?? [];
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const arrivalsToday = reservations.filter(
    (r) => ["pending", "confirmed"].includes(r.status) && r.check_in === todayIso,
  ).length;
  const departuresToday = reservations.filter(
    (r) => r.status === "checked_in" && r.check_out === todayIso,
  ).length;

  const monthlyOccupancyRate = useMemo(() => {
    if (!totalRooms) return 0;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEndExclusive = addDays(endOfMonth(now), 1);
    let occupiedNights = 0;
    for (const r of reservations) {
      if (!OCCUPANCY_STATUSES.has(r.status)) continue;
      const checkIn = parseIsoDate(r.check_in);
      const checkOut = parseIsoDate(r.check_out);
      const start = checkIn < monthStart ? monthStart : checkIn;
      const end = checkOut > monthEndExclusive ? monthEndExclusive : checkOut;
      const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      if (nights > 0) occupiedNights += nights;
    }
    const daysInMonth = Math.round((monthEndExclusive.getTime() - monthStart.getTime()) / 86_400_000);
    const availableRoomNights = totalRooms * daysInMonth;
    return availableRoomNights > 0 ? Math.round((occupiedNights / availableRoomNights) * 100) : 0;
  }, [reservations, totalRooms]);

  const totalUnpaid = useMemo(
    () =>
      reservations
        .filter((r) => !["cancelled", "no_show"].includes(r.status))
        .reduce((sum, r) => sum + Math.max(0, Number(r.balance_due ?? 0)), 0),
    [reservations],
  );

  const upcomingReservationsCount = useMemo(
    () => reservations.filter((r) => r.status === "confirmed" && r.check_in > todayIso).length,
    [reservations, todayIso],
  );

  const guestsById = useMemo(
    () => new Map((billing.data?.guests ?? []).map((g) => [g.id, g])),
    [billing.data?.guests],
  );
  const roomsById = useMemo(
    () => new Map((billing.data?.rooms ?? []).map((r: any) => [r.id, r])),
    [billing.data?.rooms],
  );
  const calendarRooms = useMemo(
    () =>
      (billing.data?.rooms ?? [])
        .map((r: any) => ({ id: r.id, number: r.number, typeName: r.hotel_room_types?.name ?? null }))
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    [billing.data?.rooms],
  );

  const roomLabel = (roomId: string) => {
    const room = roomsById.get(roomId) as any;
    return room ? room.number : "—";
  };
  const guestLabel = (guestId: string | null) => {
    const guest = guestId ? guestsById.get(guestId) : null;
    return guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Client de passage";
  };
  const todayReservationsList = useMemo(
    () =>
      reservations
        .filter((r) => r.check_in === todayIso && r.status !== "cancelled")
        .sort((a, b) => {
          const aTime = a.actual_check_in_at ? new Date(a.actual_check_in_at).getTime() : Infinity;
          const bTime = b.actual_check_in_at ? new Date(b.actual_check_in_at).getTime() : Infinity;
          return aTime - bTime;
        }),
    [reservations, todayIso],
  );

  const historyEvents = useMemo(() => {
    const events: ActivityEvent[] = [];
    for (const r of reservations) {
      const guest = guestLabel(r.guest_id);
      const room = roomLabel(r.room_id);
      if (r.status === "cancelled") {
        events.push({
          id: `${r.id}-cancelled`,
          category: "reservations",
          icon: Ban,
          iconClass: "bg-red-500/10 text-red-600 dark:text-red-400",
          title: "Réservation annulée",
          guestName: guest,
          roomNumber: room,
          amount: null,
          at: r.updated_at,
        });
      } else if (r.actual_check_out_at) {
        events.push({
          id: `${r.id}-checkout`,
          category: "checkin_checkout",
          icon: LogOut,
          iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          title: "Check-out effectué",
          guestName: guest,
          roomNumber: room,
          amount: null,
          at: r.actual_check_out_at,
        });
      } else if (r.actual_check_in_at) {
        events.push({
          id: `${r.id}-checkin`,
          category: "checkin_checkout",
          icon: LogIn,
          iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
          title: "Check-in effectué",
          guestName: guest,
          roomNumber: room,
          amount: null,
          at: r.actual_check_in_at,
        });
      } else {
        events.push({
          id: `${r.id}-created`,
          category: "reservations",
          icon: CalendarPlus,
          iconClass: "bg-primary/10 text-primary",
          title: "Nouvelle réservation créée",
          guestName: guest,
          roomNumber: room,
          amount: null,
          at: r.updated_at,
        });
      }
    }
    for (const p of paymentsQuery.data ?? []) {
      const reservation = reservations.find((r) => r.id === p.reservation_id);
      const guest = reservation ? guestLabel(reservation.guest_id) : "—";
      const room = reservation ? roomLabel(reservation.room_id) : null;
      const amount = Number(p.amount);
      events.push({
        id: `${p.id}-payment`,
        category: "payments",
        icon: Wallet,
        iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        title: "Paiement encaissé",
        guestName: guest,
        roomNumber: room,
        amount,
        at: p.paid_at,
      });
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [reservations, paymentsQuery.data, guestsById, roomsById]);

  const filteredHistory = useMemo(
    () =>
      historyEvents
        .filter((event) => historyFilter === "all" || event.category === historyFilter)
        .slice(0, MAX_TODAY_LIST_ITEMS),
    [historyEvents, historyFilter],
  );

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const userName = profile?.full_name?.trim() || profile?.email?.split("@")[0]?.trim() || "utilisateur";
  const greeting = now.getHours() < 18 ? "Bonjour" : "Bonsoir";

  return (
    <HotelAppShell title="Tableau de bord" contentClassName="bg-[#F4FAF8] dark:bg-[#07211C]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5 pb-4 sm:space-y-6"
      >
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0F4C42] via-[#0E6B58] to-[#10B981] p-6 shadow-lg shadow-emerald-950/20 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 right-16 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <Building2 className="pointer-events-none absolute right-6 top-6 h-9 w-9 text-white/25 sm:h-10 sm:w-10" />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              {greeting} {userName} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/80 capitalize">{today}</p>

            <div className="mt-5 flex divide-x divide-white/15 overflow-hidden rounded-2xl bg-white/10">
              {[
                {
                  key: "revenue",
                  icon: Wallet,
                  label: "Chiffre d'affaires du mois",
                  value: formatCurrency(revenueByPeriod.month.value) as string | number,
                  compactValue: formatCurrencyCompact(revenueByPeriod.month.value),
                },
                {
                  key: "occupancy",
                  icon: Percent,
                  label: "Taux d'occupation du mois",
                  value: `${monthlyOccupancyRate}%` as string | number,
                  compactValue: undefined as string | undefined,
                },
                {
                  key: "impayes",
                  icon: AlertCircle,
                  label: "Impayés",
                  value: formatCurrency(totalUnpaid) as string | number,
                  compactValue: formatCurrencyCompact(totalUnpaid),
                },
              ].map((stat) => (
                <div key={stat.key} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 sm:px-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="break-words text-sm font-bold leading-tight text-white sm:truncate">
                      {stat.compactValue ? (
                        <>
                          <span className="sm:hidden">{stat.compactValue}</span>
                          <span className="hidden sm:inline">{stat.value}</span>
                        </>
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p className="truncate text-[10px] text-white/75">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <Link
                  to={action.route}
                  className="flex flex-col items-center gap-1.5 rounded-[20px] border border-border bg-card p-3 shadow-sm transition-all hover:border-primary hover:shadow-md h-full sm:rounded-[24px] dark:bg-[#0F2E28] dark:border-white/5"
                >
                  <div className={cn("grid h-8 w-8 place-items-center rounded-xl", ACTION_COLOR_CLASSES[action.color])}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[11px] font-medium leading-tight">{action.title}</span>
                  {action.subtitle && (
                    <span className="text-center text-[10px] leading-tight text-muted-foreground">{action.subtitle}</span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <DashboardKpiCard
            index={0}
            title="Arrivées du jour"
            value={String(arrivalsToday)}
            icon={LogIn}
            route="/hotel/checkin-checkout"
            trend={null}
            accent="sky"
          />
          <DashboardKpiCard
            index={1}
            title="Départs du jour"
            value={String(departuresToday)}
            icon={LogOut}
            route="/hotel/checkin-checkout"
            trend={null}
            accent="amber"
          />
          <DashboardKpiCard
            index={2}
            title="Réservations à venir"
            value={String(upcomingReservationsCount)}
            icon={CalendarClock}
            route="/hotel/reservations"
            trend={null}
            accent="violet"
          />
        </div>

        {/* Disponibilité des logements */}
        <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
          <HotelAvailabilityCalendar
            rooms={calendarRooms}
            reservations={reservations as any}
            guestsById={guestsById as any}
          />
        </Card>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Occupation chambres */}
          <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
            <h3 className="font-bold mb-4">Occupation des chambres</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold tracking-tight text-primary">{occupancyRate}%</div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {occupiedRooms} / {totalRooms} chambres occupées
                </p>
                <p className="text-xs text-muted-foreground">
                  {availableRooms} chambres disponibles
                </p>
              </div>
            </div>
          </Card>

          {/* Revenus */}
          <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Revenus
              </h3>
              <Tabs value={revenuePeriod} onValueChange={(v) => setRevenuePeriod(v as RevenuePeriod)}>
                <TabsList className="h-8 grid grid-cols-3 w-full sm:inline-flex sm:w-auto">
                  {REVENUE_PERIODS.map((period) => (
                    <TabsTrigger key={period.key} value={period.key} className="px-2 py-1 text-[11px] sm:text-xs">
                      {period.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <p className="break-words text-3xl font-bold leading-tight tracking-tight">
              <span className="sm:hidden">{formatCurrencyCompact(activeRevenue.value)}</span>
              <span className="hidden sm:inline">{formatCurrency(activeRevenue.value)}</span>
            </p>
            {revenueTrend !== null && (
              <p
                className={cn(
                  "mt-1 text-xs font-semibold",
                  revenueTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {revenueTrend >= 0 ? "+" : ""}
                {revenueTrend.toFixed(1)}% vs période précédente
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Hébergement, restauration et services inclus</p>
          </Card>

          {/* Réservations du jour */}
          <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
            <h3 className="font-bold mb-4">Réservations du jour</h3>
            {billing.isLoading ? (
              <ul className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                  </li>
                ))}
              </ul>
            ) : billing.isError ? (
              <p className="text-xs text-muted-foreground">
                Impossible de charger les réservations du jour pour le moment.
              </p>
            ) : todayReservationsList.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune réservation aujourd’hui</p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {todayReservationsList.slice(0, MAX_TODAY_LIST_ITEMS).map((r) => {
                    const arrivalTime = formatFrTime(r.actual_check_in_at);
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{guestLabel(r.guest_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            Chambre {roomLabel(r.room_id)} · {arrivalTime ?? "—"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            RESERVATION_STATUS_CLASSES[r.status] ??
                              "bg-slate-500/10 text-slate-600 dark:text-slate-400",
                          )}
                        >
                          {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {todayReservationsList.length > MAX_TODAY_LIST_ITEMS && (
                  <Link
                    to="/hotel/reservations"
                    className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Voir tout <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            )}
          </Card>

          {/* Historique récent */}
          <Card className={cn("p-4 sm:p-6 lg:col-span-3", CARD_CLASS)}>
            <div className="mb-1 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="font-bold">Historique récent</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Dernières activités liées à l'exploitation hôtelière
            </p>

            <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
              <div className="flex w-max min-w-full gap-1 rounded-full bg-muted/60 p-1">
                {HISTORY_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setHistoryFilter(filter.key)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      historyFilter === filter.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {billing.isLoading ? (
              <ul className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/2 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : billing.isError ? (
              <p className="text-xs text-muted-foreground">
                Impossible de charger l'historique récent pour le moment.
              </p>
            ) : filteredHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ol>
                {filteredHistory.map((event, index) => (
                  <li key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", event.iconClass)}>
                        <event.icon className="h-4 w-4" />
                      </span>
                      {index < filteredHistory.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(event.at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.guestName}
                        {event.roomNumber ? ` · Chambre ${event.roomNumber}` : ""}
                      </p>
                      {event.amount !== null && (
                        <p className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(event.amount)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </motion.div>
    </HotelAppShell>
  );
}

export const Route = createFileRoute("/hotel/")({
  component: HotelDashboard,
});
