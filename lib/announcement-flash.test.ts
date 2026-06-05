import { describe, expect, it } from "vitest";
import {
  ensureAnnouncementFlashHeading,
  normalizeAnnouncementFlashHeading,
  parseAnnouncementFlashJson,
  serializeAnnouncementFlashHeading,
  type AnnouncementFlashHeading,
} from "@/lib/announcement-flash";

describe("announcement-flash", () => {
  it("round-trips typography settings", () => {
    const flash = {
      text: "Quick Options",
      color: "#e11d48",
      flash: true,
      fontSize: "28px",
      fontFamily: "georgia" as const,
      bold: true,
      italic: true,
      underline: false,
    };
    const json = serializeAnnouncementFlashHeading(flash);
    const parsed = parseAnnouncementFlashJson(json);
    expect(parsed).toEqual(flash);
  });

  it("defaults typography for legacy saved flash headings", () => {
    const parsed = normalizeAnnouncementFlashHeading({
      text: "Hello",
      color: "#2563eb",
      flash: true,
    });
    expect(parsed).toMatchObject({
      text: "Hello",
      fontSize: "22px",
      fontFamily: "default",
      bold: false,
      italic: false,
      underline: false,
    });
  });

  it("normalizes partial runtime flash objects", () => {
    const parsed = ensureAnnouncementFlashHeading({
      text: "Legacy",
      color: "#e11d48",
      flash: true,
    } as AnnouncementFlashHeading);
    expect(parsed?.fontFamily).toBe("default");
    expect(parsed?.fontSize).toBe("22px");
  });
});
