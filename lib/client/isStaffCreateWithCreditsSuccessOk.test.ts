import { describe, expect, it } from "vitest";
import { isStaffCreateWithCreditsSuccessOk } from "@/lib/client/invalidateAfterBillingMutation";

describe("isStaffCreateWithCreditsSuccessOk", () => {
  it("matches unified admin staff create ok values", () => {
    expect(isStaffCreateWithCreditsSuccessOk("created_reseller")).toBe(true);
    expect(isStaffCreateWithCreditsSuccessOk("created_manager")).toBe(true);
    expect(isStaffCreateWithCreditsSuccessOk("created_dealer")).toBe(true);
  });

  it("matches portal dealer create only on staff hub paths", () => {
    expect(isStaffCreateWithCreditsSuccessOk("created", "/reseller/dealers")).toBe(true);
    expect(isStaffCreateWithCreditsSuccessOk("created", "/reseller/users")).toBe(false);
    expect(isStaffCreateWithCreditsSuccessOk("created", "/manager/users")).toBe(false);
  });

  it("ignores unrelated ok values", () => {
    expect(isStaffCreateWithCreditsSuccessOk("credits_added")).toBe(false);
    expect(isStaffCreateWithCreditsSuccessOk("1")).toBe(false);
  });
});
