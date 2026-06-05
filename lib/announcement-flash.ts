/** Flash heading shown above the announcement body (gprod-style). */

import {
  normalizeAnnouncementFontFamily,
  normalizeAnnouncementFontSize,
  resolveAnnouncementFontFamily,
  type AnnouncementFontFamilyValue,
} from "@/lib/announcement-typography";

export const GLOBAL_ANNOUNCEMENT_FLASH_CONFIG_KEY = "global_announcement_flash";

export const DEFAULT_ANNOUNCEMENT_FLASH_COLOR = "#e11d48";
export const DEFAULT_ANNOUNCEMENT_FLASH_FONT_SIZE = "22px";

export type AnnouncementFlashHeading = {
  text: string;
  color: string;
  flash: boolean;
  fontSize: string;
  fontFamily: AnnouncementFontFamilyValue;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidAnnouncementFlashColor(color: string): boolean {
  return HEX_COLOR_RE.test(color.trim());
}

export function normalizeAnnouncementFlashColor(color: string): string {
  const trimmed = color.trim();
  if (isValidAnnouncementFlashColor(trimmed)) return trimmed.toLowerCase();
  return DEFAULT_ANNOUNCEMENT_FLASH_COLOR;
}

export function hasAnnouncementFlashText(flash: AnnouncementFlashHeading | null | undefined): boolean {
  return Boolean(flash?.text?.trim());
}

export function ensureAnnouncementFlashHeading(raw: unknown): AnnouncementFlashHeading | null {
  return normalizeAnnouncementFlashHeading(raw);
}

export function announcementFlashHeadingStyle(flash: AnnouncementFlashHeading): {
  color: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  lineHeight: string;
} {
  const normalized = normalizeAnnouncementFlashHeading(flash) ?? flash;
  return {
    color: normalizeAnnouncementFlashColor(
      typeof normalized.color === "string" ? normalized.color : DEFAULT_ANNOUNCEMENT_FLASH_COLOR,
    ),
    fontSize: normalizeAnnouncementFontSize(normalized.fontSize, DEFAULT_ANNOUNCEMENT_FLASH_FONT_SIZE),
    fontFamily: resolveAnnouncementFontFamily(normalized.fontFamily),
    fontWeight: normalized.bold ? 700 : 400,
    fontStyle: normalized.italic ? "italic" : "normal",
    textDecoration: normalized.underline ? "underline" : "none",
    lineHeight: "1.35",
  };
}

export function normalizeAnnouncementFlashHeading(raw: unknown): AnnouncementFlashHeading | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) return null;

  return {
    text,
    color: normalizeAnnouncementFlashColor(typeof o.color === "string" ? o.color : DEFAULT_ANNOUNCEMENT_FLASH_COLOR),
    flash: o.flash !== false,
    fontSize: normalizeAnnouncementFontSize(o.fontSize, DEFAULT_ANNOUNCEMENT_FLASH_FONT_SIZE),
    fontFamily: normalizeAnnouncementFontFamily(o.fontFamily),
    bold: o.bold === true || o.fontWeight === "bold" || o.fontWeight === 700 || o.fontWeight === "700",
    italic: o.italic === true || o.fontStyle === "italic",
    underline: o.underline === true || o.textDecoration === "underline",
  };
}

export function parseAnnouncementFlashJson(raw: string | null | undefined): AnnouncementFlashHeading | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  try {
    return normalizeAnnouncementFlashHeading(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

export function serializeAnnouncementFlashHeading(flash: AnnouncementFlashHeading | null): string {
  const normalized = flash ? ensureAnnouncementFlashHeading(flash) : null;
  if (!normalized) return "";
  return JSON.stringify({
    text: normalized.text.trim(),
    color: normalized.color,
    flash: normalized.flash !== false,
    fontSize: normalized.fontSize,
    fontFamily: normalized.fontFamily,
    bold: normalized.bold,
    italic: normalized.italic,
    underline: normalized.underline,
  });
}

export function parseAnnouncementFlashFormValue(raw: string | null | undefined): AnnouncementFlashHeading | null {
  return parseAnnouncementFlashJson(raw);
}
