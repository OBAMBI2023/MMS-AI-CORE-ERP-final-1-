import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260803000000_restore_platform_and_tenant_profile_access.sql",
  "utf8",
);
const tenantGuard = readFileSync("src/lib/tenant-route-access.server.ts", "utf8");

test("a platform admin can read its own profile without tenant_id", () => {
  assert.match(migration, /auth\.uid\(\) = id\s+OR/);
  assert.doesNotMatch(migration, /tenant_id = public\.current_tenant_id\(\)\s+AND\s+\(auth\.uid\(\) = id/);
});

test("tenant administration stays tenant scoped", () => {
  assert.match(
    migration,
    /tenant_id = public\.current_tenant_id\(\)\s+AND public\.is_admin\(\)/,
  );
  assert.match(migration, /tenant_id IS NOT NULL/);
});

test("tenant guard surfaces database errors instead of converting them to denials", () => {
  assert.match(tenantGuard, /assertQuerySucceeded\(profileError, "du profil"\)/);
  assert.match(tenantGuard, /assertQuerySucceeded\(tenantResult\.error, "du tenant"\)/);
  assert.match(tenantGuard, /assertQuerySucceeded\(permissionResult\.error, "des permissions"\)/);
});
