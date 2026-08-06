import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Truck,
  Wrench,
  FileText,
  Plus,
  UserPlus,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  Bot,
  Search,
  Command,
  ShoppingBag,
  Receipt,
  Clock,
  LogIn,
  MoreHorizontal,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AppShell } from "@/components/mms/AppShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { DashboardSecondaryCard } from "@/components/mms/dashboard/DashboardSecondaryCard";
import { DashboardEmptyState } from "@/components/mms/dashboard/DashboardEmptyState";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { ActivityItem } from "@/hooks/use-dashboard-data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/mms/format";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4", "#6366f1"];

const CHART_CARD_CLASS = "rounded-[24px] dark:bg-[#151B2F] dark:border-white/5";

const CHART_TOOLTIP_STYLE = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};
const CHART_TOOLTIP_ITEM_STYLE = { fontSize: 12, padding: 0 };
const CHART_TOOLTIP_LABEL_STYLE = { fontSize: 12, fontWeight: 600, marginBottom: 2 };
const CHART_LEGEND_STYLE = { fontSize: 11 };

type ActionColor = "blue" | "indigo" | "emerald" | "violet" | "amber" | "sky" | "rose" | "slate";

const ACTION_COLOR_CLASSES: Record<ActionColor, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const ACTIVITY_ICON: Record<
  ActivityItem["type"],
  { icon: LucideIcon; className: string; textClassName: string }
> = {
  vente: {
    icon: ShoppingCart,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    textClassName: "text-emerald-600 dark:text-emerald-400",
  },
  achat: {
    icon: Package,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    textClassName: "text-amber-600 dark:text-amber-400",
  },
  depense: {
    icon: Receipt,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    textClassName: "text-rose-600 dark:text-rose-400",
  },
  client: {
    icon: Users,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    textClassName: "text-sky-600 dark:text-sky-400",
  },
  fournisseur: {
    icon: Truck,
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    textClassName: "text-violet-600 dark:text-violet-400",
  },
};

function Dashboard() {
  const { data, isLoading, error } = useDashboardData();
  const modulesQuery = useTenantModules();
  const catalogSettingsQuery = useCatalogSettings();
  const catalogSettings = catalogSettingsQuery.data;
  const catalogMode = catalogSettings?.catalog_mode;
  const canViewClients = modulesQuery.data?.has("customers") ?? false;
  const canViewFournisseurs = modulesQuery.data?.has("suppliers") ?? false;
  const canViewDevis = modulesQuery.data?.has("quotes") ?? false;
  const [searchOpen, setSearchOpen] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

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

  const quickActions = [
    { title: "Nouvelle vente", icon: ShoppingCart, route: "/ventes", color: "blue" as ActionColor },
    { title: "Nouveau devis", icon: FileText, route: "/devis", color: "indigo" as ActionColor },
    { title: "Nouveau client", icon: UserPlus, route: "/clients", color: "emerald" as ActionColor },
    ...(catalogSettings?.suppliers_enabled ? [{ title: "Nouveau fournisseur", icon: Building2, route: "/fournisseurs", color: "sky" as ActionColor }] : []),
    ...(catalogSettings?.purchases_enabled ? [{ title: "Nouvel achat", icon: ShoppingBag, route: "/achats", color: "amber" as ActionColor }] : []),
    { title: "Nouvelle dépense", icon: CreditCard, route: "/depenses", color: "rose" as ActionColor },
    { title: catalogMode === "products" ? "Nouveau produit" : catalogMode === "services" ? "Nouveau service" : "Nouvel article", icon: Wrench, route: "/services", color: "violet" as ActionColor },
    { title: "Rapports", icon: BarChart3, route: "/rapports", color: "indigo" as ActionColor },
    { title: "Paramètres", icon: Settings, route: "/parametres", color: "slate" as ActionColor },
    // { title: "Assistant IA", icon: Bot, route: "/assistant" },
  ].filter((action) => {
    if (action.route === "/clients") return canViewClients;
    if (action.route === "/fournisseurs") return canViewFournisseurs;
    return true;
  });

  const primaryActionRoutes = ["/ventes", "/devis", "/clients", "/services"];
  const primaryActions = primaryActionRoutes
    .map((route) => quickActions.find((a) => a.route === route))
    .filter((a): a is (typeof quickActions)[number] => Boolean(a));
  const overflowActions = quickActions.filter(
    (a) => !primaryActionRoutes.includes(a.route),
  );

  if (error) {
    return (
      <AppShell title="Dashboard">
        <div className="p-6 text-sm text-destructive">
          Une erreur est survenue lors du chargement du tableau de bord.
        </div>
      </AppShell>
    );
  }

  const noDataAtAll =
    !isLoading &&
    data &&
    data.counts.ventes === 0 &&
    data.counts.achats === 0 &&
    data.counts.depenses === 0 &&
    data.counts.clients === 0 &&
    data.counts.fournisseurs === 0 &&
    data.counts.services === 0;

  return (
    <AppShell title="Dashboard" contentClassName="bg-[#F8FAFC] dark:bg-[#0B1020]">
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5 pb-4 sm:space-y-6"
      >
        {/* Welcome card */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 shadow-lg shadow-indigo-500/20 sm:p-7 dark:shadow-indigo-950/50">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 right-16 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <Sparkles className="pointer-events-none absolute right-6 top-6 h-9 w-9 text-white/25 sm:h-10 sm:w-10" />
          <div className="relative">
            {isLoading || catalogSettingsQuery.isLoading || !data?.session ? (
              <div
                className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-white/20"
                aria-label="Chargement du message d’accueil"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {greeting}, {data.session.displayName} 👋
              </h1>
            )}
            <p className="mt-1.5 text-sm text-white/80 capitalize">{today}</p>

            {isLoading || catalogSettingsQuery.isLoading || !data ? (
              <div className="mt-5 h-14 w-full animate-pulse rounded-2xl bg-white/10" />
            ) : (
              <div className="mt-5 flex divide-x divide-white/15 overflow-hidden rounded-2xl bg-white/10">
                {[
                  { key: "ventes", icon: ShoppingCart, label: "Ventes", value: data.counts.ventes },
                  ...(canViewDevis
                    ? [
                        { key: "devis", icon: FileText, label: "Devis", value: data.secondary.devisCount },
                        {
                          key: "impayees",
                          icon: Wallet,
                          label: "Facture à encaisser",
                          value: data.secondary.facturesImpayeesCount,
                        },
                      ]
                    : []),
                ].map((stat) => (
                  <div key={stat.key} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 sm:px-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-bold text-white">{stat.value}</p>
                      <p className="truncate text-[10px] text-white/75">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recherche */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/50 dark:bg-[#151B2F] dark:border-white/5"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Rechercher un client, un produit, une facture...</span>
          <span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex dark:border-white/10 dark:bg-white/5">
            <Command className="h-3 w-3" /> K
          </span>
        </button>

        {/* Actions Rapides */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Actions rapides</h2>
            {overflowActions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllActions((v) => !v)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showAllActions ? "Réduire" : "Voir tout"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {(showAllActions ? quickActions : primaryActions).map((action, i) => (
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
                  className="flex flex-col items-center gap-1.5 rounded-[20px] border border-border bg-card p-2.5 shadow-sm transition-all hover:border-primary hover:shadow-md h-full sm:rounded-[24px] sm:p-3 dark:bg-[#151B2F] dark:border-white/5"
                >
                  <div
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-xl sm:h-8 sm:w-8",
                      ACTION_COLOR_CLASSES[action.color],
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[10px] font-medium leading-tight sm:text-[11px]">{action.title}</span>
                </Link>
              </motion.div>
            ))}
          </div>
          {!showAllActions && overflowActions.length > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAllActions(true)}
              className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-all hover:border-primary hover:shadow-md dark:bg-[#151B2F] dark:border-white/5"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </div>
              Plus d’actions
            </motion.button>
          )}
        </div>

        {/* KPI Premium */}
        {isLoading || catalogSettingsQuery.isLoading || !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className={cn("h-32", CHART_CARD_CLASS)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <DashboardKpiCard
              index={0}
              title={catalogMode === "products" ? "CA produits" : catalogMode === "services" ? "CA services" : "CA total"}
              value={formatCurrency(catalogMode === "products" ? data.catalogSummary.productRevenue : catalogMode === "services" ? data.catalogSummary.serviceRevenue : data.kpis.revenue.value)}
              icon={Wallet}
              route="/ventes"
              trend={data.kpis.revenue.trend}
              spark={data.kpis.revenue.spark}
              accent="primary"
            />
            {catalogSettings?.purchases_enabled && <DashboardKpiCard
              index={1}
              title="Dépenses"
              value={formatCurrency(data.kpis.depenses.value)}
              icon={Receipt}
              route="/depenses"
              trend={data.kpis.depenses.trend}
              spark={data.kpis.depenses.spark}
              accent="rose"
            />}
            <DashboardKpiCard
              index={2}
              title="Achats"
              value={formatCurrency(data.kpis.achats.value)}
              icon={Package}
              route="/achats"
              trend={data.kpis.achats.trend}
              spark={data.kpis.achats.spark}
              accent="amber"
            />
            <DashboardKpiCard
              index={3}
              title="Bénéfice"
              value={formatCurrency(data.kpis.benefice.value)}
              icon={TrendingUp}
              route="/rapports"
              trend={data.kpis.benefice.trend}
              spark={data.kpis.benefice.spark}
              accent="emerald"
            />
          </div>
        )}

        {/* Cartes secondaires */}
        {isLoading || catalogSettingsQuery.isLoading || !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className={cn("h-20", CHART_CARD_CLASS)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {canViewClients && catalogSettings?.suppliers_enabled && (
              <DashboardSecondaryCard
                index={0}
                title="Clients"
                value={String(data.kpis.clients.value)}
                icon={Users}
                route="/clients"
                accent="sky"
              />
            )}
            {canViewFournisseurs && (
              <DashboardSecondaryCard
                index={1}
                title="Fournisseurs"
                value={String(data.kpis.fournisseurs.value)}
                icon={Truck}
                route="/fournisseurs"
                accent="violet"
              />
            )}
            {canViewDevis && (
              <>
                <DashboardSecondaryCard
                  index={2}
                  title="Devis"
                  value={String(data.secondary.devisCount)}
                  icon={FileText}
                  route="/devis"
                  accent="primary"
                />
                <DashboardSecondaryCard
                  index={3}
                  title="Factures impayées"
                  value={formatCurrency(data.secondary.facturesImpayeesTotal)}
                  icon={AlertTriangle}
                  route="/devis"
                  accent="amber"
                />
              </>
            )}
          </div>
        )}

        {isLoading || !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className={cn("h-72", CHART_CARD_CLASS)} />
            ))}
          </div>
        ) : noDataAtAll ? (
          <Card className={CHART_CARD_CLASS}>
            <DashboardEmptyState
              icon={BarChart3}
              title="Aucune donnée pour le moment"
              description="Vos graphiques et statistiques apparaîtront automatiquement dès que vous enregistrerez vos premières ventes, achats ou dépenses."
              actionLabel="Créer une première vente"
              actionRoute="/ventes"
            />
          </Card>
        ) : (
          <>
            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className={cn("p-4 sm:p-6 lg:col-span-2", CHART_CARD_CLASS)}>
                <h3 className="font-bold mb-3 sm:mb-4">Évolution du chiffre d'affaires</h3>
                {data.counts.ventes === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={Wallet}
                    title="Aucune vente enregistrée"
                    actionLabel="Créer une première vente"
                    actionRoute="/ventes"
                  />
                ) : (
                  <div className="h-52 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthlySeries}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        />
                        <Line
                          type="monotone"
                          dataKey="ca"
                          name="CA"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className={cn("p-4 sm:p-6", CHART_CARD_CLASS)}>
                <h3 className="font-bold mb-3 sm:mb-4">Répartition des ventes</h3>
                {data.ventesByMethod.length === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={ShoppingCart}
                    title="Aucune vente enregistrée"
                    actionLabel="Créer une première vente"
                    actionRoute="/ventes"
                  />
                ) : (
                  <div className="h-52 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.ventesByMethod}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {data.ventesByMethod.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        />
                        <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className={cn("p-4 sm:p-6", CHART_CARD_CLASS)}>
                <h3 className="font-bold mb-3 sm:mb-4">Dépenses vs Revenus</h3>
                {data.counts.depenses === 0 && data.counts.ventes === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={TrendingUp}
                    title="Aucune donnée financière"
                    actionLabel="Ajouter une dépense"
                    actionRoute="/depenses"
                  />
                ) : (
                  <div className="h-52 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlySeries}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        />
                        <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                        <Bar dataKey="ca" name="Revenus" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar
                          dataKey="depenses"
                          name="Dépenses"
                          fill="#f43f5e"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className={cn("p-4 sm:p-6", CHART_CARD_CLASS)}>
                <h3 className="font-bold mb-3 sm:mb-4">Répartition des dépenses</h3>
                {data.depensesByCategory.length === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={Receipt}
                    title="Aucune dépense enregistrée"
                    actionLabel="Ajouter une dépense"
                    actionRoute="/depenses"
                  />
                ) : (
                  <div className="h-52 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.depensesByCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {data.depensesByCategory.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                        />
                        <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className={cn("p-4 sm:p-6", CHART_CARD_CLASS)}>
                <h3 className="font-bold mb-3 sm:mb-4">Évolution mensuelle</h3>
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                      />
                      <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                      <Area
                        type="monotone"
                        dataKey="ca"
                        name="CA"
                        stackId="1"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.25}
                      />
                      <Area
                        type="monotone"
                        dataKey="achats"
                        name="Achats"
                        stackId="2"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.25}
                      />
                      <Area
                        type="monotone"
                        dataKey="depenses"
                        name="Dépenses"
                        stackId="3"
                        stroke="#f43f5e"
                        fill="#f43f5e"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Activité récente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className={cn("p-4 sm:p-6 lg:col-span-2", CHART_CARD_CLASS)}>
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <h3 className="font-bold">Activité récente</h3>
                  <Link to="/journal" className="text-sm font-medium text-primary hover:underline">
                    Voir tout
                  </Link>
                </div>
                <Tabs defaultValue="journal">
                  <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-full bg-muted/60 p-1.5 scrollbar-thin">
                    <TabsTrigger
                      value="journal"
                      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Journal
                    </TabsTrigger>
                    <TabsTrigger
                      value="ventes"
                      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Ventes
                    </TabsTrigger>
                    <TabsTrigger
                      value="achats"
                      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Achats
                    </TabsTrigger>
                    <TabsTrigger
                      value="depenses"
                      className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Dépenses
                    </TabsTrigger>
                    {canViewClients && (
                      <TabsTrigger
                        value="clients"
                        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                      >
                        Clients
                      </TabsTrigger>
                    )}
                    {canViewFournisseurs && (
                      <TabsTrigger
                        value="fournisseurs"
                        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                      >
                        Fournisseurs
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="journal">
                    {data.activity.length === 0 ? (
                      <DashboardEmptyState
                        compact
                        icon={Clock}
                        title="Aucune activité pour le moment"
                        description="Toutes vos actions récentes apparaîtront ici."
                      />
                    ) : (
                      <ul className="divide-y divide-border">
                        {data.activity.map((item) => {
                          const activityStyle = ACTIVITY_ICON[item.type];
                          return (
                            <li key={item.id}>
                              <a
                                href={item.route}
                                className="flex items-center gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                              >
                                <div
                                  className={cn(
                                    "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                                    activityStyle.className,
                                  )}
                                >
                                  <activityStyle.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{item.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.subtitle} · {formatDate(item.date)}
                                  </p>
                                </div>
                                {item.amount !== undefined && (
                                  <span className={cn("shrink-0 font-semibold text-sm", activityStyle.textClassName)}>
                                    {formatCurrency(item.amount)}
                                  </span>
                                )}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="ventes">
                    {data.lists.ventes.length === 0 ? (
                      <DashboardEmptyState
                        compact
                        icon={ShoppingCart}
                        title="Aucune vente enregistrée"
                        actionLabel="Créer une première vente"
                        actionRoute="/ventes"
                      />
                    ) : (
                      <ul className="divide-y divide-border">
                        {data.lists.ventes.map((v) => (
                          <li key={v.id}>
                            <Link
                              to="/ventes"
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {v.client_name || "Client comptant"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(v.created_at)}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-sm">
                                {formatCurrency(Number(v.total))}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="achats">
                    {data.lists.achats.length === 0 ? (
                      <DashboardEmptyState
                        compact
                        icon={Package}
                        title="Aucun achat enregistré"
                        actionLabel="Créer un premier achat"
                        actionRoute="/achats"
                      />
                    ) : (
                      <ul className="divide-y divide-border">
                        {data.lists.achats.map((a) => (
                          <li key={a.id}>
                            <Link
                              to="/achats"
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {a.fournisseur_name || "Fournisseur"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(a.created_at)}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-sm">
                                {formatCurrency(Number(a.total))}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="depenses">
                    {data.lists.depenses.length === 0 ? (
                      <DashboardEmptyState
                        compact
                        icon={Receipt}
                        title="Aucune dépense enregistrée"
                        actionLabel="Ajouter une dépense"
                        actionRoute="/depenses"
                      />
                    ) : (
                      <ul className="divide-y divide-border">
                        {data.lists.depenses.map((d) => (
                          <li key={d.id}>
                            <Link
                              to="/depenses"
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {d.description || d.category}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(d.paid_at)}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-sm">
                                {formatCurrency(Number(d.amount))}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  {canViewClients && (
                    <TabsContent value="clients">
                      {data.lists.clients.length === 0 ? (
                        <DashboardEmptyState
                          compact
                          icon={Users}
                          title="Aucun client enregistré"
                          actionLabel="Ajouter un client"
                          actionRoute="/clients"
                        />
                      ) : (
                        <ul className="divide-y divide-border">
                          {data.lists.clients.map((c) => (
                            <li key={c.id}>
                              <Link
                                to="/clients"
                                className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                              >
                                <p className="font-medium truncate">{c.name}</p>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {formatDate(c.created_at)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  )}

                  {canViewFournisseurs && (
                    <TabsContent value="fournisseurs">
                      {data.lists.fournisseurs.length === 0 ? (
                        <DashboardEmptyState
                          compact
                          icon={Truck}
                          title="Aucun fournisseur enregistré"
                          actionLabel="Ajouter un fournisseur"
                          actionRoute="/fournisseurs"
                        />
                      ) : (
                        <ul className="divide-y divide-border">
                          {data.lists.fournisseurs.map((f) => (
                            <li key={f.id}>
                              <Link
                                to="/fournisseurs"
                                className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                              >
                                <p className="font-medium truncate">{f.name}</p>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {formatDate(f.created_at)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </Card>

              <div className="space-y-4 sm:space-y-6">
                <Card className={cn("p-4 sm:p-6", CHART_CARD_CLASS)}>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-primary" /> Session
                  </h3>
                  {data.session ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Connecté en tant que</span>
                        <span className="font-medium truncate max-w-[160px]">
                          {data.session.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Dernière connexion</span>
                        <span className="font-medium">
                          {data.session.lastSignInAt
                            ? formatDateTime(data.session.lastSignInAt)
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune session active.</p>
                  )}
                </Card>

                {/* <Card className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" /> Assistant IA
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Besoin d'une analyse rapide de votre activité ?
                  </p>
                  <Link
                    to="/assistant"
                    className="inline-flex w-full justify-center items-center gap-2 bg-primary text-primary-foreground p-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> Interroger l'IA
                  </Link>
                </Card> */}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AppShell>
  );
}

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});
