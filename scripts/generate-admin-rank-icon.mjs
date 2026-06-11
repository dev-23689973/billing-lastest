import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "images", "promo-ranks");
const srcPath = path.join(root, "_originals", "admin.png");
const iconsDir = path.join(root, "icons");

/** Sidebar strip: 7 icons in one row, no frame (7:1). */
const STRIP_WIDTH = 336;
const STRIP_HEIGHT = 48;

/** Keep medals/gems/infinity; remove navy panel and connector bars. */
function iconStripAlpha(r, g, b, a) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = max === 0 ? 0 : chroma / max;

  if (max < 24 && chroma < 18) return 0;
  if (b > 130 && g > 100 && r < 130 && lum > 70) return a;
  if (sat > 0.32 && lum > 52) return a;
  if (lum > 115 && sat > 0.12) return a;
  if (max < 88 && b >= r - 12 && lum < 72) return 0;
  if (lum < 88 && sat < 0.38) return 0;
  if (lum < 105 && sat < 0.24) return Math.round(a * 0.08);
  if (lum < 48) return Math.round((lum / 48) * a * 0.08);
  return a;
}

async function knockOutBackdrop(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = iconStripAlpha(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

/** Crop to rows that actually contain icon pixels (drops top/bottom gold bars). */
async function cropToContentRows(image) {
  const { data, info } = await sharp(await image.png().toBuffer())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minY = info.height;
  let maxY = 0;
  const threshold = info.width * 6;

  for (let y = 0; y < info.height; y++) {
    let rowAlpha = 0;
    for (let x = 0; x < info.width; x++) {
      rowAlpha += data[(y * info.width + x) * 4 + 3];
    }
    if (rowAlpha > threshold) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (minY >= maxY) return image;

  const pad = Math.max(1, Math.floor((maxY - minY) * 0.04));
  return sharp(await image.png().toBuffer()).extract({
    left: 0,
    top: Math.max(0, minY - pad),
    width: info.width,
    height: Math.min(info.height, maxY - minY + 1 + pad * 2),
  });
}

async function prepareIconStrip() {
  const meta = await sharp(srcPath).metadata();
  const cropTop = Math.floor(meta.height * 0.34);
  const cropHeight = Math.floor(meta.height * 0.3);

  let pipe = sharp(srcPath).extract({
    left: 0,
    top: cropTop,
    width: meta.width,
    height: cropHeight,
  });

  pipe = await knockOutBackdrop(await pipe.png().toBuffer());
  pipe = await knockOutBackdrop(await pipe.trim().png().toBuffer());

  const trimmed = await pipe.metadata();
  const insetX = Math.floor(trimmed.width * 0.08);
  const innerW = trimmed.width - insetX * 2;

  pipe = sharp(await pipe.png().toBuffer()).extract({
    left: insetX,
    top: 0,
    width: innerW,
    height: trimmed.height,
  });

  pipe = await knockOutBackdrop(
    await pipe.modulate({ brightness: 1.28, saturation: 1.16 }).linear(1.14, -4).png().toBuffer(),
  );
  pipe = await cropToContentRows(pipe);
  pipe = await knockOutBackdrop(await pipe.trim().png().toBuffer());

  return pipe;
}

async function exportStrip(prepared, width, height, dest) {
  await prepared
    .clone()
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(dest);
}

const prepared = await prepareIconStrip();
const outPath = path.join(iconsDir, "admin.png");
const out2xPath = path.join(iconsDir, "admin@2x.png");

await exportStrip(prepared, STRIP_WIDTH, STRIP_HEIGHT, outPath);
await exportStrip(prepared, STRIP_WIDTH * 2, STRIP_HEIGHT * 2, out2xPath);

const outMeta = await sharp(outPath).metadata();
console.log(`Wrote admin.png (${outMeta.width}×${outMeta.height}, icon strip — do not slice into columns)`);
