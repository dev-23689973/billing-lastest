import { describe, expect, it } from "vitest";
import {
  announcementContentHash,
  announcementDismissStorageKey,
  announcementSessionDismissStorageKey,
  isAnnouncementEmpty,
  normalizeAnnouncementSlides,
  parseAnnouncementSlidesJson,
} from "@/lib/global-announcement-data";

describe("global-announcement-data", () => {
  it("rejects invalid slide paths", () => {
    expect(normalizeAnnouncementSlides(["/evil/../x.jpg", "https://x.com/a.png"])).toEqual([]);
    expect(
      normalizeAnnouncementSlides(["/uploads/announcements/promo.webp"]),
    ).toEqual(["/uploads/announcements/promo.webp"]);
  });

  it("is empty only when no text, no slides, and no flash heading", () => {
    expect(isAnnouncementEmpty("", [])).toBe(true);
    expect(isAnnouncementEmpty("<p></p>", [])).toBe(true);
    expect(isAnnouncementEmpty("", ["/uploads/announcements/a.jpg"])).toBe(false);
    expect(isAnnouncementEmpty("<p>Hi</p>", [])).toBe(false);
    expect(
      isAnnouncementEmpty("", [], { text: "Flash title", color: "#e11d48", flash: true, fontSize: "22px", fontFamily: "default", bold: true, italic: false, underline: false }),
    ).toBe(false);
  });

  it("hash changes when flash heading changes", () => {
    const a = announcementContentHash("hello", [], { text: "A", color: "#e11d48", flash: true, fontSize: "22px", fontFamily: "default", bold: true, italic: false, underline: false });
    const b = announcementContentHash("hello", [], { text: "B", color: "#e11d48", flash: true, fontSize: "22px", fontFamily: "default", bold: true, italic: false, underline: false });
    expect(a).not.toBe(b);
  });

  it("hash changes when slides change", () => {
    const a = announcementContentHash("hello", []);
    const b = announcementContentHash("hello", ["/uploads/announcements/x.jpg"]);
    expect(a).not.toBe(b);
  });

  it("uses distinct keys for persistent vs session dismiss", () => {
    const hash = announcementContentHash("x", []);
    expect(announcementDismissStorageKey("admin", hash)).not.toBe(
      announcementSessionDismissStorageKey("admin", hash),
    );
  });

  it("parses slides json", () => {
    expect(parseAnnouncementSlidesJson('["/uploads/announcements/a.jpg"]')).toEqual([
      "/uploads/announcements/a.jpg",
    ]);
    expect(parseAnnouncementSlidesJson("not json")).toEqual([]);
  });
});
