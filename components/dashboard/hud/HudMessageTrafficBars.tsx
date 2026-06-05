"use client";

import { useMemo, useState } from "react";

import { useTheme } from "@/contexts/ThemeContext";
import type { AdminMessageTrafficDayStack } from "@/lib/repos/billing";

import { cn } from "@/lib/cn";
import { STALKER_MSG_DELIVERY_HEX } from "@/lib/ui/stalkerMessageDeliveryStatus";
import { STALKER_MSG_PRIORITY_HEX } from "@/lib/ui/stalkerMessagePriority";

const SEGMENTS = [
  { key: "delivered", label: "Delivered", color: STALKER_MSG_DELIVERY_HEX.delivered },
  { key: "highPending", label: "High priority", color: STALKER_MSG_PRIORITY_HEX.high },
  { key: "normalPending", label: "Normal", color: STALKER_MSG_PRIORITY_HEX.normal },
  { key: "lowPending", label: "Low", color: STALKER_MSG_PRIORITY_HEX.low },
  { key: "otherPending", label: "Other queue", color: "#38bdf8" },
] as const;

/** Plot height matches reference HUD; Y-axis slimmer to leave more room for bars on narrow cards. */
const PLOT_H = 148;
const PLOT_MIN_H = PLOT_H + 14;

function segmentValue(row: AdminMessageTrafficDayStack, key: (typeof SEGMENTS)[number]["key"]): number {
  switch (key) {
    case "delivered":
      return row.delivered;
    case "highPending":
      return row.highPending;
    case "normalPending":
      return row.normalPending;
    case "lowPending":
      return row.lowPending;
    case "otherPending":
      return row.otherPending;
    default:
      return 0;
  }
}

/** Horizontal LCD stripe fill (matches reference). */
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

function fmtBarLabel(n: number): string {
  if (n <= 0) return "0";
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) {
    const k = n / 1000;
    return `${Math.round(k * 10) / 10}k`;
  }
  return String(n);
}

function fmtFullCount(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n)));
}

function niceCeil(x: number): number {
  if (x <= 0) return 5;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

/** Six ticks (0 … yMax) like the reference chart. */
function axisForMax(maxObserved: number): { yMax: number; ticks: number[] } {
  if (!Number.isFinite(maxObserved) || maxObserved <= 0) {
    return { yMax: 5, ticks: [0, 1, 2, 3, 4, 5] };
  }
  const yMax = Math.max(5, niceCeil(maxObserved * 1.08));
  const step = yMax / 5;
  const ticks = [0, 1, 2, 3, 4, 5].map((i) => Math.round(i * step));
  return { yMax, ticks };
}

/** Short Y-axis tick label so the gutter can stay slim on narrow cards. */
function fmtAxisTick(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1_000) {
    const k = n / 1000;
    return `${Math.round(k * 10) / 10}k`;
  }
  return String(n);
}

function groupTotal(row: AdminMessageTrafficDayStack): number {
  return (
    row.delivered +
    row.highPending +
    row.normalPending +
    row.lowPending +
    row.otherPending
  );
}

export function HudMessageTrafficBars({
  days,
  className,
  fillHeight = false,
}: {
  days: AdminMessageTrafficDayStack[];
  className?: string;
  /** Grow plot area to fill a stretched dashboard card (matches adjacent ticket panel height). */
  fillHeight?: boolean;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const maxSegment = useMemo(() => {
    let m = 0;
    for (const d of days) {
      for (const s of SEGMENTS) m = Math.max(m, segmentValue(d, s.key));
    }
    return m;
  }, [days]);

  const { yMax, ticks } = useMemo(() => axisForMax(maxSegment), [maxSegment]);

  const hasAny = useMemo(
    () => days.some((d) => SEGMENTS.some((s) => segmentValue(d, s.key) > 0)),
    [days],
  );

  /** Backdrop grid drawn behind every bar group so axis ticks align with bar tops. */
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

  /** Per-bar value labels get crowded when the card is narrow; collapse them on small screens. */
  const showSegmentValues = days.length <= 7;

  return (
    <div
      className={cn(
        "relative flex min-h-0 w-full min-w-0 flex-col",
        fillHeight && "h-full min-h-0 flex-1",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 gap-1.5 sm:gap-2",
          fillHeight ? "h-full min-h-0 flex-1" : "min-h-0",
        )}
      >
        {/* Y-axis: slim gutter so the bar row gets the most space at every breakpoint. */}
        <div
          className={cn(
            "flex w-6 shrink-0 flex-col justify-between text-right font-mono text-[8px] font-medium tabular-nums leading-none text-slate-500 sm:w-8 sm:text-[10px]",
            fillHeight ? "h-full self-stretch py-1" : "pt-3 pb-4",
          )}
          style={fillHeight ? { minHeight: PLOT_MIN_H } : { height: PLOT_MIN_H }}
          aria-hidden
        >
          {[...ticks].reverse().map((t, i) => (
            <span key={`${t}-${i}`} className="block">
              {fmtAxisTick(t)}
            </span>
          ))}
        </div>

        {/* Bar row: fit-to-width — groups share the row equally so no horizontal scroll is ever needed. */}
        <div
          className={cn(
            "flex min-w-0 flex-1 gap-1 sm:gap-1.5 md:gap-2",
            fillHeight ? "h-full min-h-0 items-stretch self-stretch py-1" : "items-end pb-4 pt-3",
          )}
          style={fillHeight ? { minHeight: PLOT_MIN_H } : { minHeight: PLOT_MIN_H }}
          onMouseLeave={() => setHoverKey(null)}
        >
          {days.map((day) => {
            const isActive = hoverKey === day.dayKey;
            const total = groupTotal(day);
            return (
              <div
                key={day.dayKey}
                className={cn(
                  "group/bar relative flex min-w-0 flex-1 flex-col",
                  fillHeight ? "h-full min-h-0 self-stretch" : "items-center",
                )}
                onMouseEnter={() => setHoverKey(day.dayKey)}
                onFocus={() => setHoverKey(day.dayKey)}
                onBlur={() => setHoverKey((k) => (k === day.dayKey ? null : k))}
                tabIndex={0}
                role="img"
                aria-label={`${day.dayLabel}: total ${fmtFullCount(total)}`}
              >
                <div
                  className={cn(
                    "relative flex w-full items-end justify-center gap-px rounded-sm border border-slate-200 bg-slate-100/80 px-0.5 transition-colors duration-150 dark:border-slate-700/35 dark:bg-slate-950/40 sm:gap-0.5 sm:px-1",
                    fillHeight && "min-h-0 flex-1",
                    isActive
                      ? "border-primary/50 bg-cyan-50 shadow-sm dark:border-cyan-300/60 dark:bg-slate-950/65 dark:shadow-[0_0_14px_-4px_rgba(34,211,238,0.45)]"
                      : "border-slate-200 dark:border-slate-700/35",
                  )}
                  style={
                    fillHeight
                      ? { minHeight: PLOT_H, ...gridStyle }
                      : { height: PLOT_H, ...gridStyle }
                  }
                >
                  {SEGMENTS.map((seg) => {
                    const v = segmentValue(day, seg.key);
                    const hPx = yMax > 0 ? Math.max(v > 0 ? 3 : 1, (v / yMax) * (PLOT_H - 2)) : 1;
                    const hPct =
                      fillHeight && yMax > 0
                        ? `${Math.max(v > 0 ? 2 : 0.5, (v / yMax) * 100)}%`
                        : undefined;
                    return (
                      <div
                        key={seg.key}
                        className={cn(
                          "flex min-w-0 flex-1 flex-col items-stretch justify-end",
                          fillHeight && "h-full",
                        )}
                      >
                        {showSegmentValues ? (
                          <span className="mb-0.5 block truncate text-center font-mono text-[7px] font-semibold tabular-nums leading-none text-slate-600 antialiased dark:text-slate-200 sm:text-[8px]">
                            {fmtBarLabel(v)}
                          </span>
                        ) : null}
                        <div
                          className={cn(
                            "w-full rounded-t-[2px] border border-slate-600/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[filter] duration-150",
                            v <= 0 ? "bg-slate-800/60" : "",
                            isActive && v > 0
                              ? "drop-shadow-[0_0_4px_rgba(8,145,178,0.2)] dark:drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]"
                              : "",
                          )}
                          style={
                            v > 0
                              ? { height: hPct ?? hPx, ...lcdBg(seg.color) }
                              : { height: hPct ?? hPx }
                          }
                        />
                      </div>
                    );
                  })}

                  {isActive ? (
                    <HudMessageTrafficTooltip
                      row={day}
                      total={total}
                      indexInRow={days.findIndex((d) => d.dayKey === day.dayKey)}
                      groupCount={days.length}
                    />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 line-clamp-1 max-w-full px-0.5 text-center font-mono text-[7px] uppercase leading-tight tracking-tight text-slate-900 dark:text-slate-500 sm:text-[8px]",
                    fillHeight ? "mt-1" : "mt-1.5",
                  )}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!hasAny ? (
        <p className="mt-3 shrink-0 text-center font-mono text-[10px] text-slate-500">
          No device messages in this period, or messaging is unavailable.
        </p>
      ) : null}

      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-slate-200 font-mono text-[8px] font-semibold uppercase tracking-wider text-slate-500 dark:border-cyan-500/15 dark:text-slate-400 sm:gap-x-4 sm:text-[9px]",
          fillHeight ? "mt-1.5 border-t pt-1.5" : "mt-2 pt-2",
        )}
      >
        {SEGMENTS.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Floating readout anchored INSIDE the chart frame so it never escapes the card.
 * Horizontal placement flips toward the card center for edge groups (no clipping on first/last column).
 */
function HudMessageTrafficTooltip({
  row,
  total,
  indexInRow,
  groupCount,
}: {
  row: AdminMessageTrafficDayStack;
  total: number;
  indexInRow: number;
  groupCount: number;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  /** Push horizontally toward the center for the first/last group so the panel never clips the card edges. */
  const horizontalAlign =
    indexInRow <= 0
      ? "left-1 translate-x-0"
      : indexInRow >= groupCount - 1
        ? "right-1 left-auto translate-x-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute top-1 z-20 w-[10.5rem] rounded-lg px-2.5 py-2 sm:w-[11.5rem]",
        isLight
          ? "border border-slate-200 bg-white shadow-md"
          : "border border-cyan-500/40 bg-slate-950/95 shadow-[0_10px_28px_-12px_rgba(2,6,23,0.85)] backdrop-blur-sm",
        horizontalAlign,
      )}
    >
      <p
        className={
          isLight
            ? "mb-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-600"
            : "mb-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-cyan-200/85"
        }
      >
        {row.dayLabel}
      </p>
      <ul className="space-y-0.5 font-mono text-[10px] tabular-nums">
        {SEGMENTS.map((seg) => {
          const v = segmentValue(row, seg.key);
          return (
            <li key={seg.key} className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 truncate",
                  isLight ? "text-slate-600" : "text-slate-300",
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: seg.color,
                    boxShadow: isLight ? undefined : `0 0 6px ${seg.color}66`,
                  }}
                  aria-hidden
                />
                <span className="truncate">{seg.label}</span>
              </span>
              <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-50">{fmtFullCount(v)}</span>
            </li>
          );
        })}
      </ul>
      <div
        className={cn(
          "mt-1.5 flex items-center justify-between border-t pt-1.5 font-mono text-[9px] uppercase tracking-wider",
          isLight ? "border-slate-200 text-slate-500" : "border-cyan-500/20 text-slate-400",
        )}
      >
        <span>Total</span>
        <span className={cn("font-semibold tabular-nums", isLight ? "text-cyan-800" : "text-cyan-100")}>
          {fmtFullCount(total)}
        </span>
      </div>
    </div>
  );
}
