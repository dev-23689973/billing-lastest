"use client";

import { useId, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRechartsEntranceMotion } from "@/components/dashboard/useLivingCount";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPlotFrame } from "@/components/dashboard/ChartPlotFrame";
import { HudChartPointCallout } from "@/components/dashboard/hud/HudChartPointCallout";
import type { DashboardDayCreditPoint } from "@/lib/dashboard/types";
import { cn } from "@/lib/cn";

const TICK_LIGHT = { fill: "hsl(215 16% 42%)", fontSize: 11, fontWeight: 500 as const };
const TICK_DARK = { fill: "hsl(215 16% 52%)", fontSize: 11, fontWeight: 500 as const };

const PALETTE = {
  dark: {
    inflow: "#22d3ee",
    inflowDeep: "#0e7490",
    outflow: "#f472b6",
    outflowDeep: "#be185d",
  },
  light: {
    inflow: "#0891b2",
    inflowDeep: "#06b6d4",
    outflow: "#db2777",
    outflowDeep: "#be185d",
  },
} as const;

/**
 * Reference-style marker: bright white outer ring + saturated core (not squares).
 */
function HudRingDot({
  cx,
  cy,
  fill,
  active,
  isLight,
}: {
  cx?: number;
  cy?: number;
  fill: string;
  active?: boolean;
  isLight: boolean;
}) {
  if (cx == null || cy == null) return null;
  const r = active ? (isLight ? 4.5 : 5) : isLight ? 3.25 : 3.75;
  const halo = isLight ? "#ffffff" : "#f8fafc";
  const stroke = isLight ? "#94a3b8" : "#0f172a";
  return (
    <g className={active && !isLight ? "motion-safe:animate-living-credit-ring-dot" : undefined}>
      <circle cx={cx} cy={cy} r={r + (isLight ? 1.25 : 1.75)} fill={halo} opacity={0.98} />
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isLight ? 1 : 1.15} />
    </g>
  );
}

function FlowTooltip({
  active,
  payload,
  inflowColor,
  outflowColor,
  isLight,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { creditIn?: number; creditOut?: number; tick?: string } }>;
  inflowColor: string;
  outflowColor: string;
  isLight: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { creditIn?: number; creditOut?: number; tick?: string } | undefined;
  if (!row) return null;
  const cin = Number(row.creditIn ?? 0);
  const cout = Number(row.creditOut ?? 0);
  return (
    <div
      className={
        isLight
          ? "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          : "rounded-lg border border-slate-600/50 bg-slate-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      }
    >
      <p
        className={
          isLight
            ? "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            : "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400"
        }
      >
        {row.tick ?? ""}
      </p>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex justify-between gap-6" style={{ color: inflowColor }}>
          <span>Credit inflow</span>
          <span className={isLight ? "font-semibold text-slate-900" : "font-semibold text-slate-50"}>
            +{cin.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-6" style={{ color: outflowColor }}>
          <span>Reversals</span>
          <span className={isLight ? "font-semibold text-slate-900" : "font-semibold text-slate-50"}>
            −{cout.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HudCreditFlowMirroredChart({
  rows,
  heightClass = "h-[340px] min-h-[340px] sm:h-[400px] sm:min-h-[400px]",
  chartKey,
  compactMargins = false,
}: {
  rows: DashboardDayCreditPoint[];
  heightClass?: string;
  chartKey?: string;
  /** Tighter Recharts margin for dashboard credit-flow panel (more plot area, same outer height). */
  compactMargins?: boolean;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const colors = isLight ? PALETTE.light : PALETTE.dark;

  const uid = useId().replace(/:/g, "");
  const gradIn = `${uid}-cf-in`;
  const gradOut = `${uid}-cf-out`;

  const motion = useRechartsEntranceMotion(900);

  const tick = isLight ? TICK_LIGHT : TICK_DARK;
  const gridStroke = isLight ? "hsl(214 20% 88%)" : "hsl(217 19% 32%)";
  const gridOpacity = isLight ? 0.6 : 0.35;
  const axisStroke = isLight ? "hsl(214 20% 82%)" : "hsl(217 19% 30%)";
  const labelFill = isLight ? "hsl(215 16% 42%)" : "hsl(215 16% 48%)";
  const fillInTop = isLight ? 0.22 : 0.48;
  const fillInBot = isLight ? 0.03 : 0.04;
  const fillOutTop = isLight ? 0.2 : 0.42;
  const fillOutBot = isLight ? 0.04 : 0.06;
  const strokeW = isLight ? 2 : 2.35;

  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        tick: row.label,
        outNeg: -row.creditOut,
      })),
    [rows],
  );

  const { domain, maxAbsScale } = useMemo(() => {
    let maxIn = 1;
    let maxOut = 1;
    for (const d of chartData) {
      maxIn = Math.max(maxIn, d.creditIn);
      maxOut = Math.max(maxOut, Math.abs(d.outNeg));
    }
    const peak = Math.max(maxIn, maxOut, 1);
    let lim = peak * 1.15 + (peak < 10 ? 2 : 0);
    if (lim >= 5000) lim = Math.ceil(lim / 1000) * 1000;
    else if (lim >= 500) lim = Math.ceil(lim / 100) * 100;
    else if (lim >= 50) lim = Math.ceil(lim / 10) * 10;
    else lim = Math.ceil(lim);
    return {
      domain: [-lim, lim] as [number, number],
      maxAbsScale: Math.max(lim, 1),
    };
  }, [chartData]);

  /** Angled X ticks when many buckets — separate from dot/label visibility. */
  const denseTicks = chartData.length > 42;

  /**
   * 1y credit flow is ~53 weekly buckets — older logic hid dots (>42) and all callouts (>35),
   * so the chart looked “empty”. Hide dots only for extreme daily density; subsample labels when busy.
   */
  const hideVertexDots = chartData.length > 120;

  /** Label only a handful of buckets — tooltip shows exact values on hover. */
  const pointLabelStep = useMemo(() => {
    const n = chartData.length;
    if (n <= 8) return 1;
    return Math.max(1, Math.ceil(n / 8));
  }, [chartData.length]);

  /**
   * Straight segments between buckets → sharp “bracket” / V peaks (not step plateaus, not splines).
   * Recharts `linear` connects points with line segments only.
   */
  const bracketCurveType = "linear" as const;
  const xInterval = useMemo(() => {
    const n = chartData.length;
    if (n <= 14) return "preserveStartEnd" as const;
    return Math.max(1, Math.floor(n / 10));
  }, [chartData.length]);

  const labelIn = useMemo(() => {
    const LabelIn = (props: { x?: number | string; y?: number | string; value?: unknown; index?: number }) => {
      const { x, y, value, index } = props;
      const ix = index ?? 0;
      if (ix % pointLabelStep !== 0) return <g />;
      const nx = typeof x === "number" ? x : Number(x);
      const ny = typeof y === "number" ? y : Number(y);
      if (x == null || y == null || Number.isNaN(nx) || Number.isNaN(ny) || value === undefined || value === null) {
        return <g />;
      }
      const v = Math.round(Number(value));
      const text = `+${v.toLocaleString()}`;
      return <HudChartPointCallout x={nx} y={ny} value={text} accent={colors.inflow} mode="above" />;
    };
    return LabelIn;
  }, [pointLabelStep, colors.inflow]);

  const labelOut = useMemo(() => {
    const LabelOut = (props: { x?: number | string; y?: number | string; value?: unknown; index?: number }) => {
      const { x, y, value, index } = props;
      const ix = index ?? 0;
      if (ix % pointLabelStep !== 0) return <g />;
      const nx = typeof x === "number" ? x : Number(x);
      const ny = typeof y === "number" ? y : Number(y);
      if (x == null || y == null || Number.isNaN(nx) || Number.isNaN(ny) || value === undefined || value === null) {
        return <g />;
      }
      const v = Math.round(Math.abs(Number(value)));
      const text = `−${v.toLocaleString()}`;
      return <HudChartPointCallout x={nx} y={ny} value={text} accent={colors.outflow} mode="below" />;
    };
    return LabelOut;
  }, [pointLabelStep, colors.outflow]);

  const refTick = chartData.length ? chartData[chartData.length - 1]?.tick : undefined;

  const tickProps = useMemo(
    () =>
      denseTicks
        ? { ...tick, fontSize: 10, angle: -30, textAnchor: "end" as const }
        : tick,
    [denseTicks, tick],
  );

  const chartMargin = useMemo(() => {
    if (compactMargins) {
      return {
        top: chartData.length ? 26 : 8,
        right: 8,
        left: 2,
        bottom: denseTicks ? 32 : pointLabelStep > 1 ? 26 : 22,
      };
    }
    return {
      top: chartData.length ? 40 : 14,
      right: 14,
      left: 4,
      bottom: denseTicks ? 44 : pointLabelStep > 1 ? 34 : 28,
    };
  }, [chartData.length, denseTicks, pointLabelStep, compactMargins]);

  if (!chartData.length) {
    return (
      <ChartPlotFrame plain className={`flex w-full items-center justify-center font-mono text-sm text-slate-500 ${heightClass}`}>
        No credit flow in this range.
      </ChartPlotFrame>
    );
  }

  return (
    <ChartPlotFrame
      plain
      className={cn("w-full dark:motion-safe:animate-living-credit-chart-frame", heightClass)}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} debounce={32} initialDimension={{ width: 720, height: 260 }}>
        <ComposedChart key={chartKey ?? "credit-flow"} data={chartData} margin={chartMargin}>
          <defs>
            <linearGradient id={gradIn} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.inflow} stopOpacity={fillInTop} />
              <stop offset="100%" stopColor={colors.inflowDeep} stopOpacity={fillInBot} />
            </linearGradient>
            <linearGradient id={gradOut} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={colors.outflow} stopOpacity={fillOutTop} />
              <stop offset="100%" stopColor={colors.outflowDeep} stopOpacity={fillOutBot} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 5" stroke={gridStroke} strokeOpacity={gridOpacity} vertical horizontal />

          <XAxis
            dataKey="tick"
            tick={tickProps}
            tickLine={false}
            axisLine={{ stroke: axisStroke, strokeOpacity: isLight ? 0.9 : 0.75 }}
            tickMargin={denseTicks ? 4 : compactMargins ? 6 : 8}
            interval={xInterval}
            label={{
              value: "Activity period",
              position: "bottom",
              offset: compactMargins ? 8 : 12,
              fill: labelFill,
              fontSize: compactMargins ? 9 : 10,
              fontWeight: 600,
            }}
          />
          <YAxis
            domain={domain}
            width={compactMargins ? 46 : 52}
            tick={tick}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v) => {
              const n = Math.round(Number(v));
              if (maxAbsScale < 5000) return n.toLocaleString();
              return `${Math.round(n / 1000)}k`;
            }}
            label={{
              value: "Credit volume (units)",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fill: labelFill, fontSize: 10, fontWeight: 600 },
            }}
          />

          <ReferenceLine
            y={0}
            stroke={isLight ? "hsl(214 20% 78%)" : "hsl(217 19% 42%)"}
            strokeDasharray="5 5"
            strokeOpacity={isLight ? 0.95 : 0.85}
          />

          {refTick ? (
            <ReferenceLine
              x={refTick}
              stroke={isLight ? "hsl(192 91% 36%)" : "hsl(199 89% 48%)"}
              strokeDasharray="5 5"
              strokeOpacity={isLight ? 0.28 : 0.45}
              strokeWidth={1}
            />
          ) : null}

          <Tooltip
            content={
              <FlowTooltip inflowColor={colors.inflow} outflowColor={colors.outflow} isLight={isLight} />
            }
            cursor={{
              stroke: colors.inflow,
              strokeWidth: 1,
              strokeDasharray: "4 4",
              fill: isLight ? "rgba(8,145,178,0.06)" : "rgba(15,23,42,0.15)",
            }}
          />

          <Area
            type={bracketCurveType}
            dataKey="creditIn"
            name="Credit inflow"
            stroke={colors.inflow}
            strokeWidth={strokeW}
            strokeLinejoin="miter"
            fill={`url(#${gradIn})`}
            isAnimationActive={motion.isAnimationActive}
            animationDuration={motion.animationDuration}
            animationEasing={motion.animationEasing}
            activeDot={(dotProps: { cx?: number; cy?: number }) => (
              <HudRingDot cx={dotProps.cx} cy={dotProps.cy} fill={colors.inflow} active isLight={isLight} />
            )}
            dot={
              hideVertexDots
                ? false
                : (dotProps: { cx?: number; cy?: number }) => (
                    <HudRingDot cx={dotProps.cx} cy={dotProps.cy} fill={colors.inflow} isLight={isLight} />
                  )
            }
          >
            <LabelList dataKey="creditIn" content={labelIn} />
          </Area>
          <Area
            type={bracketCurveType}
            dataKey="outNeg"
            name="Reversals"
            stroke={colors.outflow}
            strokeWidth={strokeW}
            strokeLinejoin="miter"
            fill={`url(#${gradOut})`}
            isAnimationActive={motion.isAnimationActive}
            animationDuration={motion.animationDuration}
            animationEasing={motion.animationEasing}
            activeDot={(dotProps: { cx?: number; cy?: number }) => (
              <HudRingDot cx={dotProps.cx} cy={dotProps.cy} fill={colors.outflow} active isLight={isLight} />
            )}
            dot={
              hideVertexDots
                ? false
                : (dotProps: { cx?: number; cy?: number }) => (
                    <HudRingDot cx={dotProps.cx} cy={dotProps.cy} fill={colors.outflow} isLight={isLight} />
                  )
            }
          >
            <LabelList dataKey="outNeg" content={labelOut} />
          </Area>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartPlotFrame>
  );
}
