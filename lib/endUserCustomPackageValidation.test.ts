import { describe, expect, it } from "vitest";
import {
  customPackageSelectionMessage,
  isCustomPackageSelectionIncomplete,
  parseAddonPackIdsFromForm,
} from "@/lib/endUserCustomPackageValidation";

describe("endUserCustomPackageValidation", () => {
  it("requires packs when custom plan is selected", () => {
    expect(isCustomPackageSelectionIncomplete(99, 99, 0)).toBe(true);
    expect(isCustomPackageSelectionIncomplete(99, 99, 1)).toBe(false);
    expect(isCustomPackageSelectionIncomplete(99, 1, 0)).toBe(false);
  });

  it("parses packs from form data", () => {
    const fd = new FormData();
    fd.append("packs", "12");
    fd.append("packs", "12");
    fd.append("packs", "34");
    expect(parseAddonPackIdsFromForm(fd)).toEqual([12, 34]);
  });

  it("returns message when incomplete", () => {
    expect(customPackageSelectionMessage(5, 5, [])).toMatch(/Select at least one package/);
    expect(customPackageSelectionMessage(5, 5, [1])).toBeNull();
  });
});
