import { describe, expect, it } from "vitest";
import { buildMonthDeductionChargedMap } from "@/lib/creditDeductions";
import {
  buildValidityOptions,
  buildValidityOptionsFromDeductionRows,
  filterCreateValidityOptionsByDebitCredits,
  filterValidityOptionsByDebitCredits,
} from "@/lib/validityOptions";

describe("buildMonthDeductionChargedMap", () => {
  it("applies promo only on exact tier months", () => {
    const map = buildMonthDeductionChargedMap([
      { month: 4, month_deduction: 1 },
      { month: 6, month_deduction: 1 },
      { month: 12, month_deduction: 3 },
    ]);
    expect(map[4]).toBe(3);
    expect(map[6]).toBe(5);
    expect(map[12]).toBe(9);
    expect(map[5]).toBeUndefined();
    expect(map[7]).toBeUndefined();
    expect(map[11]).toBeUndefined();
  });
});

describe("buildValidityOptions", () => {
  it("lists promo months before regular months", () => {
    const options = buildValidityOptionsFromDeductionRows(
      [
        { month: 4, month_deduction: 1 },
        { month: 6, month_deduction: 1 },
        { month: 12, month_deduction: 3 },
      ],
      { monthFree: false },
    );
    const paid = options.filter((o) => o.value !== "FREE_TRIAL" && o.value !== "1_MONTH_FREE");
    const promoIdx = paid.findIndex((o) => o.value === "4");
    const regularIdx = paid.findIndex((o) => o.value === "5");
    expect(promoIdx).toBeGreaterThanOrEqual(0);
    expect(regularIdx).toBeGreaterThan(promoIdx);
    expect(paid.find((o) => o.value === "7")?.label).toBe("7 Months (7 Credits)");
    expect(paid.find((o) => o.value === "6")?.label).toContain("Bonus");
  });
});

describe("filterValidityOptionsByDebitCredits", () => {
  const options = buildValidityOptions({}, { monthFree: false, maxMonths: 24 });

  it("returns no options until wallet balance is known", () => {
    expect(filterValidityOptionsByDebitCredits(options, null)).toEqual([]);
    expect(filterValidityOptionsByDebitCredits(options, undefined)).toEqual([]);
  });

  it("caps paid options by debit wallet balance", () => {
    const affordable = filterValidityOptionsByDebitCredits(options, 16);
    const paid = affordable.filter((o) => o.value !== "FREE_TRIAL" && o.value !== "1_MONTH_FREE");
    expect(paid.some((o) => o.value === "16")).toBe(true);
    expect(paid.some((o) => o.value === "17")).toBe(false);
    expect(paid.some((o) => o.value === "24" && o.label.match(/(\d+)\s*credit/i)?.[1] === "24")).toBe(false);
  });
});

describe("filterCreateValidityOptionsByDebitCredits", () => {
  const options = buildValidityOptions({}, { monthFree: true, maxMonths: 3 });

  it("returns no options when balance is 0 (trial blocked)", () => {
    expect(filterCreateValidityOptionsByDebitCredits(options, 0)).toEqual([]);
  });

  it("includes trial when balance is at least 1", () => {
    const affordable = filterCreateValidityOptionsByDebitCredits(options, 1);
    expect(affordable.some((o) => o.value === "FREE_TRIAL")).toBe(true);
    expect(affordable.some((o) => o.value === "1")).toBe(true);
    expect(affordable.some((o) => o.value === "3")).toBe(false);
  });
});
