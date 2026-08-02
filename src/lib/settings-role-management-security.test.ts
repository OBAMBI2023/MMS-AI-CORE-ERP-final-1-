import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260802230000_fix_custom_roles_and_parametres_rls.sql",
  "utf8",
);
const roleServer = readFileSync("src/lib/role-management.server.ts", "utf8");
const userServer = readFileSync("src/lib/user-management.server.ts", "utf8");

test("custom roles keep tenant isolation without a fixed-name constraint", () => {
  assert.match(migration, /DROP CONSTRAINT IF EXISTS roles_tenant_role_name_check/);
  assert.match(migration, /selected_role\.tenant_id IS DISTINCT FROM NEW\.tenant_id/);
  assert.match(migration, /selected_role\.is_active IS NOT TRUE/);
  assert.doesNotMatch(migration, /selected_role\.name NOT IN/);
});

test("company settings RLS is tenant scoped and permission gated", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "public rw parametres"/);
  assert.match(migration, /tenant_id = public\.current_tenant_id\(\)/);
  assert.match(migration, /public\.has_permission\('settings\.manage'\)/);
});

test("role and user server guards select the fields they validate", () => {
  assert.match(userServer, /\.select\("id, is_active"\)/);
  assert.doesNotMatch(userServer, /\.select\("id, name, is_active"\)/);
  assert.match(roleServer, /source\.name === "Administrateur"/);
  assert.match(roleServer, /countError/);
});
