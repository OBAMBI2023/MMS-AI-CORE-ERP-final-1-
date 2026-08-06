import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SecondaryAccent = "sky" | "violet" | "primary" | "amber";

const accentMap: Record<SecondaryAccent, string> = {
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export function DashboardSecondaryCard({
  title,
  value,
  icon: Icon,
  route,
  accent = "primary",
  index = 0,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  route: string;
  accent?: SecondaryAccent;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="h-full"
    >
      <a
        href={route}
        className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-lg font-bold tracking-tight">{value}</p>
        </div>
      </a>
    </motion.div>
  );
}
