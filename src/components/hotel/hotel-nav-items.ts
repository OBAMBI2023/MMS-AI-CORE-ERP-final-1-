import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  KeyRound,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";

export type HotelNavItem = {
  icon: LucideIcon;
  label: string;
  to: string;
};

export const HOTEL_NAV_ITEMS: HotelNavItem[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", to: "/hotel" },
  { icon: CalendarCheck, label: "Réservations", to: "/hotel/reservations" },
  { icon: BedDouble, label: "Chambres", to: "/hotel/chambres" },
  { icon: KeyRound, label: "Check-in / Check-out", to: "/hotel/checkin-checkout" },
  { icon: Users, label: "Clients", to: "/hotel/clients" },
  { icon: Receipt, label: "Facturation", to: "/hotel/facturation" },
  { icon: Wallet, label: "Caisse", to: "/hotel/caisse" },
  { icon: Wallet, label: "Dépenses", to: "/hotel/depenses" },
  { icon: BarChart3, label: "Rapports", to: "/hotel/rapports" },
  { icon: Settings, label: "Paramètres", to: "/hotel/parametres" },
];

export const HOTEL_BOTTOM_NAV_ITEMS: HotelNavItem[] = [
  { icon: LayoutDashboard, label: "Accueil", to: "/hotel" },
  { icon: CalendarCheck, label: "Réservations", to: "/hotel/reservations" },
  { icon: BedDouble, label: "Chambres", to: "/hotel/chambres" },
  { icon: KeyRound, label: "Check-in", to: "/hotel/checkin-checkout" },
];
