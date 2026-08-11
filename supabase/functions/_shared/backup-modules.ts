// Sauvegardes: module -> source table registry. Codes match
// src/lib/route-modules.ts's routeModules values and
// src/hooks/use-tenant-modules.ts's enabled-module codes, so the "only
// backup enabled modules" filter composes cleanly with the frontend.

export interface BackupModuleDef {
  label: string;
  tables: string[];
}

export const BACKUP_MODULES: Record<string, BackupModuleDef> = {
  sales: { label: "Ventes", tables: ["ventes", "vente_items"] },
  customers: { label: "Clients", tables: ["clients"] },
  suppliers: { label: "Fournisseurs", tables: ["fournisseurs"] },
  products_services: { label: "Produits", tables: ["services", "catalog_categories"] },
  purchases: { label: "Achats", tables: ["achats", "achat_items"] },
  expenses: { label: "Dépenses", tables: ["depenses"] },
  quotes: { label: "Devis", tables: ["devis", "devis_items"] },
};

export const BACKUP_MODULE_CODES = Object.keys(BACKUP_MODULES);

export function isBackupModuleCode(code: string): code is keyof typeof BACKUP_MODULES {
  return Object.prototype.hasOwnProperty.call(BACKUP_MODULES, code);
}
