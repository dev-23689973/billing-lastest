/** Max validity tier length for renewal credit rules (5 years). */
export const CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS = 60;

export type DeductionRuleInput = {
  month: number;
  creditsCharged: number;
};

/** Legacy `month_deduction`: wallet debit for tier month M is `M − month_deduction`. */
export function monthDeductionFromCreditsCharged(month: number, creditsCharged: number): number {
  const m = Math.floor(month);
  const c = Math.max(0, Math.min(m, Math.floor(creditsCharged)));
  return m - c;
}

export function creditsChargedFromMonthDeduction(month: number, monthDeduction: number): number {
  const m = Math.floor(month);
  const md = Math.floor(monthDeduction);
  return Math.max(0, Math.min(m, m - md));
}

export function validateDeductionRules(
  rules: DeductionRuleInput[],
): { ok: true; rows: DeductionRuleInput[] } | { ok: false; error: string } {
  if (!Array.isArray(rules)) {
    return { ok: false, error: "Invalid rules payload." };
  }
  if (rules.length === 0) {
    return { ok: false, error: "Add at least one rule tier." };
  }

  const rows: DeductionRuleInput[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < rules.length; i++) {
    const month = Math.floor(Number(rules[i]?.month));
    const creditsCharged = Math.floor(Number(rules[i]?.creditsCharged));
    if (!Number.isFinite(month) || month < 1 || month > CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS) {
      return {
        ok: false,
        error: `Rule ${i + 1}: validity must be between 1 and ${CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS} months (5 years).`,
      };
    }
    if (!Number.isFinite(creditsCharged) || creditsCharged < 0 || creditsCharged > month) {
      return { ok: false, error: `Rule ${i + 1}: credits charged must be between 0 and ${month}.` };
    }
    if (seen.has(month)) {
      return { ok: false, error: `Duplicate validity tier: ${month} months.` };
    }
    seen.add(month);
    rows.push({ month, creditsCharged });
  }

  rows.sort((a, b) => a.month - b.month);
  return { ok: true, rows };
}

/**
 * Promo credits charged per validity month. Only explicit `credit_deductions` tier rows apply
 * (no range fill between tiers — months without a row debit 1 credit per month).
 */
export function buildMonthDeductionChargedMap(
  rows: { month: number; month_deduction: number }[],
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const row of rows) {
    const month = Math.floor(Number(row.month));
    const monthDeduction = Math.floor(Number(row.month_deduction) || 0);
    if (!Number.isFinite(month) || month < 1 || month > CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS || monthDeduction <= 0) {
      continue;
    }
    const charged = creditsChargedFromMonthDeduction(month, monthDeduction);
    if (charged > 0 && charged < month) {
      map[month] = charged;
    }
  }
  return map;
}

/** Wallet debited for an N-month renew (bonus tiers use `credit_deductions`, not calendar months). */
export function monthRenewChargedCredits(months: number, deductionMap: Record<number, number>): number {
  const m = Math.floor(Number(months));
  if (!Number.isFinite(m) || m < 1) return 0;
  return deductionMap[m] !== undefined ? deductionMap[m] : m;
}
