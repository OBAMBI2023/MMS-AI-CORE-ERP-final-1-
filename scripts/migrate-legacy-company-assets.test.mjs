import assert from "node:assert/strict";
import test from "node:test";
import {
  migrateLegacyCompanyAssets,
  parseMigrationMode,
} from "./migrate-legacy-company-assets.mjs";

const sourcePath = "logo/30000000-0000-0000-0000-000000000001-logo.png";
const preferredPath = `20000000-0000-0000-0000-000000000001/${sourcePath}`;

function row(path = sourcePath) {
  return {
    id: "30000000-0000-0000-0000-000000000001",
    tenant_id: "20000000-0000-0000-0000-000000000001",
    logo_url: path,
    signature_url: null,
    stamp_url: null,
  };
}

function harness(initialFiles, updateResult = true) {
  const files = new Map(
    Object.entries(initialFiles).map(([path, content]) => [path, new Blob([content])]),
  );
  const writes = { uploads: [], updates: [], removes: [] };
  return {
    files,
    writes,
    storage: {
      async downloadIfExists(path) {
        return files.get(path) ?? null;
      },
      async upload(path, blob) {
        if (files.has(path)) throw new Error("already exists");
        files.set(path, blob);
        writes.uploads.push(path);
      },
      async remove(path) {
        files.delete(path);
        writes.removes.push(path);
      },
    },
    async updateReference(args) {
      writes.updates.push(args);
      return updateResult;
    },
  };
}

test("requires exactly one explicit mode", () => {
  assert.equal(parseMigrationMode(["--dry-run"]), "dry-run");
  assert.equal(parseMigrationMode(["--apply"]), "apply");
  assert.throws(() => parseMigrationMode([]));
  assert.throws(() => parseMigrationMode(["--dry-run", "--apply"]));
});

test("dry-run reports a different-content conflict without writes", async () => {
  const h = harness({ [sourcePath]: "source", [preferredPath]: "different" });
  const operations = await migrateLegacyCompanyAssets({
    rows: [row()], storage: h.storage, updateReference: h.updateReference,
    mode: "dry-run",
  });
  assert.equal(operations[0].conflict, true);
  assert.notEqual(operations[0].destination, preferredPath);
  assert.deepEqual(h.writes, { uploads: [], updates: [], removes: [] });
});

test("identical destination is reused only after content comparison", async () => {
  const h = harness({ [sourcePath]: "same", [preferredPath]: "same" });
  await migrateLegacyCompanyAssets({
    rows: [row()], storage: h.storage, updateReference: h.updateReference,
    mode: "apply",
  });
  assert.deepEqual(h.writes.uploads, []);
  assert.equal(h.writes.updates[0].newPath, preferredPath);
  assert.deepEqual(h.writes.removes, [sourcePath]);
});

test("different destination uses a non-conflicting verified path", async () => {
  const h = harness({ [sourcePath]: "source", [preferredPath]: "different" });
  await migrateLegacyCompanyAssets({
    rows: [row()], storage: h.storage, updateReference: h.updateReference,
    mode: "apply",
  });
  const uploaded = h.writes.uploads[0];
  assert.notEqual(uploaded, preferredPath);
  assert.equal(h.writes.updates[0].newPath, uploaded);
  assert.deepEqual(h.writes.removes, [sourcePath]);
});

test("failed SQL update preserves the source and old reference", async () => {
  const h = harness({ [sourcePath]: "source" }, false);
  await assert.rejects(() => migrateLegacyCompanyAssets({
    rows: [row()], storage: h.storage, updateReference: h.updateReference,
    mode: "apply",
  }));
  assert.equal(h.files.has(sourcePath), true);
  assert.deepEqual(h.writes.removes, []);
});

test("rerun after an interrupted cleanup verifies both objects then removes only legacy", async () => {
  const h = harness({ [sourcePath]: "same", [preferredPath]: "same" });
  await migrateLegacyCompanyAssets({
    rows: [row(preferredPath)], storage: h.storage, updateReference: h.updateReference,
    mode: "apply",
  });
  assert.deepEqual(h.writes.uploads, []);
  assert.deepEqual(h.writes.updates, []);
  assert.deepEqual(h.writes.removes, [sourcePath]);
  assert.equal(h.files.has(preferredPath), true);
});

test("rerun also resumes cleanup from a conflict destination", async () => {
  const conflictPath =
    "20000000-0000-0000-0000-000000000001/migrated-abcdef123456/"
    + sourcePath;
  const h = harness({ [sourcePath]: "same", [conflictPath]: "same" });
  await migrateLegacyCompanyAssets({
    rows: [row(conflictPath)], storage: h.storage, updateReference: h.updateReference,
    mode: "apply",
  });
  assert.deepEqual(h.writes.updates, []);
  assert.deepEqual(h.writes.removes, [sourcePath]);
  assert.equal(h.files.has(conflictPath), true);
});
