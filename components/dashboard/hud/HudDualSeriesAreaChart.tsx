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
import { cn } from "@/lib/cn";

const TICK_LIGHT = { fill: "hsl(215 16% 42%)", fontSize: 11, fontWeight: 500 as const };
const TICK_DARK = { fill: "hsl(215 16% 52%)", fontSize: 11, fontWeight: 500 as const };

export type HudDualSeriesPoint = { id: string; x: string; a: number; b: number };

type DualTooltipBodyProps = {
  label?: string | number;
  row: { a?: number; b?: number; x?: string };
  aName: string;
  bName: string;
  isLight: boolean;
};

function DualTooltipBody({ label, row, aName, bName, isLight }: DualTooltipBodyProps) {
  return (
    <div
      className={
        isLight
          ? "w-[10.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          : "w-[10.5rem] rounded-lg border border-slate-600/50 bg-slate-950/90 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      }
    >
      <p
        className={
          isLight
            ? "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            : "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400"
        }
      >
        {label != null ? String(label) : row.x ?? ""}
      </p>
      <div className="space-y-1 font-mono tabular-nums">
        <div className={isLight ? "flex justify-between gap-6 text-cyan-700" : "flex justify-between gap-6 text-cyan-200"}>
          <span>{aName}</span>
          <span className="font-semibold">{Number(row.a ?? 0)}</span>
        </div>
        <div className={isLight ? "flex justify-between gap-6 text-fuchsia-800" : "flex justify-between gap-6 text-fuchsia-200"}>
          <span>{bName}</span>
          <span className="font-semibold">{Number(row.b ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

/** Clamp hover popup so it stays on-screen and does not cover the active point. */
function HudDualSeriesTooltip({
  active,
  payload,
  label,
  coordinate,
  viewBox,
  aName,
  bName,
  isLight,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { a?: number; b?: number; x?: string } }>;
  label?: string | number;
  coordinate?: { x?: number; y?: number };
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  aName: string;
  bName: string;
  isLight: boolean;
}) {
  if (!active || !payload?.length || !coordinate?.x || !coordinate?.y || !viewBox?.width || !viewBox?.height) {
    return null;
  }
  const row = payload[0]?.payload as { a?: number; b?: number; x?: string } | undefined;
  if (!row) return null;

  const boxW = 168;
  const boxH = 76;
  const pad = 6;
  const vbW = viewBox.width ?? 0;
  const vbH = viewBox.height ?? 0;

  let shiftX = -boxW / 2;
  let shiftY = -boxH - 16;

  if (coordinate.x > vbW * 0.68) shiftX = -boxW + 10;
  if (coordinate.x < vbW * 0.32) shiftX = 10;
  if (coordinate.y < boxH + 28) shiftY = 14;
  if (coordinate.y > vbH - boxH - 20) shiftY = -boxH - 20;

  const maxShiftX = vbW - pad - boxW - coordinate.x;
  const minShiftX = pad - coordinate.x;
  shiftX = Math.min(maxShiftX, Math.max(minShiftX, shiftX));

  const maxShiftY = vbH - pad - boxH - coordinate.y;
  const minShiftY = pad - coordinate.y;
  shiftY = Math.min(maxShiftY, Math.max(minShiftY, shiftY));

  return (
    <div
      className="pointer-events-none"
      style={{ transform: `translate(${Math.round(shiftX)}px, ${Math.round(shiftY)}px)` }}
    >
      <DualTooltipBody label={label} row={row} aName={aName} bName={bName} isLight={isLight} />
    </div>
  );
}

function calloutAlign(index: number | undefined, total: number): "start" | "center" | "end" {
  if (index == null || total < 2) return "center";
  if (index === 0) return "start";
  if (index >= total - 1) return "end";
  if (index === total - 2 && total > 10) return "end";
  return "center";
}

export function HudDualSeriesAreaChart({
  points,
  seriesA,
  seriesB,
  yLabel,
  xLabel,
  heightClass = "h-[300px] min-h-[300px]",
  emptyLabel = "No data in this range.",
  chartKey,
}: {
  points: HudDualSeriesPoint[];
  seriesA: { name: string; stroke: string; fillHi: string; fillLo: string };
  seriesB: { name: string; stroke: string; fillHi: string; fillLo: string };
  yLabel: string;
  xLabel: string;
  heightClass?: string;
  emptyLabel?: string;
  /** Remount Recharts when the HUD period changes so axes/data refresh reliably. */
  chartKey?: string;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const uid = useId().replace(/:/g, "");
  const gradA = `${uid}-fill-a`;
  const gradB = `${uid}-fill-b`;

  const motion = useRechartsEntranceMotion(1100);

  const tick = isLight ? TICK_LIGHT : TICK_DARK;
  const gridStroke = isLight ? "hsl(214 20% 88%)" : "hsl(217 19% 32%)";
  const gridOpacity = isLight ? 0.65 : 0.38;
  const axisStroke = isLight ? "hsl(214 20% 82%)" : "hsl(217 19% 30%)";
  const labelFill = isLight ? "hsl(215 16% 42%)" : "hsl(215 16% 48%)";
  const fillTopA = isLight ? 0.2 : 0.42;
  const fillMidA = isLight ? 0.06 : 0.12;
  const fillTopB = isLight ? 0.18 : 0.38;
  const fillMidB = isLight ? 0.05 : 0.1;
  const dotStroke = isLight ? "#ffffff" : "#f8fafc";

  const maxV = useMemo(() => {
    let m = 1;
    for (const p of points) m = Math.max(m, p.a, p.b);
    return m;
  }, [points]);

  const yMax = Math.max(5, Math.ceil((maxV * 1.12) / 5) * 5);

  const refX = points.length ? points[points.length - 1].x : undefined;
  /** Skip labels when overcrowded (e.g. long daily windows). */
  const showCallouts = points.length > 0 && points.length <= 35;

  /** Many daily points: monotone avoids overshoot; hide dots (use tooltip); thin X ticks. */
  const denseDaily = points.length > 42;
  const curveType = denseDaily ? "monotone" : "natural";
  const xAxisInterval = useMemo(() => {
    const n = points.length;
    if (n <= 16) return "preserveStartEnd" as const;
    return Math.max(1, Math.floor(n / 10));
  }, [points.length]);
  const tickProps = useMemo(
    () =>
      denseDaily
        ? { ...tick, fontSize: 10, angle: -32, textAnchor: "end" as const }
        : tick,
    [denseDaily, tick],
  );
  const pointCount = points.length;

  const chartMargin = useMemo(
    () => ({
      top: showCallouts ? 22 : 10,
      right: showCallouts ? 10 : 6,
      left: 2,
      bottom: showCallouts ? (denseDaily ? 34 : 26) : denseDaily ? 32 : 18,
    }),
    [denseDaily, showCallouts],
  );

  const labelA = useMemo(() => {
    const LabelA = (props: {
      x?: number | string;
      y?: number | string;
      value?: unknown;
      index?: number;
    }) => {
      const { x, y, value, index } = props;
      const nx = typeof x === "number" ? x : Number(x);
      const ny = typeof y === "number" ? y : Number(y);
      if (!showCallouts || x == null || y == null || Number.isNaN(nx) || Number.isNaN(ny) || value === undefined || value === null) {
        return <g />;
      }
      return (
        <HudChartPointCallout
          x={nx}
          y={ny}
          value={value as number | string}
          accent={seriesA.stroke}
          mode="above"
          align={calloutAlign(index, pointCount)}
        />
      );
    };
    return LabelA;
  }, [seriesA.stroke, showCallouts, pointCount]);

  const labelB = useMemo(() => {
    const LabelB = (props: {
      x?: number | string;
      y?: number | string;
      value?: unknown;
      index?: number;
    }) => {
      const { x, y, value, index } = props;
      const nx = typeof x === "number" ? x : Number(x);
      const ny = typeof y === "number" ? y : Number(y);
      if (!showCallouts || x == null || y == null || Number.isNaN(nx) || Number.isNaN(ny) || value === undefined || value === null) {
        return <g />;
      }
      return (
        <HudChartPointCallout
          x={nx}
          y={ny}
          value={value as number | string}
          accent={seriesB.stroke}
          mode="below"
          align={calloutAlign(index, pointCount)}
        />
      );
    };
    return LabelB;
  }, [seriesB.stroke, showCallouts, pointCount]);

  if (!points.length) {
    return (
      <ChartPlotFrame plain className={cn("flex w-full items-center justify-center font-mono text-sm text-slate-500", heightClass)}>
        {emptyLabel}
      </ChartPlotFrame>
    );
  }

  return (
    <ChartPlotFrame plain className={cn("w-full", heightClass)}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={240}
        debounce={32}
        initialDimension={{ width: 720, height: 320 }}
      >
        <ComposedChart key={chartKey ?? "hud-dual"} data={points} margin={chartMargin}>
          <defs>
            <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesA.fillHi} stopOpacity={fillTopA} />
              <stop offset="55%" stopColor={seriesA.fillLo} stopOpacity={fillMidA} />
              <stop offset="100%" stopColor={seriesA.fillLo} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesB.fillHi} stopOpacity={fillTopB} />
              <stop offset="55%" stopColor={seriesB.fillLo} stopOpacity={fillMidB} />
              <stop offset="100%" stopColor={seriesB.fillLo} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 5" stroke={gridStroke} strokeOpacity={gridOpacity} vertical horizontal />

          <XAxis
            dataKey="x"
            tick={tickProps}
            tickLine={false}
            axisLine={{ stroke: axisStroke, strokeOpacity: isLight ? 0.9 : 0.75 }}
            tickMargin={denseDaily ? 2 : 4}
            interval={xAxisInterval}
            height={denseDaily ? 44 : 28}
            padding={{ left: 0, right: 0 }}
            label={
              xLabel
                ? {
                    value: xLabel,
                    position: "insideBottom",
                    offset: -2,
                    fill: labelFill,
                    fontSize: 9,
                    fontWeight: 600,
                  }
                : undefined
            }
          />
          <YAxis
            domain={[0, yMax]}
            width={36}
            tick={tick}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickMargin={4}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: 6,
              style: { textAnchor: "middle", fill: labelFill, fontSize: 9, fontWeight: 600 },
            }}
          />

          <Tooltip
            allowEscapeViewBox={{ x: true, y: true }}
            offset={0}
            wrapperStyle={{ zIndex: 30, outline: "none" }}
            content={
              <HudDualSeriesTooltip
                aName={seriesA.name}
                bName={seriesB.name}
                isLight={isLight}
              />
            }
            cursor={{
              stroke: isLight ? "hsl(192 91% 36%)" : "hsl(199 89% 48%)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
              fill: isLight ? "rgba(8,145,178,0.06)" : "rgba(15,23,42,0.12)",
            }}
          />

          <Area
            type={curveType}
            dataKey="b"
            name={seriesB.name}
            stroke={seriesB.stroke}
            strokeWidth={isLight ? 2 : 2.25}
            fill={`url(#${gradB})`}
            fillOpacity={1}
            dot={
              denseDaily
                ? false
                : { r: 3.5, strokeWidth: 2, stroke: dotStroke, fill: seriesB.stroke }
            }
            activeDot={{ r: 5, strokeWidth: 2, stroke: dotStroke }}
            {...motion}
          >
            {showCallouts ? <LabelList dataKey="b" content={labelB} /> : null}
          </Area>
          <Area
            type={curveType}
            dataKey="a"
            name={seriesA.name}
            stroke={seriesA.stroke}
            strokeWidth={isLight ? 2 : 2.25}
            fill={`url(#${gradA})`}
            fillOpacity={1}
            dot={
              denseDaily
                ? false
                : { r: 3.5, strokeWidth: 2, stroke: dotStroke, fill: seriesA.stroke }
            }
            activeDot={{ r: 5, strokeWidth: 2, stroke: dotStroke }}
            {...motion}
          >
            {showCallouts ? <LabelList dataKey="a" content={labelA} /> : null}
          </Area>

          {refX ? (
            <ReferenceLine
              x={refX}
              stroke="hsl(199 89% 48%)"
              strokeDasharray="5 5"
              strokeOpacity={isLight ? 0.28 : 0.45}
              strokeWidth={1}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartPlotFrame>
  );
}
