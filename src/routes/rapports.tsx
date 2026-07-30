import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  renderPdfFooter,
  renderPdfHeader,
  renderPdfTable,
  renderPdfTotalCard,
  tenantFromSettings,
} from "@/lib/mms/PdfTheme";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";

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

export const Route = createFileRoute("/rapports")({
  component: RapportsPage,
  head: () => ({
    meta: [
      { title: `Rapports — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Rapports financiers par activité." },
    ],
  }),
});

function useData() {
  const { profile, loading } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["reports", tenantId],
    enabled: !loading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Tenant actif introuvable.");
      const [ventes, depenses, achats, devis] = await Promise.all([
        supabase
          .from("ventes")
          .select(
            "id, number, client_name, payment_method, total, subtotal, created_at, vente_items(id, name, item_type, qty, cost_price, line_total)",
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase.from("depenses").select("amount, category, paid_at").eq("tenant_id", tenantId),
        supabase.from("achats").select("total, created_at").eq("tenant_id", tenantId),
        supabase.from("devis").select("id, status, total, created_at").eq("tenant_id", tenantId),
      ]);
      const error = ventes.error ?? depenses.error ?? achats.error ?? devis.error;
      if (error) throw error;
      return {
        ventes: (ventes.data ?? []) as ReportSale[],
        depenses: (depenses.data ?? []) as ReportExpense[],
        achats: achats.data ?? [],
        devis: (devis.data ?? []) as ReportQuote[],
      };
    },
  });
}

function isPeriod(date: string, month: number, year: number) {
  const value = new Date(date);
  return value.getMonth() + 1 === month && value.getFullYear() === year;
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

function buildPerformance(sales: ReportSale[], type: SaleItemType): Performance[] {
  const rows = new Map<string, Performance>();
  sales.forEach((sale) => {
    const factor = Number(sale.subtotal) > 0 ? Number(sale.total) / Number(sale.subtotal) : 0;
    sale.vente_items
      .filter((item) => item.item_type === type)
      .forEach((item) => {
        const current = rows.get(item.name) ?? {
          name: item.name,
          quantity: 0,
          revenue: 0,
          cost: 0,
          margin: 0,
        };
        const revenue = Number(item.line_total) * factor;
        const cost = type === "product" ? Number(item.cost_price) * Number(item.qty) : 0;
        current.quantity += Number(item.qty);
        current.revenue += revenue;
        current.cost += cost;
        current.margin += revenue - cost;
        rows.set(item.name, current);
      });
  });
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
}

function quoteBucket(status: string | null) {
  const normalized = (status ?? "").trim().toLocaleLowerCase("fr-FR");
  if (normalized === "accepté" || normalized === "accepte") return "accepted";
  if (normalized === "refusé" || normalized === "refuse") return "rejected";
  return "pending";
}

function RapportsPage() {
  const { data, isLoading, error } = useData();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("all");
  const { settings, logoUrl, companyName } = useCompanySettings();
  const canExport = useActionPermission("reports.export");

  const report = useMemo(() => {
    if (!data) return null;
    const calculate = (targetMonth: number, targetYear: number) => {
      const periodSales = data.ventes.filter((sale) =>
        isPeriod(sale.created_at, targetMonth, targetYear),
      );
      const sales = periodSales.filter(
        (sale) =>
          salesFilter === "all" || sale.vente_items.some((item) => item.item_type === salesFilter),
      );
      const productRevenue =
        salesFilter === "service"
          ? 0
          : sales.reduce((sum, sale) => sum + revenueForType(sale, "product"), 0);
      const serviceRevenue =
        salesFilter === "product"
          ? 0
          : sales.reduce((sum, sale) => sum + revenueForType(sale, "service"), 0);
      const expenses = data.depenses
        .filter((row) => isPeriod(row.paid_at, targetMonth, targetYear))
        .reduce((sum, row) => sum + Number(row.amount), 0);
      const productCost =
        salesFilter === "service"
          ? 0
          : sales.reduce(
              (saleSum, sale) =>
                saleSum +
                sale.vente_items
                  .filter((item) => item.item_type === "product")
                  .reduce((sum, item) => sum + Number(item.cost_price) * Number(item.qty), 0),
              0,
            );
      const periodExpenses = data.depenses.filter((row) =>
        isPeriod(row.paid_at, targetMonth, targetYear),
      );
      const expenseCategories = [
        ...periodExpenses.reduce((rows, row) => {
          const category = row.category?.trim() || "Non catégorisée";
          rows.set(category, (rows.get(category) ?? 0) + Number(row.amount));
          return rows;
        }, new Map<string, number>()),
      ]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      const periodQuotes = data.devis.filter((row) =>
        isPeriod(row.created_at, targetMonth, targetYear),
      );
      const quoteAmounts = periodQuotes.reduce(
        (amounts, quote) => {
          amounts[quoteBucket(quote.status)] += Number(quote.total);
          return amounts;
        },
        { accepted: 0, pending: 0, rejected: 0 },
      );
      const totalRevenue = productRevenue + serviceRevenue;
      return {
        sales,
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

    const target = calculate(month, year);
    const previous = month === 1 ? calculate(12, year - 1) : calculate(month - 1, year);
    const compare = (value: number, oldValue: number) => ({
      diff: value - oldValue,
      pct: oldValue === 0 ? 0 : ((value - oldValue) / oldValue) * 100,
    });
    const yearlyEvolution = [
      {
        name: MONTHS[month - 1],
        produits: target.productRevenue,
        services: target.serviceRevenue,
      },
    ];
    return {
      target,
      compare: {
        totalRevenue: compare(target.totalRevenue, previous.totalRevenue),
        productRevenue: compare(target.productRevenue, previous.productRevenue),
        serviceRevenue: compare(target.serviceRevenue, previous.serviceRevenue),
        purchases: compare(target.purchases, previous.purchases),
        expenses: compare(target.expenses, previous.expenses),
        grossMargin: compare(target.grossMargin, previous.grossMargin),
        netResult: compare(target.netResult, previous.netResult),
        quoteCount: compare(target.quoteCount, previous.quoteCount),
      },
      yearlyEvolution,
      products: salesFilter === "service" ? [] : buildPerformance(target.sales, "product"),
      services: salesFilter === "product" ? [] : buildPerformance(target.sales, "service"),
    };
  }, [data, month, salesFilter, year]);

  const years = useMemo(() => {
    const dates = data
      ? [
          ...data.ventes.map((row) => row.created_at),
          ...data.depenses.map((row) => row.paid_at),
          ...data.achats.map((row) => row.created_at),
          ...data.devis.map((row) => row.created_at),
        ]
      : [];
    const validYears = dates
      .map((date) => new Date(date).getFullYear())
      .filter((value) => Number.isFinite(value) && value <= currentYear);
    const firstYear = validYears.length > 0 ? Math.min(...validYears) : currentYear;
    return Array.from({ length: currentYear - firstYear + 1 }, (_, index) => currentYear - index);
  }, [currentYear, data]);

  const exportPDF = async () => {
    if (!report) return;
    const doc = new jsPDF();
    const tenant = tenantFromSettings(settings, logoUrl);
    const period = `${new Date(year, month - 1).toLocaleString("fr-FR", { month: "long" })} ${year}`;
    const startY = await renderPdfHeader(doc, tenant, "Rapport financier", [
      { label: "Période", value: period },
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
    ]);
    const rows = [
      ["CA total", formatCurrency(report.target.totalRevenue)],
      ["CA produits", formatCurrency(report.target.productRevenue)],
      ["CA services", formatCurrency(report.target.serviceRevenue)],
      [
        "Part Produits / Services",
        report.target.totalRevenue > 0
          ? `${((report.target.productRevenue / report.target.totalRevenue) * 100).toFixed(1)} % / ${((report.target.serviceRevenue / report.target.totalRevenue) * 100).toFixed(1)} %`
          : "0,0 % / 0,0 %",
      ],
      ["Achats", formatCurrency(report.target.purchases)],
      ["Dépenses", formatCurrency(report.target.expenses)],
      ["Marge brute produits", formatCurrency(report.target.grossMargin)],
      ["Nombre de devis", String(report.target.quoteCount)],
      ["Devis acceptés", formatCurrency(report.target.quoteAmounts.accepted)],
      ["Devis en attente", formatCurrency(report.target.quoteAmounts.pending)],
      ["Devis refusés", formatCurrency(report.target.quoteAmounts.rejected)],
    ];
    let finalY = renderPdfTable(doc, ["Indicateur", "Valeur"], rows, startY, {
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    });
    finalY = renderPdfTable(
      doc,
      ["Catégorie de dépense", "Montant"],
      report.target.expenseCategories.map((row) => [row.category, formatCurrency(row.amount)]),
      finalY + 8,
      { columnStyles: { 1: { halign: "right" } } },
    );
    finalY = renderPdfTable(
      doc,
      ["Meilleurs produits", "Qté", "CA", "Marge"],
      report.products.map((row) => [
        row.name,
        String(row.quantity),
        formatCurrency(row.revenue),
        formatCurrency(row.margin),
      ]),
      finalY + 8,
    );
    finalY = renderPdfTable(
      doc,
      ["Meilleurs services", "Qté", "CA"],
      report.services.map((row) => [row.name, String(row.quantity), formatCurrency(row.revenue)]),
      finalY + 8,
    );
    renderPdfTotalCard(doc, "Résultat net", formatCurrency(report.target.netResult), finalY + 7);
    renderPdfFooter(doc, tenant);
    await downloadPdf(doc, `Rapport_${companyName || "Entreprise"}_${month}_${year}.pdf`);
    toast.success("Export PDF terminé.");
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["KPI", "Valeur"],
      ["CA total", report.target.totalRevenue],
      ["CA produits", report.target.productRevenue],
      ["CA services", report.target.serviceRevenue],
      ["Achats", report.target.purchases],
      ["Dépenses", report.target.expenses],
      ["Marge brute produits", report.target.grossMargin],
      ["Résultat net", report.target.netResult],
      ["Nombre de devis", report.target.quoteCount],
      ["Devis acceptés", report.target.quoteAmounts.accepted],
      ["Devis en attente", report.target.quoteAmounts.pending],
      ["Devis refusés", report.target.quoteAmounts.rejected],
      [],
      ["Dépenses par catégorie", "Montant"],
      ...report.target.expenseCategories.map((row) => [row.category, row.amount]),
      [],
      ["Meilleurs produits", "Quantité", "CA", "Coût", "Marge"],
      ...report.products.map((row) => [row.name, row.quantity, row.revenue, row.cost, row.margin]),
      [],
      ["Meilleurs services", "Quantité", "CA"],
      ...report.services.map((row) => [row.name, row.quantity, row.revenue]),
    ];
    const blob = new Blob(["\ufeff" + rows.map((row) => row.join(";")).join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rapport_${month}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV terminé.");
  };

  return (
    <AppShell title="Rapports" subtitle="Produits, services, achats et dépenses">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
            <SelectTrigger className="w-full rounded-xl sm:w-[170px]">
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
            <SelectTrigger className="w-full rounded-xl sm:w-[150px]">
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
          <Select
            value={salesFilter}
            onValueChange={(value) => setSalesFilter(value as SalesFilter)}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les ventes</SelectItem>
              <SelectItem value="product">Produits</SelectItem>
              <SelectItem value="service">Services</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Download className="h-4 w-4" /> Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void exportPDF()}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>CSV (Excel)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement des données réelles…</div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          Impossible de charger le rapport : {error.message}
        </div>
      ) : !report ? (
        <div className="text-muted-foreground">Aucune donnée disponible.</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="CA total"
              value={report.target.totalRevenue}
              compare={report.compare.totalRevenue}
              icon={Wallet}
              tone="blue"
            />
            <StatCard
              label="CA produits"
              value={report.target.productRevenue}
              compare={report.compare.productRevenue}
              icon={Package}
              tone="blue"
            />
            <StatCard
              label="CA services"
              value={report.target.serviceRevenue}
              compare={report.compare.serviceRevenue}
              icon={Wrench}
              tone="green"
            />
            <StatCard
              label="Achats"
              value={report.target.purchases}
              compare={report.compare.purchases}
              icon={ShoppingCart}
              tone="amber"
            />
            <StatCard
              label="Dépenses"
              value={report.target.expenses}
              compare={report.compare.expenses}
              icon={Receipt}
              tone="red"
            />
            <StatCard
              label="Marge brute produits"
              value={report.target.grossMargin}
              compare={report.compare.grossMargin}
              icon={BarChart3}
              tone="blue"
            />
            <StatCard
              label="Résultat net"
              value={report.target.netResult}
              compare={report.compare.netResult}
              icon={TrendingUp}
              tone="green"
            />
            <StatCard
              label="Nombre de devis"
              value={report.target.quoteCount}
              compare={report.compare.quoteCount}
              icon={FileText}
              tone="slate"
              currency={false}
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
            <Panel title={`CA filtré — ${MONTHS[month - 1]} ${year}`} className="xl:col-span-2">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.yearlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      name="Produits"
                      type="monotone"
                      dataKey="produits"
                      stroke={PRODUCT_COLOR}
                      strokeWidth={3}
                      dot={{ r: 5 }}
                    />
                    <Line
                      name="Services"
                      type="monotone"
                      dataKey="services"
                      stroke={SERVICE_COLOR}
                      strokeWidth={3}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Répartition du CA Produits vs Services">
              <div className="h-[320px]">
                {report.target.totalRevenue === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Aucun chiffre d’affaires sur la période.
                  </div>
                ) : (
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
                      >
                        <Cell fill={PRODUCT_COLOR} />
                        <Cell fill={SERVICE_COLOR} />
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PerformanceTable title="Performances produits" rows={report.products} type="product" />
            <PerformanceTable title="Performances services" rows={report.services} type="service" />
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
        </div>
      )}
    </AppShell>
  );
}

function AmountCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
    <section
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
    >
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </section>
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

function StatCard({
  label,
  value,
  compare,
  icon: Icon,
  tone,
  currency = true,
}: {
  label: string;
  value: number;
  compare: { diff: number; pct: number };
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "red" | "slate";
  currency?: boolean;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`text-xs font-medium ${compare.diff >= 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          {compare.diff >= 0 ? "+" : ""}
          {compare.pct.toFixed(1)} %
        </span>
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {currency ? formatCurrency(value) : value.toLocaleString("fr-FR")}
      </div>
    </motion.div>
  );
}
