// One-time asset-generation script (not part of the app runtime/bundle):
// derives every SAOVIA HOTEL brand asset (icon mark, lockup, favicons, PWA
// icons, splash logo) from the single official master logo the client
// supplied (public/branding/saovia-hotel-logo.png, 1254x1254, flat white
// background, no alpha channel). The master is never redrawn, recolored, or
// distorted — every output here is either a straight crop (isolating the
// icon mark or the icon+wordmark lockup from the full lockup+tagline
// artwork, at fixed vertical fractions found by visual inspection), a
// `.trim()` (removes the uniform white margin around the cropped content),
// or a uniform resize (`fit: "contain"`, never "fill"/stretch, so aspect
// ratio is always preserved). Padding/background added around the trimmed
// mark for square icon slots uses the master's own flat white — never an
// invented color — except the maskable PWA icon, whose safe-zone padding is
// a spec requirement, not a stylistic effect.
//
// Re-run with `node scripts/generate-hotel-branding-assets.mjs` if the
// official hotel logo file is ever replaced (same filename/location).
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const SRC = "public/branding/saovia-hotel-logo.png";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Vertical fractions of the 1254x1254 master, found by visual inspection:
// the artwork stacks icon mark -> "SAOVIA HOTEL" wordmark -> tagline, top to
// bottom, with no reliable transparent/alpha boundary to detect
// programmatically (flat RGB, no alpha channel).
const ICON_ONLY_FRACTION = 0.6; // icon mark only, no text
const LOCKUP_FRACTION = 0.86; // icon + "SAOVIA HOTEL" wordmark, no tagline

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

async function croppedTrimmedBuffer(heightFraction) {
  const meta = await sharp(SRC).metadata();
  const h = heightFraction ? Math.round(meta.height * heightFraction) : meta.height;
  const cropped = await sharp(SRC)
    .extract({ left: 0, top: 0, width: meta.width, height: h })
    .png()
    .toBuffer();
  return sharp(cropped).trim({ background: "white", threshold: 10 }).png().toBuffer();
}

async function squareIcon({ source, size, marginRatio, background, outPath }) {
  const inner = Math.round(size * (1 - marginRatio * 2));
  const resized = await sharp(source)
    .resize(inner, inner, { fit: "contain", background })
    .toBuffer();
  const pad = Math.round((size - inner) / 2);
  const out = await sharp(resized)
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background,
    })
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  ensureDir(outPath);
  writeFileSync(outPath, out);
  console.log(outPath, "->", `${size}x${size}`, (out.length / 1024).toFixed(1) + "KB");
  return out;
}

async function fixedWidthPng({ source, maxDim, outPath }) {
  const meta = await sharp(source).metadata();
  const scale = maxDim / Math.max(meta.width, meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const out = await sharp(source)
    .resize(w, h, { fit: "contain", background: WHITE }) // uniform scale, correct existing aspect ratio, no distortion
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
    .toBuffer();
  ensureDir(outPath);
  writeFileSync(outPath, out);
  console.log(outPath, "->", `${w}x${h}`, (out.length / 1024).toFixed(1) + "KB");
}

// Minimal ICO container (PNG-frame format, supported by every modern
// browser + Windows since Vista): packs the already-generated 16/32/48 PNGs
// as-is, byte for byte — no re-encoding, no redraw.
function packIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const dataChunks = [];
  let offset = 6 + count * 16;

  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // data size
    entry.writeUInt32LE(offset, 12); // data offset
    dirEntries.push(entry);
    dataChunks.push(buf);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataChunks]);
}

const iconOnly = await croppedTrimmedBuffer(ICON_ONLY_FRACTION);
const lockup = await croppedTrimmedBuffer(LOCKUP_FRACTION);
const full = await croppedTrimmedBuffer(null);

// UI icon mark (header/footer/sidebar/vitrine "logo badge" usage) — high
// enough resolution to stay crisp at small CSS display sizes on Retina.
await squareIcon({
  source: iconOnly,
  size: 512,
  marginRatio: 0.06,
  background: WHITE,
  outPath: "public/branding/hotel/saovia-hotel-icon.png",
});

// Compact lockup (icon + wordmark, no tagline) for the login page / larger
// brand placements that need the full "SAOVIA HOTEL" name legible.
await fixedWidthPng({
  source: lockup,
  maxDim: 900,
  outPath: "public/branding/hotel/saovia-hotel-lockup.png",
});

// Favicons (PNG, referenced directly via <link rel="icon" sizes="...">,
// plus packed into a legacy .ico container for older consumers).
const favicon16 = await squareIcon({
  source: iconOnly,
  size: 16,
  marginRatio: 0.04,
  background: WHITE,
  outPath: "public/icons/hotel/favicon-16x16.png",
});
const favicon32 = await squareIcon({
  source: iconOnly,
  size: 32,
  marginRatio: 0.04,
  background: WHITE,
  outPath: "public/icons/hotel/favicon-32x32.png",
});
const favicon48 = await squareIcon({
  source: iconOnly,
  size: 48,
  marginRatio: 0.04,
  background: WHITE,
  outPath: "public/icons/hotel/favicon-48x48.png",
});

const icoBuffer = packIco([
  { size: 16, buf: favicon16 },
  { size: 32, buf: favicon32 },
  { size: 48, buf: favicon48 },
]);
ensureDir("public/favicon-hotel.ico");
writeFileSync("public/favicon-hotel.ico", icoBuffer);
console.log("public/favicon-hotel.ico ->", (icoBuffer.length / 1024).toFixed(1) + "KB");

// Apple touch icon: Apple recommends a fully opaque square (iOS applies its
// own rounding/mask), 180x180.
await squareIcon({
  source: iconOnly,
  size: 180,
  marginRatio: 0.1,
  background: WHITE,
  outPath: "public/icons/hotel/apple-touch-icon.png",
});

// PWA install icons.
await squareIcon({
  source: iconOnly,
  size: 192,
  marginRatio: 0.09,
  background: WHITE,
  outPath: "public/icons/hotel/pwa-192x192.png",
});
await squareIcon({
  source: iconOnly,
  size: 512,
  marginRatio: 0.09,
  background: WHITE,
  outPath: "public/icons/hotel/pwa-512x512.png",
});
// Maskable icon: OS may crop to a circle/rounded-square, so spec requires
// the mark to sit within an ~80% "safe zone" — this padding is a platform
// requirement, not a stylistic effect.
await squareIcon({
  source: iconOnly,
  size: 512,
  marginRatio: 0.18,
  background: WHITE,
  outPath: "public/icons/hotel/pwa-512x512-maskable.png",
});

// Splash screen logo: full lockup (icon + wordmark + tagline) so the brand
// is fully legible on the launch screen, matching the existing SAOVIA splash
// convention (src/components/pwa/PwaSplashScreen.tsx).
await fixedWidthPng({
  source: full,
  maxDim: 700,
  outPath: "public/splash/hotel/saovia-hotel-splash-logo.png",
});
