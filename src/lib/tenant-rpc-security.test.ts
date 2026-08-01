import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../supabase/migrations/20260801150000_confine_recovery_and_require_active_profile.sql", import.meta.url),
  "utf8",
);

test("les RPC/RLS tenant exigent profil actif, rôle du tenant et licence", () => {
  assert.match(sql, /profile\.status\s*=\s*'active'/i);
  assert.match(sql, /role\.tenant_id\s*=\s*profile\.tenant_id/i);
  assert.match(sql, /tenant_has_current_access\(profile\.tenant_id\)/i);
  assert.match(sql, /REVOKE ALL[\s\S]*FROM PUBLIC, anon/i);
});
