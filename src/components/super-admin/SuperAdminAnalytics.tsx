import { useMemo, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bug,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
  Eye,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export type AnalyticsEventRow = {
  date: string;
  event_name: string;
  tenant_id: string | null;
  platform_type: string | null;
  module: string | null;
  user_role: string | null;
  distinct_id: string | null;
  pathname: string | null;
  count: number;
};

export type AnalyticsErrorRow = {
  date: string;
  message: string;
  pathname: string | null;
  module: string | null;
  tenant_id: string | null;
  count: number;
};

export type AnalyticsSessionRow = {
  session_id: string;
  duration_seconds: number | null;
  distinct_id: string | null;
  tenant_id: string | null;
  platform_type: string | null;
  started_at: string | null;
  replay_url: string | null;
};

export type AnalyticsOverview = {
  active_users: number;
  active_tenants: number;
  total_events: number;
  frontend_errors: number;
  sales_completed: number;
  invoice_created: number;
  hotel_reservation_created: number;
};

export type FunnelRow = {
  name: string;
  steps: { event_name: string; count: number }[];
  conversion: number;
};

export type FeatureFlagRow = {
  key: string;
  name: string;
  enabled: boolean;
  description?: string | null;
};

export type SuperAdminAnalyticsPayload = {
  generated_at: string;
  filters: {
    period: "today" | "7d" | "30d" | "custom";
    tenant_id: string | null;
    platform_type: "ERP" | "HOTEL" | "ALL";
    module: string | null;
    user_role: string | null;
    event_name: string | null;
    date_from: string | null;
    date_to: string | null;
  };
  overview: AnalyticsOverview;
  daily_events: { date: string; events: number }[];
  erp_events: { event_name: string; count: number }[];
  hotel_events: { event_name: string; count: number }[];
  quality: {
    frontend_errors: number;
    sessions_with_errors: number;
    recent_errors: AnalyticsErrorRow[];
  };
  recent_events: AnalyticsEventRow[];
  sessions: AnalyticsSessionRow[];
  funnels: FunnelRow[];
  feature_flags: FeatureFlagRow[];
  tenant_activity: { tenant_id: string; events: number }[];
};

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border-border/60 bg-background/80 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString("fr-FR")}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function SuperAdminAnalyticsView({
  data,
  loading,
  error,
  onRetry,
  onRefresh,
  filters,
  onFiltersChange,
}: {
  data: SuperAdminAnalyticsPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh: () => void;
  filters: SuperAdminAnalyticsPayload["filters"];
  onFiltersChange: (next: Partial<SuperAdminAnalyticsPayload["filters"]>) => void;
}) {
  const dailyEvents = useMemo(() => data?.daily_events ?? [], [data?.daily_events]);
  const eventBars = useMemo(() => data?.erp_events ?? [], [data?.erp_events]);
  const hotelBars = useMemo(() => data?.hotel_events ?? [], [data?.hotel_events]);

  if (loading && !data) return <SuperAdminAnalyticsSkeleton />;

  if (error && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-xl rounded-2xl">
          <CardContent className="space-y-4 p-6 text-center">
            <AlertCircle className="mx-auto size-10 text-destructive" />
            <div>
              <h1 className="text-xl font-semibold">Analytics indisponibles</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={onRetry}>Ressayer</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-xl rounded-2xl">
          <CardContent className="space-y-4 p-6 text-center">
            <BarChart3 className="mx-auto size-10 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">Aucune donnée disponible</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                PostHog ne renvoie pas encore de données pour cette période.
              </p>
            </div>
            <Button variant="outline" onClick={onRefresh}>
              Actualiser
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-4 sm:p-6 xl:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics SAOVIA</h1>
          <p className="text-sm text-muted-foreground">
            Centre de pilotage PostHog sécurisé pour les super administrateurs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            Accès super admin
          </span>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCcw className="mr-2 size-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-2xl border-amber-300/50 bg-amber-50/60">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-950">
            <TriangleAlert className="size-4" />
            <span>{error}</span>
            <Button variant="ghost" className="ml-auto" onClick={onRetry}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-border/60 bg-background/80">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-3 xl:grid-cols-7">
          <div className="space-y-2">
            <Label>Période</Label>
            <Select value={filters.period} onValueChange={(value) => onFiltersChange({ period: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="custom">Personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>tenant_id</Label>
            <Input value={filters.tenant_id ?? ""} onChange={(e) => onFiltersChange({ tenant_id: e.target.value || null })} placeholder="uuid tenant" />
          </div>
          <div className="space-y-2">
            <Label>platform_type</Label>
            <Select value={filters.platform_type} onValueChange={(value) => onFiltersChange({ platform_type: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="ERP">ERP</SelectItem>
                <SelectItem value="HOTEL">HOTEL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>module</Label>
            <Input value={filters.module ?? ""} onChange={(e) => onFiltersChange({ module: e.target.value || null })} placeholder="hotel / ventes" />
          </div>
          <div className="space-y-2">
            <Label>user_role</Label>
            <Input value={filters.user_role ?? ""} onChange={(e) => onFiltersChange({ user_role: e.target.value || null })} placeholder="Rôle utilisateur" />
          </div>
          <div className="space-y-2">
            <Label>event_name</Label>
            <Input value={filters.event_name ?? ""} onChange={(e) => onFiltersChange({ event_name: e.target.value || null })} placeholder="event_name" />
          </div>
          <div className="space-y-2">
            <Label>date_from</Label>
            <Input type="date" value={filters.date_from ?? ""} onChange={(e) => onFiltersChange({ date_from: e.target.value || null })} />
          </div>
          <div className="space-y-2">
            <Label>date_to</Label>
            <Input type="date" value={filters.date_to ?? ""} onChange={(e) => onFiltersChange({ date_to: e.target.value || null })} />
          </div>
          <div className="flex items-end gap-2 lg:col-span-3 xl:col-span-7">
            <Button variant="outline" onClick={() => onFiltersChange({ period: "30d", tenant_id: null, platform_type: "ALL", module: null, user_role: null, event_name: null, date_from: null, date_to: null })}>
              Réinitialiser les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {filters.tenant_id ? <Badge text={`tenant_id: ${filters.tenant_id}`} /> : null}
        {filters.platform_type !== "ALL" ? <Badge text={`platform_type: ${filters.platform_type}`} /> : null}
        {filters.module ? <Badge text={`module: ${filters.module}`} /> : null}
        {filters.user_role ? <Badge text={`user_role: ${filters.user_role}`} /> : null}
        {filters.event_name ? <Badge text={`event_name: ${filters.event_name}`} /> : null}
        {filters.date_from ? <Badge text={`from: ${filters.date_from}`} /> : null}
        {filters.date_to ? <Badge text={`to: ${filters.date_to}`} /> : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Utilisateurs actifs" value={data.overview.active_users} icon={Users} />
        <MetricCard label="Tenants actifs" value={data.overview.active_tenants} icon={Database} />
        <MetricCard label="Événements" value={data.overview.total_events} icon={Sparkles} />
        <MetricCard label="Erreurs frontend" value={data.overview.frontend_errors} icon={Bug} />
        <MetricCard label="Ventes terminées" value={data.overview.sales_completed} icon={CheckCircle2} />
        <MetricCard label="Factures créées" value={data.overview.invoice_created} icon={BarChart3} />
        <MetricCard label="Réservations Hôtel" value={data.overview.hotel_reservation_created} icon={CalendarRange} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Évolution des événements" subtitle="Volume quotidien sur la période sélectionnée." />
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={12} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Qualité" subtitle="Erreurs frontend et sessions touchées." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Sessions avec erreurs" value={data.quality.sessions_with_errors} icon={ShieldAlert} />
              <MetricCard label="Dernières erreurs" value={data.quality.recent_errors.length} icon={TriangleAlert} />
            </div>
            <div className="rounded-xl border">
              <div className="grid grid-cols-4 gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Date</span>
                <span className="col-span-2">Message</span>
                <span>Tenant</span>
              </div>
              <div className="max-h-48 divide-y overflow-auto">
                {data.quality.recent_errors.length ? (
                  data.quality.recent_errors.map((row, index) => (
                    <div key={`${row.date}-${index}`} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                      <span>{row.date}</span>
                      <span className="col-span-2 truncate">{row.message}</span>
                      <span className="truncate">{row.tenant_id ?? "—"}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Aucune erreur frontend sur la période.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Événements ERP" subtitle="quote, invoice et sale." />
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event_name" tick={false} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Événements Hôtel" subtitle="Réservations, check-in, paiement et facture." />
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hotelBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="event_name" tick={false} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Funnels" subtitle="Conversion par étapes." />
          </CardHeader>
          <CardContent className="space-y-4">
            {data.funnels.map((funnel) => (
              <div key={funnel.name} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{funnel.name}</p>
                    <p className="text-xs text-muted-foreground">Conversion {Math.round(funnel.conversion)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {funnel.steps.map((step) => (
                    <div key={step.event_name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                      <span className="truncate">{step.event_name}</span>
                      <span className="font-medium tabular-nums">{step.count.toLocaleString("fr-FR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Flags préparés" subtitle="Lecture seule, sans action destructive." />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.feature_flags.length ? (
              data.feature_flags.map((flag) => (
                <div key={flag.key} className="flex items-center justify-between rounded-xl border px-4 py-3">
                  <div>
                    <p className="font-medium">{flag.name}</p>
                    <p className="text-xs text-muted-foreground">{flag.key}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${flag.enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {flag.enabled ? "Activé" : "Désactivé"}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucun feature flag exposé pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Événements récents" subtitle="Filtrés par tenant, plateforme, module et événement." />
          </CardHeader>
          <CardContent className="overflow-hidden p-0">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Événement</th>
                    <th className="px-4 py-3 text-left">Tenant</th>
                    <th className="px-4 py-3 text-left">Plateforme</th>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3 text-left">Utilisateur</th>
                    <th className="px-4 py-3 text-left">Pathname</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent_events.length ? (
                    data.recent_events.map((row, index) => (
                      <tr key={`${row.event_name}-${row.date}-${index}`}>
                        <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-3">{row.event_name}</td>
                        <td className="px-4 py-3">{row.tenant_id ?? "—"}</td>
                        <td className="px-4 py-3">{row.platform_type ?? "—"}</td>
                        <td className="px-4 py-3">{row.module ?? "—"}</td>
                        <td className="px-4 py-3">{row.user_role ?? "—"}</td>
                        <td className="px-4 py-3 max-w-48 truncate">{row.pathname ?? "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                        Aucun événement récent.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Session Replay" subtitle="Sessions récentes disponibles pour le Super Admin." />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sessions.length ? (
              data.sessions.map((session) => (
                <div key={session.session_id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">Session {session.session_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.started_at ?? "Date inconnue"} · {session.duration_seconds ?? 0}s
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.distinct_id ?? "distinct_id inconnu"} · {session.platform_type ?? "—"} · {session.tenant_id ?? "—"}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" disabled={!session.replay_url}>
                      <a href={session.replay_url ?? "#"} target="_blank" rel="noreferrer">
                        <Eye className="mr-2 size-4" />
                        Replay
                        <ArrowUpRight className="ml-2 size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune session disponible.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Activité par tenant" subtitle="Aide à repérer les tenants les plus actifs." />
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tenant_activity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tenant_id" tick={false} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <SectionTitle title="Résumé" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>PostHog reste la source de vérité pour les analytics. Aucun secret privé n’est exposé au frontend.</p>
            <p>Les calculs de synthèse sont préparés côté serveur / Edge Function et les données sont limitées à des agrégats.</p>
            <p>La page est protégée par le contrôle Super Admin avant chargement des données.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">{text}</span>;
}

export function SuperAdminAnalyticsSkeleton() {
  return (
    <main className="space-y-6 p-4 sm:p-6 xl:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </main>
  );
}
