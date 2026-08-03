import assert from "node:assert/strict";
import test from "node:test";
import { currentOriginServerFnInput, fetchServerFnWithAuthRetry } from "./server-fn-fetch.ts";

test("server functions always target the current browser origin", () => {
  const result = currentOriginServerFnInput(
    "http://127.0.0.1:8080/_serverFn/abc?payload=1",
    "http://127.0.0.1:8082",
  );
  assert.equal(result.toString(), "http://127.0.0.1:8082/_serverFn/abc?payload=1");
});

test("valid token: no refresh", async () => {
  let refreshes = 0;
  const response = await fetchServerFnWithAuthRetry(new Request("https://app.test/_serverFn/save"), {
    fetch: async () => new Response(null, { status: 200 }),
    refreshAccessToken: async () => { refreshes += 1; return "unused"; },
    onSessionExpired: () => undefined,
  });
  assert.equal(response.status, 200);
  assert.equal(refreshes, 0);
});

test("expired token: refresh and replay exactly once", async () => {
  const authorizations: Array<string | null> = [];
  const response = await fetchServerFnWithAuthRetry(new Request("https://app.test/_serverFn/save", {
    method: "POST", headers: { Authorization: "Bearer expired" }, body: "payload",
  }), {
    fetch: async (input) => {
      authorizations.push(new Request(input).headers.get("authorization"));
      return new Response(null, { status: authorizations.length === 1 ? 401 : 200 });
    },
    refreshAccessToken: async () => "fresh-token",
    onSessionExpired: () => undefined,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(authorizations, ["Bearer expired", "Bearer fresh-token"]);
});

test("invalid token: failed refresh signs out", async () => {
  let signedOut = false;
  const response = await fetchServerFnWithAuthRetry(new Request("https://app.test/_serverFn/save"), {
    fetch: async () => new Response(null, { status: 401 }),
    refreshAccessToken: async () => null,
    onSessionExpired: () => { signedOut = true; },
  });
  assert.equal(response.status, 401);
  assert.equal(signedOut, true);
});

test("non-super-admin: 403 is not refreshed", async () => {
  let refreshes = 0;
  const response = await fetchServerFnWithAuthRetry(new Request("https://app.test/_serverFn/save"), {
    fetch: async () => new Response(null, { status: 403 }),
    refreshAccessToken: async () => { refreshes += 1; return "unused"; },
    onSessionExpired: () => undefined,
  });
  assert.equal(response.status, 403);
  assert.equal(refreshes, 0);
});

test("non-server-function requests are not rewritten", () => {
  const input = "https://api.example.test/data";
  assert.equal(currentOriginServerFnInput(input, "https://app.example.test"), input);
});
