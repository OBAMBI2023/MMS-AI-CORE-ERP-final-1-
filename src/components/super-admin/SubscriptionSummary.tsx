import { Activity, CalendarClock, CreditCard, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mms/format";
import { numberFormatter } from "@/components/super-admin/shared";
import type { SuperAdminDashboard } from "@/lib/super-admin.server";

export function SubscriptionSummary({ data }: { data: SuperAdminDashboard["subscriptions"] }) {
  const items = [
    {
      label: "Licences actives",
      value: numberFormatter.format(data.active),
      icon: KeyRound,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
    },
    {
      label: "Essais",
      value: numberFormatter.format(data.trials),
      icon: CalendarClock,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60",
    },
    {
      label: "Expirés",
      value: numberFormatter.format(data.expired),
      icon: Activity,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60",
    },
    {
      label: "Revenus récurrents",
      value: formatCurrency(data.recurringRevenue),
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60",
    },
  ];

  return (
    <section id="licences" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Résumé des abonnements</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Indicateurs issus des abonnements enregistrés
        </p>
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
