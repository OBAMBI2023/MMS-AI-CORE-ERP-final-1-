import assert from "node:assert/strict";
import test from "node:test";
import { isAccessTokenRevoked, isProfileAccessBlocked } from "./profile-access.ts";

test("bloque uniquement les statuts canoniques sans accès", () => {
  assert.equal(isProfileAccessBlocked("active"), false);
  assert.equal(isProfileAccessBlocked("suspended"), true);
  assert.equal(isProfileAccessBlocked("archived"), true);
});

test("invalide un jeton émis avant une révocation de sessions", () => {
  assert.equal(isAccessTokenRevoked(1_700_000_000, "2023-11-14T22:13:21.000Z"), true);
  assert.equal(isAccessTokenRevoked(1_700_000_002, "2023-11-14T22:13:21.000Z"), false);
  assert.equal(isAccessTokenRevoked(1_700_000_000, null), false);
});
