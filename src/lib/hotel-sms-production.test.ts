import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../supabase/migrations/20260803140000_finalize_hotel_sms_production.sql", import.meta.url), "utf8");

test("la consommation de crédit exige un succès fournisseur", () => {
  assert.match(migration, /IF NEW\.status='sent' THEN/);
  assert.match(migration, /reserved_credits=reserved_credits-1/);
  assert.doesNotMatch(migration, /NEW\.status IN \('sent','pending'\)/);
});

test("la migration élimine les surcharges RPC et recharge PostgREST", () => {
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.prepare_hotel_sms\(uuid,text,text,text\)/);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.complete_hotel_sms\(uuid,text,text,text\)/);
  assert.match(migration, /NOTIFY pgrst, 'reload schema'/);
});

test("l'expiration est automatique et auditée", () => {
  assert.match(migration, /expire_due_module_subscriptions/);
  assert.match(migration, /'expiration'/);
  assert.match(migration, /SET enabled=false/);
});
