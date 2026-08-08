import { motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import { HOTEL_NAV_ITEMS } from "./hotel-nav-items";
import { cn } from "@/lib/utils";

export function HotelSidebarContent({
  onItemClick,
  compact = false,
}: {
  onItemClick?: () => void;
  compact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className={cn("flex-1 flex flex-col", compact ? "gap-0.5" : "gap-1 mt-2")}>
      {HOTEL_NAV_ITEMS.map((it, idx) => {
        const active = it.to === "/hotel" ? pathname === "/hotel" : pathname.startsWith(it.to);

        return (
          <Link
            key={`${it.label}-${idx}`}
            to={it.to}
            onClick={onItemClick}
            className={cn(
              "relative flex items-center gap-3 rounded-xl text-sm font-medium text-sidebar-foreground/75 transition-colors hover:text-white touch-manipulation",
              compact ? "min-h-[48px] px-3 py-2" : "px-3 py-2.5",
            )}
          >
            {active && (
              <motion.div
                layoutId="hotel-sidebar-active"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <it.icon className={`relative h-[18px] w-[18px] shrink-0 ${active ? "text-white" : ""}`} />
            <span className={`relative truncate ${active ? "text-white" : ""}`}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
