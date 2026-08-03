import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bot, MessageSquareText, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { tenantModulesQueryKey } from "@/hooks/use-tenant-modules";
import { getSmsAdminState, saveTenantModules, type SuperAdminTenant } from "@/lib/super-admin.server";

type SmsSubscription = {
  tenant_id: string;
  module_id: string;
  status: string;
  credit_balance: number;
  expires_at: string | null;
};

const sourceLabels = {
  pack: "Pack",
  manual: "Manuel",
  subscription: "Abonnement",
  system: "Système",
} as const;

const MODULE_DRAFT_KEY = "mms:super-admin:module-draft";

function formatDate(value: string | null | undefined) {
  if (!value) return "Sans expiration";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR").format(date);
}

export function TenantModulesManager({
  tenants,
  initialTenantId,
  smsSubscriptions = [],
  fixedTenant = false,
}: {
  tenants: SuperAdminTenant[];
  initialTenantId?: string;
  smsSubscriptions?: SmsSubscription[];
  fixedTenant?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialTenant = tenants.find((tenant) => tenant.id === initialTenantId)
    ?? tenants.find((tenant) => /maguy multi services/i.test(tenant.name))
    ?? tenants[0];
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenant?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loadedSmsSubscriptions, setLoadedSmsSubscriptions] = useState<SmsSubscription[]>(smsSubscriptions);
  const tenant = tenants.find((item) => item.id === selectedTenantId) ?? initialTenant;

  useEffect(() => {
    const storedDraft = sessionStorage.getItem(MODULE_DRAFT_KEY);
    let saved: { tenantId?: string; draft?: Record<string, boolean> } | null = null;
    try {
      saved = storedDraft ? JSON.parse(storedDraft) : null;
    } catch {
      sessionStorage.removeItem(MODULE_DRAFT_KEY);
    }
    setDraft(saved?.tenantId === tenant?.id && saved.draft
      ? saved.draft
      : Object.fromEntries((tenant?.modules ?? []).map((module) => [module.id, module.enabled])));
  }, [tenant]);
  useEffect(() => {
    if (tenant && Object.keys(draft).length) {
      sessionStorage.setItem(MODULE_DRAFT_KEY, JSON.stringify({ tenantId: tenant.id, draft }));
    }
  }, [draft, tenant]);
  useEffect(() => {
    if (smsSubscriptions.length) {
      setLoadedSmsSubscriptions(smsSubscriptions);
      return;
    }
    void getSmsAdminState()
      .then((state) => setLoadedSmsSubscriptions(state.subscriptions as SmsSubscription[]))
      .catch(() => setLoadedSmsSubscriptions([]));
  }, [smsSubscriptions]);

  const filteredTenants = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    if (!needle) return tenants;
    return tenants.filter((item) =>
      item.name.toLocaleLowerCase("fr").includes(needle) || item.slug.toLocaleLowerCase("fr").includes(needle),
    );
  }, [query, tenants]);
  const changes = (tenant?.modules ?? []).filter((module) => draft[module.id] !== module.enabled);
  const subscriptionByModule = new Map(
    loadedSmsSubscriptions
      .filter((item) => item.tenant_id === tenant?.id)
      .map((item) => [item.module_id, item]),
  );

  const save = async () => {
    if (!tenant || changes.length === 0) return;
    setSaving(true);
    try {
      await saveTenantModules({
        data: {
          tenantId: tenant.id,
          changes: changes.map((module) => ({ moduleId: module.id, enabled: draft[module.id] })),
        },
      });
      await queryClient.invalidateQueries({ queryKey: tenantModulesQueryKey(tenant.id) });
      await router.invalidate();
      sessionStorage.removeItem(MODULE_DRAFT_KEY);
      toast.success("Modules enregistrés. Le menu du tenant est actualisé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      {!fixedTenant && (
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Choisir un tenant</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou slug…" className="pl-9" />
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filteredTenants.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedTenantId(item.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${item.id === tenant?.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.slug}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={fixedTenant ? "xl:col-span-2" : undefined}>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{tenant?.name ?? "Aucun tenant"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Activez ou désactivez l’accès sans supprimer les données métier.</p>
          </div>
          <Button onClick={() => void save()} disabled={saving || changes.length === 0}>
            {saving ? "Enregistrement…" : `Enregistrer les changements${changes.length ? ` (${changes.length})` : ""}`}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tenant?.modules ?? []).map((module) => {
            const premium = module.module_type === "premium";
            const isSms = module.code === "hotel_sms";
            const isAi = module.code === "ai_assistant";
            const genericSubscription = subscriptionByModule.get(module.id);
            const genericSubscriptionActive = genericSubscription?.status === "active"
              && (!genericSubscription.expires_at || new Date(genericSubscription.expires_at).getTime() > Date.now());
            const aiSubscriptionActive = isAi
              && ["active", "trial"].includes(tenant?.aiSubscription?.status ?? "")
              && (!tenant?.aiSubscription?.expiresAt || new Date(tenant.aiSubscription.expiresAt).getTime() > Date.now());
            const activePremiumSubscription = premium
              && (genericSubscriptionActive || aiSubscriptionActive);
            const balance = isAi && tenant?.aiSubscription
              ? Math.max(0, tenant.aiSubscription.monthlyRequestLimit - tenant.aiSubscription.requestsUsed)
              : isSms ? genericSubscription?.credit_balance ?? 0 : null;
            const subscriptionStatus = isAi ? tenant?.aiSubscription?.status : genericSubscription?.status;
            const subscriptionExpiration = isAi ? tenant?.aiSubscription?.expiresAt : genericSubscription?.expires_at;
            return (
              <div key={module.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isSms ? <MessageSquareText className="size-4" /> : isAi ? <Bot className="size-4" /> : null}
                      <Label htmlFor={`central-module-${module.id}`} className="text-base">{module.name}</Label>
                      <Badge variant={premium ? "default" : "secondary"}>{premium ? "Premium" : "Standard"}</Badge>
                      <Badge variant={draft[module.id] ? "outline" : "secondary"}>{draft[module.id] ? "Actif" : "Inactif"}</Badge>
                      <Badge variant="outline">Source : {sourceLabels[module.assignmentSource]}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{module.code}</p>
                    {module.description && <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>}
                  </div>
                  <Switch id={`central-module-${module.id}`} checked={draft[module.id] ?? false}
                    disabled={module.code === "dashboard" || saving || (draft[module.id] && activePremiumSubscription)}
                    onCheckedChange={(enabled) => setDraft((current) => ({ ...current, [module.id]: enabled }))} />
                </div>
                {activePremiumSubscription && (
                  <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.
                  </p>
                )}
                {(isSms || isAi) && (
                  <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-4">
                    <div><span className="block text-xs text-muted-foreground">Abonnement</span><strong>{subscriptionStatus ?? "Absent"}</strong></div>
                    <div><span className="block text-xs text-muted-foreground">Solde</span><strong>{balance ?? 0}</strong></div>
                    <div><span className="block text-xs text-muted-foreground">Expiration</span><strong>{formatDate(subscriptionExpiration)}</strong></div>
                    <a className="self-center font-medium text-primary hover:underline"
                      href={isAi ? `/super-admin/ia-platform?tenantId=${tenant?.id}` : `/super-admin?tenantId=${tenant?.id}#tenants`}>
                      Gérer l’abonnement
                    </a>
                  </div>
                )}
              </div>
            );
          })}
          {!tenant?.modules.length && <p className="text-sm text-muted-foreground">Aucun module disponible.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
