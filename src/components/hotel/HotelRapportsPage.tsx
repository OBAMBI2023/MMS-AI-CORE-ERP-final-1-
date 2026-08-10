import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Ban,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Flag,
  Loader2,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useHotelReportsData } from "@/hooks/use-hotel-reports";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { computeOccupancyRate, type OccupancyReservationLike } from "@/lib/hotel-occupancy";
import { formatCurrency, formatCurrencyCompact, formatDateTime } from "@/lib/mms/format";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { tenantFromSettings } from "@/lib/mms/PdfTheme";
import { PdfLayoutEngine } from "@/lib/mms/PdfLayoutEngine";
import { cn } from "@/lib/utils";

type PeriodPreset = "today" | "week" | "month" | "lastMonth" | "custom";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "Ce mois" },
  { value: "lastMonth", label: "Mois précédent" },
  { value: "custom", label: "Période personnalisée" },
];

type DateRange = { start: Date; end: Date };
type Bucket = { label: string; start: Date; endExclusive: Date };

const NON_OCCUPYING_UNPAID_STATUSES = new Set(["cancelled", "no_show"]);
const CONFIRMED_LIKE_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);
const COMPLETED_STATUSES = new Set(["checked_out", "completed"]);
const CANCELLED_STATUSES = new Set(["cancelled", "no_show"]);

function resolvePeriodRange(preset: PeriodPreset, customFrom: string, customTo: string): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "lastMonth": {
      const base = subMonths(now, 1);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
    case "custom": {
      const fromDate = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfMonth(now);
      const toDate = customTo ? new Date(`${customTo}T00:00:00`) : now;
      const start = startOfDay(fromDate);
      const end = endOfDay(toDate);
      return { start, end: end.getTime() >= start.getTime() ? end : start };
    }
    case "month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function resolvePreviousRange(preset: PeriodPreset, range: DateRange): DateRange {
  switch (preset) {
    case "today": {
      const d = subDays(range.start, 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "week":
      return { start: startOfDay(subDays(range.start, 7)), end: endOfDay(subDays(range.end, 7)) };
    case "month":
    case "lastMonth": {
      const base = subMonths(range.start, 1);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
    case "custom":
    default: {
      const durationMs = range.end.getTime() - range.start.getTime();
      const prevEnd = new Date(range.start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      return { start: prevStart, end: prevEnd };
    }
  }
}

function formatRangeLabel(range: DateRange) {
  const sameDay = format(range.start, "yyyy-MM-dd") === format(range.end, "yyyy-MM-dd");
  if (sameDay) return format(range.start, "dd MMMM yyyy", { locale: fr });
  return `${format(range.start, "dd MMM", { locale: fr })} – ${format(range.end, "dd MMM yyyy", { locale: fr })}`;
}

function toIsoDateRangeBounds(range: DateRange) {
  return { fromIso: format(range.start, "yyyy-MM-dd"), toIso: format(range.end, "yyyy-MM-dd") };
}

function isDateInRange(dateStr: string, fromIso: string, toIso: string) {
  return dateStr >= fromIso && dateStr <= toIso;
}

function isTimestampInRange(iso: string, range: DateRange) {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

function buildBuckets(range: DateRange): Bucket[] {
  const totalDays =
    Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / 86_400_000) + 1;
  if (totalDays <= 31) {
    return Array.from({ length: totalDays }, (_, i) => {
      const day = addDays(startOfDay(range.start), i);
      return { label: format(day, "dd MMM", { locale: fr }), start: day, endExclusive: addDays(day, 1) };
    });
  }
  const buckets: Bucket[] = [];
  const rangeEndExclusive = addDays(startOfDay(range.end), 1);
  let cursor = startOfMonth(range.start);
  while (cursor < rangeEndExclusive) {
    const monthEndExclusive = addDays(endOfMonth(cursor), 1);
    const bucketStart = cursor < startOfDay(range.start) ? startOfDay(range.start) : cursor;
    const bucketEnd = monthEndExclusive > rangeEndExclusive ? rangeEndExclusive : monthEndExclusive;
    buckets.push({ label: format(cursor, "MMM yyyy", { locale: fr }), start: bucketStart, endExclusive: bucketEnd });
    cursor = addMonths(cursor, 1);
  }
  return buckets;
}

function trendPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

function StatTile({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 shadow-sm">
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none sm:text-xl">{value}</p>
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function DotLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-4"
            style={{ borderTop: `2px ${item.dashed ? "dashed" : "solid"} ${item.color}` }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function EmptyNote({ text = "Aucune donnée disponible pour cette période." }: { text?: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

export function HotelRapportsPage() {
  const canView = useActionPermission("hotel.reports.view");
  const canExport = useActionPermission("hotel.reports.export");
  const reportsQuery = useHotelReportsData();
  const { settings, logoUrl, companyName } = useCompanySettings();

  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => resolvePeriodRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const previousRange = useMemo(() => resolvePreviousRange(preset, range), [preset, range]);
  const rangeEndExclusive = useMemo(() => addDays(startOfDay(range.end), 1), [range]);
  const previousRangeEndExclusive = useMemo(() => addDays(startOfDay(previousRange.end), 1), [previousRange]);
  const { fromIso, toIso } = useMemo(() => toIsoDateRangeBounds(range), [range]);

  const reservations = reportsQuery.data?.reservations ?? [];
  const payments = reportsQuery.data?.payments ?? [];
  const expenses = reportsQuery.data?.expenses ?? [];
  const rooms = reportsQuery.data?.rooms ?? [];
  const guests = reportsQuery.data?.guests ?? [];
  // Out-of-service rooms aren't bookable, so they don't count toward the
  // capacity denominator used for occupancy — but they still appear in the
  // per-room "Performance des logements" table (built from `rooms`, not
  // `totalRooms`), since a room can have earned revenue before being taken
  // out of service.
  const totalRooms = useMemo(() => rooms.filter((r) => r.status !== "out_of_service").length, [rooms]);

  const paymentsInPeriod = useMemo(() => payments.filter((p) => isTimestampInRange(p.paid_at, range)), [payments, range]);
  const paymentsInPrevious = useMemo(
    () => payments.filter((p) => isTimestampInRange(p.paid_at, previousRange)),
    [payments, previousRange],
  );
  const expensesInPeriod = useMemo(
    () => expenses.filter((e) => isDateInRange(e.expense_date, fromIso, toIso)),
    [expenses, fromIso, toIso],
  );
  const expensesInPrevious = useMemo(() => {
    const { fromIso: prevFrom, toIso: prevTo } = toIsoDateRangeBounds(previousRange);
    return expenses.filter((e) => isDateInRange(e.expense_date, prevFrom, prevTo));
  }, [expenses, previousRange]);

  const revenueTotal = useMemo(() => paymentsInPeriod.reduce((s, p) => s + Number(p.amount || 0), 0), [paymentsInPeriod]);
  const revenuePrevTotal = useMemo(
    () => paymentsInPrevious.reduce((s, p) => s + Number(p.amount || 0), 0),
    [paymentsInPrevious],
  );
  const revenueTrend = trendPercent(revenueTotal, revenuePrevTotal);

  const expensesTotal = useMemo(() => expensesInPeriod.reduce((s, e) => s + Number(e.amount || 0), 0), [expensesInPeriod]);
  const expensesPrevTotal = useMemo(
    () => expensesInPrevious.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expensesInPrevious],
  );
  const expensesTrend = trendPercent(expensesTotal, expensesPrevTotal);

  const resultTotal = revenueTotal - expensesTotal;
  const resultPrevTotal = revenuePrevTotal - expensesPrevTotal;
  const resultTrend = trendPercent(resultTotal, resultPrevTotal);

  const occupancy = useMemo(
    () =>
      computeOccupancyRate({
        reservations: reservations as OccupancyReservationLike[],
        roomCount: totalRooms,
        rangeStart: startOfDay(range.start),
        rangeEndExclusive,
      }),
    [reservations, totalRooms, range, rangeEndExclusive],
  );
  const occupancyPrev = useMemo(
    () =>
      computeOccupancyRate({
        reservations: reservations as OccupancyReservationLike[],
        roomCount: totalRooms,
        rangeStart: startOfDay(previousRange.start),
        rangeEndExclusive: previousRangeEndExclusive,
      }),
    [reservations, totalRooms, previousRange, previousRangeEndExclusive],
  );
  const occupancyTrend = occupancy.rate - occupancyPrev.rate;

  const reservationsCreated = useMemo(
    () => reservations.filter((r) => isTimestampInRange(r.created_at, range)),
    [reservations, range],
  );
  const reservationsCreatedPrev = useMemo(
    () => reservations.filter((r) => isTimestampInRange(r.created_at, previousRange)),
    [reservations, previousRange],
  );
  const reservationsTrend = trendPercent(reservationsCreated.length, reservationsCreatedPrev.length);
  const reservationsConfirmed = useMemo(
    () => reservationsCreated.filter((r) => CONFIRMED_LIKE_STATUSES.has(r.status)).length,
    [reservationsCreated],
  );
  const reservationsCompleted = useMemo(
    () => reservationsCreated.filter((r) => COMPLETED_STATUSES.has(r.status)).length,
    [reservationsCreated],
  );
  const reservationsCancelled = useMemo(
    () => reservationsCreated.filter((r) => CANCELLED_STATUSES.has(r.status)).length,
    [reservationsCreated],
  );

  const unpaidTotal = useMemo(
    () =>
      reservations
        .filter((r) => isDateInRange(r.check_in, fromIso, toIso) && !NON_OCCUPYING_UNPAID_STATUSES.has(r.status))
        .reduce((sum, r) => sum + Math.max(0, Number(r.balance_due ?? 0)), 0),
    [reservations, fromIso, toIso],
  );

  const revenueBuckets = useMemo(() => {
    const buckets = buildBuckets(range);
    const prevBuckets = buildBuckets(previousRange);
    return buckets.map((b, i) => {
      const current = paymentsInPeriod
        .filter((p) => {
          const t = new Date(p.paid_at).getTime();
          return t >= b.start.getTime() && t < b.endExclusive.getTime();
        })
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const prevBucket = prevBuckets[i];
      const previous = prevBucket
        ? paymentsInPrevious
            .filter((p) => {
              const t = new Date(p.paid_at).getTime();
              return t >= prevBucket.start.getTime() && t < prevBucket.endExclusive.getTime();
            })
            .reduce((s, p) => s + Number(p.amount || 0), 0)
        : 0;
      return { label: b.label, current, previous };
    });
  }, [range, previousRange, paymentsInPeriod, paymentsInPrevious]);

  const expenseBuckets = useMemo(() => {
    const buckets = buildBuckets(range);
    return buckets.map((b) => {
      const bFromIso = format(b.start, "yyyy-MM-dd");
      const bToIso = format(addDays(b.endExclusive, -1), "yyyy-MM-dd");
      const amount = expensesInPeriod
        .filter((e) => isDateInRange(e.expense_date, bFromIso, bToIso))
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return { label: b.label, amount };
    });
  }, [range, expensesInPeriod]);

  const occupancyBuckets = useMemo(() => {
    const buckets = buildBuckets(range);
    return buckets.map((b) => {
      const occ = computeOccupancyRate({
        reservations: reservations as OccupancyReservationLike[],
        roomCount: totalRooms,
        rangeStart: b.start,
        rangeEndExclusive: b.endExclusive,
      });
      return { label: b.label, rate: occ.rate };
    });
  }, [range, reservations, totalRooms]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expensesInPeriod) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount || 0));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expensesInPeriod]);

  const topRooms = useMemo(() => {
    if (!totalRooms) return [];
    return rooms
      .map((room) => {
        const roomReservations = reservations.filter((r) => r.room_id === room.id);
        const concerned = roomReservations.filter(
          (r) => isDateInRange(r.check_in, fromIso, toIso) && !NON_OCCUPYING_UNPAID_STATUSES.has(r.status),
        );
        const occ = computeOccupancyRate({
          reservations: roomReservations as OccupancyReservationLike[],
          roomCount: 1,
          rangeStart: startOfDay(range.start),
          rangeEndExclusive,
        });
        const roomReservationIds = new Set(roomReservations.map((r) => r.id));
        const revenue = paymentsInPeriod
          .filter((p) => roomReservationIds.has(p.reservation_id))
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        return {
          room,
          reservationsCount: concerned.length,
          nights: occ.occupiedNights,
          occupancyRate: occ.rate,
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [rooms, reservations, paymentsInPeriod, range, rangeEndExclusive, totalRooms, fromIso, toIso]);

  const paymentDetails = useMemo(() => {
    const reservationsById = new Map(reservations.map((r) => [r.id, r]));
    const guestsById = new Map(guests.map((g) => [g.id, g]));
    const roomsById = new Map(rooms.map((r) => [r.id, r]));
    return paymentsInPeriod
      .slice()
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
      .map((p) => {
        const reservation = reservationsById.get(p.reservation_id);
        const guest = reservation?.guest_id ? guestsById.get(reservation.guest_id) : null;
        const room = reservation ? roomsById.get(reservation.room_id) : null;
        return {
          id: p.id,
          date: p.paid_at,
          amount: Number(p.amount || 0),
          method: p.method,
          reference: p.reference,
          guestName: guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Client de passage",
          roomNumber: room?.number ?? "—",
        };
      });
  }, [paymentsInPeriod, reservations, guests, rooms]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === preset)?.label ?? "";

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [
      ["Rapport Hôtel", periodLabel],
      ["Période", `${fromIso} au ${toIso}`],
      [],
      ["KPI", "Valeur"],
      ["Chiffre d'affaires encaissé", revenueTotal],
      ["Taux d'occupation (%)", occupancy.rate],
      ["Réservations", reservationsCreated.length],
      ["Impayés", unpaidTotal],
      ["Dépenses", expensesTotal],
      ["Résultat simplifié", resultTotal],
      [],
      ["Réservations par statut", "Nombre"],
      ["Créées", reservationsCreated.length],
      ["Confirmées", reservationsConfirmed],
      ["Terminées", reservationsCompleted],
      ["Annulées", reservationsCancelled],
      [],
      ["Dépenses par catégorie", "Montant"],
      ...expensesByCategory.map((row) => [row.category, row.amount]),
      [],
      ["Performance des logements", "Réservations", "Nuitées", "Taux d'occupation (%)", "CA encaissé"],
      ...topRooms.map((row) => [row.room.number, row.reservationsCount, row.nights, row.occupancyRate, row.revenue]),
      [],
      ["Détail des encaissements"],
      ["Date", "Client", "Chambre", "Montant", "Mode", "Référence"],
      ...paymentDetails.map((p) => [
        formatDateTime(p.date),
        p.guestName,
        p.roomNumber,
        p.amount,
        p.method ?? "—",
        p.reference ?? "",
      ]),
    ];
    const blob = new Blob(["﻿" + rows.map((row) => row.join(";")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rapport_hotel_${format(range.start, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel (CSV) terminé.");
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const tenant = tenantFromSettings(settings, logoUrl);
      const startY = await PdfLayoutEngine.header(doc, tenant, "Rapport Hôtel", [
        { label: "Période", value: `${periodLabel} (${formatRangeLabel(range)})` },
        { label: "CA encaissé", value: formatCurrency(revenueTotal) },
        { label: "Taux d'occupation", value: `${occupancy.rate}%` },
        { label: "Résultat simplifié", value: formatCurrency(resultTotal) },
      ]);
      let finalY = PdfLayoutEngine.table(
        doc,
        ["Indicateur", "Valeur"],
        [
          ["Chiffre d'affaires encaissé", formatCurrency(revenueTotal)],
          ["Taux d'occupation", `${occupancy.rate}%`],
          ["Réservations", String(reservationsCreated.length)],
          ["Impayés", formatCurrency(unpaidTotal)],
          ["Dépenses", formatCurrency(expensesTotal)],
          ["Résultat simplifié", formatCurrency(resultTotal)],
        ],
        PdfLayoutEngine.section(doc, "Synthèse", startY),
        { columnStyles: { 1: { halign: "right", fontStyle: "bold" } } },
      );
      finalY = PdfLayoutEngine.section(doc, "Réservations", finalY + 8);
      finalY = PdfLayoutEngine.table(
        doc,
        ["Statut", "Nombre"],
        [
          ["Créées", String(reservationsCreated.length)],
          ["Confirmées", String(reservationsConfirmed)],
          ["Terminées", String(reservationsCompleted)],
          ["Annulées", String(reservationsCancelled)],
        ],
        finalY,
      );
      finalY = PdfLayoutEngine.section(doc, "Dépenses par catégorie", finalY + 8);
      finalY = PdfLayoutEngine.table(
        doc,
        ["Catégorie", "Montant"],
        expensesByCategory.length
          ? expensesByCategory.map((row) => [row.category, formatCurrency(row.amount)])
          : [["Aucune dépense sur la période", ""]],
        finalY,
        { columnStyles: { 1: { halign: "right" } } },
      );
      finalY = PdfLayoutEngine.section(doc, "Performance des logements", finalY + 8);
      finalY = PdfLayoutEngine.table(
        doc,
        ["Logement", "Réservations", "Nuitées", "Occupation", "CA encaissé"],
        topRooms.length
          ? topRooms.map((row) => [
              row.room.number,
              String(row.reservationsCount),
              String(row.nights),
              `${row.occupancyRate}%`,
              formatCurrency(row.revenue),
            ])
          : [["Aucune donnée", "", "", "", ""]],
        finalY,
      );
      if (paymentDetails.length) {
        finalY = PdfLayoutEngine.section(doc, "Détail des encaissements", finalY + 8);
        finalY = PdfLayoutEngine.table(
          doc,
          ["Date", "Client", "Chambre", "Montant", "Mode"],
          paymentDetails.map((p) => [
            formatDateTime(p.date),
            p.guestName,
            p.roomNumber,
            formatCurrency(p.amount),
            p.method ?? "—",
          ]),
          finalY,
        );
      }
      PdfLayoutEngine.totals(
        doc,
        [
          { label: "Chiffre d'affaires encaissé", value: formatCurrency(revenueTotal) },
          { label: "Dépenses", value: formatCurrency(expensesTotal) },
          { label: "Résultat simplifié", value: formatCurrency(resultTotal) },
        ],
        finalY + 7,
      );
      PdfLayoutEngine.footer(doc, tenant);
      await downloadPdf(doc, `Rapport_hotel_${companyName || "Etablissement"}_${format(range.start, "yyyy-MM-dd")}.pdf`);
      toast.success("Export PDF terminé.");
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <HotelAppShell title="Rapports" subtitle="Analysez les performances de votre établissement">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <TrendingUp className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Accès restreint</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter les rapports de cet établissement.
            </p>
          </div>
        </div>
      </HotelAppShell>
    );
  }

  return (
    <HotelAppShell
      title="Rapports"
      subtitle="Analysez l'occupation, les revenus, les réservations, les encaissements et les performances de votre établissement."
      actions={
        canExport ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl" disabled={exporting || reportsQuery.isLoading}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handleExportPdf()}>
                <FileText className="size-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportCsv}>
                <FileSpreadsheet className="size-4" /> Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    >
      {reportsQuery.isLoading ? (
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[20px]" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : reportsQuery.isError ? (
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Impossible de charger les rapports</h3>
            <p className="mt-1 text-sm text-muted-foreground">Vérifiez votre connexion puis réessayez.</p>
            <Button variant="outline" onClick={() => void reportsQuery.refetch()} className="mt-5 rounded-xl">
              Réessayer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Filtres */}
          <Card className="rounded-2xl p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
                <SelectTrigger className="w-full rounded-xl sm:w-[210px]">
                  <CalendarRange className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preset === "custom" && (
                <>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-11 w-[150px] rounded-xl"
                  />
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-11 w-[150px] rounded-xl"
                  />
                </>
              )}
              <span className="text-xs text-muted-foreground">{formatRangeLabel(range)}</span>
            </div>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DashboardKpiCard
              index={0}
              title="CA encaissé"
              value={formatCurrency(revenueTotal)}
              compactValue={formatCurrencyCompact(revenueTotal)}
              icon={Wallet}
              trend={revenueTrend}
              accent="primary"
            />
            <DashboardKpiCard
              index={1}
              title="Taux d'occupation"
              value={`${occupancy.rate}%`}
              icon={Percent}
              trend={occupancyTrend}
              accent="sky"
            />
            <DashboardKpiCard
              index={2}
              title="Réservations"
              value={String(reservationsCreated.length)}
              icon={CalendarCheck}
              trend={reservationsTrend}
              accent="violet"
            />
            <DashboardKpiCard
              index={3}
              title="Impayés"
              value={formatCurrency(unpaidTotal)}
              compactValue={formatCurrencyCompact(unpaidTotal)}
              icon={AlertCircle}
              trend={null}
              accent="rose"
            />
            <DashboardKpiCard
              index={4}
              title="Dépenses"
              value={formatCurrency(expensesTotal)}
              compactValue={formatCurrencyCompact(expensesTotal)}
              icon={Receipt}
              trend={expensesTrend}
              accent="amber"
            />
            <DashboardKpiCard
              index={5}
              title="Résultat simplifié"
              value={formatCurrency(resultTotal)}
              compactValue={formatCurrencyCompact(resultTotal)}
              icon={TrendingUp}
              trend={resultTrend}
              accent="emerald"
            />
          </div>

          {/* Revenus */}
          <SectionCard title="Revenus" icon={Wallet}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="break-words text-3xl font-bold leading-tight tracking-tight">
                  <span className="sm:hidden">{formatCurrencyCompact(revenueTotal)}</span>
                  <span className="hidden sm:inline">{formatCurrency(revenueTotal)}</span>
                </p>
                {revenueTrend !== null && (
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      revenueTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {revenueTrend >= 0 ? "+" : ""}
                    {revenueTrend.toFixed(1)}% vs période précédente ({formatCurrencyCompact(revenuePrevTotal)})
                  </p>
                )}
              </div>
              <DotLegend
                items={[
                  { label: "Période actuelle", color: "hsl(var(--primary))" },
                  { label: "Période précédente", color: "#94a3b8", dashed: true },
                ]}
              />
            </div>
            {paymentsInPeriod.length ? (
              <>
                <div className="mt-4 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueBuckets}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11 }} width={64} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="current" name="Période actuelle" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="previous" name="Période précédente" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Période</th>
                        <th className="px-3 py-2 text-right">Montant encaissé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {revenueBuckets.map((b) => (
                        <tr key={b.label}>
                          <td className="px-3 py-2">{b.label}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(b.current)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyNote />
            )}
          </SectionCard>

          {/* Occupation */}
          <SectionCard title="Occupation" icon={Percent}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
                <div className="text-4xl font-bold tracking-tight text-primary">{occupancy.rate}%</div>
                <div className="flex-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${occupancy.rate}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {occupancy.occupiedNights} / {occupancy.availableNights} nuitées occupées
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {totalRooms ? (
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={occupancyBuckets}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Line type="monotone" dataKey="rate" name="Occupation" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyNote text="Aucun logement configuré." />
                )}
              </div>
            </div>
          </SectionCard>

          {/* Réservations */}
          <SectionCard title="Réservations" icon={CalendarCheck}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Créées" value={String(reservationsCreated.length)} icon={CalendarPlus} tone="bg-primary/10 text-primary" />
              <StatTile label="Confirmées" value={String(reservationsConfirmed)} icon={CheckCircle2} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
              <StatTile label="Terminées" value={String(reservationsCompleted)} icon={Flag} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatTile label="Annulées" value={String(reservationsCancelled)} icon={Ban} tone="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
            </div>
            {reservationsTrend !== null && (
              <p
                className={cn(
                  "mt-3 text-xs font-semibold",
                  reservationsTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {reservationsTrend >= 0 ? "+" : ""}
                {reservationsTrend.toFixed(1)}% vs période précédente
              </p>
            )}
          </SectionCard>

          {/* Encaissements */}
          <SectionCard title="Encaissements" icon={Banknote}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Total encaissé" value={formatCurrency(revenueTotal)} icon={Wallet} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatTile label="Reste à encaisser" value={formatCurrency(unpaidTotal)} icon={AlertCircle} tone="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
              <StatTile label="Nombre de paiements" value={String(paymentsInPeriod.length)} icon={Receipt} tone="bg-primary/10 text-primary" />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détail par réservation</p>
              {paymentDetails.length ? (
                <div className="max-h-72 overflow-y-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Client</th>
                        <th className="px-3 py-2 text-left">Chambre</th>
                        <th className="px-3 py-2 text-left">Mode</th>
                        <th className="px-3 py-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paymentDetails.map((p) => (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDateTime(p.date)}</td>
                          <td className="px-3 py-2">{p.guestName}</td>
                          <td className="px-3 py-2">{p.roomNumber}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.method || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyNote />
              )}
            </div>
          </SectionCard>

          {/* Dépenses */}
          <SectionCard title="Dépenses" icon={Receipt}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="break-words text-3xl font-bold leading-tight tracking-tight">
                  <span className="sm:hidden">{formatCurrencyCompact(expensesTotal)}</span>
                  <span className="hidden sm:inline">{formatCurrency(expensesTotal)}</span>
                </p>
                {expensesTrend !== null && (
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      expensesTrend <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {expensesTrend >= 0 ? "+" : ""}
                    {expensesTrend.toFixed(1)}% vs période précédente
                  </p>
                )}
                {expensesInPeriod.length ? (
                  <div className="mt-4 h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={expenseBuckets}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 11 }} width={64} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="amount" name="Dépenses" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyNote />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Répartition par catégorie</p>
                {expensesByCategory.length ? (
                  <ul className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {expensesByCategory.map((row) => {
                      const share = expensesTotal > 0 ? (row.amount / expensesTotal) * 100 : 0;
                      return (
                        <li key={row.category}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium">{row.category}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {formatCurrency(row.amount)} · {share.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(share, 2)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyNote />
                )}
              </div>
            </div>
          </SectionCard>

          {/* Performance des logements */}
          <SectionCard title="Performance des logements" icon={Building2}>
            {topRooms.length ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Logement</th>
                      <th className="px-3 py-2 text-right">Réservations</th>
                      <th className="px-3 py-2 text-right">Nuitées</th>
                      <th className="px-3 py-2 text-right">Taux d'occupation</th>
                      <th className="px-3 py-2 text-right">CA encaissé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topRooms.map((row) => (
                      <tr key={row.room.id}>
                        <td className="px-3 py-2 font-medium">
                          Chambre {row.room.number}
                          {row.room.hotel_room_types?.name ? (
                            <span className="ml-1 text-xs text-muted-foreground">· {row.room.hotel_room_types.name}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">{row.reservationsCount}</td>
                        <td className="px-3 py-2 text-right">{row.nights}</td>
                        <td className="px-3 py-2 text-right">{row.occupancyRate}%</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyNote />
            )}
          </SectionCard>
        </div>
      )}
    </HotelAppShell>
  );
}
