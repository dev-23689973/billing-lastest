/** Sync integrated announcement composer DOM ↔ stored flash + body fields. */

import { formatAnnouncementHtmlForDisplay } from "@/lib/announcement-body-format";
import {
  ANNOUNCEMENT_FONT_FAMILIES,
  normalizeAnnouncementFontSize,
  type AnnouncementFontFamilyValue,
} from "@/lib/announcement-typography";
import {
  DEFAULT_ANNOUNCEMENT_FLASH_COLOR,
  DEFAULT_ANNOUNCEMENT_FLASH_FONT_SIZE,
  announcementFlashHeadingStyle,
  ensureAnnouncementFlashHeading,
  normalizeAnnouncementFlashColor,
  serializeAnnouncementFlashHeading,
  type AnnouncementFlashHeading,
} from "@/lib/announcement-flash";

export const ANNOUNCEMENT_COMPOSER_TITLE_CLASS =
  "announcement-flash-heading announcement-composer-title text-center outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]";

function cssColorToHex(color: string): string {
  const c = color.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return normalizeAnnouncementFlashColor(c);
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return DEFAULT_ANNOUNCEMENT_FLASH_COLOR;
  const hex = (n: string) => Number.parseInt(n, 10).toString(16).padStart(2, "0");
  return `#${hex(rgb[1]!)}${hex(rgb[2]!)}${hex(rgb[3]!)}`;
}

function fontFamilyStackToKey(stack: string): AnnouncementFontFamilyValue {
  const normalized = stack.trim().toLowerCase();
  if (!normalized || normalized === "inherit") return "default";
  for (const item of ANNOUNCEMENT_FONT_FAMILIES) {
    const probe = item.stack.split(",")[0]?.replace(/['"]/g, "").trim().toLowerCase();
    if (probe && normalized.includes(probe)) return item.value;
  }
  return "default";
}

function readStyleValue(inline: string, computed: string): string {
  return inline.trim() || computed;
}

export function readFlashFromTitleElement(
  el: HTMLElement | null,
  flashAnimation: boolean,
): AnnouncementFlashHeading | null {
  if (!el) return null;
  const text = el.innerText.replace(/\u00a0/g, " ").trim();
  if (!text) return null;

  const inline = el.style;
  const computed = window.getComputedStyle(el);
  const weight = readStyleValue(inline.fontWeight, computed.fontWeight);
  const weightNum = Number.parseInt(weight, 10);
  const decoration = readStyleValue(inline.textDecoration, computed.textDecorationLine);

  return {
    text,
    color: cssColorToHex(readStyleValue(inline.color, computed.color)),
    fontSize: normalizeAnnouncementFontSize(
      readStyleValue(inline.fontSize, computed.fontSize),
      DEFAULT_ANNOUNCEMENT_FLASH_FONT_SIZE,
    ),
    fontFamily: fontFamilyStackToKey(readStyleValue(inline.fontFamily, computed.fontFamily)),
    bold: weight === "bold" || weight === "bolder" || (Number.isFinite(weightNum) && weightNum >= 600),
    italic: readStyleValue(inline.fontStyle, computed.fontStyle) === "italic",
    underline: decoration.includes("underline"),
    flash: flashAnimation,
  };
}

export function applyFlashToTitleElement(
  el: HTMLElement | null,
  flash: AnnouncementFlashHeading | null | undefined,
  flashAnimation: boolean,
): void {
  if (!el) return;
  const normalized = ensureAnnouncementFlashHeading(flash);
  if (!normalized) {
    el.innerHTML = "";
    el.classList.remove("announcement-flash-heading--animate");
    return;
  }

  const style = announcementFlashHeadingStyle(normalized);
  el.textContent = normalized.text;
  el.style.color = style.color;
  el.style.fontSize = style.fontSize;
  el.style.fontFamily = style.fontFamily;
  el.style.fontWeight = String(style.fontWeight);
  el.style.fontStyle = style.fontStyle;
  el.style.textDecoration = style.textDecoration;
  el.classList.toggle("announcement-flash-heading--animate", flashAnimation && normalized.flash !== false);
}

export function serializeFlashFromTitleElement(
  el: HTMLElement | null,
  flashAnimation: boolean,
): string {
  return serializeAnnouncementFlashHeading(readFlashFromTitleElement(el, flashAnimation));
}

export function initialBodyEditorHtml(raw: string): string {
  return raw.trim() ? formatAnnouncementHtmlForDisplay(raw) : "<p><br></p>";
}
