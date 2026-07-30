export type CatalogMode = "products" | "services" | "mixed";

export type CatalogSettings = {
  tenant_id: string;
  catalog_mode: CatalogMode;
  stock_enabled: boolean;
  purchases_enabled: boolean;
  suppliers_enabled: boolean;
  services_in_sales_enabled: boolean;
  products_in_sales_enabled: boolean;
  catalog_codes_enabled: boolean;
  updated_at: string;
};

export const DEFAULT_CATALOG_SETTINGS: Omit<CatalogSettings, "tenant_id" | "updated_at"> = {
  catalog_mode: "mixed",
  stock_enabled: true,
  purchases_enabled: true,
  suppliers_enabled: true,
  services_in_sales_enabled: true,
  products_in_sales_enabled: true,
  catalog_codes_enabled: true,
};

export function catalogTypeEnabled(settings: CatalogSettings | undefined, type: "product" | "service") {
  if (!settings) return false;
  return settings.catalog_mode === "mixed"
    || (settings.catalog_mode === "products" && type === "product")
    || (settings.catalog_mode === "services" && type === "service");
}

export function enabledCatalogTypes(settings: CatalogSettings | undefined) {
  if (!settings) return [] as ("product" | "service")[];
  if (settings.catalog_mode === "products") return ["product"] as const;
  if (settings.catalog_mode === "services") return ["service"] as const;
  return ["product", "service"] as const;
}

export function catalogRouteEnabled(settings: CatalogSettings | undefined, path: string) {
  if (!settings) return false;
  if (path === "/stock") return settings.catalog_mode !== "services" && settings.stock_enabled;
  if (path === "/achats") return settings.catalog_mode !== "services" && settings.purchases_enabled;
  if (path === "/fournisseurs") return settings.catalog_mode !== "services" && settings.suppliers_enabled;
  return true;
}
