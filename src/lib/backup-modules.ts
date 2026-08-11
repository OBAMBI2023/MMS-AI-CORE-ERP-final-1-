import {
  ShoppingCart,
  Users,
  Truck,
  Boxes,
  ShoppingBag,
  Receipt,
  FileSignature,
  CalendarCheck,
  BedDouble,
  Wrench,
  Settings,
  type LucideIcon,
} from "lucide-react";

// Sauvegardes: French labels for the modules that can be backed up. Codes
// match src/lib/route-modules.ts's routeModules values and
// supabase/functions/_shared/backup-modules.ts's registry, so the checkbox
// list composes directly with useTenantModules()'s enabled-module set.
export interface BackupModuleOption {
  code: string;
  label: string;
  icon: LucideIcon;
}

export const BACKUP_MODULE_OPTIONS: BackupModuleOption[] = [
  { code: "sales", label: "Ventes", icon: ShoppingCart },
  { code: "customers", label: "Clients", icon: Users },
  { code: "suppliers", label: "Fournisseurs", icon: Truck },
  { code: "products_services", label: "Produits", icon: Boxes },
  { code: "purchases", label: "Achats", icon: ShoppingBag },
  { code: "expenses", label: "Dépenses", icon: Receipt },
  { code: "quotes", label: "Devis", icon: FileSignature },
];

export const BACKUP_MODULE_LABELS: Record<string, string> = Object.fromEntries(
  BACKUP_MODULE_OPTIONS.map((m) => [m.code, m.label]),
);

// Hotel side: only icons are kept here (presentation-only, no live source for
// those). Labels are deliberately NOT duplicated here — they're read live
// from erp_modules.name via useHotelBackupModules() (src/hooks/use-hotel-
// backup-modules.ts), the same table already used by useTenantModules() to
// resolve which modules are enabled. These codes match the HOTEL_BACKUP_
// MODULES keys in supabase/functions/_shared/backup-modules.ts exactly —
// that Edge Function registry remains the sole source of truth for which
// tables each module actually exports; this map only decides which icon a
// module gets and which known codes the checklist may offer.
export const HOTEL_BACKUP_MODULE_ICONS: Record<string, LucideIcon> = {
  hotel_reservations: CalendarCheck,
  hotel_guests: Users,
  hotel_rooms: BedDouble,
  hotel_maintenance: Wrench,
  hotel_expenses: Receipt,
  hotel_invoicing: FileSignature,
  hotel_settings: Settings,
};
