import { cn } from "@/lib/cn";
import { rsBadgeBase } from "@/lib/ui/responsiveScale";

/** Scroll shell modifier — pairs with `subscribers-page-table-scroll` for compact modal density. */
export const SUBSCRIBERS_FETCH_MODAL_TABLE_SCROLL_CLASS = "subscribers-fetch-modal-table-scroll";

/** Soft status pill — outlined, not solid fill. */
export const subscribersFetchModalStatusPillClass = cn(
  rsBadgeBase,
  "subscribers-fetch-modal-status-pill px-1.5 py-0.5 text-[11px] font-medium leading-tight sm:text-xs",
);

/** Smaller secondary pill for expiry state under the date. */
export const subscribersFetchModalExpiryPillClass = cn(
  rsBadgeBase,
  "subscribers-fetch-modal-expiry-pill px-1.5 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
);

const SOFT_ACTIVE = cn(
  "border-emerald-300 bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  "dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/30",
);

const SOFT_INACTIVE = cn(
  "border-rose-300 bg-rose-100 text-rose-800 ring-rose-200/80",
  "dark:border-rose-500/40 dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/30",
);

const SOFT_SOON = cn(
  "border-amber-300 bg-amber-100 text-amber-800 ring-amber-200/80",
  "dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-500/30",
);

export function subscribersFetchModalStatusBadgeClass(isActive: boolean): string {
  return isActive ? SOFT_ACTIVE : SOFT_INACTIVE;
}

export function subscribersFetchModalExpiryBadgeClass(label: string): string {
  if (label === "Expired") return SOFT_INACTIVE;
  if (label === "Soon") return SOFT_SOON;
  return SOFT_ACTIVE;
}
