"use client";

import { Check, Clock, Minus, Monitor, MonitorOff, Wifi, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  rsBadgeBase,
  rsBadgeIconBox,
  rsBadgeIconBoxSm,
  rsBadgeText,
  rsIconSm,
  rsIconXs,
} from "@/lib/ui/responsiveScale";
import type { StaffPresenceState } from "@/lib/adminStaffPresence";

export type StaffRowType = "MANAGER" | "RESELLER" | "DEALER";

const STAFF_TYPE_BADGE_LABEL: Record<StaffRowType, string> = {
  MANAGER: "MNGR",
  RESELLER: "RSLR",
  DEALER: "DLR",
};

/** Active / inactive staff account (STATUS column). */
export function staffStatusBadgeClassName(isActive: boolean): string {
  return isActive
    ? "border-emerald-300 bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/30"
    : "border-rose-300 bg-rose-100 text-rose-800 ring-rose-200/80 dark:border-rose-500/40 dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-500/30";
}

/** Subscriber account STATUS (Active / Inactive) — solid fills on light for readability. */
export function subscriberAccountStatusBadgeClassName(isActive: boolean): string {
  return isActive
    ? cn(
        "border font-semibold",
        "border-emerald-700 bg-emerald-600 text-white shadow-[0_1px_2px_rgb(4_120_87/0.35)]",
        "dark:border-emerald-500/45 dark:bg-emerald-500/18 dark:text-emerald-100 dark:shadow-none",
      )
    : cn(
        "border font-semibold",
        "border-rose-700 bg-rose-600 text-white shadow-[0_1px_2px_rgb(190_18_60/0.35)]",
        "dark:border-rose-500/45 dark:bg-rose-500/18 dark:text-rose-100 dark:shadow-none",
      );
}

/** Receiver / STB pill in user detail header and tables. */
export function subscriberReceiverBadgeClassName(online: boolean): string {
  return online
    ? cn(
        "border font-semibold",
        "border-emerald-700 bg-emerald-600 text-white shadow-[0_1px_2px_rgb(4_120_87/0.35)]",
        "dark:border-emerald-500/45 dark:bg-emerald-500/18 dark:text-emerald-100 dark:shadow-none",
      )
    : cn(
        "border font-semibold",
        "border-slate-600 bg-slate-600 text-white shadow-[0_1px_2px_rgb(51_65_85/0.35)]",
        "dark:border-slate-500/45 dark:bg-slate-500/18 dark:text-slate-200 dark:shadow-none",
      );
}

export function subscriberExpiryBadgeClassName(state: "live" | "expired" | "soon"): string {
  switch (state) {
    case "live":
      return cn(
        "border font-semibold",
        "border-emerald-700 bg-emerald-600 text-white shadow-[0_1px_2px_rgb(4_120_87/0.35)]",
        "dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200 dark:shadow-none",
      );
    case "expired":
      return cn(
        "border font-semibold",
        "border-rose-700 bg-rose-600 text-white shadow-[0_1px_2px_rgb(190_18_60/0.35)]",
        "dark:border-rose-500/40 dark:bg-rose-500/12 dark:text-rose-200 dark:shadow-none",
      );
    case "soon":
      return cn(
        "border font-semibold",
        "border-amber-600 bg-amber-500 text-amber-950 shadow-[0_1px_2px_rgb(180_83_9/0.3)]",
        "dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-200 dark:shadow-none",
      );
  }
}

export function staffStatusEditButtonClassName(selected: boolean, kind: "active" | "inactive"): string {
  if (kind === "active") {
    return selected
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted/40 dark:hover:text-foreground";
  }
  return selected
    ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/90 dark:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-500/30"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted/40 dark:hover:text-foreground";
}

export function staffTypeBadgeClassName(rowType: StaffRowType): string {
  switch (rowType) {
    case "MANAGER":
      return "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-400/35 dark:bg-violet-500/12 dark:text-violet-200";
    case "RESELLER":
      return "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-400/35 dark:bg-sky-500/12 dark:text-sky-200";
    case "DEALER":
      return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/35 dark:bg-amber-500/12 dark:text-amber-200";
  }
}

const STAFF_TYPE_LETTER: Record<StaffRowType, string> = {
  MANAGER: "M",
  RESELLER: "R",
  DEALER: "D",
};

/** Compact TYPE column pill (staff hub tables). */
const staffTypeTableBadgeClass = cn(
  rsBadgeBase,
  "px-1 py-px text-[10px] font-semibold leading-none tracking-tight",
);

export function StaffTypeBadge({ rowType, className }: { rowType: StaffRowType; className?: string }) {
  return (
    <span
      className={cn(staffTypeTableBadgeClass, staffTypeBadgeClassName(rowType), className)}
      title={rowType.charAt(0) + rowType.slice(1).toLowerCase()}
    >
      {STAFF_TYPE_BADGE_LABEL[rowType]}
    </span>
  );
}

/** Mobile TYPE column: single letter M / R / D. */
export function StaffTypeLetterBadge({ rowType, className }: { rowType: StaffRowType; className?: string }) {
  return (
    <span
      className={cn(
        rsBadgeIconBoxSm,
        rsBadgeText,
        "rounded border px-1 font-bold leading-none",
        staffTypeBadgeClassName(rowType),
        className,
      )}
      title={rowType.charAt(0) + rowType.slice(1).toLowerCase()}
    >
      {STAFF_TYPE_LETTER[rowType]}
    </span>
  );
}

/** Mobile STATUS column: icon only (active / inactive). */
export function StaffStatusIconBadge({
  isActive,
  className,
  iconClassName,
}: {
  isActive: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = isActive ? Check : X;
  const title = isActive ? "Active" : "Inactive";
  return (
    <span
      className={cn(
        rsBadgeIconBox,
        "rounded-full border",
        staffStatusBadgeClassName(isActive),
        className,
      )}
      title={title}
      aria-label={title}
    >
      <Icon className={cn(rsIconXs, iconClassName)} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

const PRESENCE_ICON: Record<StaffPresenceState, typeof Wifi> = {
  ONLINE: Wifi,
  IDLE: Clock,
  OFFLINE: WifiOff,
};

const PRESENCE_TITLE: Record<StaffPresenceState, string> = {
  ONLINE: "Online",
  IDLE: "Idle",
  OFFLINE: "Offline",
};

export function StaffPresenceIconBadge({
  state,
  badgeClass,
  className,
  iconClassName,
}: {
  state: StaffPresenceState;
  badgeClass: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = PRESENCE_ICON[state];
  return (
    <span
      className={cn(
        rsBadgeIconBox,
        "rounded-full border",
        badgeClass,
        className,
      )}
      title={PRESENCE_TITLE[state]}
      aria-label={PRESENCE_TITLE[state]}
    >
      <Icon className={cn(rsIconSm, iconClassName)} aria-hidden />
    </span>
  );
}

export function ReceiverOnlineIconBadge({
  online,
  className,
  iconClassName,
}: {
  online: boolean | null;
  className?: string;
  iconClassName?: string;
}) {
  if (online === null) {
    return (
      <span
        className={cn(
          rsBadgeIconBox,
          "rounded-full border border-border/60 bg-muted/40 text-muted-foreground",
          className,
        )}
        title="Unknown"
        aria-label="Unknown"
      >
        <Minus className={cn(rsIconSm, iconClassName)} aria-hidden />
      </span>
    );
  }

  const Icon = online ? Monitor : MonitorOff;
  const title = online ? "Receiver online" : "Receiver offline";

  return (
    <span
      className={cn(
        rsBadgeIconBox,
        "rounded-full border",
        online
          ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/12 dark:text-emerald-200"
          : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/12 dark:text-slate-300",
        className,
      )}
      title={title}
      aria-label={title}
    >
      <Icon className={cn(rsIconSm, iconClassName)} aria-hidden />
    </span>
  );
}
