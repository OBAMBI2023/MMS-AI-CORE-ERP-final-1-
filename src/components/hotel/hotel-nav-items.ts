import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  KeyRound,
  Users,
  Receipt,
  ReceiptText,
  Banknote,
  BarChart3,
  Wrench,
  Settings,
  MessageCircle,
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
  { icon: KeyRound, label: "Arrivées / Départs", to: "/hotel/checkin-checkout" },
  { icon: Users, label: "Clients", to: "/hotel/clients" },
  { icon: Receipt, label: "Facturation", to: "/hotel/facturation" },
  { icon: Banknote, label: "Caisse", to: "/hotel/caisse" },
  { icon: ReceiptText, label: "Dépenses", to: "/hotel/depenses" },
  { icon: Wrench, label: "Prestataires", to: "/hotel/maintenance" },
  { icon: BarChart3, label: "Rapports", to: "/hotel/rapports" },
  { icon: Settings, label: "Paramètres", to: "/hotel/parametres" },
  { icon: MessageCircle, label: "Support", to: "/support" },
];

export const HOTEL_BOTTOM_NAV_ITEMS: HotelNavItem[] = [
  { icon: LayoutDashboard, label: "Accueil", to: "/hotel" },
  { icon: CalendarCheck, label: "Réservations", to: "/hotel/reservations" },
  { icon: BedDouble, label: "Chambres", to: "/hotel/chambres" },
  { icon: KeyRound, label: "Arrivées / Départs", to: "/hotel/checkin-checkout" },
];
