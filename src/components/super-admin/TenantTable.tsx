import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  Building2,
  ClipboardCopy,
  Gauge,
  KeyRound,
  Layers3,
  MoreHorizontal,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import {
  manageTenantAiSubscription,
  manageTenantLifecycle,
  manageTenantSubscription,
  type AiSubscriptionStatus,
  type SubscriptionBillingCycle,
  type SuperAdminAiPlan,
  type SuperAdminTenant,
  type TenantDeletionJob,
} from "@/lib/super-admin.server";
import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/mms/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cycleLabels,
  formatDate,
  isActive,
  numberFormatter,
  statusLabels,
} from "@/components/super-admin/shared";

const deletionStatusLabels: Record<TenantDeletionJob["status"], string> = {
  pending: "En attente",
  running: "En cours",
  partial: "Partiel",
  failed: "Échoué",
  completed: "Terminé",
};

function StatusBadge({ tenant, job }: { tenant: SuperAdminTenant; job?: TenantDeletionJob }) {
  if (tenant.deletedAt) return <Badge variant="destructive">Supprimé</Badge>;
  if (job) return <Badge variant="destructive">{deletionStatusLabels[job.status]}</Badge>;
  return (
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
  );
}

export function TenantTable({
  tenants,
  deletionJobs,
  aiPlans,
  query,
  onQueryChange,
  onManageModules,
}: {
  tenants: SuperAdminTenant[];
  deletionJobs: TenantDeletionJob[];
  aiPlans: SuperAdminAiPlan[];
  query: string;
  onQueryChange: (value: string) => void;
  onManageModules: (tenant: SuperAdminTenant) => void;
}) {
  const [selectedTenant, setSelectedTenant] = useState<SuperAdminTenant | null>(null);
  const [aiTenant, setAiTenant] = useState<SuperAdminTenant | null>(null);
  const [deletionTenant, setDeletionTenant] = useState<SuperAdminTenant | null>(null);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const router = useRouter();

  const activeDeletionByTenant = useMemo(
    () =>
      new Map(
        deletionJobs.filter((job) => job.status !== "completed").map((job) => [job.tenantId, job]),
      ),
    [deletionJobs],
  );

  const launchDeletion = async () => {
    if (!deletionTenant || confirmationSlug !== deletionTenant.name || !secondConfirmation) return;
    setDeletionBusy(true);
    try {
      const result = await manageTenantLifecycle({
        data: {
          tenantId: deletionTenant.id,
          action: "soft_delete",
          reason: deletionReason,
          exactName: confirmationSlug,
          secondConfirmation: "CONFIRMER LA SUPPRESSION",
        },
      });
      const count = Object.values(result.dependencies).reduce((sum, value) => sum + value, 0);
      toast.success(`Tenant supprimé logiquement. ${count} dépendance(s) conservée(s).`);
      setDeletionTenant(null);
      setConfirmationSlug("");
      setDeletionReason("");
      setSecondConfirmation(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La suppression a échoué.");
    } finally {
      setDeletionBusy(false);
      await router.invalidate();
    }
  };

  const retryDeletion = async () => {
    toast.error("La purge physique est désactivée dans ce parcours.");
  };

  const changeLifecycle = async (
    tenant: SuperAdminTenant,
    action: "suspend" | "reactivate" | "restore",
  ) => {
    setDeletionBusy(true);
    try {
      await manageTenantLifecycle({
        data: { tenantId: tenant.id, action, reason: `${action} décidé depuis le Super Admin` },
      });
      toast.success(
        action === "suspend"
          ? "Tenant suspendu."
          : action === "restore"
            ? "Tenant restauré."
            : "Tenant réactivé.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La nouvelle tentative a échoué.");
    } finally {
      setDeletionBusy(false);
      await router.invalidate();
    }
  };

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
      [tenant.name, tenant.status, tenant.plan ?? "", tenant.pack?.name ?? "", tenant.id].some(
        (value) => value.toLocaleLowerCase("fr").includes(normalized),
      ),
    );
  }, [query, tenants]);

  function ActionsMenu({ tenant }: { tenant: SuperAdminTenant }) {
    const job = activeDeletionByTenant.get(tenant.id);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground">
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
          <DropdownMenuItem onClick={() => onManageModules(tenant)}>
            <Gauge />
            Gérer les modules
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAiTenant(tenant)}>
            <Bot />
            Abonnement Assistant IA
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/settings/catalogue?tenantId=${encodeURIComponent(tenant.id)}`}>
              <Settings />
              Configurer le catalogue
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {tenant.deletedAt ? (
            <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "restore")}>
              <Activity />
              Restaurer
            </DropdownMenuItem>
          ) : tenant.suspendedAt || tenant.status === "suspended" ? (
            <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "reactivate")}>
              <Activity />
              Réactiver
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => void changeLifecycle(tenant, "suspend")}>
              <Activity />
              Suspendre
            </DropdownMenuItem>
          )}
          {job ? (
            <DropdownMenuItem
              disabled={deletionBusy || !["failed", "partial"].includes(job.status)}
              onClick={() => void retryDeletion()}
            >
              <Activity />
              Réessayer la suppression
            </DropdownMenuItem>
          ) : (
            !tenant.deletedAt && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setConfirmationSlug("");
                  setDeletionReason("");
                  setSecondConfirmation(false);
                  setDeletionTenant(tenant);
                }}
              >
                <Trash2 />
                Supprimer logiquement
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Card
      id="tenants"
      className="scroll-mt-24 overflow-hidden rounded-xl border-border/70 bg-card shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Tenants</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {numberFormatter.format(filtered.length)} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
        <>
          {/* Desktop / tablet: full table */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Tenant</TableHead>
                  <TableHead>Partner créateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Création</TableHead>
                  <TableHead className="text-right">Utilisateurs</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead className="text-right">CA mensuel</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Pack modules</TableHead>
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
                          <p className="font-mono text-[11px] text-muted-foreground">
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
                      {tenant.partner ? (
                        <div>
                          <p className="font-medium">{tenant.partner.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.partner.code}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Direct</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tenant={tenant} job={activeDeletionByTenant.get(tenant.id)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tenant.users}</TableCell>
                    <TableCell className="text-right tabular-nums">{tenant.sales}</TableCell>
                    <TableCell className="text-right tabular-nums">{tenant.clients}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(tenant.monthlyRevenue)}
                    </TableCell>
                    <TableCell>{tenant.plan ? cycleLabels[tenant.plan] : "—"}</TableCell>
                    <TableCell>
                      {tenant.pack ? (
                        <Badge variant="secondary" className="whitespace-nowrap">
                          <Layers3 className="mr-1 size-3" />
                          {tenant.pack.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Aucun</span>
                      )}
                    </TableCell>
                    <TableCell>{tenant.partnerOffer?.name ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div>{formatDate(tenant.subscriptionEnd)}</div>
                      {tenant.daysRemaining !== null && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {tenant.daysRemaining} jour{tenant.daysRemaining > 1 ? "s" : ""} restant
                          {tenant.daysRemaining > 1 ? "s" : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(tenant.lastActivityAt, true)}
                    </TableCell>
                    <TableCell>
                      <ActionsMenu tenant={tenant} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card list, no horizontal scroll */}
          <div className="divide-y divide-border/70 md:hidden">
            {filtered.map((tenant) => (
              <div key={tenant.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-blue-500/15 font-semibold text-violet-600 dark:text-violet-300">
                      {tenant.name.charAt(0).toLocaleUpperCase("fr")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{tenant.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {tenant.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <ActionsMenu tenant={tenant} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tenant={tenant} job={activeDeletionByTenant.get(tenant.id)} />
                  {tenant.pack && (
                    <Badge variant="secondary" className="whitespace-nowrap">
                      <Layers3 className="mr-1 size-3" />
                      {tenant.pack.name}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
                  <div>
                    <p className="font-semibold tabular-nums">{tenant.users}</p>
                    <p className="text-muted-foreground">Utilisateurs</p>
                  </div>
                  <div>
                    <p className="font-semibold tabular-nums">{tenant.sales}</p>
                    <p className="text-muted-foreground">Ventes</p>
                  </div>
                  <div>
                    <p className="truncate font-semibold tabular-nums">
                      {formatCurrency(tenant.monthlyRevenue)}
                    </p>
                    <p className="text-muted-foreground">CA mensuel</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Créé le {formatDate(tenant.createdAt)}</span>
                  <span>
                    {tenant.daysRemaining !== null
                      ? `${tenant.daysRemaining} j. restant${tenant.daysRemaining > 1 ? "s" : ""}`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {deletionJobs.length > 0 && (
        <div className="border-t border-border/70 p-5">
          <h3 className="text-sm font-semibold">Suivi des suppressions</h3>
          <div className="mt-3 space-y-2">
            {deletionJobs.slice(0, 10).map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {job.tenantName} ({job.tenantSlug})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Étape : {job.currentStep} · tentative {job.attemptCount}
                  </p>
                  {job.lastError?.message && (
                    <p className="mt-1 line-clamp-2 text-xs text-destructive">
                      {job.lastError.message}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={
                      job.status === "completed"
                        ? "secondary"
                        : job.status === "running"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {deletionStatusLabels[job.status]}
                  </Badge>
                  {["failed", "partial"].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deletionBusy}
                      onClick={() => void retryDeletion()}
                    >
                      Réessayer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(deletionTenant)}
        onOpenChange={(open) => {
          if (!open && !deletionBusy) {
            setDeletionTenant(null);
            setConfirmationSlug("");
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supprimer logiquement ce tenant ?</DialogTitle>
            <DialogDescription>
              Le tenant sera désactivé et masqué des listes actives. Ses profils, rôles,
              abonnements, crédits, transactions, ventes, devis, fichiers et données métier seront
              audités puis conservés pour permettre une restauration. Saisissez exactement{" "}
              <strong className="font-mono text-foreground">{deletionTenant?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmationSlug}
            onChange={(event) => setConfirmationSlug(event.target.value)}
            placeholder="Nom exact du tenant"
            autoComplete="off"
            disabled={deletionBusy}
          />
          <Input
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
            placeholder="Motif obligatoire"
            disabled={deletionBusy}
          />
          <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
            <Checkbox
              checked={secondConfirmation}
              onCheckedChange={(checked) => setSecondConfirmation(checked === true)}
              disabled={deletionBusy}
            />
            <span>Je confirme une seconde fois la suppression logique de ce tenant.</span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deletionBusy}
              onClick={() => setDeletionTenant(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletionBusy ||
                !deletionTenant ||
                confirmationSlug !== deletionTenant.name ||
                deletionReason.trim().length < 3 ||
                !secondConfirmation
              }
              onClick={() => void launchDeletion()}
            >
              {deletionBusy ? "Suppression en cours…" : "Confirmer la suppression logique"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubscriptionDialog
        tenant={selectedTenant}
        open={Boolean(selectedTenant)}
        onOpenChange={(open) => {
          if (!open) setSelectedTenant(null);
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
  const [activationStatus, setActivationStatus] =
    useState<Extract<AiSubscriptionStatus, "active" | "trial">>("active");
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
          <div>
            Statut : <strong>{subscription?.status ?? "Aucun abonnement"}</strong>
          </div>
          <div>
            Plan : <strong>{subscription?.planCode ?? "—"}</strong>
          </div>
          <div>
            Consommation :{" "}
            <strong>
              {subscription
                ? `${subscription.requestsUsed} / ${subscription.monthlyRequestLimit}`
                : "—"}
            </strong>
          </div>
          <div>
            Expiration : <strong>{formatDate(subscription?.expiresAt ?? null)}</strong>
          </div>
          <div className="sm:col-span-2">
            Période :{" "}
            <strong>
              {subscription
                ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}`
                : "—"}
            </strong>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-action">Action</Label>
            <select
              id="ai-action"
              value={action}
              onChange={(event) => setAction(event.target.value as AiSubscriptionAction)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
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
              <select
                id="ai-status"
                value={activationStatus}
                onChange={(event) => setActivationStatus(event.target.value as "active" | "trial")}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ai-plan">Plan</Label>
            <select
              id="ai-plan"
              value={planCode}
              onChange={(event) => {
                const code = event.target.value;
                setPlanCode(code);
                const plan = plans.find((item) => item.code === code);
                if (!subscription && plan?.monthlyRequestLimit)
                  setQuota(String(plan.monthlyRequestLimit));
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Sélectionner</option>
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                  {plan.enabled ? "" : " (désactivé)"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-quota">Quota mensuel</Label>
            <Input
              id="ai-quota"
              type="number"
              min={1}
              value={quota}
              onChange={(event) => setQuota(event.target.value)}
            />
          </div>
          {["activate", "renew", "extend"].includes(action) && (
            <div className="space-y-2">
              <Label htmlFor="ai-days">Durée en jours</Label>
              <Input
                id="ai-days"
                type="number"
                min={1}
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Historique d’utilisation</h3>
          <div className="max-h-52 overflow-auto rounded-lg border">
            {tenant?.aiUsageHistory.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.aiUsageHistory.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(usage.createdAt, true)}
                      </TableCell>
                      <TableCell>{usage.toolName ?? usage.requestType}</TableCell>
                      <TableCell>{usage.status}</TableCell>
                      <TableCell className="text-right">{usage.totalTokens ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Aucun appel IA enregistré.</p>
            )}
          </div>
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
                  <Label htmlFor="subscription-amount">Montant ({DEFAULT_CURRENCY})</Label>
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
