import { motion } from "framer-motion";
import {
  Home,
  Wallet,
  FileText,
  Users,
  Briefcase,
  ShoppingCart,
  Handshake,
  Receipt,
  TrendingUp,
  Settings,
  Boxes,
  Tags,
  Bot,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { isAdminOnlyRoute, isAdministratorRole } from "@/lib/route-permissions";
import { routeModules } from "@/lib/route-modules";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { catalogRouteEnabled } from "@/lib/catalog-settings";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Dashboard", to: "/app" },
  { icon: Bot, label: "Assistant IA", to: "/app/assistant-ia" },
  { icon: Wallet, label: "Ventes (POS)", to: "/ventes" },
  { icon: FileText, label: "Devis", to: "/devis" },
  { icon: Users, label: "Clients", to: "/clients" },
  { icon: Briefcase, label: "Produits & Services", to: "/services" },
  { icon: Tags, label: "Catégories", to: "/categories" },
  { icon: Boxes, label: "Stock", to: "/stock" },
  { icon: ShoppingCart, label: "Achats", to: "/achats" },
  { icon: Handshake, label: "Fournisseurs", to: "/fournisseurs" },
  { icon: Receipt, label: "Dépenses", to: "/depenses" },
  { icon: TrendingUp, label: "Rapports", to: "/rapports" },
  { icon: Settings, label: "Paramètres", to: "/parametres" },
] as const;

export function SidebarContent({
  onItemClick,
  compact = false,
}: {
  onItemClick?: () => void;
  compact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = usePermissions();
  const modulesQuery = useTenantModules();
  const catalogSettingsQuery = useCatalogSettings();
  const role = data?.role;

  const filteredItems = items.filter((it) => {
    if (isLoading || modulesQuery.isLoading || catalogSettingsQuery.isLoading) return false;
    if (!catalogRouteEnabled(catalogSettingsQuery.data, it.to)) return false;
    const requiredModule = routeModules[it.to];
    if (requiredModule && !modulesQuery.data?.has(requiredModule)) return false;
    if (isAdminOnlyRoute(it.to)) {
      return isAdministratorRole(role);
    }
    return true;
  });

  return (
    <nav className={cn("flex-1 flex flex-col", compact ? "gap-0.5" : "gap-1 mt-2")}>
      {filteredItems.map((it, idx) => {
        const active =
          pathname === it.to ||
          (it.to === "/parametres" && pathname.startsWith("/settings/"));

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
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <it.icon className={`relative h-[18px] w-[18px] shrink-0 ${active ? "text-white" : ""}`} />
            <span className={`relative truncate ${active ? "text-white" : ""}`}>
              {it.to === "/services"
                ? catalogSettingsQuery.data?.catalog_mode === "products"
                  ? "Produits"
                  : catalogSettingsQuery.data?.catalog_mode === "services"
                    ? "Services"
                    : it.label
                : it.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
