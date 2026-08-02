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
  Hotel,
  CalendarDays,
  BedDouble,
  ContactRound,
  ChartNoAxesCombined,
  Settings2,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { routePermissions } from "@/lib/route-permissions";
import { routeModules } from "@/lib/route-modules";
import { canAccessParties } from "@/lib/party-access";
import { useCatalogSettings } from "@/hooks/use-catalog-settings";
import { catalogRouteEnabled } from "@/lib/catalog-settings";
import { useTenant } from "@/providers/TenantProvider";

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
  { icon: Hotel, label: "Tableau de bord", to: "/hotel" },
  { icon: CalendarDays, label: "Réservations", to: "/hotel/reservations" },
  { icon: BedDouble, label: "Logements", to: "/hotel/chambres" },
  { icon: ContactRound, label: "Voyageurs", to: "/hotel/voyageurs" },
  { icon: ChartNoAxesCombined, label: "Rapports", to: "/hotel/rapports" },
  { icon: Settings2, label: "Paramètres", to: "/hotel/parametres" },
] as const;

const hotelPaths = new Set([
  "/hotel",
  "/hotel/reservations",
  "/hotel/logements",
  "/hotel/chambres",
  "/hotel/voyageurs",
  "/depenses",
  "/hotel/rapports",
  "/hotel/parametres",
]);

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = usePermissions();
  const modulesQuery = useTenantModules();
  const catalogSettingsQuery = useCatalogSettings();
  const { tenant } = useTenant();
  const isHotel = tenant?.platform_type === "HOTEL";
  const permissions = data?.permissions || [];
  const role = data?.role;

  const filteredItems = items.filter((it) => {
    if (isLoading || modulesQuery.isLoading || catalogSettingsQuery.isLoading) return false;
    if (isHotel !== hotelPaths.has(it.to)) return false;
    if (!catalogRouteEnabled(catalogSettingsQuery.data, it.to)) return false;
    const requiredModule = routeModules[it.to];
    if (requiredModule && !modulesQuery.data?.has(requiredModule)) return false;
    if (it.to === "/clients" || it.to === "/fournisseurs") {
      return canAccessParties(role, permissions);
    }
    const requiredPermission = routePermissions[it.to];
    if (requiredPermission) {
      return role === "Administrateur" || permissions.includes(requiredPermission);
    }
    return true;
  });

  return (
    <nav className="flex-1 flex flex-col gap-1 mt-2">
      {filteredItems.map((it, idx) => {
        const active =
          pathname === it.to ||
          (it.to === "/parametres" && pathname.startsWith("/settings/"));

        return (
          <Link
            key={`${it.label}-${idx}`}
            to={it.to}
            preload="intent"
            onClick={onItemClick}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:text-white ${isHotel ? "hover:bg-white/5" : ""}`}
          >
            {active && (
              <motion.div
                layoutId="sidebar-active"
                className={`absolute inset-0 rounded-xl ${isHotel ? "bg-[#C9A227] shadow-lg shadow-black/10" : "bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40"}`}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <it.icon className={`relative h-[18px] w-[18px] ${active ? (isHotel ? "text-[#0F172A]" : "text-white") : ""}`} />
            <span className={`relative ${active ? (isHotel ? "text-[#0F172A]" : "text-white") : ""}`}>
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
