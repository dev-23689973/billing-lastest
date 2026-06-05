"use client";

import { cn } from "@/lib/cn";

export const HUD_PERIOD_OPTIONS = [
  { id: "1w", label: "1 WEEK", shortLabel: "1W" },
  { id: "1m", label: "1 MONTH", shortLabel: "1M" },
  { id: "3m", label: "3 MONTH", shortLabel: "3M" },
  { id: "6m", label: "6 MONTH", shortLabel: "6M" },
  { id: "1y", label: "1 YEAR", shortLabel: "1Y" },
] as const;

export type HudPeriodId = (typeof HUD_PERIOD_OPTIONS)[number]["id"];

const PERIOD_IDS = new Set<string>(HUD_PERIOD_OPTIONS.map((o) => o.id));

export function parseHudPeriodId(raw: string | null | undefined): HudPeriodId | null {
  const v = raw?.trim() ?? "";
  return PERIOD_IDS.has(v) ? (v as HudPeriodId) : null;
}

/**
 * HUD-style segmented period control (reusable in headers / toolbars).
 */
export function HudPeriodStrip({
  value,
  onValueChange,
  options = HUD_PERIOD_OPTIONS,
  className,
  "aria-label": ariaLabel = "Time range",
}: {
  value: HudPeriodId;
  onValueChange: (id: HudPeriodId) => void;
  options?: ReadonlyArray<{ id: HudPeriodId; label: string; shortLabel?: string }>;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex max-w-full rounded-md border border-border/60 bg-transparent px-0.5 py-0.5 shadow-sm ring-1 ring-black/[0.04]",
        "dark:border-cyan-500/20 dark:bg-slate-950/85 dark:shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] dark:ring-0 dark:backdrop-blur-[2px]",
        "sm:rounded-lg sm:px-1 sm:py-1 lg:px-1.5",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className="pointer-events-none absolute left-0 top-0 z-[1] h-1.5 w-1.5 border-l border-t border-primary/35 sm:h-2.5 sm:w-2.5 dark:border-cyan-400/40"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 right-0 z-[1] h-1.5 w-1.5 border-b border-r border-primary/25 sm:h-2.5 sm:w-2.5 dark:border-cyan-400/28"
        aria-hidden
      />
      <div className="relative z-[2] flex w-full min-w-0 flex-nowrap items-stretch justify-stretch gap-px sm:gap-0.5 lg:gap-1">
        {options.map((opt) => {
          const active = value === opt.id;
          const short = opt.shortLabel ?? opt.label;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onValueChange(opt.id)}
              title={opt.label}
              className={cn(
                "min-h-[1.375rem] min-w-0 flex-1 rounded px-0.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] transition",
                "sm:min-h-[1.625rem] sm:flex-none sm:rounded-md sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.14em]",
                "lg:px-3 lg:tracking-[0.16em]",
                active
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25 dark:bg-cyan-500/20 dark:text-cyan-100 dark:ring-cyan-400/35 dark:shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-800 dark:text-slate-200",
              )}
              aria-pressed={active}
              aria-label={opt.label}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
