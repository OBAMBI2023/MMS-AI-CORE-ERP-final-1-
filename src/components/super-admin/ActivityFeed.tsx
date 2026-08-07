import { useQuery } from "@tanstack/react-query";
import { Activity, KeyRound, Layers3, Power, PowerOff, ShieldAlert, UserCog } from "lucide-react";
import { getSuperAdminActivity } from "@/lib/super-admin.server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/components/super-admin/shared";

const ACTION_META: Record<string, { label: string; icon: typeof Activity; tone: string }> = {
  tenant_module_enabled: {
    label: "Module activé",
    icon: Power,
    tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
  },
  tenant_module_disabled: {
    label: "Module désactivé",
    icon: PowerOff,
    tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/60",
  },
  tenant_module_pack_assigned: {
    label: "Pack attribué",
    icon: Layers3,
    tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/60",
  },
  module_pack_saved: {
    label: "Pack mis à jour",
    icon: Layers3,
    tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/60",
  },
  module_pack_removed: {
    label: "Pack supprimé",
    icon: Layers3,
    tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/60",
  },
  tenant_subscription_updated: {
    label: "Licence modifiée",
    icon: KeyRound,
    tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/60",
  },
  "tenant.suspend": {
    label: "Tenant suspendu",
    icon: ShieldAlert,
    tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/60",
  },
  "tenant.reactivate": {
    label: "Tenant réactivé",
    icon: Activity,
    tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
  },
  "tenant.soft_delete": {
    label: "Tenant supprimé",
    icon: ShieldAlert,
    tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/60",
  },
  "tenant.restore": {
    label: "Tenant restauré",
    icon: UserCog,
    tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
  },
};

function metaFor(action: string) {
  return (
    ACTION_META[action] ?? { label: action, icon: Activity, tone: "text-muted-foreground bg-muted" }
  );
}

export function ActivityFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["super-admin-activity"],
    queryFn: () => getSuperAdminActivity(),
    staleTime: 30_000,
  });

  return (
    <section id="activite" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Activité récente</h2>
        <p className="text-sm text-muted-foreground">
          Modules activés/désactivés, packs et licences modifiés par les Super Admins.
        </p>
      </div>
      <Card className="divide-y divide-border/70 overflow-hidden rounded-xl border-border/70 shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Impossible de charger l’activité récente.
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune activité enregistrée pour le moment.
          </div>
        ) : (
          data.map((item) => {
            const meta = metaFor(item.action);
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{meta.label}</p>
                    {item.tenantName && (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {item.tenantName}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.actorEmail ?? "Super Admin"} · {formatDate(item.createdAt, true)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </section>
  );
}
