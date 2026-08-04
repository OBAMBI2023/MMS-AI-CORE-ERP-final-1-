import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260804130000_protect_system_tenant_modules.sql", import.meta.url),
  "utf8",
);
const originalMigration = readFileSync(
  new URL("../../supabase/migrations/20260803160000_central_tenant_module_management.sql", import.meta.url),
  "utf8",
);

test("no existing migration file was modified to add system-module protection", () => {
  assert.match(originalMigration, /Dashboard doit rester actif/i);
});

test("the manual toggle RPC blocks disabling any system module, not only dashboard", () => {
  const managementFunction = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.manage_tenant_modules"),
    migration.indexOf("CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant"),
  );
  assert.match(
    managementFunction,
    /'dashboard', 'settings', 'hotel_dashboard', 'hotel_settings'[\s\S]*NOT next_enabled[\s\S]*Ce module système doit rester actif/i,
  );
  assert.match(managementFunction, /platform_admins[\s\S]*administrator\.user_id = auth\.uid\(\)/i);
});

test("pack assignment always keeps every system module enabled", () => {
  const packFunction = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant"),
    migration.indexOf("CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module"),
  );
  assert.match(
    packFunction,
    /module\.code = ANY \(ARRAY\['dashboard', 'settings', 'hotel_dashboard', 'hotel_settings'\]\) THEN true/i,
  );
});

test("the tenant_modules table boundary rejects disabling, deleting or re-keying any system module", () => {
  const triggerFunction = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.enforce_active_premium_tenant_module"),
  );
  assert.match(triggerFunction, /Ce module système ne peut pas être supprimé/i);
  assert.match(triggerFunction, /Ce module système ne peut pas être réaffecté/i);
  assert.match(triggerFunction, /Ce module système ne peut pas être désactivé/i);
  assert.match(
    triggerFunction,
    /BEFORE INSERT OR UPDATE OR DELETE ON public\.tenant_modules/i,
  );
  const systemGuardPosition = triggerFunction.indexOf("Ce module système ne peut pas être désactivé");
  const subscriptionGuardPosition = triggerFunction.indexOf(
    "Ce module possède un abonnement actif. Suspendez ou annulez l’abonnement avant de le désactiver.",
  );
  assert.ok(systemGuardPosition > 0 && systemGuardPosition < subscriptionGuardPosition);
});

test("system-module protection never deletes rows or touches subscription/credit state", () => {
  assert.doesNotMatch(migration, /DELETE FROM public\.tenant_modules/i);
  assert.doesNotMatch(migration, /credit_balance\s*=/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.tenant_module_subscriptions|DELETE FROM public\.tenant_ai_subscriptions/i);
});
