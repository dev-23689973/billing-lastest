import { describe, expect, it } from "vitest";
import {
  clampAnnouncementFontSizePx,
  formatAnnouncementFontSizePx,
  normalizeAnnouncementFontSize,
  parseAnnouncementFontSizePx,
} from "@/lib/announcement-typography";

describe("announcement-typography font size", () => {
  it("parses numeric px values", () => {
    expect(parseAnnouncementFontSizePx("16px")).toBe(16);
    expect(parseAnnouncementFontSizePx("16")).toBe(16);
    expect(parseAnnouncementFontSizePx(20)).toBe(20);
  });

  it("clamps custom input sizes", () => {
    expect(normalizeAnnouncementFontSize("17px")).toBe("17px");
    expect(normalizeAnnouncementFontSize("8px")).toBe("10px");
    expect(normalizeAnnouncementFontSize("120px")).toBe("96px");
  });

  it("formats clamped px", () => {
    expect(formatAnnouncementFontSizePx(clampAnnouncementFontSizePx(15.7))).toBe("16px");
  });
});
