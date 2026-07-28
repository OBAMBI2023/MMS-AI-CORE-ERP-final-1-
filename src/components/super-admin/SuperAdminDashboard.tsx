import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ClipboardCopy,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  manageTenantModule,
  manageTenantAiSubscription,
  manageTenantSubscription,
  type AiSubscriptionStatus,
  type SubscriptionBillingCycle,
  type SuperAdminDashboard,
  type SuperAdminAiPlan,
  type SuperAdminTenant,
} from "@/lib/super-admin.server";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PLATFORM_BRANDING } from "@/config/branding";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("fr-FR");

function formatCurrency(value: number) {
  return currencyFormatter.format(value).replace("XOF", "FCFA");
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function isActive(status: string) {
  return ["trial", "active"].includes(status.trim().toLowerCase());
}

const statusLabels: Record<string, string> = {
  trial: "Essai",
  active: "Active",
  expired: "Expirée",
  suspended: "Suspendue",
};

const cycleLabels: Record<SubscriptionBillingCycle, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#dashboard", active: true },
  { label: "Tenants", icon: Building2, href: "#tenants" },
  { label: "Utilisateurs", icon: Users, href: "#utilisateurs" },
  { label: "Licences", icon: KeyRound, href: "#licences" },
  { label: "Activité", icon: Activity, href: "#activite" },
  { label: "Rapports", icon: FileBarChart, href: "#rapports" },
  { label: "Paramètres", icon: Settings, href: "#parametres" },
  { label: "Journal", icon: ReceiptText, href: "#journal" },
] as const;

function SidebarContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="flex h-full flex-col bg-[#0a0a0b] text-white">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <img
          src={PLATFORM_BRANDING.assets.logoDark}
          alt={PLATFORM_BRANDING.alt}
          className="h-10 w-auto max-w-[155px]"
        />
        <span className="sr-only">Platform admin</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Espace plateforme
        </p>
        {navItems.map(({ label, icon: Icon, href, active }) => (
          <a
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
              active
                ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-[18px]" />
            <span>{label}</span>
            {active && <ChevronRight className="ml-auto size-4" />}
          </a>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <Button
          className="h-10 w-full justify-start rounded-lg bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,.08)] hover:bg-zinc-200"
          disabled
          title="Aucune action de création n'est configurée"
        >
          <Plus className="size-4" />
          Créer un tenant
        </Button>
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Super Admin</p>
            <p className="truncate text-xs text-slate-400">Compte plateforme</p>
          </div>
          {!mobile && <span className="ml-auto size-2 rounded-full bg-emerald-400" />}
        </div>
      </div>
    </div>
  );
}

type KpiCardProps = {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  note: string;
};

function KpiCard({ title, value, icon: Icon, tone, note }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
    >
      <Card className="group relative overflow-hidden rounded-xl border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>
          </div>
          <div
            className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone)}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-xl border-border/70 bg-card p-5 shadow-sm", className)}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function TenantTable({
  tenants,
  aiPlans,
  query,
  onQueryChange,
}: {
  tenants: SuperAdminTenant[];
  aiPlans: SuperAdminAiPlan[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [selectedTenant, setSelectedTenant] = useState<SuperAdminTenant | null>(null);
  const [moduleTenant, setModuleTenant] = useState<SuperAdminTenant | null>(null);
  const [aiTenant, setAiTenant] = useState<SuperAdminTenant | null>(null);
  const copyLoginUrl = async (tenant: SuperAdminTenant) => {
    const url = new URL(tenant.loginUrl, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de connexion copié.");
    } catch {
      toast.error("Impossible de copier le lien de connexion.");
    }
  };
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.status, tenant.plan ?? "", tenant.id].some((value) =>
        value.toLocaleLowerCase("fr").includes(normalized),
      ),
    );
  }, [query, tenants]);

  return (
    <Card
      id="tenants"
      className="scroll-mt-24 overflow-hidden rounded-xl border-border/70 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Tenants</h2>
          <p className="mt-1 text-xs text-slate-400">
            {numberFormatter.format(filtered.length)} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher un tenant..."
            aria-label="Rechercher un tenant"
            className="h-9 rounded-lg border-border bg-muted/40 pl-9 dark:bg-muted/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun tenant trouvé</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modifiez votre recherche pour afficher des résultats.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Tenant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">CA mensuel</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Fin abonnement</TableHead>
                <TableHead>Activité</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  className="border-border/60 transition-colors hover:bg-muted/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15 font-semibold text-violet-600 dark:text-violet-300">
                        {tenant.name.charAt(0).toLocaleUpperCase("fr")}
                      </div>
                      <div>
                        <p className="max-w-48 truncate font-medium text-foreground">
                          {tenant.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {tenant.id.slice(0, 8)}
                        </p>
                        <a
                          href={tenant.loginUrl}
                          className="block max-w-56 truncate text-xs text-blue-600 hover:underline"
                        >
                          {tenant.loginUrl}
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "rounded-full border-0 px-2.5 font-medium",
                        isActive(tenant.status)
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 size-1.5 rounded-full",
                          isActive(tenant.status) ? "bg-emerald-500" : "bg-slate-400",
                        )}
                      />
                      {statusLabels[tenant.status] ?? tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.users}</TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.sales}</TableCell>
                  <TableCell className="text-right tabular-nums">{tenant.clients}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(tenant.monthlyRevenue)}
                  </TableCell>
                  <TableCell>{tenant.plan ? cycleLabels[tenant.plan] : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(tenant.subscriptionEnd)}</div>
                    {tenant.daysRemaining !== null && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {tenant.daysRemaining} jour{tenant.daysRemaining > 1 ? "s" : ""} restant
                        {tenant.daysRemaining > 1 ? "s" : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(tenant.lastActivityAt, true)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 rounded-lg">
                        <DropdownMenuLabel>Actions du tenant</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => void copyLoginUrl(tenant)}>
                          <ClipboardCopy />
                          Copier le lien de connexion
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!tenant.subscriptionId}
                          onClick={() => setSelectedTenant(tenant)}
                        >
                          <KeyRound />
                          Gérer la licence
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModuleTenant(tenant)}>
                          <Gauge />
                          Gérer les modules
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAiTenant(tenant)}>
                          <Bot />
                          Abonnement Assistant IA
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <SubscriptionDialog
        tenant={selectedTenant}
        open={Boolean(selectedTenant)}
        onOpenChange={(open) => {
          if (!open) setSelectedTenant(null);
        }}
      />
      <TenantModulesDialog
        tenant={moduleTenant}
        open={Boolean(moduleTenant)}
        onOpenChange={(open) => {
          if (!open) setModuleTenant(null);
        }}
      />
      <AiSubscriptionDialog
        tenant={aiTenant}
        plans={aiPlans}
        open={Boolean(aiTenant)}
        onOpenChange={(open) => {
          if (!open) setAiTenant(null);
        }}
      />
    </Card>
  );
}

type AiSubscriptionAction = "activate" | "suspend" | "renew" | "extend" | "cancel" | "update";

function AiSubscriptionDialog({
  tenant,
  plans,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  plans: SuperAdminAiPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const subscription = tenant?.aiSubscription;
  const [action, setAction] = useState<AiSubscriptionAction>("activate");
  const [activationStatus, setActivationStatus] = useState<Extract<AiSubscriptionStatus, "active" | "trial">>("active");
  const [planCode, setPlanCode] = useState("");
  const [quota, setQuota] = useState("");
  const [days, setDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setAction(subscription ? "update" : "activate");
    setActivationStatus(subscription?.status === "trial" ? "trial" : "active");
    setPlanCode(subscription?.planCode ?? plans[0]?.code ?? "");
    setQuota(subscription ? String(subscription.monthlyRequestLimit) : "");
    setDays("30");
  }, [tenant, subscription, plans]);

  const submit = async () => {
    if (!tenant) return;
    const parsedQuota = Number(quota);
    const parsedDays = Number(days);
    if (!planCode || !Number.isInteger(parsedQuota) || parsedQuota < 1) {
      toast.error("Sélectionnez un plan et indiquez un quota mensuel positif.");
      return;
    }
    if (
      ["activate", "renew", "extend"].includes(action) &&
      (!Number.isInteger(parsedDays) || parsedDays < 1)
    ) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }
    setSubmitting(true);
    try {
      await manageTenantAiSubscription({
        data: {
          tenantId: tenant.id,
          action,
          planCode,
          monthlyRequestLimit: parsedQuota,
          ...(action === "activate" ? { activationStatus } : {}),
          ...(["activate", "renew", "extend"].includes(action) ? { days: parsedDays } : {}),
        },
      });
      toast.success("Abonnement Assistant IA mis à jour.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Abonnement Assistant IA</DialogTitle>
          <DialogDescription>
            Abonnement premium indépendant de la licence ERP de {tenant?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div>Statut : <strong>{subscription?.status ?? "Aucun abonnement"}</strong></div>
          <div>Plan : <strong>{subscription?.planCode ?? "—"}</strong></div>
          <div>
            Consommation : <strong>{subscription ? `${subscription.requestsUsed} / ${subscription.monthlyRequestLimit}` : "—"}</strong>
          </div>
          <div>Expiration : <strong>{formatDate(subscription?.expiresAt ?? null)}</strong></div>
          <div className="sm:col-span-2">
            Période : <strong>{subscription ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}` : "—"}</strong>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-action">Action</Label>
            <select id="ai-action" value={action} onChange={(event) => setAction(event.target.value as AiSubscriptionAction)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="activate">Activer</option>
              <option value="update">Modifier plan/quota</option>
              <option value="renew">Renouveler</option>
              <option value="extend">Prolonger</option>
              <option value="suspend">Suspendre</option>
              <option value="cancel">Résilier</option>
            </select>
          </div>
          {action === "activate" && (
            <div className="space-y-2">
              <Label htmlFor="ai-status">Type d’activation</Label>
              <select id="ai-status" value={activationStatus} onChange={(event) => setActivationStatus(event.target.value as "active" | "trial")} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ai-plan">Plan</Label>
            <select id="ai-plan" value={planCode} onChange={(event) => {
              const code = event.target.value;
              setPlanCode(code);
              const plan = plans.find((item) => item.code === code);
              if (!subscription && plan?.monthlyRequestLimit) setQuota(String(plan.monthlyRequestLimit));
            }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Sélectionner</option>
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>{plan.name}{plan.enabled ? "" : " (désactivé)"}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-quota">Quota mensuel</Label>
            <Input id="ai-quota" type="number" min={1} value={quota} onChange={(event) => setQuota(event.target.value)} />
          </div>
          {["activate", "renew", "extend"].includes(action) && (
            <div className="space-y-2">
              <Label htmlFor="ai-days">Durée en jours</Label>
              <Input id="ai-days" type="number" min={1} value={days} onChange={(event) => setDays(event.target.value)} />
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Historique d’utilisation</h3>
          <div className="max-h-52 overflow-auto rounded-lg border">
            {tenant?.aiUsageHistory.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Tool</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Tokens</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tenant.aiUsageHistory.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(usage.createdAt, true)}</TableCell>
                      <TableCell>{usage.toolName ?? usage.requestType}</TableCell>
                      <TableCell>{usage.status}</TableCell>
                      <TableCell className="text-right">{usage.totalTokens ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p className="p-4 text-sm text-muted-foreground">Aucun appel IA enregistré.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Enregistrement…" : "Confirmer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantModulesDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    if (!tenant) return;
    setPendingModule(moduleId);
    try {
      await manageTenantModule({
        data: { tenantId: tenant.id, moduleId, enabled },
      });
      toast.success(enabled ? "Module activé." : "Module désactivé.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de mettre à jour le module.",
      );
    } finally {
      setPendingModule(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modules du tenant</DialogTitle>
          <DialogDescription>
            Activez uniquement les fonctions accessibles à {tenant?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-2">
          {tenant?.modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <Label htmlFor={`module-${module.id}`}>{module.name}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {module.description ?? module.code}
                </p>
              </div>
              <Switch
                id={`module-${module.id}`}
                checked={module.enabled}
                disabled={pendingModule !== null}
                onCheckedChange={(enabled) => toggleModule(module.id, enabled)}
                aria-label={`${module.enabled ? "Désactiver" : "Activer"} ${module.name}`}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SubscriptionAction = "activate" | "extend" | "suspend" | "renew";

function SubscriptionDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: SuperAdminTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<SubscriptionAction>("activate");
  const [amount, setAmount] = useState("0");
  const [days, setDays] = useState("30");
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("monthly");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setAction(tenant.subscriptionStatus === "active" ? "renew" : "activate");
    setAmount(String(tenant.subscriptionAmount));
    setBillingCycle(tenant.plan ?? "monthly");
    setDays(tenant.plan === "yearly" ? "365" : tenant.plan === "quarterly" ? "90" : "30");
  }, [tenant]);

  const submit = async () => {
    if (!tenant) return;
    const parsedDays = Number(days);
    const parsedAmount = Number(amount);
    if (action !== "suspend" && (!Number.isInteger(parsedDays) || parsedDays < 1)) {
      toast.error("La durée doit être un nombre entier positif.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Le montant doit être positif ou nul.");
      return;
    }
    setSubmitting(true);
    try {
      await manageTenantSubscription({
        data: {
          tenantId: tenant.id,
          action,
          ...(action === "suspend" ? {} : { days: parsedDays, amount: parsedAmount, billingCycle }),
        },
      });
      toast.success("Licence mise à jour.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de mettre à jour la licence.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer la licence</DialogTitle>
          <DialogDescription>
            {tenant?.name} · {statusLabels[tenant?.subscriptionStatus ?? ""] ?? "Sans statut"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="subscription-action">Action</Label>
            <select
              id="subscription-action"
              value={action}
              onChange={(event) => setAction(event.target.value as SubscriptionAction)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="activate">Activer</option>
              <option value="extend">Prolonger</option>
              <option value="suspend">Suspendre</option>
              <option value="renew">Renouveler</option>
            </select>
          </div>
          {action !== "suspend" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="subscription-days">Durée (jours)</Label>
                  <Input
                    id="subscription-days"
                    type="number"
                    min={1}
                    max={3650}
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription-amount">Montant (FCFA)</Label>
                  <Input
                    id="subscription-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-cycle">Cycle de facturation</Label>
                <select
                  id="subscription-cycle"
                  value={billingCycle}
                  onChange={(event) =>
                    setBillingCycle(event.target.value as SubscriptionBillingCycle)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Enregistrement…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionSummary({ data }: { data: SuperAdminDashboard["subscriptions"] }) {
  const items = [
    {
      label: "Licences actives",
      value: numberFormatter.format(data.active),
      icon: KeyRound,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Essais",
      value: numberFormatter.format(data.trials),
      icon: CalendarClock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Expirés",
      value: numberFormatter.format(data.expired),
      icon: Activity,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Revenus récurrents",
      value: formatCurrency(data.recurringRevenue),
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50",
    },
  ];

  return (
    <section id="licences" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">Résumé des abonnements</h2>
        <p className="mt-1 text-xs text-slate-400">Indicateurs issus des abonnements enregistrés</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-xl border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", color)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 truncate text-xl font-semibold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function SuperAdminDashboardView({
  data,
  onSignOut,
}: {
  data: SuperAdminDashboard;
  onSignOut: () => Promise<void>;
}) {
  const [tenantQuery, setTenantQuery] = useState("");
  const tenantDistribution = [
    { name: "Actifs", value: data.kpis.activeTenants, color: "#2563EB" },
    {
      name: "Autres",
      value: Math.max(0, data.kpis.tenants - data.kpis.activeTenants),
      color: "#CBD5E1",
    },
  ];
  const salesByTenant = [...data.tenants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((tenant) => ({ name: tenant.name, value: tenant.revenue }));

  return (
    <div className="min-h-screen bg-muted/30 text-foreground dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 rounded-xl lg:hidden">
                    <Menu className="size-5" />
                    <span className="sr-only">Ouvrir le menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] border-0 p-0 [&>button]:text-white">
                  <SheetTitle className="sr-only">Navigation Super Admin</SheetTitle>
                  <SidebarContent mobile />
                </SheetContent>
              </Sheet>
              <div className="hidden min-w-0 sm:block">
                <h1 className="truncate text-base font-semibold tracking-tight">Vue d’ensemble</h1>
                <p className="truncate text-xs text-muted-foreground">Pilotage de la plateforme</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="relative hidden w-full max-w-sm md:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tenantQuery}
                  onChange={(event) => setTenantQuery(event.target.value)}
                  onFocus={() => (window.location.hash = "tenants")}
                  placeholder="Rechercher un tenant..."
                  aria-label="Rechercher dans les tenants"
                  className="h-9 rounded-lg border-border bg-muted/40 pl-9 shadow-none"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-lg text-muted-foreground"
                disabled
                title="Aucune notification configurée"
              >
                <Bell className="size-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 rounded-lg px-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-semibold text-white">
                      SA
                    </span>
                    <span className="hidden text-left md:block">
                      <span className="block text-xs font-medium">Super Admin</span>
                      <span className="block text-[10px] text-muted-foreground">Plateforme</span>
                    </span>
                    <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-lg">
                  <DropdownMenuLabel>Compte plateforme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void onSignOut()}>
                    <LogOut /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="dashboard" className="space-y-7 p-4 sm:p-6 xl:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Total tenants"
              value={numberFormatter.format(data.kpis.tenants)}
              icon={Building2}
              tone="bg-blue-50 text-blue-600"
              note="Comptes enregistrés"
            />
            <KpiCard
              title="Tenants actifs"
              value={numberFormatter.format(data.kpis.activeTenants)}
              icon={Gauge}
              tone="bg-emerald-50 text-emerald-600"
              note="Statut actif"
            />
            <KpiCard
              title="Utilisateurs"
              value={numberFormatter.format(data.kpis.users)}
              icon={Users}
              tone="bg-violet-50 text-violet-600"
              note="Profils rattachés"
            />
            <KpiCard
              title="Ventes totales"
              value={numberFormatter.format(data.kpis.sales)}
              icon={BarChart3}
              tone="bg-amber-50 text-amber-600"
              note="Transactions enregistrées"
            />
            <KpiCard
              title="CA total"
              value={formatCurrency(data.kpis.revenue)}
              icon={CircleDollarSign}
              tone="bg-cyan-50 text-cyan-600"
              note="Toutes ventes confondues"
            />
          </section>

          <section id="rapports" className="grid scroll-mt-24 gap-4 xl:grid-cols-12">
            <ChartCard
              title="Évolution des inscriptions"
              subtitle="Nouveaux tenants sur les 6 derniers mois"
              className="xl:col-span-6"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.registrations}
                    margin={{ top: 5, right: 4, bottom: 0, left: -24 }}
                  >
                    <defs>
                      <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [numberFormatter.format(Number(value)), "Tenants"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="tenants"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#registrations)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Répartition des tenants"
              subtitle="Tenants actifs et autres statuts"
              className="xl:col-span-3"
            >
              <div className="relative h-64">
                {data.kpis.tenants === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Aucun résultat
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tenantDistribution}
                          dataKey="value"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {tenantDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => numberFormatter.format(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{data.kpis.tenants}</span>
                      <span className="text-[11px] text-slate-400">Tenants</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-center gap-5 text-xs text-slate-500">
                {tenantDistribution.map((item) => (
                  <span key={item.name} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="Ventes par tenant"
              subtitle="CA cumulé des principaux tenants"
              className="xl:col-span-3"
            >
              <div className="h-64">
                {salesByTenant.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Aucun résultat
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByTenant}
                      layout="vertical"
                      margin={{ left: -20, right: 8 }}
                    >
                      <CartesianGrid horizontal={false} stroke="#E2E8F0" strokeDasharray="4 4" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={82}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748B", fontSize: 10 }}
                      />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </section>

          <TenantTable tenants={data.tenants} aiPlans={data.aiPlans} query={tenantQuery} onQueryChange={setTenantQuery} />
          <SubscriptionSummary data={data.subscriptions} />
        </main>
      </div>
    </div>
  );
}

export function SuperAdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 lg:pl-[248px] dark:bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-[248px] bg-[#0a0a0b] lg:block" />
      <div className="h-[72px] border-b border-border bg-background" />
      <main className="space-y-7 p-4 sm:p-6 xl:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <Skeleton className="h-80 rounded-xl xl:col-span-6" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </main>
    </div>
  );
}
