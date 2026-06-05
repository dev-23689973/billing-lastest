import { describe, expect, it } from "vitest";
import {
  ADD_CREDIT_PRESET_UI_MAX,
  ADD_CREDIT_PRESET_UI_MAX_ADMIN_MANAGER,
  resolveAddCreditPresetUiMax,
  resolveAddCreditAdditionalPresetMaxRungs,
  ADD_CREDIT_PROMO_LADDER_STEP_MIN,
  addCreditAdditionalPrincipalStep,
  addCreditPrincipalStep,
  addCreditPromoPrincipalStep,
  applyAdditionalPayerCapRung,
  buildAddCreditAdditionalPrincipalBases,
  applyPromoPayerCapRung,
  filterPromoRungsWithinPayerBalance,
  buildAddCreditPromoPrincipalBases,
  capAddCreditAdditionalPresetMax,
  capAddCreditPresetMax,
  computePromoBonusesForAddCapped,
  promoAppliesToAddPrincipal,
  resolvePrincipalForTargetTotalCredited,
} from "./addCreditLadder";
import { resolveHierarchyAddCreditApplyPromo } from "./formatAddCreditRungLabel";
import type { HierarchyAddCreditLadders } from "./repos/billing";

describe("addCreditPrincipalStep", () => {
  it("uses shared banded increments through 1M", () => {
    expect(addCreditPrincipalStep(0)).toBe(10);
    expect(addCreditPrincipalStep(20)).toBe(10);
    expect(addCreditPrincipalStep(99)).toBe(10);
    expect(addCreditPrincipalStep(100)).toBe(20);
    expect(addCreditPrincipalStep(199)).toBe(20);
    expect(addCreditPrincipalStep(200)).toBe(100);
    expect(addCreditPrincipalStep(999)).toBe(100);
    expect(addCreditPrincipalStep(1000)).toBe(250);
    expect(addCreditPrincipalStep(1999)).toBe(250);
    expect(addCreditPrincipalStep(2000)).toBe(500);
    expect(addCreditPrincipalStep(4999)).toBe(500);
    expect(addCreditPrincipalStep(5000)).toBe(1000);
    expect(addCreditPrincipalStep(9999)).toBe(1000);
    expect(addCreditPrincipalStep(10_000)).toBe(2500);
    expect(addCreditPrincipalStep(29_999)).toBe(2500);
    expect(addCreditPrincipalStep(30_000)).toBe(5000);
    expect(addCreditPrincipalStep(49_999)).toBe(5000);
    expect(addCreditPrincipalStep(50_000)).toBe(10_000);
    expect(addCreditPrincipalStep(99_999)).toBe(10_000);
    expect(addCreditPrincipalStep(100_000)).toBe(25_000);
    expect(addCreditPrincipalStep(249_999)).toBe(25_000);
    expect(addCreditPrincipalStep(250_000)).toBe(50_000);
    expect(addCreditPrincipalStep(499_999)).toBe(50_000);
    expect(addCreditPrincipalStep(500_000)).toBe(100_000);
    expect(addCreditPrincipalStep(999_999)).toBe(100_000);
  });

  it("promo and additional use the same step function", () => {
    expect(addCreditPromoPrincipalStep(5000)).toBe(addCreditAdditionalPrincipalStep(5000));
    expect(addCreditPromoPrincipalStep(5000)).toBe(1000);
  });
});

describe("capAddCreditPresetMax", () => {
  it("caps huge settings max for UI preset lists", () => {
    expect(capAddCreditPresetMax(100, 9_999_999)).toBe(ADD_CREDIT_PRESET_UI_MAX);
  });

  it("allows admin→manager presets up to 1M when settings allow", () => {
    expect(capAddCreditPresetMax(5000, 1_000_000, undefined, ADD_CREDIT_PRESET_UI_MAX_ADMIN_MANAGER)).toBe(1_000_000);
    expect(resolveAddCreditPresetUiMax("admin_manager")).toBe(ADD_CREDIT_PRESET_UI_MAX_ADMIN_MANAGER);
    expect(resolveAddCreditPresetUiMax("admin_reseller")).toBe(ADD_CREDIT_PRESET_UI_MAX);
    expect(resolveAddCreditAdditionalPresetMaxRungs("admin_manager")).toBeGreaterThan(600);
  });

  it("builds admin→manager promo ladder through 1M with coarse bands", () => {
    const bases = buildAddCreditPromoPrincipalBases(5000, 1_000_000);
    expect(bases[0]).toBe(5000);
    expect(bases[bases.length - 1]).toBe(1_000_000);
    expect(bases).toContain(10_000);
    expect(bases).toContain(100_000);
    expect(bases).toContain(500_000);
    expect(bases.length).toBeGreaterThan(30);
    expect(bases.length).toBeLessThan(80);
  });

  it("builds admin→manager additional ladder through 1M", () => {
    const bases = buildAddCreditAdditionalPrincipalBases(
      5000,
      1_000_000,
      undefined,
      resolveAddCreditAdditionalPresetMaxRungs("admin_manager"),
    );
    expect(bases[0]).toBe(5000);
    expect(bases[bases.length - 1]).toBe(1_000_000);
  });

  it("respects finite payer balance", () => {
    expect(capAddCreditPresetMax(100, 10_000, 3099)).toBe(3099);
  });
});

describe("capAddCreditAdditionalPresetMax", () => {
  it("extends toward payer wallet when settings max is lower", () => {
    expect(capAddCreditAdditionalPresetMax(2000, 2450, 10_334)).toBe(10_000);
    expect(capAddCreditAdditionalPresetMax(2000, 2450)).toBe(2450);
  });
});

describe("buildAddCreditPromoPrincipalBases", () => {
  it("steps by +10 below 100 then +100 to preset max", () => {
    const bases = buildAddCreditPromoPrincipalBases(20, 350);
    expect(bases[0]).toBe(20);
    expect(bases).toContain(30);
    expect(bases).toContain(90);
    expect(bases).toContain(100);
    expect(bases).toContain(120);
    expect(bases).not.toContain(25);
    expect(bases[bases.length - 1]).toBe(350);
  });

  it("starts at billing min 100 and steps +20 then +100 to preset max", () => {
    const bases = buildAddCreditPromoPrincipalBases(100, 350);
    expect(bases[0]).toBe(100);
    expect(bases).toEqual([100, 120, 140, 160, 180, 200, 300, 350]);
    expect(bases).not.toContain(105);
    expect(bases).not.toContain(110);
  });

  it("uses +250 steps in the 1000–1999 band", () => {
    const bases = buildAddCreditPromoPrincipalBases(1000, 2200);
    expect(bases[0]).toBe(1000);
    expect(bases).toContain(1250);
    expect(bases).toContain(2000);
    expect(bases[bases.length - 1]).toBe(2200);
    expect(bases).not.toContain(1100);
  });

  it("uses +1000 steps from 5000 toward 10000", () => {
    const bases = buildAddCreditPromoPrincipalBases(5000, 10_000);
    expect(bases).toEqual([5000, 6000, 7000, 8000, 9000, 10_000]);
  });

  it("uses banded steps through large max (e.g. 3099)", () => {
    const bases = buildAddCreditPromoPrincipalBases(100, 3099);
    expect(bases[0]).toBe(100);
    expect(bases).toContain(1000);
    expect(bases).toContain(2000);
    expect(bases.some((b) => b >= 2800 && b <= 3099)).toBe(true);
    expect(bases[bases.length - 1]).toBe(3099);
    expect(bases.indexOf(1100)).toBe(-1);
  });

  it("exports minimum promo ladder step", () => {
    expect(ADD_CREDIT_PROMO_LADDER_STEP_MIN).toBe(100);
  });

  it("omits payer balance as principal when cap row is used", () => {
    const bases = buildAddCreditPromoPrincipalBases(5, 334, 334);
    expect(bases[0]).toBe(5);
    expect(bases).toContain(15);
    expect(bases).toContain(95);
    expect(bases).not.toContain(334);
    expect(bases[bases.length - 1]).toBeLessThan(334);
  });
});

describe("resolvePrincipalForTargetTotalCredited", () => {
  const p1 = [{ ge: 0, lt: null, percentage: 10 }] as const;
  const p2 = [{ ge: 0, lt: null, percentage: 5 }] as const;

  it("finds principal so principal + promos = payer cap (e.g. 334)", () => {
    const row = resolvePrincipalForTargetTotalCredited(334, 10, [...p1], [...p2], 5);
    expect(row).not.toBeNull();
    expect(row!.total).toBe(334);
    expect(row!.base).toBeLessThan(334);
    expect(row!.base + row!.promo1 + row!.promo2).toBe(334);
  });
});

describe("filterPromoRungsWithinPayerBalance", () => {
  it("removes rows whose base debit exceeds payer balance", () => {
    const rungs = [
      { base: 9913, promo1: 321, promo2: 100, total: 10_334 },
      { base: 10_500, promo1: 371, promo2: 104, total: 10_780 },
    ];
    const out = filterPromoRungsWithinPayerBalance(rungs, 10_334);
    expect(out).toHaveLength(1);
    expect(out[0]!.base).toBe(9913);
  });
});

describe("applyPromoPayerCapRung", () => {
  const p1 = [{ ge: 0, lt: null, percentage: 10 }] as const;
  const p2 = [{ ge: 0, lt: null, percentage: 5 }] as const;

  it("replaces wrong last row (334 principal) with cap breakdown", () => {
    const wrong = { base: 334, promo1: 6, promo2: 4, total: 344 };
    const fixed = applyPromoPayerCapRung([wrong], 334, 10, [...p1], [...p2], 5);
    const cap = fixed[fixed.length - 1];
    expect(cap.base).not.toBe(334);
    expect(cap.total).toBe(334);
    expect(cap.base + cap.promo1 + cap.promo2).toBe(334);
  });

  it("drops over-cap totals and appends cap row last", () => {
    const over = { base: 10_305, promo1: 371, promo2: 104, total: 10_780 };
    const ok = { base: 5000, promo1: 100, promo2: 50, total: 5150 };
    const fixed = applyPromoPayerCapRung([over, ok], 10_334, 10, [...p1], [...p2], 5);
    expect(fixed.some((r) => r.total > 10_334)).toBe(false);
    expect(fixed[fixed.length - 1]!.total).toBe(10_334);
    expect(fixed[fixed.length - 1]!.base + fixed[fixed.length - 1]!.promo1 + fixed[fixed.length - 1]!.promo2).toBe(
      10_334,
    );
  });
});

describe("buildAddCreditAdditionalPrincipalBases", () => {
  it("steps continuously from low billing min to UI cap with shared bands", () => {
    const bases = buildAddCreditAdditionalPrincipalBases(100, 10_000);
    expect(bases[0]).toBe(100);
    expect(bases).toContain(1000);
    expect(bases).toContain(2000);
    expect(bases).toContain(5000);
    expect(bases[bases.length - 1]).toBe(10_000);
    for (let i = 1; i < bases.length; i++) {
      const gap = bases[i]! - bases[i - 1]!;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(2500);
    }
    expect(bases).not.toContain(105);
  });

  it("always includes preset max in the stepped list", () => {
    const bases = buildAddCreditAdditionalPrincipalBases(2000, 2450);
    expect(bases[bases.length - 1]).toBe(2450);
  });

  it("matches promo banding from billing min", () => {
    const bases = buildAddCreditAdditionalPrincipalBases(100, 350);
    expect(bases).toEqual(buildAddCreditPromoPrincipalBases(100, 350));
  });

  it("steps through UI cap to wallet without skipping the cap principal", () => {
    const bases = buildAddCreditAdditionalPrincipalBases(2000, 10_000, 10_334);
    expect(bases).toContain(10_000);
    expect(bases[bases.length - 1]).toBe(10_334);
    const i10k = bases.indexOf(10_000);
    const iCap = bases.indexOf(10_334);
    expect(iCap).toBe(i10k + 1);
    expect(bases[iCap]! - bases[i10k]!).toBe(334);
  });
});

describe("applyAdditionalPayerCapRung", () => {
  it("appends payer wallet principal as last row", () => {
    const bases = applyAdditionalPayerCapRung([2000, 10_000], 10_334, 2000);
    expect(bases[bases.length - 1]).toBe(10_334);
    expect(bases).not.toContain(10_334 - 1);
  });
});

describe("promo bonuses", () => {
  const p1 = [{ ge: 0, lt: null, percentage: 10 }] as const;
  const p2 = [{ ge: 0, lt: null, percentage: 5 }] as const;

  it("applies promos for any principal ≥ 1 (no 2000 ceiling)", () => {
    expect(promoAppliesToAddPrincipal(2000)).toBe(true);
    expect(promoAppliesToAddPrincipal(2001)).toBe(true);
    expect(promoAppliesToAddPrincipal(10_000)).toBe(true);
    const low = computePromoBonusesForAddCapped(100, 10, [...p1], [...p2]);
    expect(low.bonus1).toBeGreaterThan(0);
    const high = computePromoBonusesForAddCapped(2500, 10, [...p1], [...p2]);
    expect(high.bonus1).toBeGreaterThan(0);
    expect(high.bonus2).toBeGreaterThan(0);
  });

  it("resolves cap row with promos above 2000 principal", () => {
    const row = resolvePrincipalForTargetTotalCredited(10_334, 10, [...p1], [...p2], 5);
    expect(row).not.toBeNull();
    expect(row!.total).toBe(10_334);
    expect(row!.base).toBeGreaterThan(2000);
    expect(row!.promo1 + row!.promo2).toBeGreaterThan(0);
  });
});

describe("resolveHierarchyAddCreditApplyPromo", () => {
  const ladders: HierarchyAddCreditLadders = {
    promoRungs: [{ base: 2200, promo1: 55, promo2: 22, total: 2277, allowed: true }],
    additionalRungs: [{ base: 2200, promo1: 0, promo2: 0, total: 2200, allowed: true }],
  };

  it("promo pick applies bonuses", () => {
    expect(resolveHierarchyAddCreditApplyPromo(2200, ladders, "promo")).toBe(true);
  });

  it("additional pick does not apply bonuses", () => {
    expect(resolveHierarchyAddCreditApplyPromo(2200, ladders, "additional")).toBe(false);
  });
});
