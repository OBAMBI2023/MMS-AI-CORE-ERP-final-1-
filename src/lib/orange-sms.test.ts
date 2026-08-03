import test from "node:test";
import assert from "node:assert/strict";
import { OrangeSmsError, sendOrangeSms, testOrangeConnection, type OrangeSmsConfig } from "./orange-sms.ts";

const config: OrangeSmsConfig = {
  apiUrl: "https://orange.invalid/sms",
  sender: "tel:+2250000",
  apiToken: "secret",
  timeoutMs: 1_000,
  maxAttempts: 1,
};

test("envoie le format Orange sans exposer le jeton dans le corps", async () => {
  let captured: RequestInit | undefined;
  const fetcher: typeof fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ messageId: "msg-1" }), { status: 201, headers: { "x-request-id": "req-1" } });
  };
  const result = await sendOrangeSms(config, { to: "+2250701020304", message: "Bonjour", idempotencyKey: "log-1" }, fetcher);
  assert.equal(result.status, "sent");
  assert.equal(result.providerMessageId, "msg-1");
  assert.match(String((captured?.headers as Record<string,string>).Authorization), /^Bearer /);
  assert.doesNotMatch(String(captured?.body), /secret/);
});

test("remonte une erreur Orange structurée et non consommable", async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ code: "42", description: "Invalid address" }), { status: 400 });
  await assert.rejects(
    sendOrangeSms(config, { to: "+2250701020304", message: "Bonjour", idempotencyKey: "log-2" }, fetcher),
    (error: unknown) => error instanceof OrangeSmsError && error.details.httpStatus === 400 && error.details.code === "42",
  );
});

test("obtient un jeton OAuth lors du test de connexion", async () => {
  const oauth = { ...config, apiToken: undefined, clientId: "client", clientSecret: "secret", tokenUrl: "https://orange.invalid/token" };
  let calls = 0;
  await testOrangeConnection(oauth, async () => { calls += 1; return new Response(JSON.stringify({ access_token: "token" }), { status: 200 }); });
  assert.equal(calls, 1);
});
