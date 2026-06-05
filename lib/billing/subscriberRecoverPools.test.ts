import { describe, expect, it } from "vitest";
import {
  applyRecoverToExpiry,
  buildRecoverMonthOptions,
  effectiveRecoverPools,
  isRecoverAllowedForMonths,
  maxTotalRecoverableMonthsOff,
  recoverExpiryFloor,
} from "@/lib/billing/subscriberRecoverPools";

describe("effectiveRecoverPools", () => {
  const exp = new Date("2028-06-03T21:48:00");
  const start = new Date("2026-06-03T21:48:00");

  it("reserves the current month right after renew (12 paid → 11 recoverable)", () => {
    const now = new Date("2026-06-03T22:00:00");
    expect(
      effectiveRecoverPools({
        creditMonthsNet: 12,
        bonusMonthsGross: 12,
        startDate: start,
        expiryDate: exp,
        now,
      }),
    ).toEqual({ creditMonths: 11, bonusMonths: 12 });
  });

  it("Jun 3 expiry: 1-month renew cannot recover back to passed/present date", () => {
    const start = new Date("2026-06-03T21:48:00");
    const exp = new Date("2026-07-03T21:48:00");
    const now = new Date("2026-06-03T22:00:00");
    expect(maxTotalRecoverableMonthsOff(exp, start, now)).toBe(0);
    expect(
      effectiveRecoverPools({
        creditMonthsNet: 1,
        bonusMonthsGross: 0,
        startDate: start,
        expiryDate: exp,
        now,
      }),
    ).toEqual({ creditMonths: 0, bonusMonths: 0 });
    expect(isRecoverAllowedForMonths(exp, 1, start, now)).toBe(false);
  });

  it("Jun 5 expiry: 1-month renew can recover when result stays after today", () => {
    const start = new Date("2026-06-05T21:48:00");
    const exp = new Date("2026-07-05T21:48:00");
    const now = new Date("2026-06-03T22:00:00");
    expect(maxTotalRecoverableMonthsOff(exp, start, now)).toBe(1);
    expect(
      effectiveRecoverPools({
        creditMonthsNet: 1,
        bonusMonthsGross: 0,
        startDate: start,
        expiryDate: exp,
        now,
      }),
    ).toEqual({ creditMonths: 1, bonusMonths: 0 });
    expect(isRecoverAllowedForMonths(exp, 1, start, now)).toBe(true);
    const after = applyRecoverToExpiry(exp, 1, start, now);
    expect(after.monthsRemoved).toBe(1);
    expect(after.expiry.getMonth()).toBe(5);
    expect(after.expiry.getDate()).toBe(5);
  });

  it("consumes credit months before bonus as time passes", () => {
    const now = new Date("2027-06-04T22:00:00");
    expect(
      effectiveRecoverPools({
        creditMonthsNet: 7,
        bonusMonthsGross: 12,
        startDate: start,
        expiryDate: exp,
        now,
      }),
    ).toEqual({ creditMonths: 6, bonusMonths: 5 });
  });

  it("returns zero when account already expired", () => {
    const now = new Date("2029-01-01T00:00:00");
    expect(
      effectiveRecoverPools({
        creditMonthsNet: 12,
        bonusMonthsGross: 12,
        startDate: start,
        expiryDate: exp,
        now,
      }),
    ).toEqual({ creditMonths: 0, bonusMonths: 0 });
  });
});

describe("recoverExpiryFloor", () => {
  it("is one month after period start", () => {
    const start = new Date("2026-06-03T12:00:00");
    const floor = recoverExpiryFloor(start);
    expect(floor?.getFullYear()).toBe(2026);
    expect(floor?.getMonth()).toBe(6);
    expect(floor?.getDate()).toBe(3);
  });
});

describe("applyRecoverToExpiry", () => {
  const exp = new Date("2028-06-03T12:00:00");
  const start = new Date("2026-06-03T12:00:00");
  const now = new Date("2026-06-03T14:00:00");

  it("stops before expiry would become passed/present", () => {
    const { expiry, monthsRemoved } = applyRecoverToExpiry(exp, 24, start, now);
    expect(monthsRemoved).toBe(23);
    expect(expiry.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("maxTotalRecoverableMonthsOff", () => {
  it("allows 23 months on 24mo stack when today is period start", () => {
    const exp = new Date("2028-06-03T12:00:00");
    const start = new Date("2026-06-03T12:00:00");
    const now = new Date("2026-06-03T14:00:00");
    expect(maxTotalRecoverableMonthsOff(exp, start, now)).toBe(23);
  });
});

describe("buildRecoverMonthOptions", () => {
  it("builds credit pool labels", () => {
    expect(buildRecoverMonthOptions(3, "credit")).toEqual([
      { value: "1", label: "1 Month (1 Credit)" },
      { value: "2", label: "2 Months (2 Credits)" },
      { value: "3", label: "3 Months (3 Credits)" },
    ]);
  });

  it("builds bonus pool labels", () => {
    expect(buildRecoverMonthOptions(2, "bonus")).toEqual([
      { value: "1", label: "1 Bonus Month" },
      { value: "2", label: "2 Bonus Months" },
    ]);
  });
});
