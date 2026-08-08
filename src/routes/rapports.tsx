import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Package,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addQuarters,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  getISOWeekYear,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AppShell } from "@/components/mms/AppShell";
import { PLATFORM_BRANDING } from "@/config/branding";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mms/format";
import { useTenant } from "@/providers/TenantProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { tenantFromSettings } from "@/lib/mms/PdfTheme";
import { PdfLayoutEngine } from "@/lib/mms/PdfLayoutEngine";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { DashboardKpiCard, type KpiAccent } from "@/components/mms/dashboard/DashboardKpiCard";
import type { SparkPoint } from "@/hooks/use-dashboard-data";
import { cn } from "@/lib/utils";

type SaleItemType = "service" | "product";
type SalesFilter = "all" | SaleItemType;
type ReportSaleItem = {
  id: string;
  name: string;
  item_type: string;
  qty: number;
  cost_price: number;
  line_total: number;
};
type ReportSale = {
  id: string;
  number: string;
  client_name: string | null;
  payment_method: string;
  total: number;
  subtotal: number;
  created_at: string;
  vente_items: ReportSaleItem[];
};
type PerformanceRow = {
  item_type: string;
  item_name: string;
  quantity: number;
  revenue: number;
  cost: number;
};
type ReportExpense = {
  amount: number;
  category: string;
  paid_at: string;
};
type ReportQuote = {
  id: string;
  created_at: string;
  status: string | null;
  total: number;
};
type Performance = {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
};
type DateRange = { start: Date; end: Date };

const PRODUCT_COLOR = "#2563eb";
const SERVICE_COLOR = "#16a34a";
const MONTHS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

type PeriodPreset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "quarter" | "year" | "custom";
type ComparisonMode = "previous" | "lastYear" | "none";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "lastMonth", label: "Mois précédent" },
  { value: "quarter", label: "Ce trimestre" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Période personnalisée" },
];

const COMPARISON_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: "previous", label: "Période précédente" },
  { value: "lastYear", label: "Même période l'an dernier" },
  { value: "none", label: "Aucune comparaison" },
];

export const Route = createFileRoute("/rapports")({
  component: RapportsPage,
  head: () => ({
    meta: [
      { title: `Rapports — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Rapports financiers par activité." },
    ],
  }),
});

/** Trailing-7-days window (fixed, independent of the selected period) — the
 * only slice of ventes/vente_items still fetched at item granularity, since
 * the 7-day KPI sparklines and the "last 7 days" chart need per-day
 * product/service splits that a period-level aggregate can't provide. */
function trailingWindow(): DateRange {
  const now = new Date();
  return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
}

/** Financial aggregates (CA produits/services, coûts, top produits/services)
 * now come from get_ventes_performance_by_period() — a single indexed
 * JOIN+GROUP BY run entirely in Postgres — instead of downloading every
 * vente_items row in the period (117,953 rows / 1.14s at MEDIUM "Année" scale)
 * just to reduce them into the same numbers client-side. The formula is
 * identical: revenue = SUM(line_total * vente.total/vente.subtotal), cost =
 * cost_price*qty for products only, grouped by (item_type, name) — see the
 * RPC's own migration comment. Only three things are still fetched at row
 * level: depenses/achats/devis in the fetch window (already small & indexed,
 * unchanged), the trailing-7-days vente_items (for the always-shown 7-day
 * sparklines/daily chart), and the top-10 most recent sales in the *target*
 * period (for the "Dernières ventes" table, which needs per-sale
 * number/client/payment/type — a bounded fetch, not the whole period). */
function useData(periodRange: DateRange, compareRange: DateRange | null) {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;
  const trailing = trailingWindow();
  const periodStartISO = periodRange.start.toISOString();
  const periodEndISO = periodRange.end.toISOString();
  const compareStartISO = compareRange?.start.toISOString() ?? null;
  const compareEndISO = compareRange?.end.toISOString() ?? null;
  const trailingStartISO = trailing.start.toISOString();
  const trailingEndISO = trailing.end.toISOString();
  // depenses/achats/devis still need the full window (period ∪ compare ∪
  // trailing 7 days) so calculate()'s date-filtering over them keeps working
  // unchanged for both the target and comparison periods.
  const fetchStart = new Date(
    Math.min(periodRange.start.getTime(), compareRange?.start.getTime() ?? Infinity, trailing.start.getTime()),
  );
  const fetchEnd = new Date(
    Math.max(periodRange.end.getTime(), compareRange?.end.getTime() ?? -Infinity, trailing.end.getTime()),
  );
  const fetchStartISO = fetchStart.toISOString();
  const fetchEndISO = fetchEnd.toISOString();
  const fetchStartDate = format(fetchStart, "yyyy-MM-dd");
  const fetchEndDate = format(fetchEnd, "yyyy-MM-dd");

  return useQuery({
    queryKey: [
      "reports",
      tenantId,
      periodStartISO,
      periodEndISO,
      compareStartISO,
      compareEndISO,
      trailingStartISO,
      trailingEndISO,
    ],
    enabled: !loading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant actif introuvable.");
      const [targetPerfRes, comparePerfRes, depensesRes, achatsRes, devisRes, trailingItemsRes, topSalesRes] =
        await Promise.all([
          (supabase.rpc as any)("get_ventes_performance_by_period", {
            p_start: periodStartISO,
            p_end: periodEndISO,
          }) as Promise<{ data: PerformanceRow[] | null; error: Error | null }>,
          compareRange
            ? ((supabase.rpc as any)("get_ventes_performance_by_period", {
                p_start: compareStartISO,
                p_end: compareEndISO,
              }) as Promise<{ data: PerformanceRow[] | null; error: Error | null }>)
            : Promise.resolve({ data: [] as PerformanceRow[], error: null }),
          supabase
            .from("depenses")
            .select("amount, category, paid_at")
            .eq("tenant_id", tenantId)
            .gte("paid_at", fetchStartDate)
            .lte("paid_at", fetchEndDate),
          supabase
            .from("achats")
            .select("total, created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", fetchStartISO)
            .lte("created_at", fetchEndISO),
          supabase
            .from("devis")
            .select("id, status, total, created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", fetchStartISO)
            .lte("created_at", fetchEndISO),
          (supabase.from("vente_items") as any)
            .select(
              "id, vente_id, name, item_type, qty, cost_price, line_total, ventes!inner(created_at, total, subtotal)",
            )
            .eq("tenant_id", tenantId)
            .gte("ventes.created_at", trailingStartISO)
            .lte("ventes.created_at", trailingEndISO),
          // Bounded candidate set for the "Dernières ventes" table: 15 is a
          // safety margin over the 10 displayed, in case salesFilter (mixed
          // catalogs only) excludes a few of the most recent sales.
          supabase
            .from("ventes")
            .select("id, number, client_name, payment_method, total, subtotal, created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", periodStartISO)
            .lte("created_at", periodEndISO)
            .order("created_at", { ascending: false })
            .limit(15),
        ]);
      const error =
        targetPerfRes.error ??
        comparePerfRes.error ??
        depensesRes.error ??
        achatsRes.error ??
        devisRes.error ??
        trailingItemsRes.error ??
        topSalesRes.error;
      if (error) throw error;

      const topSaleIds = (topSalesRes.data ?? []).map((s: { id: string }) => s.id);
      const topItemsRes = topSaleIds.length
        ? await supabase
            .from("vente_items")
            .select("vente_id, item_type")
            .eq("tenant_id", tenantId)
            .in("vente_id", topSaleIds)
        : { data: [] as { vente_id: string; item_type: string }[], error: null };
      if (topItemsRes.error) throw topItemsRes.error;

      const topTypesByVente = new Map<string, Set<string>>();
      for (const row of topItemsRes.data ?? []) {
        const set = topTypesByVente.get(row.vente_id) ?? new Set<string>();
        set.add(row.item_type);
        topTypesByVente.set(row.vente_id, set);
      }
      // Reconstructs just enough of the old ReportSale shape (vente_items
      // reduced to their item_type only — that's all saleType()/the
      // salesFilter membership check need) for the top-10 table.
      const topSales: ReportSale[] = ((topSalesRes.data ?? []) as Omit<ReportSale, "vente_items">[]).map(
        (sale) => ({
          ...sale,
          vente_items: [...(topTypesByVente.get(sale.id) ?? [])].map((item_type) => ({
            id: `${sale.id}-${item_type}`,
            name: "",
            item_type,
            qty: 0,
            cost_price: 0,
            line_total: 0,
          })),
        }),
      );

      const trailingItemsByVenteId = new Map<string, ReportSaleItem[]>();
      const trailingSaleMeta = new Map<string, { created_at: string; total: number; subtotal: number }>();
      for (const row of (trailingItemsRes.data ?? []) as (ReportSaleItem & {
        vente_id: string;
        ventes: { created_at: string; total: number; subtotal: number };
      })[]) {
        const list = trailingItemsByVenteId.get(row.vente_id);
        const item: ReportSaleItem = {
          id: row.id,
          name: row.name,
          item_type: row.item_type,
          qty: row.qty,
          cost_price: row.cost_price,
          line_total: row.line_total,
        };
        if (list) list.push(item);
        else trailingItemsByVenteId.set(row.vente_id, [item]);
        if (!trailingSaleMeta.has(row.vente_id)) trailingSaleMeta.set(row.vente_id, row.ventes);
      }
      const trailingSales: ReportSale[] = [...trailingItemsByVenteId.entries()].map(([id, items]) => {
        const meta = trailingSaleMeta.get(id)!;
        return {
          id,
          number: "",
          client_name: null,
          payment_method: "",
          total: meta.total,
          subtotal: meta.subtotal,
          created_at: meta.created_at,
          vente_items: items,
        };
      });

      return {
        targetPerformance: targetPerfRes.data ?? [],
        comparePerformance: comparePerfRes.data ?? [],
        topSales,
        trailingSales,
        depenses: (depensesRes.data ?? []) as ReportExpense[],
        achats: achatsRes.data ?? [],
        devis: (devisRes.data ?? []) as ReportQuote[],
      };
    },
  });
}

/** The "Année" period selector needs to know every year that has any data at
 * all, including years outside the currently fetched window — so it's kept
 * as its own tiny min-date lookup (4 single-row indexed queries) instead of
 * being derived from the (now date-bounded) report data. */
function useEarliestYear(tenantId: string | undefined, currentYear: number) {
  return useQuery({
    queryKey: ["reports", "earliest-year", tenantId],
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [v, d, a, q] = await Promise.all([
        supabase
          .from("ventes")
          .select("created_at")
          .eq("tenant_id", tenantId as string)
          .order("created_at", { ascending: true })
          .limit(1),
        supabase
          .from("depenses")
          .select("paid_at")
          .eq("tenant_id", tenantId as string)
          .order("paid_at", { ascending: true })
          .limit(1),
        supabase
          .from("achats")
          .select("created_at")
          .eq("tenant_id", tenantId as string)
          .order("created_at", { ascending: true })
          .limit(1),
        supabase
          .from("devis")
          .select("created_at")
          .eq("tenant_id", tenantId as string)
          .order("created_at", { ascending: true })
          .limit(1),
      ]);
      const dates = [
        v.data?.[0]?.created_at,
        d.data?.[0]?.paid_at,
        a.data?.[0]?.created_at,
        q.data?.[0]?.created_at,
      ].filter((value): value is string => Boolean(value));
      if (dates.length === 0) return currentYear;
      return Math.min(...dates.map((value) => new Date(value).getFullYear()));
    },
  });
}

function inRange(date: string, range: DateRange) {
  const value = new Date(date);
  return isWithinInterval(value, { start: range.start, end: range.end });
}

function revenueForType(sale: ReportSale, type: SaleItemType) {
  const gross = sale.vente_items
    .filter((item) => item.item_type === type)
    .reduce((sum, item) => sum + Number(item.line_total), 0);
  const factor = Number(sale.subtotal) > 0 ? Number(sale.total) / Number(sale.subtotal) : 0;
  return gross * factor;
}

function saleType(sale: ReportSale) {
  const types = new Set(
    sale.vente_items
      .map((item) => item.item_type)
      .filter((type): type is SaleItemType => type === "product" || type === "service"),
  );
  if (types.size === 2) return "Mixte";
  if (types.has("product")) return "Produit";
  if (types.has("service")) return "Service";
  return "Non classée";
}

function quoteBucket(status: string | null) {
  const normalized = (status ?? "").trim().toLocaleLowerCase("fr-FR");
  if (normalized === "accepté" || normalized === "accepte") return "accepted";
  if (normalized === "refusé" || normalized === "refuse") return "rejected";
  return "pending";
}

/** Resolves the active preset + sub-controls into a concrete [start, end] window. */
function getPeriodRange(params: {
  preset: PeriodPreset;
  month: number;
  year: number;
  weekOffset: number;
  quarterOffset: number;
  customFrom: string;
  customTo: string;
}): DateRange {
  const now = new Date();
  switch (params.preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const d = subDays(now, 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "week": {
      const anchor = addWeeks(now, params.weekOffset);
      return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    }
    case "lastMonth": {
      const base = subMonths(now, 1);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
    case "quarter": {
      const anchor = addQuarters(now, params.quarterOffset);
      return { start: startOfQuarter(anchor), end: endOfQuarter(anchor) };
    }
    case "year": {
      const base = new Date(params.year, 0, 1);
      return { start: startOfYear(base), end: endOfYear(base) };
    }
    case "custom": {
      const fromDate = params.customFrom ? new Date(`${params.customFrom}T00:00:00`) : startOfMonth(now);
      const toDate = params.customTo ? new Date(`${params.customTo}T00:00:00`) : now;
      const from = startOfDay(fromDate);
      const to = endOfDay(toDate);
      return { start: from, end: to.getTime() >= from.getTime() ? to : from };
    }
    case "month":
    default: {
      const base = new Date(params.year, params.month - 1, 1);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
  }
}

/** Mirrors getPeriodRange to find the "previous equivalent" window for automatic comparison. */
function getComparisonRange(
  mode: ComparisonMode,
  params: Parameters<typeof getPeriodRange>[0],
  range: DateRange,
): DateRange | null {
  if (mode === "none") return null;
  if (mode === "lastYear") {
    return { start: subYears(range.start, 1), end: subYears(range.end, 1) };
  }
  switch (params.preset) {
    case "today":
      return getPeriodRange({ ...params, preset: "yesterday" });
    case "yesterday": {
      const d = subDays(new Date(), 2);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case "week":
      return getPeriodRange({ ...params, preset: "week", weekOffset: params.weekOffset - 1 });
    case "quarter":
      return getPeriodRange({ ...params, preset: "quarter", quarterOffset: params.quarterOffset - 1 });
    case "year":
      return getPeriodRange({ ...params, preset: "year", year: params.year - 1 });
    case "lastMonth": {
      const base = subMonths(new Date(), 2);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
    case "custom": {
      const durationMs = range.end.getTime() - range.start.getTime();
      const prevEnd = new Date(range.start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      return { start: prevStart, end: prevEnd };
    }
    case "month":
    default: {
      const base = subMonths(new Date(params.year, params.month - 1, 1), 1);
      return { start: startOfMonth(base), end: endOfMonth(base) };
    }
  }
}

function formatRangeLabel(range: DateRange) {
  const sameDay = startOfDay(range.start).getTime() === startOfDay(range.end).getTime();
  if (sameDay) return format(range.start, "dd MMMM yyyy", { locale: fr });
  return `${format(range.start, "dd MMM", { locale: fr })} – ${format(range.end, "dd MMM yyyy", { locale: fr })}`;
}

function formatPeriodTitle(preset: PeriodPreset, range: DateRange) {
  switch (preset) {
    case "today":
      return "Aujourd'hui";
    case "yesterday":
      return "Hier";
    case "week":
      return `Semaine ${getISOWeek(range.start)} (${getISOWeekYear(range.start)})`;
    case "quarter":
      return `T${Math.floor(range.start.getMonth() / 3) + 1} ${range.start.getFullYear()}`;
    case "year":
      return `Année ${range.start.getFullYear()}`;
    case "lastMonth":
      return `${format(range.start, "MMMM yyyy", { locale: fr })}`;
    case "custom":
      return "Période personnalisée";
    case "month":
    default:
      return `${format(range.start, "MMMM yyyy", { locale: fr })}`;
  }
}

/** Sums `valueFn` over the trailing N calendar days ending "today" — feeds KPI mini sparklines. */
function lastNDaysSpark(days: number, valueFn: (day: DateRange) => number): SparkPoint[] {
  const now = new Date();
  const points: SparkPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(now, i);
    const dayRange = { start: startOfDay(day), end: endOfDay(day) };
    points.push({ label: format(day, "dd/MM"), value: valueFn(dayRange) });
  }
  return points;
}

function RapportsPage() {
  const { profile } = useTenant();
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [weekOffset, setWeekOffset] = useState(0);
  const [quarterOffset, setQuarterOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("all");
  const catalogSettingsQuery = useCatalogSettings();
  const catalogMode = catalogSettingsQuery.data?.catalog_mode;
  const showProducts = catalogMode !== "services" && salesFilter !== "service";
  const showServices = catalogMode !== "products" && salesFilter !== "product";
  const showMixed = catalogMode === "mixed";
  const showPurchases = showProducts && catalogSettingsQuery.data?.purchases_enabled;
  const { settings, logoUrl, companyName } = useCompanySettings();
  const canExport = useActionPermission("reports.export");

  useEffect(() => {
    if (catalogMode === "products") setSalesFilter("product");
    else if (catalogMode === "services") setSalesFilter("service");
  }, [catalogMode]);

  const rangeParams = useMemo(
    () => ({ preset, month, year, weekOffset, quarterOffset, customFrom, customTo }),
    [preset, month, year, weekOffset, quarterOffset, customFrom, customTo],
  );
  const periodRange = useMemo(() => getPeriodRange(rangeParams), [rangeParams]);
  const compareRange = useMemo(
    () => getComparisonRange(comparisonMode, rangeParams, periodRange),
    [comparisonMode, rangeParams, periodRange],
  );

  const { data, isLoading, isFetching, error, dataUpdatedAt, refetch } = useData(periodRange, compareRange);
  const earliestYearQuery = useEarliestYear(profile?.tenant_id, currentYear);

  const report = useMemo(() => {
    if (!data) return null;
    // Financial totals/top-lists now come pre-aggregated per (item_type, name)
    // from get_ventes_performance_by_period() for `range` — summing across
    // names for a given item_type is mathematically identical to the old
    // sales.reduce(revenueForType) (a sale with no matching item contributed
    // 0 either way), so switching from "sum over filtered sales" to "sum over
    // filtered item rows" changes zero results.
    const calculate = (perfRows: PerformanceRow[]) => {
      const sumType = (type: "product" | "service", key: "revenue" | "cost") =>
        perfRows.filter((r) => r.item_type === type).reduce((sum, r) => sum + Number(r[key]), 0);
      const productRevenue = salesFilter === "service" ? 0 : sumType("product", "revenue");
      const serviceRevenue = salesFilter === "product" ? 0 : sumType("service", "revenue");
      const productCost = salesFilter === "service" ? 0 : sumType("product", "cost");
      const range = perfRows === data.targetPerformance ? periodRange : compareRange!;
      const expenses = data.depenses
        .filter((row) => inRange(row.paid_at, range))
        .reduce((sum, row) => sum + Number(row.amount), 0);
      const periodExpenses = data.depenses.filter((row) => inRange(row.paid_at, range));
      const expenseCategories = [
        ...periodExpenses.reduce((rows, row) => {
          const category = row.category?.trim() || "Non catégorisée";
          rows.set(category, (rows.get(category) ?? 0) + Number(row.amount));
          return rows;
        }, new Map<string, number>()),
      ]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      const periodQuotes = data.devis.filter((row) => inRange(row.created_at, range));
      const quoteAmounts = periodQuotes.reduce(
        (amounts, quote) => {
          amounts[quoteBucket(quote.status)] += Number(quote.total);
          return amounts;
        },
        { accepted: 0, pending: 0, rejected: 0 },
      );
      const totalRevenue = productRevenue + serviceRevenue;
      return {
        productRevenue,
        serviceRevenue,
        totalRevenue,
        purchases: productCost,
        expenses,
        grossMargin: productRevenue - productCost,
        netResult: productRevenue - productCost + serviceRevenue - expenses,
        quoteCount: periodQuotes.length,
        quoteAmounts,
        expenseCategories,
      };
    };

    const target = calculate(data.targetPerformance);
    const previous = compareRange ? calculate(data.comparePerformance) : null;
    const compare = (value: number, oldValue: number) => ({
      diff: value - oldValue,
      pct: oldValue === 0 ? 0 : ((value - oldValue) / oldValue) * 100,
    });
    const trend = (key: keyof typeof target) =>
      previous ? compare(Number(target[key]), Number(previous[key])).pct : null;

    // "Dernières ventes" table: same salesFilter membership rule as before
    // (a sale qualifies if it has ≥1 item of the selected type), applied to
    // the bounded top-15 candidates fetched for the target period.
    const tableSales = data.topSales
      .filter(
        (sale) => salesFilter === "all" || sale.vente_items.some((item) => item.item_type === salesFilter),
      )
      .slice(0, 10);

    const toPerformance = (type: SaleItemType): Performance[] =>
      data.targetPerformance
        .filter((r) => r.item_type === type)
        .map((r) => ({
          name: r.item_name,
          quantity: Number(r.quantity),
          revenue: Number(r.revenue),
          cost: Number(r.cost),
          margin: Number(r.revenue) - Number(r.cost),
        }))
        .sort((a, b) => b.revenue - a.revenue);

    return {
      target: { ...target, sales: tableSales },
      previous,
      trends: {
        totalRevenue: trend("totalRevenue"),
        productRevenue: trend("productRevenue"),
        serviceRevenue: trend("serviceRevenue"),
        purchases: trend("purchases"),
        expenses: trend("expenses"),
        grossMargin: trend("grossMargin"),
        netResult: trend("netResult"),
        quoteCount: trend("quoteCount"),
      },
      products: salesFilter === "service" ? [] : toPerformance("product"),
      services: salesFilter === "product" ? [] : toPerformance("service"),
    };
  }, [data, periodRange, compareRange, salesFilter]);

  // Trailing-7-days-only sparklines/daily chart — data.trailingSales is
  // already scoped to exactly this window (see useData), so no further
  // date-range fetch is needed here; only the day-bucketing below changes.
  const trends = useMemo(() => {
    if (!data) return null;
    const ventes = data.trailingSales;
    const depenses = data.depenses;
    const revenueSpark = (type: SaleItemType | "all") =>
      lastNDaysSpark(7, (day) =>
        ventes
          .filter((sale) => inRange(sale.created_at, day))
          .reduce(
            (sum, sale) =>
              sum +
              (type === "all"
                ? revenueForType(sale, "product") + revenueForType(sale, "service")
                : revenueForType(sale, type)),
            0,
          ),
      );
    const purchasesSpark = lastNDaysSpark(7, (day) =>
      ventes
        .filter((sale) => inRange(sale.created_at, day))
        .reduce(
          (sum, sale) =>
            sum +
            sale.vente_items
              .filter((item) => item.item_type === "product")
              .reduce((s, item) => s + Number(item.cost_price) * Number(item.qty), 0),
          0,
        ),
    );
    const expensesSpark = lastNDaysSpark(7, (day) =>
      depenses.filter((row) => inRange(row.paid_at, day)).reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const quotesSpark = lastNDaysSpark(7, (day) =>
      data.devis.filter((row) => inRange(row.created_at, day)).length,
    );
    return {
      total: revenueSpark("all"),
      product: revenueSpark("product"),
      service: revenueSpark("service"),
      purchases: purchasesSpark,
      expenses: expensesSpark,
      quotes: quotesSpark,
    };
  }, [data]);

  const dailyTrend = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const out: { name: string; produits: number; services: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayRange = { start: startOfDay(day), end: endOfDay(day) };
      const daySales = data.trailingSales.filter((sale) => inRange(sale.created_at, dayRange));
      out.push({
        name: format(day, "dd MMM", { locale: fr }),
        produits: showProducts
          ? daySales.reduce((sum, sale) => sum + revenueForType(sale, "product"), 0)
          : 0,
        services: showServices
          ? daySales.reduce((sum, sale) => sum + revenueForType(sale, "service"), 0)
          : 0,
      });
    }
    return out;
  }, [data, showProducts, showServices]);

  const years = useMemo(() => {
    // Independent of the (now date-bounded) report data — see useEarliestYear.
    const firstYear = earliestYearQuery.data ?? currentYear;
    return Array.from({ length: currentYear - firstYear + 1 }, (_, index) => currentYear - index);
  }, [currentYear, earliestYearQuery.data]);

  const periodTitle = formatPeriodTitle(preset, periodRange);
  const periodDates = formatRangeLabel(periodRange);
  const comparisonTitle = compareRange
    ? `${formatPeriodTitle(preset, compareRange)} · ${formatRangeLabel(compareRange)}`
    : "Aucune comparaison";

  const handleRefresh = () => {
    void refetch();
    void catalogSettingsQuery.refetch();
    toast.success("Rapport actualisé.");
  };

  const exportPDF = async (successMessage = "Export PDF terminé.") => {
    if (!report) return;
    const doc = new jsPDF();
    const tenant = tenantFromSettings(settings, logoUrl);
    const startY = await PdfLayoutEngine.header(doc, tenant, "Rapport financier", [
      { label: "Période", value: `${periodTitle} (${periodDates})` },
      { label: "CA total", value: formatCurrency(report.target.totalRevenue) },
      {
        label: "Filtre",
        value:
          salesFilter === "all"
            ? "Toutes les ventes"
            : salesFilter === "product"
              ? "Produits"
              : "Services",
      },
      { label: "Indicateur", value: formatCurrency(report.target.netResult) },
    ]);
    const rows = [
      ...(showMixed ? [["CA total", formatCurrency(report.target.totalRevenue)]] : []),
      ...(showProducts ? [["CA produits", formatCurrency(report.target.productRevenue)]] : []),
      ...(showServices ? [["CA services", formatCurrency(report.target.serviceRevenue)]] : []),
      ...(showMixed ? [[
        "Part Produits / Services",
        report.target.totalRevenue > 0
          ? `${((report.target.productRevenue / report.target.totalRevenue) * 100).toFixed(1)} % / ${((report.target.serviceRevenue / report.target.totalRevenue) * 100).toFixed(1)} %`
          : "0,0 % / 0,0 %",
      ]] : []),
      ...(showPurchases ? [["Achats", formatCurrency(report.target.purchases)]] : []),
      ["Dépenses", formatCurrency(report.target.expenses)],
      ...(showProducts ? [["Marge brute produits", formatCurrency(report.target.grossMargin)]] : []),
      ["Nombre de devis", String(report.target.quoteCount)],
      ["Devis acceptés", formatCurrency(report.target.quoteAmounts.accepted)],
      ["Devis en attente", formatCurrency(report.target.quoteAmounts.pending)],
      ["Devis refusés", formatCurrency(report.target.quoteAmounts.rejected)],
    ];
    let finalY = PdfLayoutEngine.table(
      doc,
      ["Indicateur", "Valeur"],
      rows,
      PdfLayoutEngine.section(doc, "Synthèse", startY),
      {
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      },
    );
    finalY = PdfLayoutEngine.section(doc, "Dépenses par catégorie", finalY + 8);
    finalY = PdfLayoutEngine.table(
      doc,
      ["Catégorie de dépense", "Montant"],
      report.target.expenseCategories.map((row) => [row.category, formatCurrency(row.amount)]),
      finalY,
      { columnStyles: { 1: { halign: "right" } } },
    );
    if (showProducts) {
      finalY = PdfLayoutEngine.section(doc, "Meilleurs produits", finalY + 8);
      finalY = PdfLayoutEngine.table(
      doc, ["Produit", "Qté", "CA", "Marge"],
      report.products.map((row) => [row.name, String(row.quantity), formatCurrency(row.revenue), formatCurrency(row.margin)]),
      finalY,
    );
    }
    if (showServices) {
      finalY = PdfLayoutEngine.section(doc, "Meilleurs services", finalY + 8);
      finalY = PdfLayoutEngine.table(
      doc, ["Service", "Qté", "CA"],
      report.services.map((row) => [row.name, String(row.quantity), formatCurrency(row.revenue)]),
      finalY,
    );
    }
    PdfLayoutEngine.totals(doc, [
      { label: "Chiffre d'affaires", value: formatCurrency(report.target.totalRevenue) },
      { label: "Achats", value: formatCurrency(report.target.purchases), hidden: !showPurchases },
      { label: "Dépenses", value: formatCurrency(report.target.expenses) },
      { label: "Résultat net", value: formatCurrency(report.target.netResult) },
    ], finalY + 7);
    PdfLayoutEngine.footer(doc, tenant);
    await downloadPdf(doc, `Rapport_${companyName || "Entreprise"}_${format(periodRange.start, "yyyy-MM-dd")}.pdf`);
    toast.success(successMessage);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["KPI", "Valeur"],
      ...(showMixed ? [["CA total", report.target.totalRevenue]] : []),
      ...(showProducts ? [["CA produits", report.target.productRevenue]] : []),
      ...(showServices ? [["CA services", report.target.serviceRevenue]] : []),
      ...(showPurchases ? [["Achats", report.target.purchases]] : []),
      ["Dépenses", report.target.expenses],
      ...(showProducts ? [["Marge brute produits", report.target.grossMargin]] : []),
      ["Résultat net", report.target.netResult],
      ["Nombre de devis", report.target.quoteCount],
      ["Devis acceptés", report.target.quoteAmounts.accepted],
      ["Devis en attente", report.target.quoteAmounts.pending],
      ["Devis refusés", report.target.quoteAmounts.rejected],
      [],
      ["Dépenses par catégorie", "Montant"],
      ...report.target.expenseCategories.map((row) => [row.category, row.amount]),
      [],
      ...(showProducts ? [["Meilleurs produits", "Quantité", "CA", "Coût", "Marge"], ...report.products.map((row) => [row.name, row.quantity, row.revenue, row.cost, row.margin]), []] : []),
      ...(showServices ? [["Meilleurs services", "Quantité", "CA"], ...report.services.map((row) => [row.name, row.quantity, row.revenue]), []] : []),
    ];
    const blob = new Blob(["﻿" + rows.map((row) => row.join(";")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rapport_${format(periodRange.start, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel (CSV) terminé.");
  };

  return (
    <AppShell title="Rapports" subtitle="Analyse complète des performances de votre entreprise.">
      <div className="-m-4 min-h-full overflow-x-hidden bg-[#F8FAFC] p-4 pb-24 dark:bg-transparent md:-m-8 md:p-8 md:pb-8">
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200/70 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-border dark:bg-background/80 md:-mx-8 md:rounded-b-[24px] md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-3 gap-2 overflow-x-hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:overflow-visible">
              <div className="min-w-0 sm:shrink-0">
                <Select value={preset} onValueChange={(value) => setPreset(value as PeriodPreset)}>
                  <SelectTrigger className="w-full rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[190px]">
                    <CalendarRange className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
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
              </div>

              {preset === "week" && (
                <div className="col-span-3 flex items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 dark:border-border dark:bg-muted/40 sm:col-span-1 sm:w-auto sm:shrink-0 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((v) => v - 1)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-muted dark:hover:text-foreground"
                    aria-label="Semaine précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="truncate whitespace-nowrap px-1 text-sm font-medium text-slate-700 dark:text-foreground">
                    Semaine {getISOWeek(periodRange.start)} ({getISOWeekYear(periodRange.start)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((v) => v + 1)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-muted dark:hover:text-foreground"
                    aria-label="Semaine suivante"
                    disabled={weekOffset >= 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {preset === "quarter" && (
                <div className="col-span-3 flex items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 dark:border-border dark:bg-muted/40 sm:col-span-1 sm:w-auto sm:shrink-0 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setQuarterOffset((v) => v - 1)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-muted dark:hover:text-foreground"
                    aria-label="Trimestre précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="truncate whitespace-nowrap px-1 text-sm font-medium text-slate-700 dark:text-foreground">
                    {formatPeriodTitle("quarter", periodRange)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuarterOffset((v) => v + 1)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-muted dark:hover:text-foreground"
                    aria-label="Trimestre suivant"
                    disabled={quarterOffset >= 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {preset === "month" && (
                <>
                  <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                    <SelectTrigger className="w-full min-w-0 rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[140px] sm:shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((name, index) => (
                        <SelectItem key={name} value={String(index + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                    <SelectTrigger className="w-full min-w-0 rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[120px] sm:shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {preset === "year" && (
                <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                  <SelectTrigger className="w-full min-w-0 rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[120px] sm:shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {preset === "custom" && (
                <div className="col-span-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-border dark:bg-muted/40 sm:col-span-1 sm:w-auto sm:shrink-0">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none dark:text-foreground"
                  />
                  <span className="shrink-0 text-slate-400">→</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none dark:text-foreground"
                  />
                </div>
              )}

              {showMixed && (
                <div className="min-w-0 sm:shrink-0">
                  <Select
                    value={salesFilter}
                    onValueChange={(value) => setSalesFilter(value as SalesFilter)}
                  >
                    <SelectTrigger className="w-full rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les ventes</SelectItem>
                      <SelectItem value="product">Produits</SelectItem>
                      <SelectItem value="service">Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="min-w-0 sm:shrink-0">
                <Select value={comparisonMode} onValueChange={(value) => setComparisonMode(value as ComparisonMode)}>
                  <SelectTrigger className="w-full rounded-2xl border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/40 sm:w-[210px]">
                    <GitCompareArrows className="mr-1 h-4 w-4 shrink-0 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPARISON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:shrink-0 sm:gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 rounded-2xl border-slate-200 dark:border-border sm:flex-none"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                <span>Actualiser</span>
              </Button>
              {canExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="flex-1 gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 sm:flex-none">
                      <Download className="h-4 w-4" /> Exporter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportPDF("Export PDF terminé.")}>
                      <FileText className="mr-2 h-4 w-4" /> Exporter PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportCSV}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportPDF("Impression lancée.")}>
                      <Printer className="mr-2 h-4 w-4" /> Imprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {report && (
          <div className="mb-6 flex flex-col gap-3 overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-4 shadow-sm dark:border-border dark:from-blue-500/10 dark:via-transparent dark:to-transparent sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Période analysée
              </p>
              <p className="mt-0.5 truncate text-lg font-semibold text-slate-900 dark:text-foreground">
                {periodTitle}
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-muted-foreground">
                  {periodDates}
                </span>
              </p>
            </div>
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Comparée à</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-600 dark:text-muted-foreground">
                {comparisonTitle}
              </p>
            </div>
          </div>
        )}

        {isLoading || catalogSettingsQuery.isLoading ? (
          <div className="text-muted-foreground">Chargement des données réelles…</div>
        ) : error || catalogSettingsQuery.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            Impossible de charger le rapport : {(error ?? catalogSettingsQuery.error)?.message}
            <Button variant="outline" className="ml-3" onClick={() => { void catalogSettingsQuery.refetch(); }}>Réessayer</Button>
          </div>
        ) : !report ? (
          <div className="text-muted-foreground">Aucune donnée disponible.</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {showMixed && (
                <KpiTile
                  title="CA total"
                  value={formatCurrency(report.target.totalRevenue)}
                  icon={Wallet}
                  trend={report.trends.totalRevenue}
                  spark={trends?.total}
                  accent="primary"
                  index={0}
                />
              )}
              {showProducts && (
                <KpiTile
                  title="CA produits"
                  value={formatCurrency(report.target.productRevenue)}
                  icon={Package}
                  trend={report.trends.productRevenue}
                  spark={trends?.product}
                  accent="sky"
                  index={1}
                />
              )}
              {showServices && (
                <KpiTile
                  title="CA services"
                  value={formatCurrency(report.target.serviceRevenue)}
                  icon={Wrench}
                  trend={report.trends.serviceRevenue}
                  spark={trends?.service}
                  accent="emerald"
                  index={2}
                />
              )}
              {showPurchases && (
                <KpiTile
                  title="Achats"
                  value={formatCurrency(report.target.purchases)}
                  icon={ShoppingCart}
                  trend={report.trends.purchases}
                  spark={trends?.purchases}
                  accent="amber"
                  index={3}
                />
              )}
              <KpiTile
                title="Dépenses"
                value={formatCurrency(report.target.expenses)}
                icon={Receipt}
                trend={report.trends.expenses}
                spark={trends?.expenses}
                accent="rose"
                index={4}
              />
              {showProducts && (
                <KpiTile
                  title="Marge brute produits"
                  value={formatCurrency(report.target.grossMargin)}
                  icon={BarChart3}
                  trend={report.trends.grossMargin}
                  accent="indigo"
                  index={5}
                />
              )}
              <KpiTile
                title="Résultat net"
                value={formatCurrency(report.target.netResult)}
                icon={TrendingUp}
                trend={report.trends.netResult}
                accent="emerald"
                index={6}
              />
              <KpiTile
                title="Nombre de devis"
                value={report.target.quoteCount.toLocaleString("fr-FR")}
                icon={FileText}
                trend={report.trends.quoteCount}
                spark={trends?.quotes}
                accent="violet"
                index={7}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AmountCard
                label="Devis acceptés"
                value={report.target.quoteAmounts.accepted}
                tone="text-emerald-600"
              />
              <AmountCard
                label="Devis en attente"
                value={report.target.quoteAmounts.pending}
                tone="text-amber-600"
              />
              <AmountCard
                label="Devis refusés"
                value={report.target.quoteAmounts.rejected}
                tone="text-red-600"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Tendance des 7 derniers jours" className="xl:col-span-2">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      {showProducts && (
                        <Line
                          name="Produits"
                          type="monotone"
                          dataKey="produits"
                          stroke={PRODUCT_COLOR}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          isAnimationActive
                        />
                      )}
                      {showServices && (
                        <Line
                          name="Services"
                          type="monotone"
                          dataKey="services"
                          stroke={SERVICE_COLOR}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          isAnimationActive
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              {showMixed && (
                <Panel title="Répartition du CA Produits vs Services">
                  <div className="relative h-[320px]">
                    {report.target.totalRevenue === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Aucun chiffre d’affaires sur la période.
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Produits", value: report.target.productRevenue },
                                { name: "Services", value: report.target.serviceRevenue },
                              ]}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={65}
                              outerRadius={95}
                              paddingAngle={3}
                              isAnimationActive
                            >
                              <Cell fill={PRODUCT_COLOR} />
                              <Cell fill={SERVICE_COLOR} />
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Total
                          </span>
                          <span className="text-lg font-bold text-slate-900 dark:text-foreground">
                            {formatCurrency(report.target.totalRevenue)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {report.target.totalRevenue > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-center text-sm">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                        Produits{" "}
                        <strong>
                          {((report.target.productRevenue / report.target.totalRevenue) * 100).toFixed(
                            1,
                          )}{" "}
                          %
                        </strong>
                      </div>
                      <div className="rounded-xl bg-green-50 p-3 text-green-700">
                        Services{" "}
                        <strong>
                          {((report.target.serviceRevenue / report.target.totalRevenue) * 100).toFixed(
                            1,
                          )}{" "}
                          %
                        </strong>
                      </div>
                    </div>
                  )}
                </Panel>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {showProducts && <PerformanceTable title="Performances produits" rows={report.products} type="product" />}
              {showServices && <PerformanceTable title="Performances services" rows={report.services} type="service" />}
            </div>

            <Panel title="Dépenses par catégorie">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Catégorie</th>
                      <th className="pb-3 text-right font-medium">Montant</th>
                      <th className="pb-3 text-right font-medium">Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.target.expenseCategories.map((row) => (
                      <tr key={row.category} className="border-b last:border-0">
                        <td className="py-3 font-medium">{row.category}</td>
                        <td className="py-3 text-right">{formatCurrency(row.amount)}</td>
                        <td className="py-3 text-right">
                          {report.target.expenses > 0
                            ? `${((row.amount / report.target.expenses) * 100).toFixed(1)} %`
                            : "0,0 %"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.target.expenseCategories.length === 0 && (
                  <EmptyState label="Aucune dépense sur cette période." />
                )}
              </div>
            </Panel>

            <Panel title="Dernières ventes">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Référence</th>
                      <th className="pb-3 font-medium">Client</th>
                      <th className="pb-3 text-right font-medium">Montant</th>
                      <th className="pb-3 font-medium">Paiement</th>
                      <th className="pb-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.target.sales.slice(0, 10).map((sale) => (
                      <tr key={sale.id} className="border-b last:border-0">
                        <td className="py-3">
                          <TypeBadge type={saleType(sale)} />
                        </td>
                        <td className="py-3 font-medium">{sale.number}</td>
                        <td className="py-3">{sale.client_name || "Client comptoir"}</td>
                        <td className="py-3 text-right font-semibold">
                          {formatCurrency(Number(sale.total))}
                        </td>
                        <td className="py-3">{sale.payment_method}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Finalisée
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.target.sales.length === 0 && (
                  <EmptyState label="Aucune vente sur cette période." />
                )}
              </div>
            </Panel>

            <div className="flex flex-col items-center justify-between gap-2 rounded-[24px] border border-slate-100 bg-white/60 px-5 py-3 text-xs text-slate-500 dark:border-border dark:bg-card/60 dark:text-muted-foreground sm:flex-row">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Données à jour
              </span>
              <span>
                Dernière actualisation :{" "}
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR") : "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KpiTile({
  title,
  value,
  icon,
  trend,
  spark,
  accent,
  index,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: number | null;
  spark?: SparkPoint[];
  accent: KpiAccent;
  index: number;
}) {
  return (
    <DashboardKpiCard
      title={title}
      value={value}
      icon={icon}
      trend={trend}
      spark={spark}
      accent={accent}
      index={index}
    />
  );
}

function AmountCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{formatCurrency(value)}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
    >
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </motion.section>
  );
}

function PerformanceTable({
  title,
  rows,
  type,
}: {
  title: string;
  rows: Performance[];
  type: SaleItemType;
}) {
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">{type === "product" ? "Produit" : "Service"}</th>
              <th className="pb-3 text-right font-medium">Qté</th>
              <th className="pb-3 text-right font-medium">CA</th>
              <th className="pb-3 text-right font-medium">
                {type === "product" ? "Marge" : "Contribution"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="py-3 font-medium">{row.name}</td>
                <td className="py-3 text-right">{row.quantity.toLocaleString("fr-FR")}</td>
                <td className="py-3 text-right">{formatCurrency(row.revenue)}</td>
                <td
                  className={`py-3 text-right font-semibold ${type === "product" ? "text-blue-600" : "text-green-600"}`}
                >
                  {formatCurrency(row.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <EmptyState
            label={`Aucune vente ${type === "product" ? "produit" : "service"} sur cette période.`}
          />
        )}
      </div>
    </Panel>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{label}</div>;
}

function TypeBadge({ type }: { type: string }) {
  const style =
    type === "Produit"
      ? "bg-blue-50 text-blue-700"
      : type === "Service"
        ? "bg-green-50 text-green-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{type}</span>;
}
