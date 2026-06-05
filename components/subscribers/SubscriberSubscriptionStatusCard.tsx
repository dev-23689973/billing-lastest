"use client";

import {
  getSubscriberSubscriptionStatusDisplay,
  type SubscriberSubscriptionStatusTone,
} from "@/lib/subscriberSubscriptionStatusDisplay";
import { cn } from "@/lib/cn";
import { rsTextBody, rsTextCaption } from "@/lib/ui/responsiveScale";

const toneClass: Record<SubscriberSubscriptionStatusTone, { shell: string; date: string; status: string }> = {
  expired: {
    shell: "border-amber-300/80 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-500/10",
    date: "text-amber-950 dark:text-amber-100",
    status: "text-rose-600 dark:text-rose-300",
  },
  soon: {
    shell: "border-violet-300/80 bg-violet-50/90 dark:border-violet-500/25 dark:bg-violet-500/10",
    date: "text-emerald-700 dark:text-emerald-300",
    status: "text-amber-700 dark:text-amber-200",
  },
  active: {
    shell: "border-violet-300/80 bg-violet-50/90 dark:border-violet-500/25 dark:bg-violet-500/10",
    date: "text-emerald-700 dark:text-emerald-300",
    status: "text-slate-600 dark:text-slate-300",
  },
  neutral: {
    shell: "border-border/60 bg-muted/25 dark:border-border/50 dark:bg-muted/10",
    date: "text-foreground",
    status: "text-muted-foreground",
  },
};

/** Inline pill for headers and detail rows — date + status on one line. */
export function SubscriberSubscriptionStatusBadge({
  expires,
  className,
}: {
  expires: string | null | undefined;
  className?: string;
}) {
  const display = getSubscriberSubscriptionStatusDisplay(expires);
  const styles = toneClass[display.tone];

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-none",
        styles.shell,
        className,
      )}
      title={display.statusLabel}
    >
      <span className={cn("shrink-0 font-semibold tabular-nums", styles.date)}>{display.dateLabel}</span>
      <span className="shrink-0 text-muted-foreground/70" aria-hidden>
        ·
      </span>
      <span className={cn("min-w-0 truncate font-medium", styles.status)}>{display.statusLabel}</span>
    </span>
  );
}

export function SubscriberSubscriptionStatusCard({
  expires,
  className,
  compact = false,
}: {
  expires: string | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  const display = getSubscriberSubscriptionStatusDisplay(expires);
  const styles = toneClass[display.tone];

  return (
    <div
      className={cn(
        "inline-flex min-w-[9.5rem] flex-col rounded-lg border px-3 py-2",
        compact ? "min-w-[8.5rem] px-2.5 py-1.5" : "px-3.5 py-2.5",
        styles.shell,
        className,
      )}
    >
      <span className={cn(compact ? rsTextCaption : rsTextBody, "font-semibold tabular-nums", styles.date)}>
        {display.dateLabel}
      </span>
      <span className={cn(rsTextCaption, "mt-0.5 font-medium", styles.status)}>{display.statusLabel}</span>
    </div>
  );
}
