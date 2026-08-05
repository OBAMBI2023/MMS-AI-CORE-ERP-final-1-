import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const removalMigration = readFileSync(
  new URL("../../supabase/migrations/20260805130000_allow_sms_module_activation_without_subscription.sql", import.meta.url),
  "utf8",
);
const genericSubscriptionMigration = readFileSync(
  new URL("../../supabase/migrations/20260803130000_create_generic_module_subscriptions.sql", import.meta.url),
  "utf8",
);
const sectorSignupMigration = readFileSync(
  new URL("../../supabase/migrations/20260805120000_public_trial_sector_signup.sql", import.meta.url),
  "utf8",
);
const managerUi = readFileSync(new URL("../components/super-admin/TenantModulesManager.tsx", import.meta.url), "utf8");

test("a new additive migration removes the activation-blocking trigger without editing the old one", () => {
  assert.match(removalMigration, /DROP TRIGGER IF EXISTS enforce_premium_module_subscription ON public\.tenant_modules/);
  assert.match(removalMigration, /DROP FUNCTION IF EXISTS public\.enforce_premium_module_subscription\(\)/);
  // The original migration file that created the trigger is untouched: the definition still exists there.
  assert.match(genericSubscriptionMigration, /CREATE OR REPLACE FUNCTION public\.enforce_premium_module_subscription\(\)/);
  assert.match(genericSubscriptionMigration, /Un abonnement SMS actif doit être attribué avant l.activation du module/);
});

test("sending SMS still requires an active subscription and credit, untouched by the removal", () => {
  assert.doesNotMatch(removalMigration, /DROP (TRIGGER|FUNCTION)[\s\S]*(reserve_hotel_sms_credit|settle_hotel_sms_credit)/);
  assert.match(genericSubscriptionMigration, /reserve_hotel_sms_credit[\s\S]*nécessite un abonnement actif/);
  assert.match(genericSubscriptionMigration, /IF sub\.status<>'active' THEN RAISE EXCEPTION/);
  assert.match(genericSubscriptionMigration, /credit_balance-sub\.reserved_credits<1 THEN RAISE EXCEPTION 'Quota SMS épuisé/);
});

test("the sector trial signup can enable every pack module, including hotel_sms, inside tenant creation", () => {
  assert.match(sectorSignupMigration, /Hôtel \/ Résidence \/ Hébergement.*v_platform:='HOTEL'; v_pack_code:='hotel'/);
  assert.match(
    sectorSignupMigration,
    /INSERT INTO public\.tenant_modules\(tenant_id,module_id,enabled\)[\s\S]*SELECT v_tenant_id,module_id,true FROM public\.module_pack_items WHERE pack_id=v_pack_id/,
  );
});

test("the UI shows a non-blocking SMS subscription status instead of preventing activation", () => {
  assert.match(managerUi, /Aucun abonnement SMS actif/);
  assert.match(managerUi, /isSms && draft\[module\.id\] && !activePremiumSubscription/);
  // Only an active premium subscription may ever disable the switch (to block deactivation); enabling is never gated.
  assert.match(managerUi, /disabled=\{module\.code === "dashboard" \|\| saving \|\| \(draft\[module\.id\] && activePremiumSubscription\)\}/);
});
