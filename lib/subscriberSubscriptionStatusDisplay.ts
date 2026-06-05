import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import { formatSubscriberExpiryFallback } from "@/lib/accountAutoRenew";

export type SubscriberSubscriptionStatusTone = "expired" | "soon" | "active" | "neutral";

export type SubscriberSubscriptionStatusDisplay = {
  dateLabel: string;
  statusLabel: string;
  tone: SubscriberSubscriptionStatusTone;
};

function parseExpiryDate(raw: string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysUntilExpiry(expires: string | null | undefined): number | null {
  const expiry = parseExpiryDate(expires);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(expiry);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

/** Image-2 style subscription status: date + “Expired” / “N days left”. */
export function getSubscriberSubscriptionStatusDisplay(
  expires: string | null | undefined,
): SubscriberSubscriptionStatusDisplay {
  const dateLabel = formatSubscriberExpiryFallback(expires) ?? "—";
  if (!expires) {
    return { dateLabel: "—", statusLabel: "No expiry set", tone: "neutral" };
  }
  if (isBillingAccountExpired(expires)) {
    return { dateLabel, statusLabel: "Expired", tone: "expired" };
  }
  const days = daysUntilExpiry(expires);
  if (days != null && days >= 0) {
    if (days <= 7) {
      return {
        dateLabel,
        statusLabel: days === 1 ? "1 day left" : `${days} days left`,
        tone: "soon",
      };
    }
    return {
      dateLabel,
      statusLabel: "Active",
      tone: "active",
    };
  }
  return { dateLabel, statusLabel: "Active", tone: "active" };
}
