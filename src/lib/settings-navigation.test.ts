import assert from "node:assert/strict";
import test from "node:test";
import {
  ERP_SETTINGS_MODULE,
  ERP_SETTINGS_PATH,
  HOTEL_SETTINGS_MODULE,
  HOTEL_SETTINGS_PATH,
  getSettingsModule,
  getSettingsPath,
} from "./settings-navigation.ts";
import { getRouteModule } from "./route-modules.ts";

test("MMS (ERP) ouvre /parametres", () => {
  assert.equal(getSettingsPath("ERP"), "/parametres");
  assert.equal(getSettingsPath("ERP"), ERP_SETTINGS_PATH);
});

test("MMS (ERP) ne peut pas charger /hotel/parametres", () => {
  assert.notEqual(getSettingsPath("ERP"), HOTEL_SETTINGS_PATH);
});

test("Damaja (HOTEL) ouvre /hotel/parametres", () => {
  assert.equal(getSettingsPath("HOTEL"), "/hotel/parametres");
  assert.equal(getSettingsPath("HOTEL"), HOTEL_SETTINGS_PATH);
  assert.notEqual(getSettingsPath("HOTEL"), ERP_SETTINGS_PATH);
});

test("platform_type absent retombe sur le comportement ERP par défaut", () => {
  assert.equal(getSettingsPath(undefined), ERP_SETTINGS_PATH);
});

test("le module ERP est reconnu avec la clé settings", () => {
  assert.equal(getSettingsModule("ERP"), "settings");
  assert.equal(getSettingsModule("ERP"), ERP_SETTINGS_MODULE);
});

test("le module Hôtel est reconnu avec la clé hotel_settings", () => {
  assert.equal(getSettingsModule("HOTEL"), "hotel_settings");
  assert.equal(getSettingsModule("HOTEL"), HOTEL_SETTINGS_MODULE);
});

test("les modules de route restent cohérents avec la carte des routes", () => {
  assert.equal(getRouteModule(ERP_SETTINGS_PATH), getSettingsModule("ERP"));
  assert.equal(getRouteModule(HOTEL_SETTINGS_PATH), getSettingsModule("HOTEL"));
});
