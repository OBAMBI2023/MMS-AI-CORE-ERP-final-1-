import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, BriefcaseBusiness, Check, Loader2, Package, Save, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { invalidateCatalogDependents, useCatalogSettings } from "@/hooks/use-catalog-settings";
import { useTenant } from "@/providers/TenantProvider";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogMode, CatalogSettings } from "@/lib/catalog-settings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/catalogue")({
  validateSearch: z.object({
    tenantId: z.string().uuid().optional(),
  }),
  component: CatalogueSettingsPage,
  head: () => ({ meta: [{ title: "Paramètres du catalogue" }] }),
});

const modes = [
  { value: "products", label: "Produits uniquement", description: "Pour les commerces vendant des articles physiques", icon: Package },
  { value: "services", label: "Services uniquement", description: "Pour les cabinets, agences et prestataires", icon: BriefcaseBusiness },
  { value: "mixed", label: "Produits + Services", description: "Pour les activités mixtes", icon: Boxes },
] as const;

type EditableSettings = Omit<CatalogSettings, "tenant_id" | "updated_at">;

function CatalogueSettingsPage() {
  const { profile } = useTenant();
  const { tenantId: requestedTenantId } = Route.useSearch();
  const tenantId = requestedTenantId ?? profile?.tenant_id;
  const queryClient = useQueryClient();
  const settingsQuery = useCatalogSettings(requestedTenantId);
  const [form, setForm] = useState<EditableSettings | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      const { tenant_id: _tenantId, updated_at: _updatedAt, ...editable } = settingsQuery.data;
      setForm(editable);
    }
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: async (value: EditableSettings) => {
      if (!tenantId) throw new Error("Locataire introuvable");
      const { error } = await supabase
        .from("tenant_catalog_settings")
        .update({ ...value, updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateCatalogDependents(queryClient, tenantId);
      setConfirmOpen(false);
      toast.success("Configuration du catalogue enregistrée");
    },
    onError: () => toast.error("Impossible d’enregistrer la configuration"),
  });

  const chooseMode = (catalog_mode: CatalogMode) => {
    setForm((current) => current && ({
      ...current,
      catalog_mode,
      stock_enabled: catalog_mode === "services" ? false : current.stock_enabled,
      purchases_enabled: catalog_mode === "services" ? false : current.purchases_enabled,
      suppliers_enabled: catalog_mode === "services" ? false : current.suppliers_enabled,
      services_in_sales_enabled: catalog_mode === "products" ? false : current.services_in_sales_enabled,
      products_in_sales_enabled: catalog_mode === "services" ? false : current.products_in_sales_enabled,
    }));
  };

  if (settingsQuery.isLoading) {
    return <AppShell title="Paramètres du catalogue"><div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div></AppShell>;
  }

  if (settingsQuery.isError || !form) {
    return (
      <AppShell title="Paramètres du catalogue">
        <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : "Impossible de charger les paramètres du catalogue."}
          <Button variant="outline" onClick={() => void settingsQuery.refetch()}>Réessayer</Button>
        </div>
      </AppShell>
    );
  }

  const selected = modes.find((mode) => mode.value === form.catalog_mode)!;
  const productAllowed = form.catalog_mode !== "services";
  const serviceAllowed = form.catalog_mode !== "products";
  const options = [
    { key: "stock_enabled", label: "Gestion du stock", disabled: !productAllowed },
    { key: "purchases_enabled", label: "Module achats", disabled: !productAllowed },
    { key: "suppliers_enabled", label: "Gestion des fournisseurs", disabled: !productAllowed },
    { key: "products_in_sales_enabled", label: "Produits dans les ventes, devis et factures", disabled: !productAllowed },
    { key: "services_in_sales_enabled", label: "Services dans les ventes, devis et factures", disabled: !serviceAllowed },
    { key: "catalog_codes_enabled", label: "Codes catalogue / SKU", disabled: !productAllowed },
  ] as const;

  return (
    <AppShell title="Paramètres du catalogue" subtitle="Adaptez l’ERP à l’activité de votre entreprise" actions={<div className="flex gap-2"><Button asChild variant="outline"><Link to="/parametres"><ArrowLeft className="mr-2 h-4 w-4" />Paramètres</Link></Button><Button onClick={() => setConfirmOpen(true)} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Enregistrer</Button></div>}>
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold">Type de catalogue</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les données masquées restent conservées et réapparaîtront si vous changez de mode.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {modes.map((mode) => {
                const active = form.catalog_mode === mode.value;
                return <button key={mode.value} type="button" onClick={() => chooseMode(mode.value)} className={cn("relative rounded-2xl border p-5 text-left transition-all hover:border-primary/50", active && "border-primary bg-primary/5 shadow-md shadow-primary/10")}>
                  {active && <span className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}
                  <mode.icon className={cn("mb-4 h-7 w-7 text-muted-foreground", active && "text-primary")} />
                  <div className="font-semibold">{mode.label}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mode.description}</p>
                </button>;
              })}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold">Options complémentaires</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {options.map((option) => <div key={option.key} className={cn("flex items-start gap-3 rounded-xl border p-4", option.disabled && "opacity-50")}>
                <Checkbox id={option.key} disabled={option.disabled} checked={form[option.key]} onCheckedChange={(checked) => setForm({ ...form, [option.key]: checked === true })} />
                <Label htmlFor={option.key} className="cursor-pointer leading-5">{option.label}</Label>
              </div>)}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-lg">
            <div className="bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground">
              <p className="text-xs font-medium uppercase tracking-widest opacity-80">Aperçu en direct</p>
              <h2 className="mt-2 text-xl font-bold">{selected.label}</h2>
            </div>
            <div className="space-y-3 p-5">
              {(productAllowed && form.products_in_sales_enabled) && <PreviewItem icon={<Package />} label="Produits" />}
              {(serviceAllowed && form.services_in_sales_enabled) && <PreviewItem icon={<BriefcaseBusiness />} label="Services" />}
              {(productAllowed && form.stock_enabled) && <PreviewItem icon={<Boxes />} label="Stock" />}
              {(productAllowed && form.purchases_enabled) && <PreviewItem icon={<ShoppingCart />} label="Achats" />}
              <p className="pt-2 text-xs text-muted-foreground">Cet aperçu reflète les éléments visibles dans la navigation et les documents commerciaux.</p>
            </div>
          </section>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer ce changement ?</AlertDialogTitle><AlertDialogDescription>Le catalogue passera en mode « {selected.label} ». Aucune donnée existante ne sera supprimée.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer et enregistrer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function PreviewItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3"><span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span><span className="text-sm font-medium">{label}</span></div>;
}
