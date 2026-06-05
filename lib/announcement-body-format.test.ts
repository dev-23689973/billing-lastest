import { describe, expect, it } from "vitest";
import {
  formatAnnouncementHtmlForDisplay,
  hasStructuredAnnouncementHtml,
  normalizeAnnouncementHtmlForStorage,
} from "@/lib/announcement-body-format";

describe("announcement-body-format", () => {
  it("wraps plain text with newlines", () => {
    const raw = "🤝 Line one\n\nLine two\n📩 @contact";
    const out = formatAnnouncementHtmlForDisplay(raw);
    expect(out).toContain('class="announcement-preserve-root"');
    expect(out).toContain("dir=\"auto\"");
    expect(out).toContain("🤝");
    expect(out).toContain("Line one");
    expect(out).not.toContain("<br");
  });

  it("is idempotent", () => {
    const raw = "A\n\nB";
    const once = formatAnnouncementHtmlForDisplay(raw);
    const twice = formatAnnouncementHtmlForDisplay(once);
    expect(twice).toBe(once);
  });

  it("leaves structured HTML unchanged", () => {
    const html = "<h3>Title</h3><p>Para</p>";
    expect(formatAnnouncementHtmlForDisplay(html)).toBe(html);
    expect(hasStructuredAnnouncementHtml(html)).toBe(true);
  });

  it("normalizes on storage", () => {
    const stored = normalizeAnnouncementHtmlForStorage("Hello\nWorld");
    expect(stored).toContain("announcement-preserve-root");
  });
});
