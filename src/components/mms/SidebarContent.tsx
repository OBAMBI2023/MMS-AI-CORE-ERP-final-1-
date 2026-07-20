import { motion } from "framer-motion";
import {
  Home,
  Bot,
  Wallet,
  FileText,
  Users,
  Briefcase,
  ShoppingCart,
  Handshake,
  Receipt,
  TrendingUp,
  Settings,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

const items = [
  { icon: Home, label: "Dashboard", to: "/" },
  // { icon: Bot, label: "Assistant IA", to: "/assistant" },
  { icon: Wallet, label: "Ventes (POS)", to: "/ventes" },
  { icon: FileText, label: "Devis", to: "/devis" },
  { icon: Users, label: "Clients", to: "/clients" },
  { icon: Briefcase, label: "Services", to: "/services" },
  { icon: ShoppingCart, label: "Achats", to: "/achats" },
  { icon: Handshake, label: "Fournisseurs", to: "/fournisseurs" },
  { icon: Receipt, label: "Dépenses", to: "/depenses" },
  { icon: TrendingUp, label: "Rapports", to: "/rapports" },
  { icon: Settings, label: "Paramètres", to: "/parametres" },
] as const;

export function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex-1 flex flex-col gap-1 mt-2">
      {items.map((it, idx) => {
        const isActive = pathname === it.to && !(it.to === "/" && idx === 0 && pathname === "/");
        const active =
          it.to === "/ventes"
            ? pathname.startsWith("/ventes")
            : pathname === it.to && idx !== 0
              ? true
              : isActive;

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
