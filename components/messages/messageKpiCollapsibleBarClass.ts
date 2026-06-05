import { cn } from "@/lib/cn";
import { livingGlassBar } from "@/components/theme/digital-classes";

/** Collapsed intel bar — single compact row, no horizontal scroll. */
export const messageKpiCollapsibleBarClass = cn(
  "relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 overflow-x-hidden rounded-md border px-2 py-1.5 sm:gap-x-2.5 sm:px-2.5 sm:py-2",
  livingGlassBar,
  "dark:shadow-[inset_0_1px_0_rgba(148,163,184,0.05),0_0_24px_rgba(34,211,238,0.04)]",
);

/** Inline metrics — wrap instead of scroll. */
export const kpiIntelChipsRowClass =
  "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 sm:gap-x-3";

export const messageKpiIntelChipClass = "inline-flex min-w-0 items-baseline gap-1";

export const messageKpiIntelChipLabelClass = cn(
  "shrink-0 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground",
);

export const messageKpiIntelChipValueClass = cn(
  "min-w-0 truncate text-[11px] font-semibold tabular-nums leading-none text-foreground sm:text-xs",
);

export const kpiIntelInlineDividerClass = "hidden h-3 w-px shrink-0 bg-border/70 sm:block";
