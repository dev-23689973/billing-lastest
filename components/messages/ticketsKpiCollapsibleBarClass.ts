import { cn } from "@/lib/cn";
import { livingGlassBar } from "@/components/theme/digital-classes";
import { rsTextCaption, rsTextKicker } from "@/lib/ui/responsiveScale";

/** Collapsed ticket queue intel bar — stack stats on mobile so all chips stay visible. */
export const ticketsKpiCollapsibleBarClass = cn(
  "relative flex min-w-0 flex-col gap-1 rounded-md border px-2 py-1.5 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:px-2.5 sm:py-2",
  livingGlassBar,
  "border-amber-500/25 dark:border-amber-500/18 dark:bg-slate-950/45",
  "dark:shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_0_24px_rgba(245,158,11,0.05)]",
);

export const ticketsKpiBarTopRowClass = "flex min-w-0 w-full items-center gap-1.5 sm:w-auto sm:shrink-0";

/** Full-width stats row — scroll if needed, never clip. */
export const ticketsKpiIntelChipsRowClass =
  "thin-scrollbar flex w-full min-w-0 flex-nowrap items-center justify-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-1 sm:gap-2 sm:overflow-x-visible sm:pb-0";

export const ticketsKpiIntelChipShellClass = cn(
  "inline-flex min-w-0 shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-sm",
);

export const ticketsKpiIntelChipLabelClass = cn("shrink-0 font-mono opacity-90", rsTextKicker);

export const ticketsKpiIntelChipValueClass = cn(
  "shrink-0 font-mono text-sm font-bold tabular-nums leading-none sm:text-base",
);

export const ticketsKpiIntelChipSuffixClass = cn(
  "shrink-0 font-mono tabular-nums opacity-75",
  rsTextCaption,
  "font-medium",
);
