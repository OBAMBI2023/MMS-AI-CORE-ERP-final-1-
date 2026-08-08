import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { HOTEL_BOTTOM_NAV_ITEMS } from "./hotel-nav-items";
import { cn } from "@/lib/utils";

export function HotelBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-3 z-40 flex items-center justify-around gap-0.5 rounded-[24px] border border-border/60 bg-card/85 px-1.5 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 md:hidden dark:bg-[#0F2E28]/85 dark:border-white/5 dark:shadow-black/40"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {HOTEL_BOTTOM_NAV_ITEMS.map((it) => {
        const active = it.to === "/hotel" ? pathname === "/hotel" : pathname.startsWith(it.to);
        return (
          <Link
            key={it.to}
            to={it.to}
            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition-colors"
          >
            {active && (
              <motion.div
                layoutId="hotel-bottom-nav-active"
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
