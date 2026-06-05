import { sanitizeAnnouncementHtml } from "@/lib/announcement-html-sanitize";

/**
 * Preserve pasted announcement layout: line breaks, spacing, emoji, mixed LTR/RTL.
 * Plain / line-based text is wrapped for display; structured HTML (p, lists, headings) is left as-is.
 */

const PRESERVE_ROOT_CLASS = "announcement-preserve-root";
const PRESERVE_MARK = `class="${PRESERVE_ROOT_CLASS}"`;

const STRUCTURED_HTML_RE = /<(p|div|h[1-6]|ul|ol|li|table|blockquote|section|article)\b/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when admin used block-level HTML (toolbar headings, lists, etc.). */
export function hasStructuredAnnouncementHtml(html: string): boolean {
  return STRUCTURED_HTML_RE.test(html);
}

function alreadyPreserveWrapped(html: string): boolean {
  return html.includes(PRESERVE_MARK) || html.includes(PRESERVE_ROOT_CLASS);
}

/**
 * Format announcement body for modal + settings preview.
 * Idempotent when called again on stored output.
 */
export function formatAnnouncementHtmlForDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (alreadyPreserveWrapped(trimmed)) return trimmed;
  if (hasStructuredAnnouncementHtml(trimmed)) return trimmed;

  const hasBlockTags = /<(p|div|h[1-6]|ul|ol|li|table)\b/i.test(trimmed);
  if (hasBlockTags) return trimmed;

  const hasNewlines = /\r?\n/.test(trimmed);
  const brCount = (trimmed.match(/<br\s*\/?>/gi) ?? []).length;
  const hasInlineHtml = /<(strong|em|b|i|a|span)\b/i.test(trimmed);

  const shouldPreserve =
    hasNewlines || brCount > 0 || (!hasInlineHtml && !/<[a-z][\s>/]/i.test(trimmed));

  if (!shouldPreserve) return trimmed;

  let inner: string;
  if (hasInlineHtml || brCount > 0) {
    inner = trimmed.replace(/\r?\n/g, "<br />");
  } else {
    inner = escapeHtml(trimmed);
  }

  return `<div class="${PRESERVE_ROOT_CLASS}" dir="auto">${inner}</div>`;
}

/** Normalize on save so DB always stores display-safe markup. */
export function normalizeAnnouncementHtmlForStorage(raw: string): string {
  const sanitized = sanitizeAnnouncementHtml(raw);
  if (!sanitized) return "";
  if (/<[a-z][\s>/]/i.test(sanitized)) return sanitized;
  return formatAnnouncementHtmlForDisplay(sanitized);
}
