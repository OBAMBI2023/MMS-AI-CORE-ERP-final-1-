import assert from "node:assert/strict";
import test from "node:test";
import { currentOriginServerFnInput } from "./server-fn-fetch.ts";

test("server functions always target the current browser origin", () => {
  const result = currentOriginServerFnInput(
    "http://127.0.0.1:8080/_serverFn/abc?payload=1",
    "http://127.0.0.1:8082",
  );
  assert.equal(result.toString(), "http://127.0.0.1:8082/_serverFn/abc?payload=1");
});

test("non-server-function requests are not rewritten", () => {
  const input = "https://api.example.test/data";
  assert.equal(currentOriginServerFnInput(input, "https://app.example.test"), input);
});
