"use client";

import { useMemo, useState } from "react";

import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { hudDashShell } from "@/components/dashboard/hud/hudDashboardLayout";
import type { AdminReportPackageRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/cn";

const PLOT_H = 200;
const BAR_COLOR = "#818cf8";
/**
 * Vertical space reserved below the bars for the -45° rotated tariff-plan labels.
 * `truncate max-w-[6.5rem]` ≈ 104px → diagonal drop is `104 × sin(45°) ≈ 74px`; round up for descenders + tracking.
 */
const LABEL_GUTTER = 80;

function niceCeil(x: number): number {
  if (x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

function axisForMax(maxObserved: number) {
  if (!Number.isFinite(maxObserved) || maxObserved <= 0) {
    return { yMax: 5, ticks: [0, 1, 2, 3, 4, 5] };
  }
  const yMax = Math.max(2, niceCeil(maxObserved * 1.05));
  const step = yMax / 5;
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => Math.round(i * step * 10) / 10);
  return { yMax, ticks };
}

function fmtTick(n: number) {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** LCD-stripe fill (same vocabulary as the bar chart and tariff plan mock). */
function lcdBg(hex: string) {
  return {
    backgroundImage: `repeating-linear-gradient(
      to bottom,
      ${hex} 0px,
      ${hex} 2px,
      rgba(0,0,0,0.22) 2px,
      rgba(0,0,0,0.22) 4px
    )`,
  } as const;
}

export function HudPackageDistributionPanel({
  rows,
  className,
}: {
  rows: AdminReportPackageRow[];
  className?: string;
}) {
  const { tips } = useDashboardIntel();
  const [showAllocation, setShowAllocation] = useState(false);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const r of rows) m = Math.max(m, r.count);
    return m;
  }, [rows]);

  const { yMax, ticks } = useMemo(() => axisForMax(maxCount), [maxCount]);
  const totalUsers = useMemo(() => rows.reduce((s, r) => s + r.count, 0), [rows]);

  const gridStyle = useMemo(() => {
    const n = Math.max(1, ticks.length - 1);
    const pct = 100 / n;
    return {
      backgroundImage: `repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent calc(${pct}% - 1px),
        rgba(148,163,184,0.1) calc(${pct}% - 1px),
        rgba(148,163,184,0.1) ${pct}%
      )`,
    } as const;
  }, [ticks.length]);

  const hasAny = rows.length > 0 && maxCount > 0;

  return (
    <div className={cn(hudDashShell, "flex min-h-0 min-w-0 flex-col", className)}>
      <div className="relative z-[1] flex min-h-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-base font-bold uppercase tracking-[0.12em] text-slate-900 sm:text-lg dark:text-slate-50">
              Package distribution
            </h3>
            <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary dark:text-cyan-500/75">
              Tariff plan density and user allocation
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllocation((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition",
                showAllocation
                  ? "border-cyan-600/50 bg-cyan-50 text-cyan-900 dark:border-cyan-400/60 dark:bg-cyan-500/15 dark:text-cyan-100"
                  : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-cyan-500/40 hover:text-cyan-800 dark:border-slate-600/60 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none dark:hover:border-cyan-500/50 dark:hover:text-cyan-100",
              )}
              aria-pressed={showAllocation}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  showAllocation
                    ? "bg-cyan-600 dark:bg-cyan-300 dark:shadow-[0_0_8px_rgba(34,211,238,0.55)]"
                    : "bg-slate-400 dark:bg-slate-500",
                )}
                aria-hidden
              />
              {showAllocation ? "Hide allocation" : "Show allocation"}
            </button>
                  <IntelGuideBadge size="sm" tip={tips.packageDistribution} />
          </div>
        </div>

        {!hasAny ? (
          <div
            className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm text-slate-500 dark:border-slate-700/40 dark:bg-slate-950/30"
            style={{ height: PLOT_H + 24 + LABEL_GUTTER }}
          >
            No tariff plan data available.
          </div>
        ) : (
          <div className="flex min-h-0 w-full min-w-0 items-start gap-2 sm:gap-3">
            {/*
              Y-axis: invisible spacers above/below mirror the bar column's value label
              and rotated-label boxes so the visible ticks share the exact PLOT_H span
              of the bar plot frame (top tick = top of bar frame, "0" = baseline).
            */}
            <div
              className="flex w-7 shrink-0 flex-col items-end pt-4 sm:w-8"
              style={{ paddingBottom: LABEL_GUTTER }}
              aria-hidden
            >
              <span className="invisible mb-0.5 block font-mono text-[8px] leading-none sm:text-[9px]">
                .
              </span>
              <div
                className="flex flex-col justify-between text-right font-mono text-[8px] font-medium tabular-nums leading-none text-slate-500 sm:text-[10px]"
                style={{ height: PLOT_H }}
              >
                {[...ticks].reverse().map((t, i) => (
                  <span key={`${t}-${i}`} className="block">
                    {fmtTick(t)}
                  </span>
                ))}
              </div>
              <span className="invisible mt-1.5 block h-3" />
            </div>

            {/* Bars + labels */}
            <div
              className="flex min-w-0 flex-1 items-start gap-1 pt-4 sm:gap-1.5"
              style={{ paddingBottom: LABEL_GUTTER }}
            >
              {rows.map((row) => {
                const barPx = yMax > 0 ? Math.max(row.count > 0 ? 3 : 1, (row.count / yMax) * (PLOT_H - 2)) : 1;
                const pct = totalUsers > 0 ? (row.count / totalUsers) * 100 : 0;
                return (
                  <div key={row.name} className="group/pkg flex min-w-0 flex-1 flex-col items-center">
                    <span className="mb-0.5 block truncate text-center font-mono text-[8px] font-semibold tabular-nums leading-none text-slate-700 antialiased dark:text-slate-200 sm:text-[9px]">
                      {row.count}
                    </span>
                    <div
                      className="relative flex w-full items-end justify-center rounded-sm border border-slate-200 bg-slate-100/80 px-0.5 dark:border-slate-700/35 dark:bg-slate-950/40 sm:px-1"
                      style={{ height: PLOT_H, ...gridStyle }}
                      title={`${row.name}: ${row.count} users${totalUsers > 0 ? ` (${pct.toFixed(1)}%)` : ""}`}
                    >
                      <div
                        className="w-full max-w-[36px] rounded-t-[3px] border border-slate-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[filter] duration-150 group-hover/pkg:drop-shadow-[0_0_6px_rgba(99,102,241,0.25)] dark:border-slate-600/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:group-hover/pkg:drop-shadow-[0_0_8px_rgba(129,140,248,0.5)] sm:max-w-[44px]"
                        style={{ height: barPx, ...lcdBg(BAR_COLOR) }}
                      />
                    </div>
                    {/*
                      Rotated label anchored at the *bar's center* (column 50%),
                      hanging DOWN-LEFT so the right end of the angled text lands
                      directly under its own bar instead of the gap between bars.
                    */}
                    <div className="relative mt-1.5 h-3 w-full">
                      <span
                        className="absolute top-0 inline-block max-w-[6.5rem] -rotate-45 truncate font-mono text-[8px] uppercase leading-none tracking-tight text-slate-500 sm:text-[9px]"
                        style={{ transformOrigin: "top right", right: "50%" }}
                        title={row.name}
                      >
                        {row.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAllocation && hasAny ? (
          <ul className="mt-2 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 font-mono text-[10px] dark:border-cyan-500/15 sm:grid-cols-2 sm:text-[11px]">
            {rows.map((row) => {
              const pct = totalUsers > 0 ? (row.count / totalUsers) * 100 : 0;
              return (
                <li
                  key={`${row.name}-alloc`}
                  className="flex items-center justify-between gap-3 rounded-sm border border-slate-200/80 bg-slate-50 px-2 py-1 dark:border-transparent dark:bg-slate-900/40"
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-slate-700 dark:text-slate-200">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: BAR_COLOR, boxShadow: `0 0 6px ${BAR_COLOR}66` }}
                      aria-hidden
                    />
                    <span className="truncate" title={row.name}>{row.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-cyan-700 dark:text-cyan-200">
                    {row.count}
                    <span className="ml-1.5 text-slate-500">{pct.toFixed(1)}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
