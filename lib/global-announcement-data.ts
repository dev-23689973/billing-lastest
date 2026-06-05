/** Client-safe global announcement payload helpers (no server/fs imports). */

import {
  hasAnnouncementFlashText,
  type AnnouncementFlashHeading,
  serializeAnnouncementFlashHeading,
} from "@/lib/announcement-flash";

export {
  GLOBAL_ANNOUNCEMENT_FLASH_CONFIG_KEY,
  type AnnouncementFlashHeading,
  parseAnnouncementFlashJson,
  serializeAnnouncementFlashHeading,
} from "@/lib/announcement-flash";

export const GLOBAL_ANNOUNCEMENT_SLIDES_CONFIG_KEY = "global_announcement_slides";

/** Public URL path segment for uploaded slide files. */
export const ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX = "/uploads/announcements/";

export const ANNOUNCEMENT_SLIDES_MAX_COUNT = 12;
export const ANNOUNCEMENT_SLIDE_MAX_BYTES = 5 * 1024 * 1024;

export type GlobalAnnouncementPayload = {
  html: string;
  slides: string[];
  flash: AnnouncementFlashHeading | null;
};

export function isAnnouncementHtmlEmpty(html: string): boolean {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

export function isAnnouncementEmpty(
  html: string,
  slides: string[],
  flash: AnnouncementFlashHeading | null = null,
): boolean {
  return (
    isAnnouncementHtmlEmpty(html) &&
    normalizeAnnouncementSlides(slides).length === 0 &&
    !hasAnnouncementFlashText(flash)
  );
}

/** Only allow paths served from our announcements upload folder. */
export function isValidAnnouncementSlidePath(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith(ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX)) return false;
  const rest = p.slice(ANNOUNCEMENT_SLIDES_PUBLIC_PREFIX.length);
  if (!rest || rest.includes("..") || rest.includes("\\") || rest.includes("/")) return false;
  return /^[a-zA-Z0-9._-]+$/.test(rest);
}

export function normalizeAnnouncementSlides(slides: unknown): string[] {
  if (!Array.isArray(slides)) return [];
  const out: string[] = [];
  for (const item of slides) {
    if (typeof item !== "string") continue;
    const p = item.trim();
    if (!isValidAnnouncementSlidePath(p)) continue;
    if (!out.includes(p)) out.push(p);
    if (out.length >= ANNOUNCEMENT_SLIDES_MAX_COUNT) break;
  }
  return out;
}

export function parseAnnouncementSlidesJson(raw: string | null | undefined): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return normalizeAnnouncementSlides(parsed);
  } catch {
    return [];
  }
}

export function serializeAnnouncementSlides(slides: string[]): string {
  return JSON.stringify(normalizeAnnouncementSlides(slides));
}

/** Stable key so a new announcement (text, slides, or flash) shows the login modal again. */
export function announcementContentHash(
  html: string,
  slides: string[],
  flash: AnnouncementFlashHeading | null = null,
): string {
  const normalized = `${html.trim()}\n${serializeAnnouncementSlides(slides)}\n${serializeAnnouncementFlashHeading(flash)}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (Math.imul(31, hash) + normalized.charCodeAt(i)) | 0;
  }
  return String(hash >>> 0);
}

export function announcementDismissStorageKey(username: string, contentHash: string): string {
  return `billing-global-announcement:${username}:${contentHash}`;
}

/** Per browser tab session — dismiss without checking "don't show again" still hides until tab close. */
export function announcementSessionDismissStorageKey(username: string, contentHash: string): string {
  return `billing-global-announcement-session:${username}:${contentHash}`;
}
