import assert from "node:assert/strict";
import test from "node:test";
import { readBearerToken, readJwtIssuedAt } from "./auth-token.ts";

test("extrait uniquement un jeton Bearer strict", () => {
  assert.equal(readBearerToken("Bearer header.payload.signature"), "header.payload.signature");
  assert.equal(readBearerToken("bearer header.payload.signature"), null);
  assert.equal(readBearerToken("Bearer "), null);
  assert.equal(readBearerToken("Bearer token extra"), null);
  assert.equal(readBearerToken(null), null);
});

test("lit iat après validation distante du JWT", () => {
  const payload = Buffer.from(JSON.stringify({ sub: "user-id", iat: 1_700_000_000 }))
    .toString("base64url");
  assert.equal(readJwtIssuedAt(`header.${payload}.signature`), 1_700_000_000);
  assert.equal(readJwtIssuedAt("invalid"), null);
  assert.equal(readJwtIssuedAt("header.broken.signature"), null);
});
