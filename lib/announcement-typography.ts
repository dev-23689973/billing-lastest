export const ANNOUNCEMENT_FONT_SIZE_MIN = 10;
export const ANNOUNCEMENT_FONT_SIZE_MAX = 96;

/** Common pixel sizes — shown in the size preset dropdown. */
export const ANNOUNCEMENT_FONT_SIZE_PRESETS = [
  10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48, 60, 72,
] as const;

/** @deprecated Use numeric presets — kept for imports that map label/value pairs. */
export const ANNOUNCEMENT_FONT_SIZES = ANNOUNCEMENT_FONT_SIZE_PRESETS.map((px) => ({
  label: String(px),
  value: `${px}px`,
}));

export const ANNOUNCEMENT_TEXT_COLORS = [
  "#0f172a",
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
] as const;

/** @deprecated Use ANNOUNCEMENT_FONT_SIZE_PRESETS */
export const ANNOUNCEMENT_HEADING_FONT_SIZES = ANNOUNCEMENT_FONT_SIZES.filter((item) =>
  [18, 22, 28, 34, 42].includes(Number.parseInt(item.label, 10)),
);

export const ANNOUNCEMENT_FONT_FAMILIES = [
  { label: "Default", value: "default", stack: "inherit" },
  { label: "Arial", value: "arial", stack: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "verdana", stack: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "tahoma", stack: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "trebuchet", stack: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Georgia", value: "georgia", stack: "Georgia, serif" },
  { label: "Times New Roman", value: "times", stack: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "courier", stack: "'Courier New', Courier, monospace" },
  { label: "Impact", value: "impact", stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
] as const;

export type AnnouncementFontFamilyValue = (typeof ANNOUNCEMENT_FONT_FAMILIES)[number]["value"];

export function clampAnnouncementFontSizePx(px: number): number {
  if (!Number.isFinite(px)) return 15;
  return Math.min(ANNOUNCEMENT_FONT_SIZE_MAX, Math.max(ANNOUNCEMENT_FONT_SIZE_MIN, Math.round(px)));
}

export function parseAnnouncementFontSizePx(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampAnnouncementFontSizePx(value);
  }
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:px)?$/i);
  if (!match) return null;
  return clampAnnouncementFontSizePx(Number.parseFloat(match[1]!));
}

export function formatAnnouncementFontSizePx(px: number): string {
  return `${clampAnnouncementFontSizePx(px)}px`;
}

export function resolveAnnouncementFontFamily(value: unknown): string {
  if (typeof value !== "string") return "inherit";
  const key = value.trim().toLowerCase();
  if (!key || key === "default") return "inherit";
  const found = ANNOUNCEMENT_FONT_FAMILIES.find((item) => item.value === key);
  return found?.stack ?? "inherit";
}

export function normalizeAnnouncementFontFamily(value: unknown): AnnouncementFontFamilyValue {
  if (typeof value !== "string") return "default";
  const key = value.trim().toLowerCase();
  if (ANNOUNCEMENT_FONT_FAMILIES.some((item) => item.value === key)) {
    return key as AnnouncementFontFamilyValue;
  }
  return "default";
}

export function normalizeAnnouncementFontSize(value: unknown, fallback = "22px"): string {
  const parsed = parseAnnouncementFontSizePx(value);
  if (parsed !== null) return formatAnnouncementFontSizePx(parsed);
  const fallbackParsed = parseAnnouncementFontSizePx(fallback);
  return fallbackParsed === null ? "22px" : formatAnnouncementFontSizePx(fallbackParsed);
}

export function isAllowedAnnouncementFontFamilyStack(stack: string): boolean {
  const trimmed = stack.trim();
  if (!trimmed || trimmed === "inherit") return true;
  return ANNOUNCEMENT_FONT_FAMILIES.some((item) => item.stack === trimmed);
}

export function sanitizeAnnouncementFontFamilyStyle(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "inherit") return "inherit";
  if (isAllowedAnnouncementFontFamilyStack(trimmed)) return trimmed;
  for (const item of ANNOUNCEMENT_FONT_FAMILIES) {
    if (trimmed.toLowerCase() === item.value) return item.stack;
  }
  return "";
}
