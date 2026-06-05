"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatHudDayMonthLabel } from "@/components/dashboard/hud/hudMonthKey";
import { cn } from "@/lib/cn";

function defaultLabel(d: Date) {
  return formatHudDayMonthLabel(d);
}

export function HudMonthNavigator({
  viewMonth,
  onPrev,
  onNext,
  onToday,
  formatLabel = defaultLabel,
  /** Title in the center box; defaults to `viewMonth` (e.g. pass selected when it lies in the viewed month). */
  titleDate,
  className,
}: {
  viewMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  /** Jump calendar + selection to the current local date. */
  onToday?: () => void;
  formatLabel?: (d: Date) => string;
  titleDate?: Date;
  className?: string;
}) {
  const labelFrom = titleDate ?? viewMonth;

  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-2 sm:px-3", className)}>
      <div className="flex w-full max-w-[16rem] items-center justify-center gap-2 sm:max-w-[18rem]">
        <button
          type="button"
          onClick={onPrev}
          className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-700 shadow-none transition duration-200 hover:border-primary/35 hover:bg-white hover:text-primary dark:border-slate-600/50 dark:bg-slate-950/55 dark:text-cyan-300/95 dark:shadow-none dark:hover:border-cyan-500/40 dark:hover:bg-slate-950/75 dark:hover:text-cyan-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2} />
        </button>
        <div className="w-fit max-w-[9.5rem] shrink-0 rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-center hud-calendar-month-title--animate dark:border-cyan-500/25 dark:bg-slate-950/20 sm:max-w-[10.5rem] sm:px-3">
          <span className="whitespace-nowrap font-mono text-[12px] font-bold tracking-[0.1em] text-slate-900 sm:text-sm dark:text-cyan-100/95">
            {formatLabel(labelFrom)}
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="group flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-700 shadow-none transition duration-200 hover:border-primary/35 hover:bg-white hover:text-primary dark:border-slate-600/50 dark:bg-slate-950/55 dark:text-cyan-300/95 dark:shadow-none dark:hover:border-cyan-500/40 dark:hover:bg-slate-950/75 dark:hover:text-cyan-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
        </button>
      </div>
      {onToday ? (
        <button
          type="button"
          onClick={onToday}
          className="w-full max-w-[10rem] rounded-sm border border-slate-200 bg-slate-50 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-none transition hover:border-primary/30 hover:bg-white hover:text-primary dark:border-slate-600/45 dark:bg-slate-950/40 dark:text-cyan-200/95 dark:shadow-none dark:hover:border-cyan-500/35 dark:hover:bg-slate-950/55 dark:hover:text-cyan-100"
        >
          Today
        </button>
      ) : null}
    </div>
  );
}
