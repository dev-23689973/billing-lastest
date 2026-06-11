import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "images", "promo-ranks", "icons");
const SIZE = 48;

/** 🥉 🥈 🥇 💎 💠 — VIP (6th) uses crowned diamond separately. */
const RANK_SOURCES = {
  bronze: "bronze.png",
  silver: "silver.png",
  gold: "gold.png",
  platinum: "platinum.png",
  diamond: "platinum.png",
  vip: "diamond.png",
};

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

async function exportRank(name, sourceFile, tune = {}) {
  const src = path.join(iconsDir, sourceFile);
  const dest = path.join(iconsDir, `${name}.png`);

  let pipe = await knockOutBackdrop(src);
  pipe = pipe.trim();

  if (tune.brightness || tune.saturation || tune.lightness) {
    pipe = pipe.modulate({
      brightness: tune.brightness ?? 1,
      saturation: tune.saturation ?? 1,
      lightness: tune.lightness ?? 1,
    });
  }
  if (tune.linear) {
    const [a, b] = tune.linear;
    pipe = pipe.linear(a, b);
  }

  await pipe
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toFile(dest);

  const meta = await sharp(dest).metadata();
  console.log(`Wrote ${name}.png from ${sourceFile} (${meta.width}×${meta.height}, alpha=${meta.hasAlpha})`);
}

// VIP must be built from crowned diamond before diamond.png is overwritten.
await exportRank("vip", RANK_SOURCES.vip, { brightness: 1.12, saturation: 1.1 });

await exportRank("bronze", RANK_SOURCES.bronze, { brightness: 1.1, saturation: 1.05 });
await exportRank("silver", RANK_SOURCES.silver, { brightness: 1.12, saturation: 1.05 });
await exportRank("gold", RANK_SOURCES.gold, { brightness: 1.14, saturation: 1.08 });
await exportRank("platinum", RANK_SOURCES.platinum, { brightness: 1.1, saturation: 1.02 });
await exportRank("diamond", RANK_SOURCES.diamond, {
  brightness: 1.22,
  saturation: 1.18,
  lightness: 1.06,
  linear: [1.08, -8],
});
