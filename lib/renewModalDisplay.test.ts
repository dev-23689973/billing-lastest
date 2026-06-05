import { describe, expect, it } from "vitest";
import {
  formatRelativeDayCountFromToday,
  formatRenewPeriodOptionLabel,
  formatRenewSubmitLabel,
  isRenewPromoOption,
} from "@/lib/renewModalDisplay";

describe("renewModalDisplay", () => {
  it("formats standard and promo period labels", () => {
    expect(formatRenewPeriodOptionLabel({ value: "1", label: "1 month" })).toBe("1 Month (1 Credit)");
    expect(formatRenewPeriodOptionLabel({ value: "24", label: "24 months (12 credits charged, 12 bonus months)" })).toBe(
      "24 Months (12 Credits + 12 Bonus Months)",
    );
    expect(formatRenewPeriodOptionLabel({ value: "6", label: "6 months (4 credits charged, 2 bonus months)" })).toBe(
      "6 Months (4 Credits + 2 Bonus Months)",
    );
  });

  it("detects promo rows", () => {
    expect(isRenewPromoOption({ value: "6", label: "6 months (5 credits charged, 1 bonus month)" })).toBe(true);
    expect(isRenewPromoOption({ value: "2", label: "2 months" })).toBe(false);
  });

  it("builds submit labels", () => {
    expect(formatRenewSubmitLabel({ value: "1", label: "1 month" })).toBe("Renew for 1 month");
    expect(formatRenewSubmitLabel({ value: "6", label: "6 months" })).toBe("Renew for 6 months");
  });

  it("formats relative day counts", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    expect(formatRelativeDayCountFromToday(today)).toBe("(today)");
  });
});
