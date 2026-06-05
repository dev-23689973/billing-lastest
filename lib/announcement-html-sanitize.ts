/**
 * Server-safe sanitizer for admin-authored announcement HTML.
 * Allows rich inline styles (font size, color) while stripping scripts and unsafe markup.
 */

import { isValidAnnouncementSlidePath } from "@/lib/global-announcement-data";
import { sanitizeAnnouncementFontFamilyStyle } from "@/lib/announcement-typography";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
  "hr",
  "font",
]);

const ALLOWED_CLASSES = new Set(["announcement-preserve-root"]);

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "line-height",
  "text-align",
  "background-color",
  "text-decoration",
  "width",
  "max-width",
  "height",
  "border-radius",
]);

const UNSAFE_TAG_RE = /<\/?(?:script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg)[^>]*>/gi;
const TAG_RE = /<\/?([a-z0-9]+)([^>]*)>/gi;
const ATTR_RE = /([a-z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;

function isSafeCssValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v || v.length > 80) return false;
  if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(v)) return false;
  return /^[#a-z0-9%,.\s()/-]+$/i.test(v);
}

function sanitizeStyle(raw: string): string {
  const parts: string[] = [];
  for (const chunk of raw.split(";")) {
    const idx = chunk.indexOf(":");
    if (idx < 1) continue;
    const prop = chunk.slice(0, idx).trim().toLowerCase();
    const val = chunk.slice(idx + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (prop === "font-family") {
      const family = sanitizeAnnouncementFontFamilyStyle(val);
      if (family) parts.push(`font-family:${family}`);
      continue;
    }
    if (!isSafeCssValue(val)) continue;
    parts.push(`${prop}:${val}`);
  }
  return parts.join(";");
}

function sanitizeHref(href: string): string {
  const h = href.trim();
  if (!h) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/uploads\/announcements\/)/i.test(h)) return h;
  if (h.startsWith("#") && /^#[\w-]+$/.test(h)) return h;
  return "";
}

function sanitizeAttributes(tag: string, attrsRaw: string): string {
  const attrs: string[] = [];
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrsRaw)) !== null) {
    const name = match[1]!.toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    if (name === "class") {
      const kept = value
        .split(/\s+/)
        .map((c) => c.trim())
        .filter((c) => ALLOWED_CLASSES.has(c));
      if (kept.length) attrs.push(`class="${kept.join(" ")}"`);
      continue;
    }

    if (name === "style") {
      const style = sanitizeStyle(value);
      if (style) attrs.push(`style="${style}"`);
      continue;
    }

    if (name === "dir" && (value === "auto" || value === "ltr" || value === "rtl")) {
      attrs.push(`dir="${value}"`);
      continue;
    }

    if (tag === "a" && name === "href") {
      const href = sanitizeHref(value);
      if (href) {
        attrs.push(`href="${href.replace(/"/g, "&quot;")}"`);
        attrs.push('target="_blank"');
        attrs.push('rel="noopener noreferrer"');
      }
      continue;
    }

    if (tag === "img" && name === "src") {
      if (isValidAnnouncementSlidePath(value)) {
        attrs.push(`src="${value.replace(/"/g, "&quot;")}"`);
      }
      continue;
    }

    if (tag === "img" && name === "alt") {
      attrs.push(`alt="${value.slice(0, 200).replace(/"/g, "&quot;")}"`);
    }
  }

  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function sanitizeTags(html: string): string {
  return html.replace(TAG_RE, (full, tagName: string, attrsRaw: string) => {
    const tag = String(tagName).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    const isClosing = full.startsWith("</");
    if (isClosing) return `</${tag}>`;

    if (tag === "br" || tag === "hr" || tag === "img") return `<${tag}${sanitizeAttributes(tag, attrsRaw)} />`;

    return `<${tag}${sanitizeAttributes(tag, attrsRaw)}>`;
  });
}

/** Strip dangerous markup and normalize allowed rich-text HTML. */
export function sanitizeAnnouncementHtml(raw: string): string {
  let html = raw.trim();
  if (!html) return "";

  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(UNSAFE_TAG_RE, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = sanitizeTags(html);

  return html.trim();
}
