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
  UserCog,
  Boxes,
  Tags,
  Bot,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { routePermissions } from "@/lib/route-permissions";
import { routeModules } from "@/lib/route-modules";

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
  { icon: UserCog, label: "Utilisateurs", to: "/utilisateurs" },
] as const;

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = usePermissions();
  const modulesQuery = useTenantModules();
  const permissions = data?.permissions || [];
  const role = data?.role;

  const filteredItems = items.filter((it) => {
    if (isLoading || modulesQuery.isLoading) return false;
    const requiredModule = routeModules[it.to];
    if (requiredModule && !modulesQuery.data?.has(requiredModule)) return false;
    const requiredPermission = routePermissions[it.to];
    if (requiredPermission) {
      return permissions.includes(requiredPermission);
    }
    return true;
  });

  return (
    <nav className="flex-1 flex flex-col gap-1 mt-2">
      {filteredItems.map((it, idx) => {
        const active = pathname === it.to;

        return (
          <Link
            key={`${it.label}-${idx}`}
            to={it.to}
            onClick={onItemClick}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/75 hover:text-white transition-colors"
          >
            {active && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <it.icon className={`relative h-[18px] w-[18px] ${active ? "text-white" : ""}`} />
            <span className={`relative ${active ? "text-white" : ""}`}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
