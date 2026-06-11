import { formatMysqlDateTime } from "@/lib/billingAccountExpiry";

/** Elapsed whole months from summarize `start_date` to now (matches `creditSummarizeBeforeUpdate`). */
export function summarizeElapsedMonths(startDate: Date, now: Date): number {
  const invert = startDate.getTime() > now.getTime();
  const earlier = invert ? now : startDate;
  const later = invert ? startDate : now;
  let y = later.getFullYear() - earlier.getFullYear();
  let m = later.getMonth() - earlier.getMonth();
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return Math.max(0, y * 12 + m);
}

export type RecoverPoolsInput = {
  /** Net credit-month pool (`max_credit_recoverable` after time drift). */
  creditMonthsNet: number;
  /** Gross bonus-month pool added on renews (`max_bonus_recoverable`). */
  bonusMonthsGross: number;
  startDate: Date | null;
  expiryDate: Date | null;
  now?: Date;
};

/**
 * Months consumed on the period timeline.
 * The in-progress month counts only after the period has started (`start <= now`).
 */
export function monthsConsumedForRecover(startDate: Date, now: Date, subscriptionActive: boolean): number {
  const elapsed = summarizeElapsedMonths(startDate, now);
  const periodHasBegun = startDate.getTime() <= now.getTime();
  const currentMonth = subscriptionActive && periodHasBegun ? 1 : 0;
  return elapsed + currentMonth;
}

/** Earliest expiry that keeps one paid month from period start (used for pool math only). */
export function recoverExpiryFloor(startDate: Date | null): Date | null {
  if (!startDate || !Number.isFinite(startDate.getTime())) return null;
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    startDate.getDate(),
    startDate.getHours(),
    startDate.getMinutes(),
    startDate.getSeconds(),
  );
}

/** True when expiry is still active at `now` (PHP `check_expired`: expires >= now). */
export function isSubscriptionExpiryActive(expiry: Date, now: Date = new Date()): boolean {
  if (!Number.isFinite(expiry.getTime())) return false;
  const expStr = formatMysqlDateTime(expiry);
  if (expStr <= "1970-01-01 00:00:00") return false;
  return expStr >= formatMysqlDateTime(now);
}

/**
 * Max months removable from expiry while the result stays active (not passed / present).
 * Example: today Jun 3, expiry Jul 5 → 1 month back to Jun 5 is allowed.
 * Example: today Jun 3, expiry Jul 3 → 1 month back to Jun 3 is not allowed.
 */
export function maxTotalRecoverableMonthsOff(
  expiry: Date,
  _startDate: Date | null,
  now: Date = new Date(),
): number {
  if (!isSubscriptionExpiryActive(expiry, now)) return 0;
  let allowed = 0;
  for (let m = 1; m <= 2000; m++) {
    const after = subtractCalendarMonthsFromExpiry(expiry, m);
    if (!isSubscriptionExpiryActive(after, now)) break;
    allowed = m;
  }
  return allowed;
}

export function capPoolsByRecoverableSpan(
  creditMonths: number,
  bonusMonths: number,
  maxTotalMonthsOff: number,
): { creditMonths: number; bonusMonths: number } {
  const max = Math.max(0, Math.floor(maxTotalMonthsOff));
  let c = Math.max(0, Math.floor(creditMonths));
  let b = Math.max(0, Math.floor(bonusMonths));
  while (c + b > max) {
    if (b > 0) b -= 1;
    else if (c > 0) c -= 1;
    else break;
  }
  return { creditMonths: c, bonusMonths: b };
}

/** Effective recoverable credit and bonus months (paid first, then bonus). */
export function effectiveRecoverPools(input: RecoverPoolsInput): {
  creditMonths: number;
  bonusMonths: number;
} {
  const now = input.now ?? new Date();
  const exp = input.expiryDate;
  if (!exp || !Number.isFinite(exp.getTime()) || !isSubscriptionExpiryActive(exp, now)) {
    return { creditMonths: 0, bonusMonths: 0 };
  }

  const bonusGross = Math.max(0, Math.floor(input.bonusMonthsGross));
  const start = input.startDate;
  const maxOff = maxTotalRecoverableMonthsOff(exp, start, now);

  let creditMonths: number;
  let bonusMonths: number;

  if (!start || !Number.isFinite(start.getTime())) {
    creditMonths = Math.max(0, Math.floor(input.creditMonthsNet));
    bonusMonths = bonusGross;
  } else {
    const elapsed = summarizeElapsedMonths(start, now);
    const grossCredit = Math.max(0, Math.floor(input.creditMonthsNet)) + elapsed;
    const consumed = monthsConsumedForRecover(start, now, true);
    creditMonths = Math.max(0, grossCredit - consumed);
    bonusMonths = Math.max(0, bonusGross - Math.max(0, consumed - grossCredit));
  }

  return capPoolsByRecoverableSpan(creditMonths, bonusMonths, maxOff);
}

/** Apply recovery; only removes months while the new expiry stays active. */
export function applyRecoverToExpiry(
  currentExpiry: Date,
  monthsOff: number,
  _startDate: Date | null,
  now: Date = new Date(),
): { expiry: Date; monthsRemoved: number } {
  const requested = Math.max(0, Math.floor(monthsOff));
  if (requested < 1) {
    return { expiry: new Date(currentExpiry.getTime()), monthsRemoved: 0 };
  }
  const raw = subtractCalendarMonthsFromExpiry(currentExpiry, requested);
  if (isSubscriptionExpiryActive(raw, now)) {
    return { expiry: raw, monthsRemoved: requested };
  }
  const allowed = maxTotalRecoverableMonthsOff(currentExpiry, null, now);
  const actual = Math.min(requested, allowed);
  if (actual < 1) {
    return { expiry: new Date(currentExpiry.getTime()), monthsRemoved: 0 };
  }
  const expiry = subtractCalendarMonthsFromExpiry(currentExpiry, actual);
  return { expiry, monthsRemoved: actual };
}

/** Whether the proposed recovery leaves a non-expired subscription. */
export function isRecoverAllowedForMonths(
  currentExpiry: Date,
  monthsOff: number,
  startDate: Date | null,
  now: Date = new Date(),
): boolean {
  const requested = Math.max(0, Math.floor(monthsOff));
  if (requested < 1) return false;
  const { monthsRemoved, expiry } = applyRecoverToExpiry(currentExpiry, requested, startDate, now);
  return monthsRemoved >= requested && isSubscriptionExpiryActive(expiry, now);
}

export function buildRecoverMonthOptions(
  max: number,
  kind: "credit" | "bonus" = "credit",
): { value: string; label: string }[] {
  const cap = Math.max(0, Math.floor(max));
  if (cap <= 0) return [];
  return Array.from({ length: cap }, (_, i) => {
    const n = i + 1;
    if (kind === "bonus") {
      return {
        value: String(n),
        label: `${n} Bonus ${n === 1 ? "Month" : "Months"}`,
      };
    }
    const creditWord = n === 1 ? "Credit" : "Credits";
    const monthWord = n === 1 ? "Month" : "Months";
    return { value: String(n), label: `${n} ${monthWord} (${n} ${creditWord})` };
  });
}

export function subtractCalendarMonthsFromExpiry(expiry: Date, months: number): Date {
  const n = Math.max(0, Math.floor(months));
  if (n <= 0) return new Date(expiry.getTime());
  return new Date(
    expiry.getFullYear(),
    expiry.getMonth() - n,
    expiry.getDate(),
    expiry.getHours(),
    expiry.getMinutes(),
    expiry.getSeconds(),
  );
}

/** PHP-style y/m month span between two dates (reseller RCDT cap). */
export function phpCalendarYearMonthsBetween(dateA: Date, dateB: Date): number {
  const t1 = dateA.getTime();
  const t2 = dateB.getTime();
  const dEarly = t1 <= t2 ? dateA : dateB;
  const dLate = t1 <= t2 ? dateB : dateA;
  let y = dLate.getFullYear() - dEarly.getFullYear();
  let m = dLate.getMonth() - dEarly.getMonth();
  const day = dLate.getDate() - dEarly.getDate();
  if (day < 0) m -= 1;
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return y * 12 + m;
}

/** Reseller RCDT: calendar months from now until expiry (PHP `check_renew_validity`). */
export function calendarMonthsUntilExpiry(expiry: Date, now: Date = new Date()): number {
  if (!Number.isFinite(expiry.getTime()) || !isSubscriptionExpiryActive(expiry, now)) return 0;
  return Math.max(0, phpCalendarYearMonthsBetween(now, expiry));
}
