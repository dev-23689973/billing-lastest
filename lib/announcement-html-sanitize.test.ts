import { describe, expect, it } from "vitest";
import { sanitizeAnnouncementHtml } from "@/lib/announcement-html-sanitize";

describe("announcement-html-sanitize", () => {
  it("keeps rich inline styles", () => {
    const raw =
      '<p><span style="color:#e11d48;font-size:22px;font-family:Georgia, serif;font-style:italic">Hello</span></p>';
    const out = sanitizeAnnouncementHtml(raw);
    expect(out).toContain("color:#e11d48");
    expect(out).toContain("font-size:22px");
    expect(out).toContain("font-family:Georgia, serif");
    expect(out).toContain("font-style:italic");
  });

  it("strips scripts and unsafe tags", () => {
    const raw = '<p>Hi</p><script>alert(1)</script><iframe src="x"></iframe>';
    expect(sanitizeAnnouncementHtml(raw)).toBe("<p>Hi</p>");
  });

  it("allows uploaded announcement images only", () => {
    const ok = sanitizeAnnouncementHtml('<img src="/uploads/announcements/promo.jpg" alt="Promo" />');
    expect(ok).toContain('/uploads/announcements/promo.jpg');

    const bad = sanitizeAnnouncementHtml('<img src="https://evil.test/x.jpg" alt="X" />');
    expect(bad).not.toContain("evil.test");
  });

  it("keeps image width styles", () => {
    const raw =
      '<img src="/uploads/announcements/promo.jpg" alt="Promo" style="width:50%;max-width:100%;height:auto;border-radius:0.375rem" />';
    const out = sanitizeAnnouncementHtml(raw);
    expect(out).toContain("width:50%");
    expect(out).toContain("max-width:100%");
  });
});
