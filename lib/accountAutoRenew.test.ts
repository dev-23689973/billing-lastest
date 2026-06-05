import { describe, expect, it } from "vitest";
import {
  autoRenewPeriodSelectionFromAccount,
  buildAutoRenewPeriodSelectOptions,
  clampAutoRenewPeriodSelection,
  computeAutoRenewUntilDate,
  formatAutoRenewEnabledCellDisplay,
  formatAutoRenewTotalMonthsLabel,
  formatAutoRenewUntilLabel,
  formatAutoRenewUntilLabelFromTotal,
  formatAutoRenewUntilMonthYear,
  formatAutoRenewUntilParts,
  getAutoRenewEnableBlockMessage,
  isAutoRenewEnableBlocked,
  parseAutoRenewPeriodSelection,
} from "@/lib/accountAutoRenew";

const sampleValidity = [
  { value: "1", label: "1 month" },
  { value: "2", label: "2 months" },
  { value: "3", label: "3 months (2 credits charged, 1 bonus month)" },
  { value: "4", label: "4 months" },
  { value: "5", label: "5 months" },
];

describe("accountAutoRenew set-auto-renew helpers", () => {
  it("builds month options from 1 through debit balance plus disable", () => {
    const options = buildAutoRenewPeriodSelectOptions(sampleValidity, 16);
    expect(options.map((o) => o.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "disable",
    ]);
    expect(options[0]).toEqual({ value: "1", label: "1 Month" });
    expect(options[15]).toEqual({ value: "16", label: "16 Months" });
    expect(options[16]).toEqual({ value: "disable", label: "Disable auto renew" });
  });

  it("builds affordable month options from balance when below max", () => {
    const options = buildAutoRenewPeriodSelectOptions(sampleValidity, 2);
    expect(options.map((o) => o.value)).toEqual(["1", "2", "disable"]);
  });

  it("caps at 24 months when balance exceeds server max", () => {
    const options = buildAutoRenewPeriodSelectOptions(sampleValidity, 99);
    expect(options.filter((o) => o.value !== "disable")).toHaveLength(24);
  });

  it("returns only disable when balance is zero", () => {
    const options = buildAutoRenewPeriodSelectOptions(sampleValidity, 0);
    expect(options).toEqual([{ value: "disable", label: "Disable auto renew" }]);
  });

  it("clamps selection to nearest affordable month", () => {
    const options = buildAutoRenewPeriodSelectOptions(sampleValidity, 2);
    expect(clampAutoRenewPeriodSelection("8", options)).toBe("2");
    expect(clampAutoRenewPeriodSelection("disable", options)).toBe("disable");
  });

  it("maps account state to dropdown value", () => {
    expect(autoRenewPeriodSelectionFromAccount(false, 0)).toBe("disable");
    expect(autoRenewPeriodSelectionFromAccount(true, 9)).toBe("10");
  });

  it("parses disable and month selections", () => {
    expect(parseAutoRenewPeriodSelection("disable")).toEqual({ enabled: false, totalCycles: 0 });
    expect(parseAutoRenewPeriodSelection("3")).toEqual({ enabled: true, totalCycles: 3 });
    expect(parseAutoRenewPeriodSelection("99")).toEqual({ enabled: true, totalCycles: 24 });
  });

  it("computes auto renew until from expiry and total plan months", () => {
    const until = computeAutoRenewUntilDate("2027-01-03 12:00:00", 4);
    expect(until?.getFullYear()).toBe(2027);
    expect(until?.getMonth()).toBe(4);
    expect(until?.getDate()).toBe(3);
    expect(formatAutoRenewUntilLabel("2027-01-03 12:00:00", 3)).toMatch(/May 3, 2027/);
    expect(formatAutoRenewUntilMonthYear("2028-02-01 12:00:00", 9)).toMatch(/Dec 2028/i);
    expect(formatAutoRenewUntilMonthYear("2028-02-01", 9)).toBe("Dec 2028");
    expect(formatAutoRenewUntilParts("2028-02-01", 9)).toEqual({ month: "Dec", year: "2028" });
  });

  it("shows one month ahead for a 1-month plan at expiry", () => {
    expect(formatAutoRenewUntilLabelFromTotal("2026-06-05", 1)).toBe("Jul 5, 2026");
    expect(formatAutoRenewUntilLabel("2026-06-05 00:00:00", 0)).toBe("Jul 5, 2026");
    expect(formatAutoRenewUntilLabel("2026-06-04", 0)).toBe("Jul 4, 2026");
  });

  it("formats enabled cell as until date plus total months", () => {
    expect(formatAutoRenewTotalMonthsLabel(11)).toBe("(12 months)");
    expect(formatAutoRenewTotalMonthsLabel(0)).toBe("(1 month)");
    const display = formatAutoRenewEnabledCellDisplay("2027-03-02 12:00:00", 11);
    expect(display?.periodMonthsLabel).toBe("(12 months)");
    expect(display?.untilDateLabel).toMatch(/Mar \d+, 2028/);
  });

  it("blocks enabling auto-renew when expired or inactive", () => {
    expect(isAutoRenewEnableBlocked({ subscriptionExpired: true, accountActive: false })).toBe(true);
    expect(isAutoRenewEnableBlocked({ subscriptionExpired: true, accountActive: true })).toBe(true);
    expect(isAutoRenewEnableBlocked({ subscriptionExpired: false, accountActive: false })).toBe(true);
    expect(isAutoRenewEnableBlocked({ subscriptionExpired: false, accountActive: true })).toBe(false);
  });

  it("returns a specific block message for each ineligible state", () => {
    expect(
      getAutoRenewEnableBlockMessage({ subscriptionExpired: true, accountActive: false }),
    ).toMatch(/expired and disabled/i);
    expect(getAutoRenewEnableBlockMessage({ subscriptionExpired: true, accountActive: true })).toMatch(
      /expired/i,
    );
    expect(getAutoRenewEnableBlockMessage({ subscriptionExpired: false, accountActive: false })).toMatch(
      /disabled/i,
    );
    expect(getAutoRenewEnableBlockMessage({ subscriptionExpired: false, accountActive: true })).toBeNull();
  });
});
