import { describe, expect, it } from "vitest";
import { portalStaffMessageHeadline } from "@/lib/portalStaffMessageDisplay";

describe("portalStaffMessageHeadline", () => {
  it("prefers title over body preview", () => {
    expect(portalStaffMessageHeadline({ title: "Maintenance tonight", body: "Long body text" })).toBe(
      "Maintenance tonight",
    );
  });

  it("falls back to trimmed body when title is empty", () => {
    expect(portalStaffMessageHeadline({ title: "", body: "  Hello staff  " })).toBe("Hello staff");
  });

  it("returns Message when both are empty", () => {
    expect(portalStaffMessageHeadline({ title: "", body: "" })).toBe("Message");
  });
});
