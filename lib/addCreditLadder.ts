import { computePromoBonusesForAdd, type PromoTier } from "@/lib/promoBonus";

/** Standard +100 step once principal reaches 100 (below that, {@link ADD_CREDIT_PRINCIPAL_STEP_BANDS} uses +10). */
export const ADD_CREDIT_PROMO_LADDER_STEP_MIN = 100;

/**
 * Banded principal increments for promo and additional preset dropdowns.
 * `from` is inclusive lower bound; step applies while principal &lt; next band's `from`.
 */
export const ADD_CREDIT_PRINCIPAL_STEP_BANDS: ReadonlyArray<{ from: number; step: number }> = [
  { from: 0, step: 10 },
  { from: 100, step: 20 },
  { from: 200, step: 100 },
  { from: 1_000, step: 250 },
  { from: 2_000, step: 500 },
  { from: 5_000, step: 1_000 },
  { from: 10_000, step: 2_500 },
  { from: 30_000, step: 5_000 },
  { from: 50_000, step: 10_000 },
  { from: 100_000, step: 25_000 },
  { from: 250_000, step: 50_000 },
  { from: 500_000, step: 100_000 },
] as const;

/** Short hint for dropdown section labels (first min + band pattern). */
export const ADD_CREDIT_PRINCIPAL_STEP_HINT = "+10/+20/+100/+250/+500/…";

/** Max principal enumerated in add-credit preset dropdowns (avoids huge payloads when settings max is millions). */
export const ADD_CREDIT_PRESET_UI_MAX = 10_000;

/** Admin → manager: full stepped presets through billing global max (e.g. 1_000_000). */
export const ADD_CREDIT_PRESET_UI_MAX_ADMIN_MANAGER = 1_000_000;

export function resolveAddCreditPresetUiMax(portal?: string): number {
  if (portal === "admin_manager") return ADD_CREDIT_PRESET_UI_MAX_ADMIN_MANAGER;
  return ADD_CREDIT_PRESET_UI_MAX;
}

/**
 * Max steps when building the additional ladder (min → UI cap).
 * Banded steps to 1M need ~200 rungs from typical billing mins.
 */
export const ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS = 600;

/** Admin → manager: additional ladder may span min → 1M (banded steps). */
export const ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS_ADMIN_MANAGER = 2_500;

export function resolveAddCreditAdditionalPresetMaxRungs(portal?: string): number {
  if (portal === "admin_manager") return ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS_ADMIN_MANAGER;
  return ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS;
}

/**
 * Upper bound for building preset lists: settings max, optional payer wallet, and UI safety cap.
 */
export function capAddCreditPresetMax(
  addMin: number,
  addMax: number,
  payerBal?: number,
  uiMax: number = ADD_CREDIT_PRESET_UI_MAX,
): number {
  const lo = Math.max(1, Math.floor(addMin));
  const settingsHi = Math.max(lo, Math.floor(addMax));
  let hi = Math.min(settingsHi, Math.max(lo, Math.floor(uiMax)));
  if (payerBal != null && Number.isFinite(payerBal) && payerBal < Number.MAX_SAFE_INTEGER / 4) {
    hi = Math.min(hi, Math.max(lo, Math.floor(payerBal)));
  }
  return hi;
}

/**
 * Upper bound for additional-credit preset steps: extends toward payer wallet when it exceeds settings max
 * (final payer-balance row is appended separately via {@link applyAdditionalPayerCapRung}).
 */
export function capAddCreditAdditionalPresetMax(
  addMin: number,
  addMax: number,
  payerBal?: number,
  uiMax: number = ADD_CREDIT_PRESET_UI_MAX,
): number {
  const lo = Math.max(1, Math.floor(addMin));
  const settingsHi = Math.max(lo, Math.floor(addMax));
  const uiCap = Math.max(lo, Math.floor(uiMax));
  let hi = Math.min(settingsHi, uiCap);
  if (payerBal != null && Number.isFinite(payerBal) && payerBal < Number.MAX_SAFE_INTEGER / 4) {
    const payerHi = Math.min(uiCap, Math.max(lo, Math.floor(payerBal)));
    hi = Math.max(hi, payerHi);
  }
  return hi;
}

/** Banded step from current principal — shared by promo and additional preset ladders. */
export function addCreditPrincipalStep(current: number): number {
  const n = Math.floor(Number(current));
  if (!Number.isFinite(n) || n < 0) return ADD_CREDIT_PROMO_LADDER_STEP_MIN;
  let step = ADD_CREDIT_PRINCIPAL_STEP_BANDS[0]!.step;
  for (const band of ADD_CREDIT_PRINCIPAL_STEP_BANDS) {
    if (n >= band.from) step = band.step;
  }
  return step;
}

/** @see {@link addCreditPrincipalStep} */
export function addCreditPromoPrincipalStep(current: number): number {
  return addCreditPrincipalStep(current);
}

/** @see {@link addCreditPrincipalStep} */
export function addCreditAdditionalPrincipalStep(current: number): number {
  return addCreditPrincipalStep(current);
}

function fillAdditionalPrincipalBases(
  lo: number,
  hi: number,
  maxRungs: number = ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS,
): number[] {
  const low = Math.max(1, Math.floor(lo));
  const high = Math.max(low, Math.floor(hi));
  const bases = new Set<number>();

  let cur = low;
  bases.add(cur);
  let guard = 0;
  while (cur < high && guard < maxRungs) {
    guard++;
    const step = addCreditAdditionalPrincipalStep(cur);
    cur = Math.min(high, cur + step);
    bases.add(cur);
  }
  if (!bases.has(high)) {
    bases.add(high);
  }

  return [...bases].sort((a, b) => a - b);
}

export type AddCreditPromoCapBreakdown = {
  base: number;
  promo1: number;
  promo2: number;
  total: number;
};

/**
 * Largest principal whose credited total (principal + Promo 1 + Promo 2) is ≤ `targetTotal`.
 */
export function resolvePrincipalForTargetTotalCredited(
  targetTotal: number,
  activeClientCount: number,
  promo1: PromoTier[],
  promo2: PromoTier[],
  minPrincipal: number,
): AddCreditPromoCapBreakdown | null {
  const T = Math.floor(Number(targetTotal));
  if (!Number.isFinite(T) || T < 1) return null;
  const lo = Math.max(1, Math.floor(minPrincipal));
  let left = lo;
  let right = T;
  let best: AddCreditPromoCapBreakdown | null = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const b = computePromoBonusesForAddCapped(mid, activeClientCount, promo1, promo2);
    const total = mid + b.bonus1 + b.bonus2;
    if (total <= T) {
      best = { base: mid, promo1: b.bonus1, promo2: b.bonus2, total };
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return best;
}

/**
 * Promo preset ladder from billing `addMin` with banded steps ({@link ADD_CREDIT_PRINCIPAL_STEP_BANDS}).
 * When `payerCapTotal` is set, do not use payer balance as principal — cap row is added separately.
 */
export function buildAddCreditPromoPrincipalBases(addMin: number, presetMax: number, payerCapTotal?: number): number[] {
  const lo = Math.max(1, Math.floor(addMin));
  const hi = Math.max(lo, Math.floor(presetMax));
  const cap =
    payerCapTotal != null && Number.isFinite(payerCapTotal) && Math.floor(payerCapTotal) >= lo
      ? Math.floor(payerCapTotal)
      : null;
  const limit = cap ?? hi;
  const bases: number[] = [];

  let cur = lo;
  bases.push(cur);
  let guard = 0;
  while (cur < limit && guard < 50_000) {
    guard++;
    const step = addCreditPromoPrincipalStep(cur);
    const next = Math.min(limit, cur + step);
    if (cap != null && next === cap) break;
    cur = next;
    bases.push(cur);
  }

  if (cap == null && (bases.length === 0 || bases[bases.length - 1] !== hi)) {
    bases.push(hi);
  }

  return bases;
}

/** Replace mistaken “principal = payer balance” row with x + p1 + p2 = payer cap total. */
export function applyPromoPayerCapRung<T extends AddCreditPromoCapBreakdown>(
  rungs: T[],
  payerCapTotal: number,
  activeClientCount: number,
  promo1: PromoTier[],
  promo2: PromoTier[],
  minPrincipal: number,
): T[] {
  const cap = Math.floor(Number(payerCapTotal));
  if (!Number.isFinite(cap) || cap < 1) return rungs;

  const resolved = resolvePrincipalForTargetTotalCredited(cap, activeClientCount, promo1, promo2, minPrincipal);
  if (!resolved) return rungs;

  const withinCap = rungs.filter((r) => r.total <= cap && r.base !== cap);
  const withoutDuplicate = withinCap.filter(
    (r) => !(r.base === resolved.base && r.total === resolved.total),
  );

  const sorted = [...withoutDuplicate].sort((a, b) => a.base - b.base);
  sorted.push({ ...resolved } as T);
  return sorted;
}

/** Drop preset rows whose **base** debit exceeds payer wallet (promo is admin-subsidized). */
export function filterPromoRungsWithinPayerBalance<T extends { base: number; total: number }>(
  rungs: T[],
  payerBal: number,
): T[] {
  if (!Number.isFinite(payerBal) || payerBal >= Number.MAX_SAFE_INTEGER / 4) return rungs;
  const max = Math.floor(payerBal);
  return rungs.filter((r) => r.base <= max);
}

/**
 * Additional-credit preset ladder from billing `addMin` through `presetMax` (same bands as promo).
 * When `payerCapPrincipal` is set, stepping stops below that value; use {@link applyAdditionalPayerCapRung} for the last row.
 */
export function buildAddCreditAdditionalPrincipalBases(
  addMin: number,
  presetMax: number,
  payerCapPrincipal?: number,
  maxRungs: number = ADD_CREDIT_ADDITIONAL_PRESET_MAX_RUNGS,
): number[] {
  const lo = Math.max(1, Math.floor(addMin));
  const hi = Math.max(lo, Math.floor(presetMax));
  const cap =
    payerCapPrincipal != null && Number.isFinite(payerCapPrincipal) && Math.floor(payerCapPrincipal) >= lo
      ? Math.floor(payerCapPrincipal)
      : null;
  const limit = cap != null && cap < hi ? cap : hi;
  const out = new Set(fillAdditionalPrincipalBases(lo, limit, maxRungs));

  if (cap != null && cap > hi) {
    let cur = Math.max(...out);
    let guard = 0;
    while (cur < cap && guard < 64) {
      guard++;
      const step = addCreditAdditionalPrincipalStep(cur);
      cur = Math.min(cap, cur + step);
      out.add(cur);
    }
    out.add(cap);
  } else if (cap == null && !out.has(hi)) {
    out.add(hi);
  }

  return [...out].sort((a, b) => a - b);
}

/** Append principal = payer wallet as the last additional row (principal-only, no promo line). */
export function applyAdditionalPayerCapRung(bases: number[], payerCapPrincipal: number, minPrincipal: number): number[] {
  const cap = Math.floor(Number(payerCapPrincipal));
  const lo = Math.max(1, Math.floor(minPrincipal));
  if (!Number.isFinite(cap) || cap < lo) return bases;

  const withoutCap = bases.filter((b) => b < cap);
  const sorted = [...new Set(withoutCap)].sort((a, b) => a - b);
  if (sorted.length === 0 || sorted[sorted.length - 1] !== cap) {
    sorted.push(cap);
  }
  return sorted;
}

export function promoAppliesToAddPrincipal(principal: number): boolean {
  const p = Math.floor(Number(principal));
  return Number.isFinite(p) && p >= 1;
}

/** Promo 1 + Promo 2 for hierarchy add-credit (no principal ceiling). */
export function computePromoBonusesForAddCapped(
  requestedCredits: number,
  activeClientCount: number,
  promo1: PromoTier[],
  promo2: PromoTier[],
): ReturnType<typeof computePromoBonusesForAdd> {
  if (!promoAppliesToAddPrincipal(requestedCredits)) {
    return { pct1: 0, pct2: 0, bonus1: 0, bonus2: 0 };
  }
  return computePromoBonusesForAdd(requestedCredits, activeClientCount, promo1, promo2);
}
