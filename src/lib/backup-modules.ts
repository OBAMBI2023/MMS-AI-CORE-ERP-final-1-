import {
  ShoppingCart,
  Users,
  Truck,
  Boxes,
  ShoppingBag,
  Receipt,
  FileSignature,
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
