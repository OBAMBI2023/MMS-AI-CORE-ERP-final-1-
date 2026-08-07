import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { iconForModule } from "@/components/super-admin/shared";
import type { SuperAdminDashboard } from "@/lib/super-admin.server";

export function ModulesCatalogSection({ modules }: { modules: SuperAdminDashboard["modules"] }) {
  const sorted = [...modules].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id="modules" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Modules</h2>
        <p className="text-sm text-muted-foreground">
          Catalogue des modules disponibles sur la plateforme. Utilisez le panneau « Contrôle des
          modules » pour les activer ou les désactiver par tenant.
        </p>
      </div>
      {sorted.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">Aucun module au catalogue.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((module) => {
            const Icon = iconForModule(module.icon);
            return (
              <Card
                key={module.id}
                className="flex items-start gap-3 rounded-xl border-border/70 p-4 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{module.name}</p>
                    <Badge
                      variant={module.is_active ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {module.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {module.code}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {module.description ?? "Aucune description"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
