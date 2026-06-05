"use client";

import { useMemo } from "react";

import { hudIsFutureLocalDay } from "@/components/dashboard/hud/hudMonthKey";
import { cn } from "@/lib/cn";

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export type HudCalendarDayMarkers = {
  /** At least one new signup (created) on this day */
  newUsers?: boolean;
  /** At least one account with subscription ending (expires) on this day */
  expiredUsers?: boolean;
};

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Six weeks starting Sunday of the week that contains the 1st of `viewMonth`. */
function buildCalendarCells(viewMonth: Date) {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const start = new Date(y, m, 1 - lead);
  const cells: { at: Date; inViewMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const at = new Date(start);
    at.setDate(start.getDate() + i);
    cells.push({
      at,
      inViewMonth: at.getMonth() === m && at.getFullYear() === y,
    });
  }
  return cells;
}

export function HudCalendarMonthGrid({
  viewMonth,
  selected,
  onSelect,
  getDayMarkers,
  showFooterRail = true,
  /** Compare against `new Date()` so days after today are disabled and show no activity dots. */
  disableFutureDays = true,
  className,
}: {
  viewMonth: Date;
  selected: Date;
  onSelect: (day: Date) => void;
  /** Markers for any rendered calendar day (including adjacent months). */
  getDayMarkers?: (date: Date) => HudCalendarDayMarkers | undefined;
  /** Thin baseline with centered cyan dot (reference HUD). */
  showFooterRail?: boolean;
  disableFutureDays?: boolean;
  className?: string;
}) {
  const cells = useMemo(() => buildCalendarCells(viewMonth), [viewMonth]);
  /** Fresh each render so “today” stays correct if the session crosses midnight. */
  const today = new Date();

  return (
    <div className={cn("relative flex h-full min-h-0 w-full flex-col", className)}>
      <div
        className="pointer-events-none absolute inset-0 hud-calendar-grid-mesh hud-calendar-grid-mesh--animate"
        aria-hidden
      />
      <div className="relative z-[1] grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-x-px gap-y-px text-center">
        {WEEK.map((w) => (
          <div
            key={w}
            className="pb-0.5 font-sans text-[8px] font-bold uppercase tracking-[0.12em] text-slate-700 sm:pb-1 sm:text-[9px] sm:tracking-[0.14em] dark:text-slate-500/85"
          >
            {w}
          </div>
        ))}
        {cells.map(({ at, inViewMonth }, i) => {
          const d = at.getDate();
          const isFuture = disableFutureDays && hudIsFutureLocalDay(at, today);
          const isSel = sameLocalDay(at, selected) && !isFuture;
          const mkRaw = getDayMarkers?.(at) ?? {};
          const mk = isFuture ? {} : mkRaw;
          return (
            <button
              key={`${at.getFullYear()}-${at.getMonth()}-${d}-${i}`}
              type="button"
              disabled={isFuture}
              onClick={() => {
                if (!isFuture) onSelect(at);
              }}
              style={{ animationDelay: `${i * 16}ms` }}
              className={cn(
                "group relative flex h-full min-h-[1.5rem] w-full flex-col items-center justify-center gap-px rounded-sm border py-px font-mono text-[11px] font-semibold tabular-nums leading-none transition-[color,border-color] duration-200 ease-out hud-calendar-day-appear sm:min-h-[1.75rem] sm:text-[12px] lg:min-h-[1.875rem]",
                !isFuture && "active:opacity-90",
                isFuture &&
                  "cursor-not-allowed border-transparent opacity-[0.38] grayscale-[0.35] hover:border-transparent hover:text-inherit",
                !inViewMonth && !isFuture && "text-slate-600/75",
                inViewMonth &&
                  !isSel &&
                  !isFuture &&
                  "text-slate-800 hover:border-primary/25 hover:bg-slate-50/80 dark:text-slate-200/95 dark:hover:border-emerald-500/22 dark:hover:bg-transparent dark:hover:text-emerald-50/95",
                isSel &&
                  "z-[1] border-primary/35 bg-primary/8 text-slate-900 hud-calendar-cell-selected--animate dark:border-cyan-400/28 dark:text-white",
                !isSel && !isFuture && "border-transparent hover:border-slate-200 dark:hover:border-slate-600/35",
              )}
            >
              {isSel ? (
                <span
                  className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-sm opacity-0 hud-calendar-scanlines hud-calendar-scanlines--animate dark:opacity-[0.92]"
                  aria-hidden
                />
              ) : null}
              <span className="relative z-[1] transition-opacity duration-300 group-hover:opacity-100">
                {String(d).padStart(2, "0")}
              </span>
              <span className="relative z-[1] flex h-[0.4rem] min-h-[0.4rem] items-center justify-center gap-px">
                {!isFuture && mk.newUsers ? (
                  <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.45)] hud-calendar-marker--pulse" />
                ) : null}
                {!isFuture && mk.expiredUsers ? (
                  <span className="h-1 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_4px_rgba(232,121,249,0.38)] hud-calendar-marker--pulse-delayed" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {showFooterRail ? (
        <div className="relative z-[1] mt-2 w-full shrink-0" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600/80" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 hud-calendar-footer-node--animate dark:bg-cyan-400/90" />
        </div>
      ) : null}
    </div>
  );
}
