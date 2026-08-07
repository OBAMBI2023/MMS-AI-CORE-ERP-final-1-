import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Layers3, Loader2 } from "lucide-react";
import {
  assignModulePack,
  manageTenantModule,
  type SuperAdminModulePack,
  type SuperAdminTenant,
  type SuperAdminTenantModule,
} from "@/lib/super-admin.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CRITICAL_MODULE_CODES,
  iconForModule,
  isActive,
  statusLabels,
} from "@/components/super-admin/shared";

type BulkAction = "enable" | "disable" | null;

export function TenantModuleControlPanel({
  tenants,
  modulePacks,
  selectedTenantId,
  onSelectedTenantIdChange,
}: {
  tenants: SuperAdminTenant[];
  modulePacks: SuperAdminModulePack[];
  selectedTenantId: string | null;
  onSelectedTenantIdChange: (tenantId: string) => void;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [selectedPackId, setSelectedPackId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [confirmModule, setConfirmModule] = useState<SuperAdminTenantModule | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const tenant = useMemo(
    () => tenants.find((item) => item.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId],
  );

  useEffect(() => {
    setOverrides({});
    setSelectedPackId(tenant?.pack?.id ?? "");
  }, [tenant?.id, tenant?.modules, tenant?.pack?.id]);

  const modules = useMemo(
    () =>
      (tenant?.modules ?? []).map((module) => ({
        ...module,
        enabled: overrides[module.id] ?? module.enabled,
      })),
    [tenant?.modules, overrides],
  );

  const commitToggle = async (
    tenantId: string,
    module: SuperAdminTenantModule,
    nextEnabled: boolean,
  ) => {
    setOverrides((current) => ({ ...current, [module.id]: nextEnabled }));
    setPendingModuleId(module.id);
    try {
      await manageTenantModule({ data: { tenantId, moduleId: module.id, enabled: nextEnabled } });
      toast.success(nextEnabled ? `${module.name} activé.` : `${module.name} désactivé.`);
      await router.invalidate();
    } catch (error) {
      setOverrides((current) => ({ ...current, [module.id]: !nextEnabled }));
      toast.error(
        error instanceof Error ? error.message : "Impossible de mettre à jour le module.",
      );
    } finally {
      setPendingModuleId(null);
    }
  };

  const toggleModule = (module: SuperAdminTenantModule, nextEnabled: boolean) => {
    if (!tenant) return;
    if (!nextEnabled && CRITICAL_MODULE_CODES.has(module.code)) {
      setConfirmModule(module);
      return;
    }
    void commitToggle(tenant.id, module, nextEnabled);
  };

  const runBulk = async (action: "enable" | "disable") => {
    if (!tenant) return;
    const targetEnabled = action === "enable";
    const targets = modules.filter((module) => module.enabled !== targetEnabled);
    if (targets.length === 0) {
      setBulkAction(null);
      return;
    }
    setBulkBusy(true);
    setOverrides((current) => {
      const next = { ...current };
      for (const module of targets) next[module.id] = targetEnabled;
      return next;
    });
    const results = await Promise.allSettled(
      targets.map((module) =>
        manageTenantModule({
          data: { tenantId: tenant.id, moduleId: module.id, enabled: targetEnabled },
        }),
      ),
    );
    const failed = targets.filter((_, index) => results[index].status === "rejected");
    if (failed.length > 0) {
      setOverrides((current) => {
        const next = { ...current };
        for (const module of failed) next[module.id] = !targetEnabled;
        return next;
      });
      toast.error(`${failed.length} module(s) n’ont pas pu être mis à jour.`);
    }
    if (failed.length < targets.length) {
      toast.success(targetEnabled ? "Modules activés." : "Modules désactivés.");
    }
    setBulkBusy(false);
    setBulkAction(null);
    await router.invalidate();
  };

  const applyPack = async () => {
    if (!tenant || !selectedPackId) return;
    setAssigning(true);
    try {
      await assignModulePack({ data: { tenantId: tenant.id, packId: selectedPackId } });
      toast.success("Pack attribué et modules synchronisés.");
      setOverrides({});
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’attribuer le pack.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Card
      id="controle-modules"
      className="scroll-mt-24 flex h-fit flex-col gap-4 rounded-xl border-border/70 p-5 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold">Contrôle des modules</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Activer ou désactiver les modules par tenant
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tenant</p>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              className="h-11 w-full justify-between rounded-lg px-3 font-normal"
            >
              {tenant ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/15 to-blue-500/15 text-xs font-semibold text-violet-600 dark:text-violet-300">
                    {tenant.name.charAt(0).toLocaleUpperCase("fr")}
                  </span>
                  <span className="truncate">{tenant.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 border-0 text-[10px]",
                      isActive(tenant.status)
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {statusLabels[tenant.status] ?? tenant.status}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">Sélectionner un tenant…</span>
              )}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher un tenant..." />
              <CommandList>
                <CommandEmpty>Aucun tenant trouvé.</CommandEmpty>
                <CommandGroup>
                  {tenants.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => {
                        onSelectedTenantIdChange(item.id);
                        setPickerOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          item.id === selectedTenantId ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
                        {item.name.charAt(0).toLocaleUpperCase("fr")}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {statusLabels[item.status] ?? item.status}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!tenant ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
          <Layers3 className="mb-2 size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Aucun tenant sélectionné</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisissez un tenant pour afficher et modifier ses modules actifs.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-xs font-medium text-muted-foreground">Appliquer un pack</p>
            <div className="mt-2 flex gap-2">
              <Select value={selectedPackId} onValueChange={setSelectedPackId}>
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="Sélectionner un pack" />
                </SelectTrigger>
                <SelectContent>
                  {modulePacks
                    .filter((pack) => pack.is_active)
                    .map((pack) => (
                      <SelectItem key={pack.id} value={pack.id}>
                        {pack.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => void applyPack()}
                disabled={!selectedPackId || assigning || selectedPackId === tenant.pack?.id}
              >
                {assigning ? <Loader2 className="size-4 animate-spin" /> : "Attribuer"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {modules.length} module{modules.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                disabled={bulkBusy || modules.length === 0}
                onClick={() => void runBulk("enable")}
              >
                Tout activer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                disabled={bulkBusy || modules.length === 0}
                onClick={() => setBulkAction("disable")}
              >
                Tout désactiver
              </Button>
            </div>
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {modules.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Aucun module disponible pour ce tenant.
              </p>
            ) : (
              modules.map((module) => {
                const Icon = iconForModule(module.icon);
                const busy = pendingModuleId === module.id || bulkBusy;
                return (
                  <div
                    key={module.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{module.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {module.description ?? module.code}
                      </p>
                    </div>
                    <Switch
                      checked={module.enabled}
                      disabled={busy}
                      onCheckedChange={(enabled) => toggleModule(module, enabled)}
                      aria-label={`${module.enabled ? "Désactiver" : "Activer"} ${module.name}`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <AlertDialog
        open={Boolean(confirmModule)}
        onOpenChange={(open) => !open && setConfirmModule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver « {confirmModule?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce module est essentiel au fonctionnement courant de {tenant?.name ?? "ce tenant"}. Le
              désactiver peut bloquer l’accès de ses utilisateurs à certaines fonctions de la
              plateforme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                const module = confirmModule;
                setConfirmModule(null);
                if (tenant && module) void commitToggle(tenant.id, module, false);
              }}
            >
              Désactiver quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkAction === "disable"}
        onOpenChange={(open) => !open && !bulkBusy && setBulkAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout désactiver pour {tenant?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              La désactivation massive peut bloquer des fonctionnalités du tenant. Cette action
              s’applique à tous les modules actuellement activés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void runBulk("disable");
              }}
            >
              {bulkBusy ? "Désactivation…" : "Tout désactiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
