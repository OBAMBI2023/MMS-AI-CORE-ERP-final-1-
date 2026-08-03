import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../supabase/migrations/20260803160000_central_tenant_module_management.sql", import.meta.url), "utf8");
const routeGuard = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
const smsMigration = readFileSync(new URL("../../supabase/migrations/20260803140000_finalize_hotel_sms_production.sql", import.meta.url), "utf8");
const premiumFixMigration = readFileSync(new URL("../../supabase/migrations/20260803161000_preserve_active_premium_module_access.sql", import.meta.url), "utf8");
const premiumBoundaryMigration = readFileSync(new URL("../../supabase/migrations/20260803162000_enforce_premium_subscription_at_tenant_modules.sql", import.meta.url), "utf8");
const premiumDeleteMigration = readFileSync(new URL("../../supabase/migrations/20260803163000_protect_premium_tenant_module_deletes.sql", import.meta.url), "utf8");
const premiumKeyUpdateMigration = readFileSync(new URL("../../supabase/migrations/20260803164000_protect_premium_tenant_module_key_updates.sql", import.meta.url), "utf8");
const trialActivationMigration = readFileSync(new URL("../../supabase/migrations/20260801190000_validate_pending_trial_billing_cycle.sql", import.meta.url), "utf8");
const managerUi = readFileSync(new URL("../components/super-admin/TenantModulesManager.tsx", import.meta.url), "utf8");

test("module management is platform-admin-only, tenant-scoped and audited", () => {
  assert.match(migration, /platform_admins[\s\S]*administrator\.user_id = auth\.uid\(\)/i);
  assert.match(migration, /requested_tenant_id[\s\S]*tenant_module_enabled[\s\S]*tenant_module_disabled/i);
  assert.match(migration, /assignment_source[\s\S]*'pack'[\s\S]*'manual'[\s\S]*'subscription'[\s\S]*'system'/i);
  assert.match(migration, /Dashboard doit rester actif/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.tenant_modules/i);
});

test("premium activation grants no credits and SMS requires a valid subscription", () => {
  const managementFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.manage_tenant_modules"));
  assert.doesNotMatch(managementFunction, /credit_balance\s*=/i);
  assert.match(migration, /subscription\.status = 'active'[\s\S]*subscription\.expires_at > now\(\)/i);
  assert.match(smsMigration, /status='active'[\s\S]*expires_at[\s\S]*credit_balance>0/i);
});

test("disabled routes are checked through the tenant module guard", () => {
  assert.match(routeGuard, /getRouteModule\(location\.pathname\)/);
  assert.match(routeGuard, /current_user_module_enabled/);
  assert.match(routeGuard, /moduleError \|\| !moduleEnabled/);
});

test("an active generic Premium subscription blocks manual deactivation before writes and audit", () => {
  const guardPosition = premiumFixMigration.indexOf("Ce module possède un abonnement actif");
  const moduleWritePosition = premiumFixMigration.indexOf("INSERT INTO public.tenant_modules");
  const auditPosition = premiumFixMigration.indexOf("INSERT INTO public.audit_logs");
  assert.match(premiumFixMigration, /target_module\.module_type = 'premium'[\s\S]*NOT next_enabled[\s\S]*has_active_subscription/i);
  assert.match(premiumFixMigration, /subscription\.status = 'active'[\s\S]*subscription\.expires_at IS NULL OR subscription\.expires_at > now\(\)/i);
  assert.ok(guardPosition > 0 && guardPosition < moduleWritePosition && guardPosition < auditPosition);
  assert.match(premiumFixMigration, /Suspendez ou annulez l’abonnement avant de le désactiver/);
});

test("a pack preserves active Premium modules and their subscription source", () => {
  const packFunction = premiumFixMigration.slice(premiumFixMigration.indexOf("CREATE OR REPLACE FUNCTION public.assign_module_pack_to_tenant"));
  const packAssignment = packFunction.slice(packFunction.indexOf("SELECT requested_tenant_id, module.id"));
  const activePremiumBranch = packAssignment.indexOf("WHEN module.module_type = 'premium' AND EXISTS");
  const absentPackBranch = packAssignment.indexOf("WHEN NOT EXISTS");
  assert.ok(activePremiumBranch > 0 && activePremiumBranch < absentPackBranch);
  assert.match(packAssignment, /THEN true[\s\S]*THEN 'subscription'/i);
  assert.match(packAssignment, /WHEN NOT EXISTS[\s\S]*THEN false[\s\S]*WHEN module\.module_type = 'standard' THEN true/i);
  assert.match(packFunction, /preserved_active_premium_modules/);
  assert.doesNotMatch(packFunction, /DELETE FROM public\.tenant_modules/i);
});

test("the UI blocks active Premium deactivation with a business message", () => {
  assert.match(managerUi, /activePremiumSubscription/);
  assert.match(managerUi, /draft\[module\.id\] && activePremiumSubscription/);
  assert.match(managerUi, /Ce module possède un abonnement actif\. Suspendez ou annulez l’abonnement avant de le désactiver\./);
});

test("the tenant_modules table boundary rejects every active Premium disabling path", () => {
  assert.match(premiumBoundaryMigration, /CREATE TRIGGER trg_enforce_active_premium_tenant_module[\s\S]*BEFORE INSERT OR UPDATE ON public\.tenant_modules/i);
  assert.match(premiumBoundaryMigration, /IF TG_OP = 'INSERT' OR OLD\.enabled[\s\S]*RAISE EXCEPTION/i);
  assert.match(premiumBoundaryMigration, /Ce module possède un abonnement actif/);
  assert.ok(
    premiumBoundaryMigration.indexOf("RAISE EXCEPTION USING")
      < premiumBoundaryMigration.indexOf("NEW.assignment_source := 'subscription'"),
  );
});

test("the reusable Premium helper covers generic SMS and active or trial AI subscriptions", () => {
  assert.match(premiumBoundaryMigration, /tenant_has_active_premium_subscription/);
  assert.match(premiumBoundaryMigration, /tenant_module_subscriptions[\s\S]*status = 'active'[\s\S]*expires_at IS NULL OR subscription\.expires_at > now\(\)/i);
  assert.match(premiumBoundaryMigration, /module\.code = 'ai_assistant'[\s\S]*tenant_ai_subscriptions[\s\S]*status IN \('active', 'trial'\)/i);
  assert.match(premiumBoundaryMigration, /ai_subscription\.expires_at IS NULL OR ai_subscription\.expires_at > now\(\)/i);
});

test("pack paths preserve active subscription access and attribution", () => {
  assert.match(premiumBoundaryMigration, /mark_pack_module_sources[\s\S]*tenant_has_active_premium_subscription[\s\S]*THEN 'subscription'[\s\S]*ELSE 'pack'/i);
  assert.match(premiumBoundaryMigration, /assign_module_pack_to_tenant[\s\S]*tenant_has_active_premium_subscription\(requested_tenant_id, module\.id\) THEN true/i);
  assert.doesNotMatch(premiumBoundaryMigration, /DELETE FROM public\.tenant_modules/i);
});

test("DELETE is protected at the tenant_modules boundary using OLD values", () => {
  assert.match(premiumDeleteMigration, /BEFORE INSERT OR UPDATE OR DELETE ON public\.tenant_modules/i);
  assert.match(premiumDeleteMigration, /TG_OP = 'DELETE'[\s\S]*OLD\.tenant_id[\s\S]*OLD\.module_id/i);
  assert.match(premiumDeleteMigration, /IF OLD\.enabled AND has_active_subscription THEN[\s\S]*RAISE EXCEPTION/i);
  assert.match(premiumDeleteMigration, /tenant_has_active_premium_subscription/);
  assert.match(premiumDeleteMigration, /RETURN OLD/);
});

test("trial cleanup remains subject to the table boundary instead of bypassing it", () => {
  assert.match(trialActivationMigration, /DELETE FROM public\.tenant_modules WHERE tenant_id = p_tenant_id/i);
  assert.doesNotMatch(trialActivationMigration, /DISABLE TRIGGER|session_replication_role/i);
  assert.doesNotMatch(premiumDeleteMigration, /DELETE FROM public\.tenant_module_subscriptions|DELETE FROM public\.tenant_ai_subscriptions/i);
});

test("UPDATE cannot move an active Premium assignment to another tenant or module", () => {
  assert.match(premiumKeyUpdateMigration, /TG_OP = 'UPDATE'/i);
  assert.match(
    premiumKeyUpdateMigration,
    /OLD\.tenant_id IS DISTINCT FROM NEW\.tenant_id[\s\S]*OLD\.module_id IS DISTINCT FROM NEW\.module_id/i,
  );
  assert.match(
    premiumKeyUpdateMigration,
    /tenant_has_active_premium_subscription\([\s\S]*OLD\.tenant_id[\s\S]*OLD\.module_id[\s\S]*IF OLD\.enabled AND old_has_active_subscription THEN[\s\S]*RAISE EXCEPTION/i,
  );
  assert.match(premiumKeyUpdateMigration, /avant de modifier son affectation/i);
  assert.ok(
    premiumKeyUpdateMigration.indexOf("IF OLD.enabled AND old_has_active_subscription")
      < premiumKeyUpdateMigration.indexOf("new_has_active_subscription :="),
  );
  assert.match(
    premiumKeyUpdateMigration,
    /CREATE TRIGGER trg_enforce_active_premium_tenant_module[\s\S]*BEFORE INSERT OR UPDATE OR DELETE ON public\.tenant_modules/i,
  );
  assert.doesNotMatch(
    premiumKeyUpdateMigration,
    /UPDATE public\.tenant_module_subscriptions|UPDATE public\.tenant_ai_subscriptions|credit_balance\s*=/i,
  );
});
