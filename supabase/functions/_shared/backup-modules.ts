// Sauvegardes: module -> source table registry, one per platform. Codes
// match src/lib/route-modules.ts's routeModules values (ERP) and
// src/hooks/use-tenant-modules.ts's enabled-module codes (both platforms —
// the same tenant_modules/erp_modules tables back HOTEL module codes too),
// so the "only backup enabled modules" filter composes cleanly with the
// frontend for either platform. ERP and HOTEL module codes are disjoint
// strings (no key ever appears in both registries), which is what lets
// create-backup reject a module key that doesn't belong to the caller's
// own platform without any extra bookkeeping — see isBackupModuleCode.

export interface BackupModuleDef {
  label: string;
  tables: string[];
}

export const ERP_BACKUP_MODULES: Record<string, BackupModuleDef> = {
  sales: { label: "Ventes", tables: ["ventes", "vente_items"] },
  customers: { label: "Clients", tables: ["clients"] },
  suppliers: { label: "Fournisseurs", tables: ["fournisseurs"] },
  products_services: { label: "Produits", tables: ["services", "catalog_categories"] },
  purchases: { label: "Achats", tables: ["achats", "achat_items"] },
  expenses: { label: "Dépenses", tables: ["depenses"] },
  quotes: { label: "Devis", tables: ["devis", "devis_items"] },
};

// Table names and grouping verified directly against the live schema and
// the actual `.from("...")` calls in src/components/hotel/*.tsx — never
// guessed. hotel_reservation_balances is a VIEW derived from
// hotel_reservations/hotel_reservation_extras/hotel_reservation_payments,
// intentionally excluded (nothing to export, it's recomputed on read).
export const HOTEL_BACKUP_MODULES: Record<string, BackupModuleDef> = {
  hotel_reservations: {
    label: "Réservations",
    tables: ["hotel_reservations", "hotel_guest_companions"],
  },
  hotel_guests: { label: "Voyageurs / Clients", tables: ["hotel_guests"] },
  hotel_rooms: { label: "Chambres / Logements", tables: ["hotel_rooms", "hotel_room_types"] },
  hotel_maintenance: { label: "Prestataires", tables: ["hotel_maintenance_providers"] },
  hotel_expenses: { label: "Dépenses Hôtel", tables: ["hotel_expenses"] },
  hotel_invoicing: {
    label: "Facturation",
    tables: ["hotel_invoices", "hotel_reservation_extras", "hotel_reservation_payments"],
  },
  hotel_settings: { label: "Paramètres Hôtel", tables: ["hotel_settings"] },
};

export type PlatformType = "ERP" | "HOTEL";

export function normalizePlatformType(value: unknown): PlatformType {
  return value === "HOTEL" ? "HOTEL" : "ERP";
}

export function getBackupModuleRegistry(
  platformType: PlatformType,
): Record<string, BackupModuleDef> {
  return platformType === "HOTEL" ? HOTEL_BACKUP_MODULES : ERP_BACKUP_MODULES;
}

export function isBackupModuleCode(moduleCode: string, platformType: PlatformType): boolean {
  return Object.prototype.hasOwnProperty.call(getBackupModuleRegistry(platformType), moduleCode);
}
