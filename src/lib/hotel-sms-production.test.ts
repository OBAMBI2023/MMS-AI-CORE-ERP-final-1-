import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260803140000_finalize_hotel_sms_production.sql",
    import.meta.url,
  ),
  "utf8",
);
const server = readFileSync(new URL("./hotel-sms.server.ts", import.meta.url), "utf8");

test("la consommation de crédit exige un succès fournisseur", () => {
  assert.match(migration, /IF NEW\.status='sent' THEN/);
  assert.match(migration, /reserved_credits=reserved_credits-1/);
  assert.doesNotMatch(migration, /NEW\.status IN \('sent','pending'\)/);
});

test("la migration élimine les surcharges RPC et recharge PostgREST", () => {
  assert.match(
    migration,
    /DROP FUNCTION IF EXISTS public\.prepare_hotel_sms\(uuid,text,text,text\)/,
  );
  assert.match(
    migration,
    /DROP FUNCTION IF EXISTS public\.complete_hotel_sms\(uuid,text,text,text\)/,
  );
  assert.match(migration, /NOTIFY pgrst, 'reload schema'/);
});

test("l'expiration est automatique et auditée", () => {
  assert.match(migration, /expire_due_module_subscriptions/);
  assert.match(migration, /'expiration'/);
  assert.match(migration, /SET enabled=false/);
});

test("le test Orange est authentifié, autorisé et sans effet sur les SMS ou crédits", () => {
  const start = server.indexOf("export const testOrangeSmsConnection");
  const testFunction = server.slice(start, server.indexOf("const checked", start));
  assert.ok(start >= 0);
  assert.match(testFunction, /middleware\(\[requireSupabaseAuth\]\)/);
  assert.match(testFunction, /assertOrangeTestAccess/);
  assert.match(server, /hotel\.sms\.settings/);
  assert.match(server, /platform_admins/);
  assert.doesNotMatch(
    testFunction,
    /prepare_hotel_sms|complete_hotel_sms|sendOrangeSms|hotel_sms_logs|module_credit/,
  );
});

test("la réponse du test Orange reste limitée à un statut et un message utilisateur", () => {
  assert.match(server, /connected:\s*true,[\s\S]*?status:\s*"connected",[\s\S]*?message:/);
  assert.doesNotMatch(
    server.slice(
      server.indexOf("export type OrangeConnectionResult"),
      server.indexOf("export const orangeConnectionMessage"),
    ),
    /token|secret|apiUrl|payload|requestId/,
  );
});
