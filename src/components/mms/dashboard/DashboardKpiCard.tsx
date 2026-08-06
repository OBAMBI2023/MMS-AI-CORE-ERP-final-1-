import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { SparkPoint } from "@/hooks/use-dashboard-data";
import { cn } from "@/lib/utils";

export type KpiAccent =
  "primary" | "emerald" | "amber" | "violet" | "sky" | "rose" | "indigo" | "cyan";

const accentMap: Record<KpiAccent, { icon: string; glow: string; stroke: string }> = {
  primary: {
    icon: "bg-primary/10 text-primary",
    glow: "from-primary/15",
    stroke: "hsl(var(--primary))",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    glow: "from-emerald-500/15",
    stroke: "#10b981",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    glow: "from-amber-500/15",
    stroke: "#f59e0b",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    glow: "from-violet-500/15",
    stroke: "#8b5cf6",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    glow: "from-sky-500/15",
    stroke: "#0ea5e9",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    glow: "from-rose-500/15",
    stroke: "#f43f5e",
  },
  indigo: {
    icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    glow: "from-indigo-500/15",
    stroke: "#6366f1",
  },
  cyan: {
    icon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    glow: "from-cyan-500/15",
    stroke: "#06b6d4",
  },
};

export function DashboardKpiCard({
  title,
  value,
  icon: Icon,
  route,
  trend,
  spark,
  accent = "primary",
  index = 0,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  route: string;
  trend: number | null;
  spark?: SparkPoint[];
  accent?: KpiAccent;
  index?: number;
}) {
  const colors = accentMap[accent];
  const trendUp = (trend ?? 0) > 0.001;
  const trendDown = (trend ?? 0) < -0.001;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      <a href={route} className="block h-full group">
        <div className="relative h-full overflow-hidden rounded-[20px] border border-border bg-card p-3.5 shadow-sm transition-shadow group-hover:shadow-lg group-hover:shadow-black/5 sm:rounded-[24px] sm:p-5 dark:bg-[#151B2F] dark:border-white/5 dark:shadow-none dark:group-hover:shadow-lg dark:group-hover:shadow-indigo-950/40">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100",
              colors.glow,
            )}
          />
          <div className="relative flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">{title}</p>
              <p className="mt-2 text-lg font-bold leading-none tracking-tight sm:mt-2.5 sm:text-[1.7rem]">{value}</p>
            </div>
            <div
              className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl", colors.icon)}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="relative mt-3 flex items-center justify-between gap-2 sm:mt-4">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold sm:text-xs",
                trend !== null && trendUp && "text-emerald-600 dark:text-emerald-400",
                trend !== null && trendDown && "text-rose-600 dark:text-rose-400",
                trend !== null && !trendUp && !trendDown && "text-muted-foreground",
                trend === null && "text-muted-foreground",
              )}
            >
              {trend !== null && trendUp && <ArrowUpRight className="h-3 w-3" />}
              {trend !== null && trendDown && <ArrowDownRight className="h-3 w-3" />}
              {trend !== null && !trendUp && !trendDown && <Minus className="h-3 w-3" />}
              {trend === null ? "—" : `${Math.abs(trend).toFixed(0)}%`}
            </span>
            {spark && spark.some((p) => p.value > 0) && (
              <div className="h-7 w-14 opacity-80 sm:h-8 sm:w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={colors.stroke}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </a>
    </motion.div>
  );
}
