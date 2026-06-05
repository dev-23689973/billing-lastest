import {
  subscriberAccountStatusBadgeClassName,
  subscriberExpiryBadgeClassName,
} from "@/components/admin/HierarchyTableBadges";
import { SubscriberSubscriptionStatusCard } from "@/components/subscribers/SubscriberSubscriptionStatusCard";
import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";

const ACCOUNT_OFF = 1;

export function formatExpiryShort(raw: string | null | undefined, compact = false): string {
  if (!raw) return "—";
  const parsed = Date.parse(String(raw).replace(" ", "T"));
  if (Number.isNaN(parsed)) return String(raw).slice(0, 10);
  const d = new Date(parsed);
  if (compact) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return String(raw).slice(0, 10);
}

export function subscriptionPill(r: SubscriberListClientRow) {
  const isActive = r.status !== ACCOUNT_OFF;
  return {
    label: isActive ? "Active" : "Inactive",
    className: subscriberAccountStatusBadgeClassName(isActive),
  };
}

export type ExpiryPillState = { label: string; className: string };

export function expiryPill(r: SubscriberListClientRow): ExpiryPillState | null {
  if (!r.expires) return null;
  if (isBillingAccountExpired(r.expires)) {
    return { label: "Expired", className: subscriberExpiryBadgeClassName("expired") };
  }
  const exp = new Date(String(r.expires).replace(" ", "T"));
  if (!Number.isNaN(exp.getTime()) && exp.getTime() > Date.now()) {
    if (exp.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000) {
      return { label: "Soon", className: subscriberExpiryBadgeClassName("soon") };
    }
    return { label: "Live", className: subscriberExpiryBadgeClassName("live") };
  }
  return null;
}

/** Expiry date + relative status — image-2 style card for table cells. */
export function SubscriberExpiryTableCell({
  expires,
  compact = false,
}: {
  expires: string | null | undefined;
  /** Tighter card for dense embedded tables. */
  compact?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <SubscriberSubscriptionStatusCard expires={expires} compact={compact} />
    </div>
  );
}

function parseBillingDateTime(raw: string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

export function formatStateRelative(raw: string | null | undefined): string {
  const d = parseBillingDateTime(raw);
  if (!d) return "No signal";
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Seen now";
  if (minutes < 60) return `Seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Seen ${days}d ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return `Seen ${months}mo ago`;
  const years = Math.floor(days / 365);
  return `Seen ${years}y ago`;
}
