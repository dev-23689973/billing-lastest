import type { ValidityOption } from "@/lib/validityOptions";
import { formatValidityMonthLabel, validityOptionChargedCredits } from "@/lib/validityOptions";

export function formatRenewPeriodOptionLabel(option: ValidityOption): string {
  const v = option.value;
  if (v === "FREE_TRIAL") return "Free trial";
  if (v === "1_MONTH_FREE") return "1 Month free (bonus)";

  const months = Number.parseInt(v, 10);
  if (!Number.isFinite(months) || months < 1) return option.label;

  const charged = validityOptionChargedCredits(option);
  return formatValidityMonthLabel(months, charged);
}

export function isRenewPromoOption(option: ValidityOption): boolean {
  if (option.value === "FREE_TRIAL" || option.value === "1_MONTH_FREE") return false;
  const months = Number.parseInt(option.value, 10);
  if (!Number.isFinite(months) || months < 1) return false;
  return validityOptionChargedCredits(option) < months;
}

export function renewPeriodMonths(option: ValidityOption): number {
  const months = Number.parseInt(option.value, 10);
  return Number.isFinite(months) && months > 0 ? months : 0;
}

export function formatRenewSubmitLabel(option: ValidityOption | undefined): string {
  if (!option) return "Renew account";
  if (option.value === "FREE_TRIAL") return "Apply free trial";
  if (option.value === "1_MONTH_FREE") return "Apply 1 month free";
  const months = renewPeriodMonths(option);
  if (months === 1) return "Renew for 1 month";
  if (months > 1) return `Renew for ${months} months`;
  return "Renew account";
}

export function formatRenewExpiryDateShort(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDayCountFromToday(target: Date | null | undefined): string | null {
  if (!target || Number.isNaN(target.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (days === 0) return "(today)";
  if (days === 1) return "(1 day)";
  if (days === -1) return "(1 day ago)";
  if (days > 0) return `(${days} days)`;
  return `(${Math.abs(days)} days ago)`;
}

export function parseRenewExpiryDate(raw: string | null | undefined): Date | null {
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addMonthsToRenewExpiry(base: Date, months: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth() + months,
    base.getDate(),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
  );
}
