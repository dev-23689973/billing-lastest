import { buildMonthDeductionChargedMap, CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS } from "@/lib/creditDeductions";

export type ValidityOption = { value: string; label: string };

export type BuildValidityOptionsInput = {
  monthFree?: boolean;
  maxMonths?: number;
  trialLabel?: string;
};

/** e.g. `24 Months (12 Credits + 12 Bonus Months)` or `2 Months (2 Credits)`. */
export function formatValidityMonthLabel(month: number, charged: number): string {
  const credits = Math.max(0, Math.floor(charged));
  const bonus = Math.max(0, month - credits);
  const monthWord = month === 1 ? "Month" : "Months";
  const creditWord = credits === 1 ? "Credit" : "Credits";
  if (bonus > 0) {
    const bonusWord = bonus === 1 ? "Month" : "Months";
    return `${month} ${monthWord} (${credits} ${creditWord} + ${bonus} Bonus ${bonusWord})`;
  }
  return `${month} ${monthWord} (${credits} ${creditWord})`;
}

function formatMonthLabel(month: number, charged: number): string {
  return formatValidityMonthLabel(month, charged);
}

/**
 * Validity dropdown: trial/free flags, then promo tiers (from settings), then regular months.
 * `deductionMap` keys are exact promo months only (see `buildMonthDeductionChargedMap`).
 */
export function buildValidityOptions(
  deductionMap: Record<number, number>,
  input: BuildValidityOptionsInput = {},
): ValidityOption[] {
  const maxMonths = input.maxMonths ?? CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS;
  const head: ValidityOption[] = [{ value: "FREE_TRIAL", label: input.trialLabel ?? "2 days trial" }];
  if (input.monthFree) {
    head.push({ value: "1_MONTH_FREE", label: "1 month free (bonus)" });
  }

  const promo: ValidityOption[] = [];
  const regular: ValidityOption[] = [];

  for (let month = 1; month <= maxMonths; month++) {
    const charged = deductionMap[month] ?? month;
    const opt: ValidityOption = {
      value: String(month),
      label: formatMonthLabel(month, charged),
    };
    if (charged < month) promo.push(opt);
    else regular.push(opt);
  }

  return [...head, ...promo, ...regular];
}

export function buildValidityOptionsFromDeductionRows(
  rows: { month: number; month_deduction: number | string }[],
  input: BuildValidityOptionsInput = {},
): ValidityOption[] {
  const deductionMap = buildMonthDeductionChargedMap(
    rows.map((r) => ({ month: r.month, month_deduction: Number(r.month_deduction) || 0 })),
  );
  return buildValidityOptions(deductionMap, input);
}

/** Credits debited for a validity row (parses “N credits charged” bonus labels). */
export function validityOptionChargedCredits(option: ValidityOption): number {
  if (option.value === "FREE_TRIAL" || option.value === "1_MONTH_FREE") return 0;
  const fromLabel =
    option.label.match(/(\d+)\s+Credits?\s*\+/i) ?? option.label.match(/(\d+)\s*credits?\s*charged/i) ?? option.label.match(/(\d+)\s*credits?/i);
  if (fromLabel) return Number.parseInt(fromLabel[1] ?? "", 10);
  const months = Number.parseInt(option.value, 10);
  return Number.isFinite(months) ? months : Number.POSITIVE_INFINITY;
}

/** Paid renew options the debit wallet can afford (`charged credits` ≤ balance). */
export function filterValidityOptionsByDebitCredits(
  options: ValidityOption[],
  debitCredits: number | null | undefined,
): ValidityOption[] {
  if (debitCredits == null || !Number.isFinite(debitCredits)) return [];
  const balance = Math.max(0, Math.floor(debitCredits));
  return options.filter((o) => {
    const charged = validityOptionChargedCredits(o);
    if (o.value === "FREE_TRIAL" || o.value === "1_MONTH_FREE") {
      return charged === 0 && balance > 0;
    }
    return Number.isFinite(charged) && charged >= 1 && charged <= balance;
  });
}

/**
 * Validity options for creating a new user.
 * Trial / free month still require at least 1 credit on the debit wallet (portal policy).
 */
export function filterCreateValidityOptionsByDebitCredits(
  options: ValidityOption[],
  debitCredits: number | null | undefined,
): ValidityOption[] {
  if (debitCredits == null || !Number.isFinite(debitCredits)) return [];
  const balance = Math.max(0, Math.floor(debitCredits));
  if (balance < 1) return [];
  return options.filter((o) => {
    if (o.value === "FREE_TRIAL" || o.value === "1_MONTH_FREE") return true;
    const charged = validityOptionChargedCredits(o);
    return Number.isFinite(charged) && charged >= 1 && charged <= balance;
  });
}

export { buildRecoverMonthOptions } from "@/lib/billing/subscriberRecoverPools";

/** @deprecated Use `buildRecoverMonthOptions` for recover UI (credit/bonus pools are separate). */
export function filterValidityOptionsByRecoverablePeriods(
  options: ValidityOption[],
  recoverableCredits: number | null | undefined,
): ValidityOption[] {
  if (recoverableCredits == null || !Number.isFinite(recoverableCredits)) return [];
  const max = Math.max(0, Math.floor(recoverableCredits));
  if (max <= 0) return [];
  return options.filter((o) => {
    if (o.value === "FREE_TRIAL" || o.value === "1_MONTH_FREE") return false;
    const months = Number.parseInt(o.value, 10);
    return Number.isFinite(months) && months >= 1 && months <= max;
  });
}

/** Keep `value` in `options`, or fall back to the first option / `"1"`. */
export function clampValiditySelection(value: string, options: ValidityOption[]): string {
  if (options.some((o) => o.value === value)) return value;
  return options[0]?.value ?? "1";
}
