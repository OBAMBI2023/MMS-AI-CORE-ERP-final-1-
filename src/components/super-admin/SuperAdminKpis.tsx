import { type ComponentType } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, CircleDollarSign, Gauge, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/mms/format";
import { numberFormatter } from "@/components/super-admin/shared";
import type { SuperAdminDashboard } from "@/lib/super-admin.server";

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

export function SuperAdminKpis({ kpis }: { kpis: SuperAdminDashboard["kpis"] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Total tenants"
        value={numberFormatter.format(kpis.tenants)}
        icon={Building2}
        tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60"
        note="Comptes enregistrés"
      />
      <KpiCard
        title="Tenants actifs"
        value={numberFormatter.format(kpis.activeTenants)}
        icon={Gauge}
        tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"
        note="Statut actif"
      />
      <KpiCard
        title="Utilisateurs"
        value={numberFormatter.format(kpis.users)}
        icon={Users}
        tone="bg-violet-50 text-violet-600 dark:bg-violet-950/60"
        note="Profils rattachés"
      />
      <KpiCard
        title="Ventes totales"
        value={numberFormatter.format(kpis.sales)}
        icon={BarChart3}
        tone="bg-amber-50 text-amber-600 dark:bg-amber-950/60"
        note="Transactions enregistrées"
      />
      <KpiCard
        title="CA total"
        value={formatCurrency(kpis.revenue)}
        icon={CircleDollarSign}
        tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60"
        note="Toutes ventes confondues"
      />
    </section>
  );
}
