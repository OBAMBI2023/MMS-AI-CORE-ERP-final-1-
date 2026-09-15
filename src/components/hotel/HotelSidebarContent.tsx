import { motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import { HOTEL_NAV_ITEMS } from "./hotel-nav-items";
import { useActionPermission } from "@/hooks/use-action-permission";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { hotelRouteModules } from "@/lib/route-modules";
import { cn } from "@/lib/utils";

export function HotelSidebarContent({
  onItemClick,
  compact = false,
}: {
  onItemClick?: () => void;
  compact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // isPending, not isLoading: usePermissions() is enabled: !loading &&
  // Boolean(tenantId), and a disabled query's isLoading stays false even
  // with no data yet — isPending is the flag that's actually true whenever
  // permissions data is still unresolved.
  const { isPending: permissionsLoading } = usePermissions();
  const modulesQuery = useTenantModules();
  // Governed by the hotel.settings.view RBAC permission, not the
  // Administrateur role name — see the identical fix/rationale in
  // HotelParametresPage.tsx, the page this link points to.
  const canViewHotelSettings = useActionPermission("hotel.settings.view");
  const canViewMaintenance = useActionPermission("hotel.maintenance.view");

  const visibleItems = HOTEL_NAV_ITEMS.filter((it) => {
    if (it.to === "/hotel/parametres" && !canViewHotelSettings) return false;
    if (it.to === "/hotel/maintenance") {
      if (!canViewMaintenance) return false;
      return true;
    }
    const requiredModule = hotelRouteModules[it.to];
    if (requiredModule) {
      if (modulesQuery.isLoading || permissionsLoading) return false;
      if (!modulesQuery.data?.has(requiredModule)) return false;
    }
    return true;
  });

  return (
    <nav className={cn("flex-1 flex flex-col", compact ? "gap-0.5" : "gap-1 mt-2")}>
      {visibleItems.map((it, idx) => {
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
            <it.icon
              className={`relative h-[18px] w-[18px] shrink-0 ${active ? "text-white" : ""}`}
            />
            <span className={`relative truncate ${active ? "text-white" : ""}`}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
