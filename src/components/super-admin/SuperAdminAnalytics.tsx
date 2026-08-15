import { useMemo, useState, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bug,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  LogIn,
  LogOut,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { getEventLabel } from "@/lib/analytics/event-labels";
import { cn } from "@/lib/utils";

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
  person_label: string | null;
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

export type AnalyticsFilters = {
  period: "today" | "7d" | "30d" | "custom";
  tenant_id: string | null;
  platform_type: "ERP" | "HOTEL" | "ALL";
  module: string | null;
  user_role: string | null;
  event_name: string | null;
  date_from: string | null;
  date_to: string | null;
};

export type SuperAdminAnalyticsPayload = {
  generated_at: string;
  filters: AnalyticsFilters;
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

export type AnalyticsTenantOption = {
  id: string;
  name: string;
  platform_type: string | null;
};

const PLATFORM_LABEL: Record<AnalyticsFilters["platform_type"], string> = {
  ALL: "Toutes plateformes",
  ERP: "ERP",
  HOTEL: "Hôtel",
};

function eventCount(events: { event_name: string; count: number }[], name: string) {
  return events.find((row) => row.event_name === name)?.count ?? 0;
}

function tenantLabel(tenantId: string | null, tenantsById: Map<string, string>) {
  if (!tenantId) return "—";
  return tenantsById.get(tenantId) ?? tenantId;
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const timePart = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m${remaining.toString().padStart(2, "0")}s`;
}

/** Never surfaces a raw distinct_id UUID as the primary label — only a short
 *  fallback prefix, so a person without a PostHog name/email doesn't read as
 *  a wall of technical noise. */
function sessionUserDisplay(session: AnalyticsSessionRow): string {
  if (session.person_label) return `Utilisateur : ${session.person_label}`;
  if (session.distinct_id) return `Utilisateur : ${session.distinct_id.slice(0, 8)}…`;
  return "Utilisateur non identifié";
}

export type AnalyticsErrorKind = "unauthorized" | "forbidden" | "outage";

const ERROR_COPY: Record<AnalyticsErrorKind, { title: string; message: string }> = {
  unauthorized: {
    title: "Session expirée",
    message: "Reconnectez-vous pour accéder aux Analytics SAOVIA.",
  },
  forbidden: {
    title: "Accès réservé au Super Administrateur",
    message: "Vous n'avez pas les autorisations nécessaires pour consulter les analytics globaux.",
  },
  outage: {
    title: "Analytics temporairement indisponibles",
    message: "",
  },
};

type Tone = "neutral" | "accent" | "danger";

function toneClasses(tone: Tone) {
  if (tone === "danger") return "text-[var(--analytics-danger)]";
  if (tone === "accent") return "text-[var(--analytics-technical)]";
  return "text-[var(--analytics-accent)]";
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <Card className="h-full rounded-2xl border-border/60 bg-card shadow-sm">
      <CardContent className="flex h-full items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {value.toLocaleString("fr-FR")}
          </p>
        </div>
        <Icon className={cn("size-5 shrink-0", toneClasses(tone))} />
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function FilterBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <span className="truncate max-w-40">{value}</span>
    </span>
  );
}

function MiniBarList({
  rows,
}: {
  rows: { event_name: string; count: number }[];
}) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.count - a.count), [rows]);
  const max = Math.max(1, ...sorted.map((row) => row.count));
  const hasActivity = sorted.some((row) => row.count > 0);

  if (!sorted.length || !hasActivity) {
    return <EmptyState icon={Sparkles} message="Aucun événement correspondant aux filtres." />;
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((row) => (
        <div key={row.event_name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{getEventLabel(row.event_name)}</span>
            <span className="shrink-0 pl-2 font-medium tabular-nums">{row.count.toLocaleString("fr-FR")}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--analytics-accent)]"
              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuperAdminAnalyticsView({
  data,
  loading,
  error,
  errorKind = "outage",
  onRetry,
  onRefresh,
  filters,
  onFiltersChange,
  tenants = [],
}: {
  data: SuperAdminAnalyticsPayload | null;
  loading: boolean;
  error: string | null;
  errorKind?: AnalyticsErrorKind;
  onRetry: () => void;
  onRefresh: () => void;
  filters: AnalyticsFilters;
  onFiltersChange: (next: Partial<AnalyticsFilters>) => void;
  tenants?: AnalyticsTenantOption[];
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const tenantsById = useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const dailyEvents = useMemo(() => data?.daily_events ?? [], [data?.daily_events]);
  const dailyTotal = useMemo(() => dailyEvents.reduce((sum, row) => sum + row.events, 0), [dailyEvents]);
  const dailyPeak = useMemo(
    () => dailyEvents.reduce((max, row) => Math.max(max, row.events), 0),
    [dailyEvents],
  );
  const dailyAverage = dailyEvents.length ? Math.round(dailyTotal / dailyEvents.length) : 0;

  const topTenants = useMemo(
    () => [...(data?.tenant_activity ?? [])].sort((a, b) => b.events - a.events).slice(0, 10),
    [data?.tenant_activity],
  );

  if (loading && !data) return <SuperAdminAnalyticsSkeleton />;

  if (error && !data) {
    const copy = ERROR_COPY[errorKind];
    const message = errorKind === "outage" ? error : copy.message;
    return (
      <main className="analytics-cockpit grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-xl rounded-2xl">
          <CardContent className="space-y-4 p-6 text-center">
            {errorKind === "forbidden" ? (
              <ShieldAlert className="mx-auto size-10 text-destructive" />
            ) : (
              <AlertCircle className="mx-auto size-10 text-destructive" />
            )}
            <div>
              <h1 className="text-xl font-semibold">{copy.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            </div>
            {errorKind === "unauthorized" ? (
              <Button asChild>
                <a href="/login">Se reconnecter</a>
              </Button>
            ) : errorKind === "outage" ? (
              <Button onClick={onRetry}>Réessayer</Button>
            ) : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="analytics-cockpit grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="w-full max-w-xl rounded-2xl">
          <CardContent className="space-y-4 p-6 text-center">
            <Sparkles className="mx-auto size-10 text-muted-foreground" />
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

  const platformType = filters.platform_type;
  const showErp = platformType !== "HOTEL";
  const showHotel = platformType !== "ERP";

  const kpis = buildKpis(data, platformType);
  const funnels = data.funnels.filter((funnel) => {
    if (platformType === "HOTEL") return funnel.name === "Parcours Hôtel";
    if (platformType === "ERP") return funnel.name !== "Parcours Hôtel";
    return true;
  });

  const topTenantsMax = Math.max(1, ...topTenants.map((row) => row.events));

  const sessionsToShow = showAllSessions ? data.sessions.slice(0, 10) : data.sessions.slice(0, 5);
  const lastUpdated = formatDateTime(data.generated_at);

  return (
    <main className="analytics-cockpit space-y-6 bg-muted/20 p-4 sm:p-6 xl:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics SAOVIA</h1>
          <p className="text-sm text-muted-foreground">
            Pilotage de l'utilisation, de la performance métier et de la qualité de la plateforme.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <ShieldAlert className="size-3.5" />
              Accès Super Admin
            </span>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCcw className="mr-2 size-4" />
              Actualiser
            </Button>
          </div>
          {lastUpdated ? (
            <p className="text-xs text-muted-foreground">Dernière actualisation : {lastUpdated}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="rounded-2xl border-[var(--analytics-danger)]/30 bg-[var(--analytics-danger-soft)]">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <TriangleAlert className="size-4 text-[var(--analytics-danger)]" />
            <span>{errorKind === "outage" ? error : ERROR_COPY[errorKind].message}</span>
            {errorKind === "outage" ? (
              <Button variant="ghost" className="ml-auto" onClick={onRetry}>
                Réessayer
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Card className="rounded-2xl border-border/60 bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={filters.period} onValueChange={(value) => onFiltersChange({ period: value as AnalyticsFilters["period"] })}>
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
              <Label>Plateforme</Label>
              <Select value={filters.platform_type} onValueChange={(value) => onFiltersChange({ platform_type: value as AnalyticsFilters["platform_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes plateformes</SelectItem>
                  <SelectItem value="ERP">ERP</SelectItem>
                  <SelectItem value="HOTEL">Hôtel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={filters.tenant_id ?? "__all__"}
                onValueChange={(value) => onFiltersChange({ tenant_id: value === "__all__" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les tenants</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((prev) => !prev)}>
              <SlidersHorizontal className="mr-2 size-3.5" />
              {showAdvanced ? "Moins de filtres" : "Plus de filtres"}
              {showAdvanced ? <ChevronUp className="ml-1.5 size-3.5" /> : <ChevronDown className="ml-1.5 size-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onFiltersChange({
                  period: "30d",
                  tenant_id: null,
                  platform_type: "ALL",
                  module: null,
                  user_role: null,
                  event_name: null,
                  date_from: null,
                  date_to: null,
                })
              }
            >
              Réinitialiser les filtres
            </Button>
          </div>

          {showAdvanced ? (
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="filter-module">Module</Label>
                <Input
                  id="filter-module"
                  value={filters.module ?? ""}
                  onChange={(e) => onFiltersChange({ module: e.target.value || null })}
                  placeholder="Tous les modules"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-role">Rôle</Label>
                <Input
                  id="filter-role"
                  value={filters.user_role ?? ""}
                  onChange={(e) => onFiltersChange({ user_role: e.target.value || null })}
                  placeholder="Tous les rôles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-event">Événement</Label>
                <Input
                  id="filter-event"
                  value={filters.event_name ?? ""}
                  onChange={(e) => onFiltersChange({ event_name: e.target.value || null })}
                  placeholder="Tous les événements"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="filter-from">Du</Label>
                  <Input
                    id="filter-from"
                    type="date"
                    value={filters.date_from ?? ""}
                    onChange={(e) => onFiltersChange({ date_from: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-to">Au</Label>
                  <Input
                    id="filter-to"
                    type="date"
                    value={filters.date_to ?? ""}
                    onChange={(e) => onFiltersChange({ date_to: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {(filters.tenant_id ||
        filters.platform_type !== "ALL" ||
        filters.module ||
        filters.user_role ||
        filters.event_name ||
        filters.date_from ||
        filters.date_to) ? (
        <div className="flex flex-wrap gap-2">
          {filters.tenant_id ? <FilterBadge label="Tenant :" value={tenantLabel(filters.tenant_id, tenantsById)} /> : null}
          {filters.platform_type !== "ALL" ? <FilterBadge label="Plateforme :" value={PLATFORM_LABEL[filters.platform_type]} /> : null}
          {filters.module ? <FilterBadge label="Module :" value={filters.module} /> : null}
          {filters.user_role ? <FilterBadge label="Rôle :" value={filters.user_role} /> : null}
          {filters.event_name ? <FilterBadge label="Événement :" value={filters.event_name} /> : null}
          {filters.date_from ? <FilterBadge label="Du :" value={filters.date_from} /> : null}
          {filters.date_to ? <FilterBadge label="Au :" value={filters.date_to} /> : null}
        </div>
      ) : null}

      {/* Vue d'ensemble */}
      <section className="space-y-4">
        <SectionHeading title="Vue d'ensemble" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <SectionHeading title="Évolution de l'activité" subtitle="Volume quotidien d'événements sur la période sélectionnée." />
            {dailyTotal > 0 ? (
              <div className="flex gap-4 text-right text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total période</p>
                  <p className="font-semibold tabular-nums">{dailyTotal.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Moyenne / jour</p>
                  <p className="font-semibold tabular-nums">{dailyAverage.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pic d'activité</p>
                  <p className="font-semibold tabular-nums">{dailyPeak.toLocaleString("fr-FR")}</p>
                </div>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {dailyTotal > 0 && dailyEvents.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyEvents}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickMargin={12} fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} width={36} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="events"
                      name="Événements"
                      stroke="var(--analytics-accent)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Sparkles} message="Aucune activité pour cette période." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Performance métier */}
      <section className="space-y-4">
        <SectionHeading title="Performance métier" />

        {(showErp || showHotel) ? (
          <div className={cn("grid gap-6", showErp && showHotel ? "xl:grid-cols-2" : "")}>
            {showErp ? (
              <Card className="rounded-2xl">
                <CardHeader>
                  <SectionTitleWithBadge title="Événements ERP" badge="ERP" />
                </CardHeader>
                <CardContent>
                  <MiniBarList rows={data.erp_events} />
                </CardContent>
              </Card>
            ) : null}
            {showHotel ? (
              <Card className="rounded-2xl">
                <CardHeader>
                  <SectionTitleWithBadge title="Événements Hôtel" badge="HOTEL" />
                </CardHeader>
                <CardContent>
                  <MiniBarList rows={data.hotel_events} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Funnels" subtitle="Conversion par étapes du parcours." />
            </CardHeader>
            <CardContent className="space-y-4">
              {funnels.length ? (
                funnels.map((funnel) => <FunnelCard key={funnel.name} funnel={funnel} />)
              ) : (
                <EmptyState icon={ArrowUpRight} message="Pas encore assez de données pour calculer ce parcours." />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Tenants les plus actifs" subtitle="Classement par volume d'événements." />
            </CardHeader>
            <CardContent>
              {topTenants.length ? (
                <div className="space-y-2.5">
                  {topTenants.map((row) => (
                    <div key={row.tenant_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-foreground">{tenantLabel(row.tenant_id, tenantsById)}</span>
                        <span className="shrink-0 pl-2 font-medium tabular-nums">{row.events.toLocaleString("fr-FR")}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--analytics-accent)]"
                          style={{ width: `${Math.round((row.events / topTenantsMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Building2} message="Aucune activité tenant détectée." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Qualité & expérience */}
      <section className="space-y-4">
        <SectionHeading title="Qualité & expérience" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Erreurs & incidents" subtitle="Erreurs frontend détectées sur la période." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Erreurs frontend" value={data.quality.frontend_errors} icon={Bug} tone="danger" />
                <KpiCard label="Sessions avec erreurs" value={data.quality.sessions_with_errors} icon={ShieldAlert} tone="accent" />
              </div>
              {data.quality.recent_errors.length ? (
                <div className="rounded-xl border">
                  <div className="grid grid-cols-4 gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Date</span>
                    <span className="col-span-2">Message</span>
                    <span>Tenant</span>
                  </div>
                  <div className="max-h-48 divide-y overflow-auto">
                    {data.quality.recent_errors.map((row, index) => (
                      <div key={`${row.date}-${index}`} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                        <span>{row.date}</span>
                        <span className="col-span-2 truncate">{row.message}</span>
                        <span className="truncate">{tenantLabel(row.tenant_id, tenantsById)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} message="Aucun incident frontend sur la période." />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Sessions récentes" subtitle="Session Replay pour le Super Admin." />
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionsToShow.length ? (
                <>
                  {sessionsToShow.map((session) => (
                    <div key={session.session_id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {formatDateTime(session.started_at) ?? "Date indisponible"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tenantLabel(session.tenant_id, tenantsById)} · {session.platform_type ?? "—"} · {formatDuration(session.duration_seconds)}
                          </p>
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={session.distinct_id ?? undefined}
                          >
                            {sessionUserDisplay(session)}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" disabled={!session.replay_url}>
                          <a href={session.replay_url ?? "#"} target="_blank" rel="noreferrer">
                            <Eye className="mr-2 size-4" />
                            Replay
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {data.sessions.length > 5 ? (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAllSessions((prev) => !prev)}>
                      {showAllSessions ? "Réduire" : `Voir toutes les sessions (${data.sessions.length})`}
                    </Button>
                  ) : null}
                </>
              ) : (
                <EmptyState icon={Eye} message="Aucune session disponible." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Exploration */}
      <section className="space-y-4">
        <SectionHeading title="Exploration" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Événements récents" subtitle="Filtrés par tenant, plateforme, module et événement." />
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
              {data.recent_events.length ? (
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Événement</th>
                        <th className="px-4 py-3 text-left">Tenant</th>
                        <th className="px-4 py-3 text-left">Plateforme</th>
                        <th className="px-4 py-3 text-left">Page</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.recent_events.map((row, index) => {
                        const platform = row.platform_type ?? (row.event_name.startsWith("hotel_") ? "HOTEL" : "ERP");
                        return (
                          <tr key={`${row.event_name}-${row.date}-${index}`}>
                            <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-3" title={row.event_name}>
                              {getEventLabel(row.event_name)}
                            </td>
                            <td className="px-4 py-3 max-w-32 truncate">{tenantLabel(row.tenant_id, tenantsById)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  platform === "HOTEL"
                                    ? "bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)]"
                                    : "bg-[var(--analytics-technical-soft)] text-[var(--analytics-technical)]",
                                )}
                              >
                                {platform}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-48 truncate">{row.pathname ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState icon={Sparkles} message="Aucun événement correspondant aux filtres." />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <SectionHeading title="Feature Flags" subtitle="Lecture seule, aucune action destructive." />
            </CardHeader>
            <CardContent className="space-y-3">
              {data.feature_flags.length ? (
                data.feature_flags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between rounded-xl border px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{flag.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{flag.key}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        flag.enabled
                          ? "bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {flag.enabled ? "Activé" : "Désactivé"}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState icon={Flag} message="Aucun Feature Flag exposé pour le moment." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function SectionTitleWithBadge({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="flex items-center gap-2">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          badge === "HOTEL"
            ? "bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)]"
            : "bg-[var(--analytics-technical-soft)] text-[var(--analytics-technical)]",
        )}
      >
        {badge}
      </span>
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: FunnelRow }) {
  const first = funnel.steps[0]?.count ?? 0;
  const last = funnel.steps.at(-1)?.count ?? 0;
  const allZero = funnel.steps.every((step) => step.count === 0);
  const conversion = first > 0 ? Math.round((last / first) * 100) : null;

  if (allZero) {
    return (
      <div className="rounded-xl border p-4">
        <p className="mb-3 font-medium">{funnel.name}</p>
        <EmptyState icon={ArrowUpRight} message="Pas encore assez de données pour calculer ce parcours." />
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{funnel.name}</p>
        {conversion !== null ? (
          <p className="text-xs text-muted-foreground">Conversion {conversion}%</p>
        ) : null}
      </div>
      <div className="space-y-2">
        {funnel.steps.map((step) => (
          <div key={step.event_name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <span className="truncate">{getEventLabel(step.event_name)}</span>
            <span className="font-medium tabular-nums">{step.count.toLocaleString("fr-FR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildKpis(
  data: SuperAdminAnalyticsPayload,
  platformType: AnalyticsFilters["platform_type"],
): { label: string; value: number; icon: ComponentType<{ className?: string }>; tone: Tone }[] {
  const base = { label: "Utilisateurs actifs", value: data.overview.active_users, icon: Users, tone: "neutral" as Tone };
  const errors = { label: "Erreurs frontend", value: data.quality.frontend_errors, icon: Bug, tone: "danger" as Tone };

  if (platformType === "ERP") {
    return [
      base,
      { label: "Devis créés", value: eventCount(data.erp_events, "quote_created"), icon: Receipt, tone: "neutral" },
      { label: "Factures créées", value: eventCount(data.erp_events, "invoice_created"), icon: Receipt, tone: "neutral" },
      { label: "Paiements enregistrés", value: eventCount(data.erp_events, "invoice_payment_recorded"), icon: Wallet, tone: "neutral" },
      { label: "Ventes terminées", value: eventCount(data.erp_events, "sale_completed"), icon: CheckCircle2, tone: "neutral" },
      errors,
    ];
  }

  if (platformType === "HOTEL") {
    return [
      base,
      { label: "Réservations créées", value: eventCount(data.hotel_events, "hotel_reservation_created"), icon: CalendarRange, tone: "neutral" },
      { label: "Check-in complétés", value: eventCount(data.hotel_events, "hotel_checkin_completed"), icon: LogIn, tone: "neutral" },
      { label: "Check-out complétés", value: eventCount(data.hotel_events, "hotel_checkout_completed"), icon: LogOut, tone: "neutral" },
      { label: "Paiements enregistrés", value: eventCount(data.hotel_events, "hotel_payment_recorded"), icon: Wallet, tone: "neutral" },
      { label: "Factures Hôtel", value: eventCount(data.hotel_events, "hotel_invoice_created"), icon: Receipt, tone: "neutral" },
      errors,
    ];
  }

  return [
    base,
    { label: "Tenants actifs", value: data.overview.active_tenants, icon: Building2, tone: "neutral" },
    { label: "Événements", value: data.overview.total_events, icon: Sparkles, tone: "neutral" },
    { label: "Ventes terminées", value: eventCount(data.erp_events, "sale_completed"), icon: CheckCircle2, tone: "neutral" },
    { label: "Factures créées", value: eventCount(data.erp_events, "invoice_created"), icon: Receipt, tone: "neutral" },
    { label: "Réservations Hôtel", value: eventCount(data.hotel_events, "hotel_reservation_created"), icon: CalendarRange, tone: "neutral" },
    errors,
  ];
}

export function SuperAdminAnalyticsSkeleton() {
  return (
    <main className="analytics-cockpit space-y-6 bg-muted/20 p-4 sm:p-6 xl:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </main>
  );
}
