import assert from "node:assert/strict";
import test from "node:test";
import { runPreservingAuthUid } from "./preserve-auth-session.ts";

test("conserve le même auth.uid() avant et après la création", async () => {
  const observedUids = ["partner-user-id", "partner-user-id"];
  const result = await runPreservingAuthUid(
    async () => observedUids.shift() ?? null,
    async () => ({ tenantId: "tenant-id" }),
  );

  assert.equal(result.tenantId, "tenant-id");
  assert.deepEqual(observedUids, []);
});

test("refuse une création qui remplace la session Partner", async () => {
  const observedUids = ["partner-user-id", "tenant-admin-id"];

  await assert.rejects(
    runPreservingAuthUid(
      async () => observedUids.shift() ?? null,
      async () => ({ tenantId: "tenant-id" }),
    ),
    /session Partner a changé/,
  );
});
