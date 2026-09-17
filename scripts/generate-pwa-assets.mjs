// One-off generator used to derive every SAOVIA PWA/splash asset from the
// official source logo (Downloads/5f4a3f92-5eee-40c2-9cc2-1a5687e1f5c9.png).
// The source artwork is never redrawn or recolored here — only trimmed of
// its (non-symmetric) transparent margin, re-centered on a fresh transparent
// or brand-navy canvas, and resized uniformly (no aspect distortion).
//
// Re-run with `node scripts/generate-pwa-assets.mjs <path-to-source-png>` if
// the official logo is ever replaced.
//
// Note: sharp does not treat chained geometric ops (.extend() then
// .resize()) as strictly sequential within a single pipeline — always
// materialize a buffer between them, or the second op silently resizes
// against the wrong intermediate canvas.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = process.argv[2] ?? "C:\\Users\\HP\\Downloads\\5f4a3f92-5eee-40c2-9cc2-1a5687e1f5c9.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const NAVY = { r: 0x07, g: 0x1b, b: 0x49, alpha: 1 };

async function trimmedBuffer() {
  return sharp(SRC).trim({ threshold: 10 }).png().toBuffer();
}

async function squareIcon({ size, marginRatio, background, outPath }) {
  const trimmed = await trimmedBuffer();
  const inner = Math.round(size * (1 - marginRatio * 2));
  const resized = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background })
    .toBuffer();
  const pad = Math.round((size - inner) / 2);
  const extended = await sharp(resized)
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background,
    })
    .toBuffer();
  const out = await sharp(extended)
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  writeFileSync(outPath, out);
  console.log(outPath, "->", size + "x" + size, (out.length / 1024).toFixed(1) + "KB");
}

async function splashLogo({ outPath, maxDim }) {
  const trimmed = await trimmedBuffer();
  const meta = await sharp(trimmed).metadata();
  const margin = Math.round(Math.max(meta.width, meta.height) * 0.06);
  const padded = await sharp(trimmed)
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: TRANSPARENT })
    .toBuffer();
  const paddedMeta = await sharp(padded).metadata();
  const scale = maxDim / Math.max(paddedMeta.width, paddedMeta.height);
  const w = Math.round(paddedMeta.width * scale);
  const h = Math.round(paddedMeta.height * scale);
  const out = await sharp(padded)
    .resize(w, h, { fit: "fill" }) // uniform scale of an already-correct aspect ratio, no distortion
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  writeFileSync(outPath, out);
  console.log(outPath, "->", w + "x" + h, (out.length / 1024).toFixed(1) + "KB");
}

await squareIcon({ size: 192, marginRatio: 0.09, background: TRANSPARENT, outPath: "public/pwa-192x192.png" });
await squareIcon({ size: 512, marginRatio: 0.09, background: TRANSPARENT, outPath: "public/pwa-512x512.png" });
await squareIcon({ size: 512, marginRatio: 0.16, background: NAVY, outPath: "public/icons/saovia-maskable-512.png" });
await squareIcon({ size: 180, marginRatio: 0.12, background: NAVY, outPath: "public/icons/apple-touch-icon.png" });
await splashLogo({ outPath: "public/splash/saovia-splash-logo.png", maxDim: 700 });
