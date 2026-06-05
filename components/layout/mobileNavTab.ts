import { cn } from "@/lib/cn";
import { rsIconNav, rsIconSm, rsTextCaption } from "@/lib/ui/responsiveScale";
import {
  hudPeriodStripCornerTopLeftClass,
  managersToolbarDropdownPanelClass,
} from "@/components/admin/managers-toolbar-icon-button";

/**
 * Fixed short labels for the mobile bar — full label stays in `title`.
 * Never use CSS truncation (no "…"); these strings must fit one line per tab.
 */
const MOBILE_NAV_SHORT_LABELS: Record<string, string> = {
  Dashboard: "Dash",
  Resellers: "Resell",
  Users: "Users",
  Transactions: "Trans",
  "Credit deductions": "Deduct",
  Messages: "Msgs",
  Tickets: "Tix",
  Settings: "Setup",
  "Check MAC": "MAC",
  Dealers: "Dealer",
  News: "News",
  More: "More",
};

export function mobileNavShortLabel(label: string): string {
  const mapped = MOBILE_NAV_SHORT_LABELS[label];
  if (mapped) return mapped;
  if (label.length <= 7) return label;
  const word = label.split(/\s+/)[0] ?? label;
  return word.length <= 7 ? word : word.slice(0, 7);
}

/** Reserve space above fixed bottom nav on mobile (uses `--mobile-nav-offset` in globals.css). */
export const mobileNavLayoutPadClass = "pb-[var(--mobile-nav-offset)] lg:pb-0";

/** Min width per tab when calculating how many fit before "More". */
export const MOBILE_NAV_MIN_SLOT_PX = 44;

/** Keys/hrefs moved to “More” first when space is tight (admin `NavKey` or portal href token). */
const PREFER_OVERFLOW_KEYS = [
  "settings",
  "tickets",
  "message",
  "deductions",
  "check-mac",
  "transactions",
] as const;

/**
 * How many nav items fit in the bar; remainder goes under More (always last).
 */
export function mobileNavVisibleItemCount(
  barWidth: number,
  totalItems: number,
  extraSlots: number,
): number {
  if (totalItems <= 0 || barWidth <= 0) return totalItems > 0 ? 1 : 0;

  const maxSlots = Math.floor(barWidth / MOBILE_NAV_MIN_SLOT_PX);
  const slotsForNav = maxSlots - extraSlots;
  if (slotsForNav <= 0) return 1;

  if (totalItems <= slotsForNav) return totalItems;
  return Math.max(1, slotsForNav - 1);
}

/**
 * Pick bar vs overflow while preserving nav order. Low-priority items overflow first.
 */
export function splitMobileNavItems<T>(
  items: T[],
  maxBarItems: number,
  itemKey: (item: T) => string,
): { bar: T[]; overflow: T[] } {
  if (items.length <= maxBarItems) return { bar: items, overflow: [] };

  const matchesKey = (item: T, key: string) => {
    const k = itemKey(item);
    return k === key || k.endsWith(`/${key}`);
  };

  const pending = [...items];
  const overflowList: T[] = [];

  for (const key of PREFER_OVERFLOW_KEYS) {
    if (items.length - overflowList.length <= maxBarItems) break;
    const idx = pending.findIndex((i) => matchesKey(i, key));
    if (idx >= 0) {
      overflowList.push(pending[idx]!);
      pending.splice(idx, 1);
    }
  }

  while (pending.length > maxBarItems) {
    overflowList.unshift(pending.pop()!);
  }

  const overflowSet = new Set(overflowList);
  return {
    bar: items.filter((i) => !overflowSet.has(i)),
    overflow: items.filter((i) => overflowSet.has(i)),
  };
}

export const mobileNavBarShellClass = cn(
  "fixed inset-x-0 bottom-0 z-50 lg:hidden",
  "border-t border-cyan-500/28 bg-background/98 backdrop-blur-lg",
  "pb-[var(--mobile-nav-safe-area-bottom)]",
  "pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
  "shadow-[0_-4px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(34,211,238,0.14)]",
  "dark:border-cyan-400/22 dark:bg-[hsl(222_47%_5%/0.97)] dark:shadow-[0_-6px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(34,211,238,0.1)]",
);

export const mobileNavBarRowClass =
  "relative flex w-full min-w-0 flex-nowrap items-stretch overflow-hidden px-1 pt-[var(--mobile-nav-bar-row-padding-top)]";

export const mobileNavBarCornerTopLeftClass = hudPeriodStripCornerTopLeftClass;
export const mobileNavBarCornerTopRightClass =
  "pointer-events-none absolute right-0 top-0 z-[2] h-2.5 w-2.5 border-r border-t border-cyan-400/35";

/** One equal flex slot in the bottom nav row. */
export const mobileNavSlotClass =
  "flex min-h-[var(--mobile-nav-bar-min-height)] min-w-0 flex-1 basis-0 touch-manipulation justify-center overflow-hidden";

/** Fixed-width “More” slot — always last, never overlaps neighbors. */
export const mobileNavMoreSlotClass =
  "relative z-20 flex w-14 min-h-[var(--mobile-nav-bar-min-height)] shrink-0 basis-14 flex-col justify-center overflow-hidden isolate";

export const mobileNavIconClass = rsIconNav;

export function mobileNavInnerClass(active: boolean) {
  return cn(
    "relative flex h-full w-full min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-1 py-1 transition-colors duration-150",
    active
      ? "text-primary after:absolute after:left-1/2 after:top-0 after:h-[2.5px] after:w-7 after:-translate-x-1/2 after:rounded-full after:bg-cyan-400 after:shadow-[0_0_10px_rgba(34,211,238,0.7)] after:content-['']"
      : "text-muted-foreground hover:text-foreground active:text-foreground",
  );
}

export const mobileNavLabelClass = cn(
  "w-full px-0.5 text-center font-medium leading-snug tracking-wide whitespace-nowrap",
  rsTextCaption,
);

export function mobileNavLabelClassActive(active: boolean) {
  return cn(mobileNavLabelClass, active && "font-semibold text-cyan-400 dark:text-cyan-300");
}

/** Overflow “More” popup — HUD frame (used inside `FloatingMenuPortal`). */
export const mobileNavMoreMenuPanelClass = cn(
  managersToolbarDropdownPanelClass,
  "!w-max min-w-[9.5rem] max-w-[min(calc(100vw-1.25rem),13rem)]",
  "shadow-[0_10px_32px_rgba(0,0,0,0.5)]",
  "dark:bg-[hsl(222_47%_6%/0.96)]",
);

export const mobileNavMoreMenuItemClass = cn(
  "flex w-full items-center gap-2 whitespace-nowrap px-2.5 py-2 text-left text-xs font-medium leading-none text-foreground",
  "transition-colors duration-150",
  "hover:bg-cyan-500/10 hover:text-foreground dark:hover:bg-cyan-400/12",
  "focus-visible:outline-none focus-visible:bg-cyan-500/12",
);

export function mobileNavMoreMenuItemClassActive(active: boolean) {
  return cn(
    mobileNavMoreMenuItemClass,
    active &&
      "bg-cyan-500/14 text-cyan-800 shadow-[inset_2px_0_0_0_rgb(34_211_238/0.8)] dark:bg-cyan-400/12 dark:text-cyan-50",
  );
}

export const mobileNavMoreMenuIconClass = cn(rsIconSm, "text-cyan-500/90 dark:text-cyan-400/85");
