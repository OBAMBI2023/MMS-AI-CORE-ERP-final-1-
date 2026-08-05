import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisibleSettingsTabs,
  isSettingsTabVisible,
  SETTINGS_TAB_ORDER,
} from "./settings-tabs.ts";

test("le catalogue est masqué quand le module produits/services est inactif", () => {
  assert.equal(isSettingsTabVisible("catalog", { catalogModuleActive: false }), false);
  assert.equal(isSettingsTabVisible("catalog", { catalogModuleActive: true }), true);
});

test("un tenant hôtel sans module catalogue actif ne voit pas l’onglet catalogue", () => {
  const visible = getVisibleSettingsTabs({ catalogModuleActive: false });
  assert.equal(visible.includes("catalog"), false);
  assert.equal(visible.length, SETTINGS_TAB_ORDER.length - 1);
});

test("un tenant avec le module catalogue actif voit tous les onglets", () => {
  const visible = getVisibleSettingsTabs({ catalogModuleActive: true });
  assert.deepEqual(visible, SETTINGS_TAB_ORDER);
});

test("les onglets non pertinents restent masqués, jamais supprimés du code", () => {
  for (const tab of SETTINGS_TAB_ORDER) {
    assert.equal(typeof isSettingsTabVisible(tab, { catalogModuleActive: false }), "boolean");
  }
});
