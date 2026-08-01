import assert from "node:assert/strict";
import test from "node:test";
import {
  processPasswordRecoveryCallback,
  readRecoveryCallback,
  isRecoveryRouteAllowed,
} from "./password-recovery-callback.ts";

const session = { user: { id: "user-id" } };
const success = { data: { session }, error: null };

function auth(overrides: Record<string, unknown> = {}) {
  return {
    exchangeCodeForSession: async () => success,
    verifyOtp: async () => success,
    setSession: async () => success,
    getSession: async () => success,
    ...overrides,
  };
}

test("échange un callback PKCE puis vérifie la session", async () => {
  let exchanged = "";
  let verified = false;
  const callback = readRecoveryCallback("https://erp.example/reset-password?code=pkce-secret");
  const result = await processPasswordRecoveryCallback(callback, auth({
    exchangeCodeForSession: async (code: string) => { exchanged = code; return success; },
    getSession: async () => { verified = true; return success; },
  }));
  assert.equal(result, "valid");
  assert.equal(exchanged, "pkce-secret");
  assert.equal(verified, true);
});

for (const type of ["invite", "recovery"] as const) {
  test(`établit une session depuis un hash implicite ${type}`, async () => {
    let received: unknown;
    const callback = readRecoveryCallback(
      `https://erp.example/reset-password#access_token=access-secret&refresh_token=refresh-secret&type=${type}`,
    );
    const result = await processPasswordRecoveryCallback(callback, auth({
      setSession: async (tokens: unknown) => { received = tokens; return success; },
    }));
    assert.equal(result, "valid");
    assert.deepEqual(received, { access_token: "access-secret", refresh_token: "refresh-secret" });
  });
}

test("refuse un lien expiré et journalise uniquement le code Supabase", async () => {
  const callback = readRecoveryCallback("https://erp.example/reset-password?code=do-not-log-me");
  const original = console.error;
  const logs: unknown[][] = [];
  console.error = (...values: unknown[]) => logs.push(values);
  try {
    const result = await processPasswordRecoveryCallback(callback, auth({
      exchangeCodeForSession: async () => ({ data: { session: null }, error: { code: "otp_expired" } }),
    }));
    assert.equal(result, "invalid");
    assert.match(JSON.stringify(logs), /otp_expired/);
    assert.doesNotMatch(JSON.stringify(logs), /do-not-log-me/);
  } finally {
    console.error = original;
  }
});

test("un rechargement sans callback ne rééchange aucun secret", async () => {
  let calls = 0;
  const result = await processPasswordRecoveryCallback(null, auth({
    exchangeCodeForSession: async () => { calls += 1; return success; },
  }));
  assert.equal(result, "absent");
  assert.equal(calls, 0);
});

test("une session recovery est confinée à reset-password", () => {
  assert.equal(isRecoveryRouteAllowed("/reset-password"), true);
  for (const path of ["/app", "/partner", "/super-admin", "/settings/users"]) {
    assert.equal(isRecoveryRouteAllowed(path), false);
  }
});
