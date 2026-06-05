import type { ValidityOption } from "@/lib/validityOptions";
export const ACCOUNT_AUTO_RENEW_MARK_ON = 1;
export const ACCOUNT_AUTO_RENEW_MARK_OFF = 0;

/**
 * Remaining scheduled auto-renew cycles after the month applied at setup.
 * Column: `accounts.credit` (see `scripts/sql/accounts-auto-renew-credit.sql`).
 */
export const ACCOUNT_AUTO_RENEW_CYCLES_COLUMN = "credit";

export const AUTO_RENEW_TOTAL_CYCLES_MIN = 1;
export const AUTO_RENEW_TOTAL_CYCLES_MAX = 24;

export function clampAutoRenewTotalCycles(n: number): number {
  if (!Number.isFinite(n)) return AUTO_RENEW_TOTAL_CYCLES_MIN;
  return Math.min(AUTO_RENEW_TOTAL_CYCLES_MAX, Math.max(AUTO_RENEW_TOTAL_CYCLES_MIN, Math.floor(n)));
}

export function parseAccountAutoRenewMark(mark: unknown): boolean {
  if (mark == null || mark === "") return false;
  const n = Number(mark);
  if (Number.isFinite(n)) return n === ACCOUNT_AUTO_RENEW_MARK_ON;
  const s = String(mark).trim().toLowerCase();
  return s === "y" || s === "yes" || s === "on" || s === "true" || s === "auto";
}

/** Short expiry label for subscriber tables (e.g. Apr 3, 2027). */
export function formatSubscriberExpiryDate(expires: string | null | undefined): string | null {
  if (expires == null || expires === "") return null;
  const raw = String(expires).trim();
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatSubscriberExpiryFallback(expires: string | null | undefined): string | null {
  return formatSubscriberExpiryDate(expires) ?? (expires ? String(expires).trim().slice(0, 10) : null);
}

/** Remaining scheduled auto-renew cycles (`accounts.credit`). */
export function formatAutoRenewCyclesLabel(cyclesRemaining: number): string {
  const n = Math.max(0, Math.floor(cyclesRemaining));
  if (n === 0) return "Final month";
  return `${n} month${n === 1 ? "" : "s"}`;
}

export function parseAccountAutoRenewCyclesRemaining(credit: unknown): number | null {
  if (credit == null || credit === "") return null;
  const raw =
    typeof credit === "number"
      ? credit
      : typeof credit === "string"
        ? Number.parseInt(credit, 10)
        : typeof credit === "bigint"
          ? Number(credit)
          : Number(credit);
  if (!Number.isFinite(raw) || raw < 0) return null;
  return Math.floor(raw);
}

/** Infer total cycles for the UI when only mark + remaining are known. */
export function inferAutoRenewTotalCycles(enabled: boolean, cyclesRemaining: number): number {
  if (!enabled) return 12;
  return clampAutoRenewTotalCycles(cyclesRemaining + 1);
}

export function buildAutoRenewTotalCycleOptions(
  maxCycles: number = AUTO_RENEW_TOTAL_CYCLES_MAX,
): Array<{ value: string; label: string }> {
  const cap = clampAutoRenewTotalCycles(maxCycles);
  const out: Array<{ value: string; label: string }> = [];
  for (let i = AUTO_RENEW_TOTAL_CYCLES_MIN; i <= cap; i += 1) {
    out.push({
      value: String(i),
      label: i === 1 ? "1 month" : `${i} months`,
    });
  }
  return out;
}

/** Set Auto Renew dropdown — consecutive months from 1 up to debit wallet balance, plus disable. */
export function buildAutoRenewPeriodSelectOptions(
  _validityOptions: ValidityOption[] = [],
  debitCredits?: number | null,
): Array<{ value: string; label: string }> {
  const affordable = buildBalanceCappedMonthOptions(debitCredits);
  const out = affordable.map((o) => {
    const months = Number.parseInt(o.value, 10);
    return {
      value: o.value,
      label: months === 1 ? "1 Month" : `${months} Months`,
    };
  });
  out.push({ value: "disable", label: "Disable auto renew" });
  return out;
}

function buildBalanceCappedMonthOptions(debitCredits?: number | null): ValidityOption[] {
  if (debitCredits == null || !Number.isFinite(debitCredits)) return [];
  const maxMonths = Math.min(AUTO_RENEW_TOTAL_CYCLES_MAX, Math.max(0, Math.floor(debitCredits)));
  const out: ValidityOption[] = [];
  for (let i = 1; i <= maxMonths; i += 1) {
    out.push({ value: String(i), label: String(i) });
  }
  return out;
}

/** Keep selection in list, or pick the nearest lower affordable month / disable. */
export function clampAutoRenewPeriodSelection(
  value: string,
  options: Array<{ value: string; label: string }>,
): string {
  if (options.some((o) => o.value === value)) return value;
  if (value === "disable") return "disable";
  const months = Number.parseInt(value, 10);
  if (Number.isFinite(months)) {
    const paid = options.filter((o) => o.value !== "disable");
    const affordable = paid
      .map((o) => Number.parseInt(o.value, 10))
      .filter((n) => Number.isFinite(n) && n <= months);
    if (affordable.length) return String(Math.max(...affordable));
  }
  return options.find((o) => o.value !== "disable")?.value ?? "disable";
}

export function autoRenewPeriodSelectionFromAccount(enabled: boolean, cyclesRemaining: number): string {
  if (!enabled) return "disable";
  return String(clampAutoRenewTotalCycles(Math.max(0, Math.floor(cyclesRemaining)) + 1));
}

export function parseAutoRenewPeriodSelection(value: string): { enabled: boolean; totalCycles: number } {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v || v === "disable" || v === "0" || v === "off") {
    return { enabled: false, totalCycles: 0 };
  }
  const months = Number.parseInt(v, 10);
  if (!Number.isFinite(months) || months < 1) {
    return { enabled: false, totalCycles: 0 };
  }
  return {
    enabled: true,
    totalCycles: clampAutoRenewTotalCycles(months),
  };
}

const AUTO_RENEW_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Parse billing expiry without UTC date-only drift (e.g. `2028-02-01` stays February). */
export function parseAutoRenewExpiryBase(expiresAt: string | null | undefined): Date | null {
  const raw = String(expiresAt ?? "").trim();
  if (!raw || raw === "0000-00-00 00:00:00" || raw.startsWith("0000-00-00")) return null;
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Final expiry if all remaining auto-renew cycles succeed (current expiry + remaining cycles). */
export function computeAutoRenewUntilDate(
  expiresAt: string | null | undefined,
  cyclesRemaining: number,
): Date | null {
  const base = parseAutoRenewExpiryBase(expiresAt);
  if (!base) return null;
  const extra = Math.max(0, Math.floor(cyclesRemaining));
  return new Date(
    base.getFullYear(),
    base.getMonth() + extra,
    base.getDate(),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
  );
}

export function formatAutoRenewUntilLabel(
  expiresAt: string | null | undefined,
  cyclesRemaining: number,
): string | null {
  const until = computeAutoRenewUntilDate(expiresAt, cyclesRemaining);
  if (!until) return null;
  return formatSubscriberExpiryDate(
    `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, "0")}-${String(until.getDate()).padStart(2, "0")}`,
  );
}

export type AutoRenewUntilParts = { month: string; year: string };

export function formatAutoRenewUntilParts(
  expiresAt: string | null | undefined,
  cyclesRemaining: number,
): AutoRenewUntilParts | null {
  const until = computeAutoRenewUntilDate(expiresAt, cyclesRemaining);
  if (!until) return null;
  return {
    month: AUTO_RENEW_MONTH_SHORT[until.getMonth()] ?? "—",
    year: String(until.getFullYear()),
  };
}

/** Total auto-renew period for display, e.g. “(12 months)”. */
export function formatAutoRenewTotalMonthsLabel(cyclesRemaining: number): string {
  const total = inferAutoRenewTotalCycles(true, Math.max(0, Math.floor(cyclesRemaining)));
  return total === 1 ? "(1 month)" : `(${total} months)`;
}

export type AutoRenewEnabledCellDisplay = {
  untilDateLabel: string;
  periodMonthsLabel: string;
};

/** Enabled auto-renew table cell: until date + total period in months. */
export function formatAutoRenewEnabledCellDisplay(
  expiresAt: string | null | undefined,
  cyclesRemaining: number,
): AutoRenewEnabledCellDisplay | null {
  const untilDateLabel = formatAutoRenewUntilLabel(expiresAt, cyclesRemaining);
  if (!untilDateLabel) return null;
  return {
    untilDateLabel,
    periodMonthsLabel: formatAutoRenewTotalMonthsLabel(cyclesRemaining),
  };
}

/** Compact “Nov 2028” label for auto-renew table cells. */
export function formatAutoRenewUntilMonthYear(
  expiresAt: string | null | undefined,
  cyclesRemaining: number,
): string | null {
  const parts = formatAutoRenewUntilParts(expiresAt, cyclesRemaining);
  if (!parts) return null;
  return `${parts.month} ${parts.year}`;
}
