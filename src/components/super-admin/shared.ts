import {
  Bot,
  BedDouble,
  Boxes,
  Briefcase,
  CalendarDays,
  ChartNoAxesCombined,
  ContactRound,
  FileText,
  Handshake,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Receipt,
  ReceiptText,
  Settings,
  Settings2,
  ShoppingCart,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { SubscriptionBillingCycle } from "@/lib/super-admin.server";

export const numberFormatter = new Intl.NumberFormat("fr-FR");

export function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function isActive(status: string) {
  return ["trial", "active"].includes(status.trim().toLowerCase());
}

export const statusLabels: Record<string, string> = {
  trial: "Essai",
  active: "Active",
  expired: "Expirée",
  suspended: "Suspendue",
};

export const cycleLabels: Record<SubscriptionBillingCycle, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

/**
 * erp_modules.icon stores a lucide-react component name (seeded in SQL migrations).
 * Unknown/new names fall back to a generic icon instead of crashing the panel.
 */
const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Wallet,
  Briefcase,
  Users,
  Handshake,
  ShoppingCart,
  Receipt,
  ReceiptText,
  FileText,
  TrendingUp,
  Settings,
  Settings2,
  UserCog,
  Boxes,
  Bot,
  MessageSquareText,
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  ContactRound,
  ChartNoAxesCombined,
  Wrench,
};

export function iconForModule(iconName: string | null | undefined): LucideIcon {
  if (iconName && MODULE_ICON_MAP[iconName]) return MODULE_ICON_MAP[iconName];
  return Package;
}

/**
 * Codes with no DB "is_system" flag but whose loss breaks a tenant's basic
 * usage of the platform — disabling them asks for an extra confirmation.
 */
export const CRITICAL_MODULE_CODES = new Set(["dashboard", "settings", "users"]);
