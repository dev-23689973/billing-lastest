"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPlotFrame } from "@/components/dashboard/ChartPlotFrame";
import { useTheme } from "@/contexts/ThemeContext";
import { useLivingCount, useLivingSmooth, useRechartsEntranceMotion } from "@/components/dashboard/useLivingCount";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { hudDashShell } from "@/components/dashboard/hud/hudDashboardLayout";
import type { AdminMessageTrafficDayStack } from "@/lib/repos/billing";
import { STALKER_MSG_DELIVERY_HEX } from "@/lib/ui/stalkerMessageDeliveryStatus";
import { cn } from "@/lib/cn";

const TICK_LIGHT = { fill: "hsl(215 16% 42%)", fontSize: 10, fontWeight: 500 as const };
const TICK_DARK = { fill: "hsl(215 16% 52%)", fontSize: 10, fontWeight: 500 as const };

/** All numeric fields come straight from `AdminMessageTrafficDayStack` (Stalker `events.send_msg`). */
type RelayRow = {
  id: string;
  x: string;
  confirmed: number;
  pending: number;
};

function pendingSum(d: AdminMessageTrafficDayStack): number {
  return d.highPending + d.normalPending + d.lowPending + d.otherPending;
}

function RelayTooltip({
  active,
  payload,
  isLight,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: RelayRow }>;
  isLight: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const confirmedColor = isLight ? "#047857" : undefined;
  const pendingColor = isLight ? "#b45309" : undefined;
  return (
    <div
      className={
        isLight
          ? "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          : "rounded-lg border border-slate-600/50 bg-slate-950/92 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      }
    >
      <p
        className={
          isLight
            ? "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            : "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400"
        }
      >
        {row.x}
      </p>
      <div className="space-y-1 font-mono tabular-nums">
        <div
          className={cn("flex justify-between gap-6", !isLight && "text-emerald-200")}
          style={confirmedColor ? { color: confirmedColor } : undefined}
        >
          <span>Confirmed</span>
          <span className={cn("font-semibold", isLight && "text-slate-900")}>{row.confirmed.toLocaleString()}</span>
        </div>
        <div
          className={cn("flex justify-between gap-6", !isLight && "text-amber-200")}
          style={pendingColor ? { color: pendingColor } : undefined}
        >
          <span>Pending</span>
          <span className={cn("font-semibold", isLight && "text-slate-900")}>{row.pending.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function HudCommunicationRelayPanel({
  days,
  className,
}: {
  days: AdminMessageTrafficDayStack[];
  className?: string;
}) {
  const { tips } = useDashboardIntel();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const tick = isLight ? TICK_LIGHT : TICK_DARK;
  const gridStroke = isLight ? "hsl(214 20% 88%)" : "hsl(217 19% 32%)";
  const gridOpacity = isLight ? 0.6 : 0.35;
  const axisStroke = isLight ? "hsl(214 20% 82%)" : "hsl(217 19% 30%)";
  const labelFill = isLight ? "hsl(215 16% 42%)" : "hsl(215 16% 48%)";
  const motion = useRechartsEntranceMotion(900);

  const { points, confirmed, pending, ratePct, peakConfirmed, peakPending } = useMemo(() => {
    const pts: RelayRow[] = days.map((d) => ({
      id: d.dayKey,
      x: d.dayLabel,
      confirmed: d.delivered,
      pending: pendingSum(d),
    }));
    let c = 0;
    let p = 0;
    let maxC = -1;
    let maxP = -1;
    let maxCAt: { x: string; v: number } | null = null;
    let maxPAt: { x: string; v: number } | null = null;
    for (const row of pts) {
      c += row.confirmed;
      p += row.pending;
      if (row.confirmed > maxC) {
        maxC = row.confirmed;
        maxCAt = { x: row.x, v: row.confirmed };
      }
      if (row.pending > maxP) {
        maxP = row.pending;
        maxPAt = { x: row.x, v: row.pending };
      }
    }
    const total = c + p;
    const rate = total > 0 ? (100 * c) / total : 0;
    return {
      points: pts,
      confirmed: c,
      pending: p,
      ratePct: rate,
      peakConfirmed: maxCAt && maxCAt.v > 0 ? maxCAt : null,
      peakPending: maxPAt && maxPAt.v > 0 ? maxPAt : null,
    };
  }, [days]);

  const livingConfirmed = useLivingCount(confirmed);
  const livingPending = useLivingCount(pending);
  const livingRate = useLivingSmooth(ratePct, 950);

  const yDomain = useMemo((): [number, number] => {
    if (!points.length) return [0, 5];
    let hi = 0;
    for (const q of points) hi = Math.max(hi, q.confirmed, q.pending);
    const pad = Math.max(hi * 0.12, 2);
    return [0, Math.ceil(hi + pad)];
  }, [points]);

  const denseX = points.length > 6;
  const hasTraffic = confirmed + pending > 0;

  return (
    <div className={cn(hudDashShell, "flex min-h-0 min-w-0 flex-col", className)}>
      <div className="relative z-[1] flex min-h-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-base font-bold uppercase tracking-[0.12em] text-slate-900 sm:text-lg dark:text-slate-50">
              Communication relay
            </h3>
            <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary dark:text-cyan-500/75">
              Device message throughput &amp; delivery success
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[9px] font-semibold uppercase tracking-wider sm:text-[10px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-200/95">
                <span
                  className="h-2 w-2 shrink-0 rounded-full dark:shadow-[0_0_8px_rgba(52,211,153,0.35)]"
                  style={{ backgroundColor: STALKER_MSG_DELIVERY_HEX.delivered }}
                  aria-hidden
                />
                Confirmed
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-200/95">
                <span
                  className="h-2 w-2 shrink-0 rounded-full dark:shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                  style={{ backgroundColor: STALKER_MSG_DELIVERY_HEX.pending }}
                  aria-hidden
                />
                Pending
              </span>
            </div>
            <IntelGuideBadge size="sm" className="shrink-0" tip={tips.communicationRelay} />
          </div>
        </div>

        <div className="min-h-0 w-full min-w-0">
          {!hasTraffic || points.length === 0 ? (
            <div className="flex h-[200px] min-h-[200px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm text-slate-500 dark:border-slate-700/40 dark:bg-slate-950/30 sm:h-[240px] sm:min-h-[240px]">
              No messaging traffic in this window.
            </div>
          ) : (
            <ChartPlotFrame plain className="h-[200px] min-h-[200px] w-full sm:h-[240px] sm:min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={32}>
                <LineChart data={points} margin={{ top: 28, right: 8, left: 2, bottom: denseX ? 36 : 22 }}>
                  <CartesianGrid strokeDasharray="3 5" stroke={gridStroke} strokeOpacity={gridOpacity} vertical horizontal />
                  <XAxis
                    dataKey="x"
                    tick={{ ...tick, fontSize: denseX ? 8 : 10 }}
                    tickLine={false}
                    axisLine={{ stroke: axisStroke, strokeOpacity: isLight ? 0.9 : 0.75 }}
                    tickMargin={6}
                    interval={0}
                    angle={denseX ? -28 : 0}
                    textAnchor={denseX ? "end" : "middle"}
                    height={denseX ? 48 : 28}
                  />
                  <YAxis
                    domain={yDomain}
                    width={44}
                    tick={tick}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    label={{
                      value: "Messages",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fill: labelFill, fontSize: 9, fontWeight: 600 },
                      offset: 8,
                    }}
                  />
                  <Tooltip
                    content={<RelayTooltip isLight={isLight} />}
                    cursor={{
                      stroke: isLight ? "hsl(192 91% 36%)" : "hsl(199 89% 48%)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  {peakConfirmed ? (
                    <ReferenceLine
                      x={peakConfirmed.x}
                      stroke={STALKER_MSG_DELIVERY_HEX.delivered}
                      strokeOpacity={0.85}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      label={{
                        value: peakConfirmed.v.toLocaleString(),
                        position: "top",
                        fill: STALKER_MSG_DELIVERY_HEX.delivered,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  ) : null}
                  {peakPending && peakPending.x !== peakConfirmed?.x ? (
                    <ReferenceLine
                      x={peakPending.x}
                      stroke={STALKER_MSG_DELIVERY_HEX.pending}
                      strokeOpacity={0.95}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      label={{
                        value: peakPending.v.toLocaleString(),
                        position: "bottom",
                        fill: STALKER_MSG_DELIVERY_HEX.pending,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="confirmed"
                    name="Confirmed"
                    stroke={STALKER_MSG_DELIVERY_HEX.delivered}
                    strokeWidth={2.25}
                    dot={{
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: isLight ? "#e2e8f0" : "#f8fafc",
                      fill: STALKER_MSG_DELIVERY_HEX.delivered,
                    }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: isLight ? "#94a3b8" : "#f8fafc" }}
                    {...motion}
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    name="Pending"
                    stroke={STALKER_MSG_DELIVERY_HEX.pending}
                    strokeWidth={2.25}
                    dot={{
                      r: 3.5,
                      strokeWidth: 2,
                      stroke: isLight ? "#e2e8f0" : "#f8fafc",
                      fill: STALKER_MSG_DELIVERY_HEX.pending,
                    }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: isLight ? "#94a3b8" : "#f8fafc" }}
                    {...motion}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPlotFrame>
          )}
        </div>

        {/* Delivery totals (all DB-sourced sums) */}
        <div className="border-t border-slate-200 pt-3 dark:border-cyan-500/20">
          <p className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-500/90 sm:text-[10px]">
            Delivery totals
          </p>
          <dl className="grid max-w-md grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-3 sm:text-xs sm:gap-4">
            <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:gap-1">
              <dt className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirmed</dt>
              <dd className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-200">
                {livingConfirmed.toLocaleString()}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:gap-1">
              <dt className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending</dt>
              <dd className="tabular-nums font-semibold text-amber-700 dark:text-amber-200">
                {livingPending.toLocaleString()}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:gap-1">
              <dt className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Delivery rate</dt>
              <dd className="tabular-nums font-semibold text-cyan-700 dark:text-cyan-200">
                {confirmed + pending > 0 ? `${livingRate.toFixed(1)}%` : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
