import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNED_URL_REFRESH_LEAD_MS,
  SIGNED_URL_RETRY_MS,
  clearSignedUrlLeaseCache,
  createSignedUrlLease,
  getCachedSignedUrl,
} from "./signed-url-lease.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));

test.beforeEach(() => clearSignedUrlLeaseCache());

test("cache renews a signature when it enters the five-minute window", async () => {
  let calls = 0;
  const signer = async () => ({
    signedUrl: `signed-${++calls}`,
    expiresAt: new Date(3_600_000).toISOString(),
  });
  assert.equal((await getCachedSignedUrl("bucket:path", signer, 0)).signedUrl, "signed-1");
  assert.equal(
    (await getCachedSignedUrl("bucket:path", signer, 3_600_000 - SIGNED_URL_REFRESH_LEAD_MS - 1))
      .signedUrl,
    "signed-1",
  );
  assert.equal(
    (await getCachedSignedUrl("bucket:path", signer, 3_600_000 - SIGNED_URL_REFRESH_LEAD_MS))
      .signedUrl,
    "signed-2",
  );
});

test("concurrent consumers share one signature request", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const signer = async () => {
    calls += 1;
    await gate;
    return { signedUrl: "shared", expiresAt: new Date(Date.now() + 3_600_000).toISOString() };
  };
  const first = getCachedSignedUrl("bucket:path", signer);
  const second = getCachedSignedUrl("bucket:path", signer);
  release();
  assert.deepEqual(await Promise.all([first, second]), [
    { signedUrl: "shared", expiresAt: (await first).expiresAt },
    { signedUrl: "shared", expiresAt: (await first).expiresAt },
  ]);
  assert.equal(calls, 1);
});

test("lease schedules renewal five minutes early", async () => {
  let now = 1_000;
  let scheduledDelay = 0;
  let scheduledCallback: (() => void) | null = null;
  let calls = 0;
  const urls: Array<string | null> = [];
  const dispose = createSignedUrlLease({
    key: "bucket:path",
    now: () => now,
    signer: async () => ({
      signedUrl: `url-${++calls}`,
      expiresAt: new Date(now + 3_600_000).toISOString(),
    }),
    onLoading: () => {},
    onValue: (url) => urls.push(url),
    onError: (error) => assert.fail(String(error)),
    schedule: (callback, delay) => {
      scheduledCallback = callback;
      scheduledDelay = delay;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: () => {},
  });
  await flush();
  assert.equal(scheduledDelay, 3_600_000 - SIGNED_URL_REFRESH_LEAD_MS);
  now += scheduledDelay;
  scheduledCallback!();
  await flush();
  assert.deepEqual(urls, ["url-1", "url-2"]);
  dispose();
});

test("signature errors yield a neutral fallback and controlled retry", async () => {
  const values: Array<string | null> = [];
  const errors: unknown[] = [];
  let retryDelay = 0;
  const dispose = createSignedUrlLease({
    key: "bucket:error",
    signer: async () => { throw new Error("signature unavailable"); },
    onLoading: () => {},
    onValue: (value) => values.push(value),
    onError: (error) => errors.push(error),
    schedule: (_callback, delay) => {
      retryDelay = delay;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: () => {},
  });
  await flush();
  assert.deepEqual(values, [null]);
  assert.equal(errors.length, 1);
  assert.equal(retryDelay, SIGNED_URL_RETRY_MS);
  dispose();
});

test("dispose cancels timers and ignores an outstanding signature", async () => {
  let release!: (value: { signedUrl: string; expiresAt: string }) => void;
  const pending = new Promise<{ signedUrl: string; expiresAt: string }>((resolve) => {
    release = resolve;
  });
  const values: Array<string | null> = [];
  let cancelled = 0;
  const dispose = createSignedUrlLease({
    key: "bucket:unmount",
    signer: () => pending,
    onLoading: () => {},
    onValue: (value) => values.push(value),
    onError: (error) => assert.fail(String(error)),
    schedule: () => 1 as unknown as ReturnType<typeof setTimeout>,
    cancel: () => { cancelled += 1; },
  });
  dispose();
  release({ signedUrl: "too-late", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  await flush();
  assert.deepEqual(values, []);
  assert.equal(cancelled, 0);
});
