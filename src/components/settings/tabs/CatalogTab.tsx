import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, Component, Loader2 } from "lucide-react";
import { Panel } from "@/components/settings/tabs/GeneralTab";
import { Button } from "@/components/ui/button";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<string, string> = {
  products: "Produits",
  services: "Services",
  mixed: "Produits + Services",
};

export function CatalogTab() {
  const settingsQuery = useCatalogSettings();
  const settings = settingsQuery.data;

  if (settingsQuery.isLoading || !settings) {
    return (
      <Panel title="Catalogue" description="Chargement de la configuration du catalogue…" icon={<Component className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Panel>
    );
  }

  const badges = [
    { label: "Mode", value: MODE_LABELS[settings.catalog_mode] ?? settings.catalog_mode, active: true },
    { label: "Stock", active: settings.stock_enabled },
    { label: "Achats", active: settings.purchases_enabled },
    { label: "Fournisseurs", active: settings.suppliers_enabled },
    { label: "Produits en vente", active: settings.products_in_sales_enabled },
    { label: "Services en vente", active: settings.services_in_sales_enabled },
    { label: "Codes catalogue", active: settings.catalog_codes_enabled },
  ];

  return (
    <Panel title="Catalogue" description={MODE_LABELS[settings.catalog_mode] ?? settings.catalog_mode} icon={<Component className="h-5 w-5" />}>
      <Button asChild className="w-full sm:w-auto">
        <Link to="/settings/catalogue">Configurer</Link>
      </Button>

      <div className="mt-5 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
              badge.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400" : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {badge.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
            {badge.label}
            {"value" in badge && badge.value && <span className="font-normal opacity-80">{badge.value}</span>}
            {!("value" in badge) && <span className="font-normal opacity-80">{badge.active ? "Activé" : "Désactivé"}</span>}
          </span>
        ))}
      </div>
    </Panel>
  );
}
