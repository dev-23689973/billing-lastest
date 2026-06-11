import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "images", "promo-ranks");
const source = path.join(root, "_originals", "vip.png");
const iconsDir = path.join(root, "icons");

function backdropAlpha(r, g, b, a) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (max < 42 && chroma < 22) return 0;
  if (min > 145 && chroma < 30) return 0;
  if (min > 110 && max > 165 && chroma < 24) return 0;
  if (max < 58 && chroma < 24) return Math.round(((max - 42) / 16) * a);
  if (min > 130 && chroma < 32) return Math.round(((165 - min) / 35) * a);

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

async function exportVip(size, destName) {
  let pipe = await knockOutBackdrop(source);
  pipe = pipe.trim().modulate({ brightness: 1.1, saturation: 1.08 });

  const dest = path.join(iconsDir, destName);
  await pipe
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toFile(dest);

  const meta = await sharp(dest).metadata();
  console.log(`Wrote ${destName} (${meta.width}×${meta.height}, ${meta.size} bytes)`);
}

await exportVip(48, "vip.png");
await exportVip(96, "vip@2x.png");
