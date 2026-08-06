import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
  ShoppingBag,
  Receipt,
  Clock,
  LogIn,
  MoreHorizontal,
  AlertTriangle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { DashboardSecondaryCard } from "@/components/mms/dashboard/DashboardSecondaryCard";
import { DashboardEmptyState } from "@/components/mms/dashboard/DashboardEmptyState";
// TODO: Réactiver la recherche globale plus tard
// import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/mms/format";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4", "#6366f1"];

function Dashboard() {
  const { data, isLoading, error } = useDashboardData();
  const modulesQuery = useTenantModules();
  const catalogSettingsQuery = useCatalogSettings();
  const catalogSettings = catalogSettingsQuery.data;
  const catalogMode = catalogSettings?.catalog_mode;
  const canViewClients = modulesQuery.data?.has("customers") ?? false;
  const canViewFournisseurs = modulesQuery.data?.has("suppliers") ?? false;
  const canViewDevis = modulesQuery.data?.has("quotes") ?? false;
  // TODO: Réactiver la recherche globale plus tard
  // const [searchOpen, setSearchOpen] = useState(false);

  // useEffect(() => {
  //   const handler = (e: KeyboardEvent) => {
  //     if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
  //       e.preventDefault();
  //       setSearchOpen((o) => !o);
  //     }
  //   };
  //   window.addEventListener("keydown", handler);
  //   return () => window.removeEventListener("keydown", handler);
  // }, []);

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
    { title: "Nouvelle vente", icon: ShoppingCart, route: "/ventes" },
    { title: "Nouveau devis", icon: FileText, route: "/devis" },
    { title: "Nouveau client", icon: UserPlus, route: "/clients" },
    ...(catalogSettings?.suppliers_enabled ? [{ title: "Nouveau fournisseur", icon: Building2, route: "/fournisseurs" }] : []),
    ...(catalogSettings?.purchases_enabled ? [{ title: "Nouvel achat", icon: ShoppingBag, route: "/achats" }] : []),
    { title: "Nouvelle dépense", icon: CreditCard, route: "/depenses" },
    { title: catalogMode === "products" ? "Nouveau produit" : catalogMode === "services" ? "Nouveau service" : "Nouvel article", icon: Wrench, route: "/services" },
    { title: "Rapports", icon: BarChart3, route: "/rapports" },
    { title: "Paramètres", icon: Settings, route: "/parametres" },
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
    <AppShell title="Dashboard" contentClassName="bg-[#F8FAFC] dark:bg-background">
      {/* TODO: Réactiver la recherche globale plus tard */}
      {/* <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} /> */}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-8 pb-4"
      >
        {/* Welcome card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {isLoading || catalogSettingsQuery.isLoading || !data?.session ? (
            <div
              className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-muted"
              aria-label="Chargement du message d’accueil"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {greeting}, {data.session.displayName} 👋
            </h1>
          )}
          <p className="text-sm text-muted-foreground capitalize mt-1">{today}</p>
        </div>

        {/* Actions Rapides */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {primaryActions.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <Link
                  to={action.route}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all h-full"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.title}</span>
                </Link>
              </motion.div>
            ))}
            {overflowActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: primaryActions.length * 0.02 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all h-full w-full"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <MoreHorizontal className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-center">Plus</span>
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {overflowActions.map((action) => (
                    <DropdownMenuItem key={action.title} asChild>
                      <Link to={action.route} className="flex items-center gap-2">
                        <action.icon className="h-4 w-4" />
                        {action.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* TODO: Réactiver la recherche globale plus tard */}
            {/* <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: quickActions.length * 0.02 }}
              onClick={() => setSearchOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all h-full"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-center">Recherche globale</span>
            </motion.button> */}
          </div>
        </div>

        {/* KPI Premium */}
        {isLoading || catalogSettingsQuery.isLoading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Card key={i} className="h-20 rounded-2xl" />
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
              <Card key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : noDataAtAll ? (
          <Card className="rounded-2xl">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6 rounded-2xl lg:col-span-2">
                <h3 className="font-bold mb-4">Évolution du chiffre d'affaires</h3>
                {data.counts.ventes === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={Wallet}
                    title="Aucune vente enregistrée"
                    actionLabel="Créer une première vente"
                    actionRoute="/ventes"
                  />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthlySeries}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
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

              <Card className="p-6 rounded-2xl">
                <h3 className="font-bold mb-4">Répartition des ventes</h3>
                {data.ventesByMethod.length === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={ShoppingCart}
                    title="Aucune vente enregistrée"
                    actionLabel="Créer une première vente"
                    actionRoute="/ventes"
                  />
                ) : (
                  <div className="h-64">
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
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className="p-6 rounded-2xl">
                <h3 className="font-bold mb-4">Dépenses vs Revenus</h3>
                {data.counts.depenses === 0 && data.counts.ventes === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={TrendingUp}
                    title="Aucune donnée financière"
                    actionLabel="Ajouter une dépense"
                    actionRoute="/depenses"
                  />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlySeries}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
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

              <Card className="p-6 rounded-2xl">
                <h3 className="font-bold mb-4">Répartition des dépenses</h3>
                {data.depensesByCategory.length === 0 ? (
                  <DashboardEmptyState
                    compact
                    icon={Receipt}
                    title="Aucune dépense enregistrée"
                    actionLabel="Ajouter une dépense"
                    actionRoute="/depenses"
                  />
                ) : (
                  <div className="h-64">
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
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className="p-6 rounded-2xl">
                <h3 className="font-bold mb-4">Évolution mensuelle</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlySeries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6 rounded-2xl lg:col-span-2">
                <h3 className="font-bold mb-4">Activité récente</h3>
                <Tabs defaultValue="journal">
                  <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="journal">Journal</TabsTrigger>
                    <TabsTrigger value="ventes">Ventes</TabsTrigger>
                    <TabsTrigger value="achats">Achats</TabsTrigger>
                    <TabsTrigger value="depenses">Dépenses</TabsTrigger>
                    {canViewClients && <TabsTrigger value="clients">Clients</TabsTrigger>}
                    {canViewFournisseurs && <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>}
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
                        {data.activity.map((item) => (
                          <li key={item.id}>
                            <a
                              href={item.route}
                              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.subtitle} · {formatDate(item.date)}
                                </p>
                              </div>
                              {item.amount !== undefined && (
                                <span className="shrink-0 font-semibold text-sm">
                                  {formatCurrency(item.amount)}
                                </span>
                              )}
                            </a>
                          </li>
                        ))}
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

              <div className="space-y-6">
                <Card className="p-6 rounded-2xl">
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
