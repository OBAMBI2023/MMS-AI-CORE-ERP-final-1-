import { motion } from "framer-motion";
import { Home, Wallet, FileText, Receipt, Menu } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Accueil", to: "/app" },
  { icon: Wallet, label: "Ventes", to: "/ventes" },
  { icon: FileText, label: "Devis", to: "/devis" },
  { icon: Receipt, label: "Dépenses", to: "/depenses" },
] as const;

export function BottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-3 z-40 flex items-center justify-around gap-0.5 rounded-[24px] border border-border/60 bg-card/85 px-1.5 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 md:hidden dark:bg-[#151B2F]/85 dark:border-white/5 dark:shadow-black/40"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {items.map((it) => {
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition-colors"
          >
            {active && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute inset-0 rounded-2xl bg-primary/10"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <it.icon
              className={cn(
                "relative h-5 w-5 transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className={cn("relative", active ? "text-primary" : "text-muted-foreground")}>
              {it.label}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium text-muted-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        Menu
      </button>
    </nav>
  );
}
