import assert from "node:assert/strict";
import test from "node:test";
import { profileBelongsToTenant } from "./tenant-login-access.ts";

test("autorise uniquement le profil rattaché au tenant du slug", () => {
  assert.equal(profileBelongsToTenant("tenant-a", "tenant-a"), true);
  assert.equal(profileBelongsToTenant("tenant-b", "tenant-a"), false);
  assert.equal(profileBelongsToTenant(null, "tenant-a"), false);
});
