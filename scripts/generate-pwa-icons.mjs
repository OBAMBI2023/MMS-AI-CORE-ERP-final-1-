// One-time asset-generation script (not part of the app runtime/bundle):
// derives square 192x192 / 512x512 PWA icons from the existing, non-square
// public/branding/saovia-icon.png (737x619 "S" mark). Re-run manually if the
// source mark is ever replaced. Uses `sharp` (devDependency, build-time
// only) since the repo has no other image-processing tool.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(rootDir, "public/branding/saovia-icon.png");

async function makeIcon(size, outPath) {
  const padding = Math.round(size * 0.12);
  const inner = size - padding * 2;

  const iconBuf = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: iconBuf, gravity: "center" }])
    .png()
    .toFile(outPath);

  console.log("wrote", outPath);
}

await makeIcon(192, path.join(rootDir, "public/pwa-192x192.png"));
await makeIcon(512, path.join(rootDir, "public/pwa-512x512.png"));
