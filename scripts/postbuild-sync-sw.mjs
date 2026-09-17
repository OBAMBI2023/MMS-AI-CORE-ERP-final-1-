// Nitro's Vercel preset packages `.output/public` into
// `.vercel/output/static` during Rollup's `writeBundle` stage, which always
// completes before vite-plugin-pwa's own `closeBundle` hook has written
// sw.js/workbox-*.js — that stage ordering is fixed by Rollup itself and
// cannot be changed by plugin position or `enforce`. Without this step, the
// service worker exists in `.output/public` but never reaches the deployed
// static output, producing a 404 on /sw.js in production.
//
// Runs as a `vite build &&` postbuild step (see package.json). No-ops when
// `.vercel/output/static` doesn't exist, i.e. any build that isn't going
// through the Vercel preset (plain local `vite build`, other targets).
import { existsSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_DIR = ".output/public";
const VERCEL_STATIC_DIR = ".vercel/output/static";

if (!existsSync(VERCEL_STATIC_DIR)) {
  process.exit(0);
}

const swFiles = readdirSync(PUBLIC_DIR).filter(
  (file) => file === "sw.js" || file.startsWith("workbox-"),
);

if (swFiles.length === 0) {
  console.warn("[postbuild-sync-sw] no service worker files found in .output/public — nothing to sync");
  process.exit(0);
}

for (const file of swFiles) {
  copyFileSync(join(PUBLIC_DIR, file), join(VERCEL_STATIC_DIR, file));
  console.log(`[postbuild-sync-sw] synced ${file} -> ${VERCEL_STATIC_DIR}/${file}`);
}
