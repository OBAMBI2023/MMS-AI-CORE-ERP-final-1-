import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogRouteEnabled,
  catalogTypeEnabled,
  enabledCatalogTypes,
  type CatalogSettings,
} from "./catalog-settings.ts";

const settings = (catalog_mode: CatalogSettings["catalog_mode"]): CatalogSettings => ({
  tenant_id: "00000000-0000-4000-8000-000000000001",
  catalog_mode,
  stock_enabled: true,
  purchases_enabled: true,
  suppliers_enabled: true,
  services_in_sales_enabled: catalog_mode !== "products",
  products_in_sales_enabled: catalog_mode !== "services",
  catalog_codes_enabled: true,
  updated_at: "2026-07-30T00:00:00.000Z",
});

test("products n’autorise que les produits et les modules de stock", () => {
  assert.equal(catalogTypeEnabled(settings("products"), "product"), true);
  assert.equal(catalogTypeEnabled(settings("products"), "service"), false);
  assert.deepEqual(enabledCatalogTypes(settings("products")), ["product"]);
  assert.equal(catalogRouteEnabled(settings("products"), "/stock"), true);
});

test("services n’autorise que les services et masque le stock", () => {
  assert.equal(catalogTypeEnabled(settings("services"), "product"), false);
  assert.equal(catalogTypeEnabled(settings("services"), "service"), true);
  assert.deepEqual(enabledCatalogTypes(settings("services")), ["service"]);
  assert.equal(catalogRouteEnabled(settings("services"), "/stock"), false);
});

test("mixed autorise un panier mixte", () => {
  assert.deepEqual(enabledCatalogTypes(settings("mixed")), ["product", "service"]);
});

test("un chargement absent n’expose aucun type avant résolution du fallback serveur", () => {
  assert.equal(catalogTypeEnabled(undefined, "product"), false);
  assert.equal(catalogTypeEnabled(undefined, "service"), false);
  assert.deepEqual(enabledCatalogTypes(undefined), []);
});
