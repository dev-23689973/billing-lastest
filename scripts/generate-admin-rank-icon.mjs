import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "images", "promo-ranks");
const srcPath = path.join(root, "_originals", "admin.png");
const outPath = path.join(root, "icons", "admin.png");
const out2xPath = path.join(root, "icons", "admin@2x.png");

/** 5 rank slots × 60px = 300px wide (expanded), same height as one slot row. */
const WIDTH = 300;
const HEIGHT = 60;

function backdropAlpha(r, g, b, a) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (max < 42 && chroma < 22) {
    return 0;
  }

  if (min > 150 && chroma < 30) {
    return 0;
  }
  if (min > 115 && max > 170 && chroma < 24) {
    return 0;
  }

  if (max < 58 && chroma < 24) {
    return Math.round(((max - 42) / 16) * a);
  }

  if (min > 135 && chroma < 32) {
    return Math.round(((170 - min) / 35) * a);
  }

  return a;
}

async function knockOutBackdrop(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = backdropAlpha(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function prepareSource() {
  const knocked = await knockOutBackdrop(srcPath);
  const trimmed = await knockOutBackdrop(await knocked.trim().png().toBuffer());

  const lightened = await trimmed
    .modulate({ brightness: 1.42, saturation: 1.18, lightness: 1.14 })
    .linear(1.28, -28)
    .gamma(1.08)
    .normalise()
    .png()
    .toBuffer();

  return knockOutBackdrop(lightened);
}

async function exportIcon(prepared, width, height, dest) {
  await prepared
    .clone()
    .resize(width, height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(dest);
}

const prepared = await prepareSource();
await exportIcon(prepared, WIDTH, HEIGHT, outPath);
await exportIcon(prepared, WIDTH * 2, HEIGHT * 2, out2xPath);

const outMeta = await sharp(outPath).metadata();
const corner = await sharp(outPath).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
console.log(`Wrote ${outPath} (${outMeta.width}×${outMeta.height}, alpha=${outMeta.hasAlpha})`);
console.log(`Corner RGBA: ${[...corner].join(",")}`);
