import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260730210000_centralize_partner_tenant_lifecycle.sql",
  "utf8",
);
const applicationFiles = [
  "src/hooks/use-signed-url.ts",
  "src/routes/devis.tsx",
  "src/routes/parametres.tsx",
  "src/lib/partner-admin.server.ts",
  "src/routes/login.tsx",
].map((path) => readFileSync(path, "utf8")).join("\n");

test("company-assets is private before its authenticated policies", () => {
  const privateBucket = migration.indexOf(
    "UPDATE storage.buckets\nSET public = false\nWHERE id = 'company-assets';",
  );
  const firstPolicy = migration.indexOf('ALTER POLICY "company-assets read"');
  assert.ok(privateBucket >= 0);
  assert.ok(firstPolicy > privateBucket);
});

test("company-assets policies require authenticated tenant-scoped access", () => {
  assert.match(migration, /ALTER POLICY "company-assets read" ON storage\.objects TO authenticated/);
  assert.match(migration, /public\.current_tenant_id\(\)::text/);
  assert.doesNotMatch(applicationFiles, /\.getPublicUrl\s*\(/);
});

test("application reads company assets with signed URLs", () => {
  assert.match(applicationFiles, /\.createSignedUrl\s*\(/);
});
