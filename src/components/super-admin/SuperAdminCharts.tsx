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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mms/format";
import { numberFormatter } from "@/components/super-admin/shared";
import type { SuperAdminDashboard } from "@/lib/super-admin.server";

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

export function SuperAdminCharts({ dashboard }: { dashboard: SuperAdminDashboard }) {
  const tenantDistribution = [
    { name: "Actifs", value: dashboard.kpis.activeTenants, color: "#2563EB" },
    {
      name: "Autres",
      value: Math.max(0, dashboard.kpis.tenants - dashboard.kpis.activeTenants),
      color: "#CBD5E1",
    },
  ];
  const salesByTenant = [...dashboard.tenants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((tenant) => ({ name: tenant.name, value: tenant.revenue }));

  return (
    <section id="rapports" className="grid scroll-mt-24 gap-4 xl:grid-cols-12">
      <ChartCard
        title="Évolution des inscriptions"
        subtitle="Nouveaux tenants sur les 6 derniers mois"
        className="xl:col-span-6"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dashboard.registrations}
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
              <Tooltip formatter={(value) => [numberFormatter.format(Number(value)), "Tenants"]} />
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
          {dashboard.kpis.tenants === 0 ? (
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
                <span className="text-2xl font-bold">{dashboard.kpis.tenants}</span>
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
              <BarChart data={salesByTenant} layout="vertical" margin={{ left: -20, right: 8 }}>
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
  );
}
