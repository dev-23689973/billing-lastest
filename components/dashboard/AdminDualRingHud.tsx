"use client";

import { useEffect, useId, useState } from "react";

import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { useLivingCount, useLivingSmooth } from "@/components/dashboard/useLivingCount";
import { hudDashShell } from "@/components/dashboard/hud/hudDashboardLayout";
import { cn } from "@/lib/cn";
import { rsTextKicker } from "@/lib/ui/responsiveScale";

export type DualRingMetric = {
  key: string;
  label: string;
  value: number;
  /** 0–100 sweep for the ring */
  pct: number;
  /** Stroke / legend accent (hex) */
  color: string;
  /** Pre-formatted legend value (RSC-safe; use instead of passing a function from a Server Component) */
  legendDisplay?: string;
};

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

function fmtPct1(n: number) {
  const v = clampPct(n);
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

/** Side rings — must stay inside each 1fr grid column (avoid 58vw × 2 overflowing on mobile). */
const branchRingFootprintClass =
  "min-w-0 w-full max-w-full sm:max-w-[min(100%,304px)] min-[1280px]:max-w-[min(100%,328px)] min-[1666px]:max-w-[min(100%,340px)]";

/** Center hub — match {@link QuadStatusGauges} “Users by status” readout footprint. */
const branchPulseHubClass =
  "animate-living-quad-hub-breathe relative flex aspect-square min-h-[5.25rem] min-w-[5.25rem] flex-col items-center justify-center rounded-full px-3 py-2.5 text-center sm:min-h-[6rem] sm:min-w-[6rem] sm:px-5 sm:py-3";

const branchPulseHubShellClass =
  "border border-slate-200/90 bg-white/90 shadow-sm dark:border-cyan-400/30 dark:bg-slate-950/40 dark:shadow-[0_0_28px_-4px_rgb(34_211_238/0.28)]";

function TripleRingCluster({
  metrics,
  centerPct,
  centerValue,
  intelGuide,
}: {
  metrics: DualRingMetric[];
  centerPct: number;
  centerValue: number;
  intelGuide?: boolean;
}) {
  const { tips } = useDashboardIntel();
  const uid = useId().replace(/:/g, "");
  const cx = 100;
  const cy = 100;
  /** Wider inner bore so center % / totals stay inside the innermost track (was 40/56/72). */
  const radii = [50, 61, 76];
  const stroke = 9;
  /** Extra viewBox margin so stroke, round caps, and feGaussianBlur are not clipped. */
  const vbPad = 32;
  const vbSize = 200 + vbPad * 2;
  const [ringsReady, setRingsReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const livingPct = useLivingSmooth(clampPct(centerPct));
  const livingCenter = useLivingCount(Math.max(0, Math.round(centerValue)));

  useEffect(() => {
    const t = requestAnimationFrame(() => setRingsReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col items-center overflow-hidden">
      <div
        className={cn(
          "@container/ring relative mx-auto aspect-square w-full overflow-visible",
          branchRingFootprintClass,
        )}
      >
        <svg
          viewBox={`${-vbPad} ${-vbPad} ${vbSize} ${vbSize}`}
          className="relative z-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            {metrics.map((m) => (
              <filter key={m.key} id={`${uid}-glow-${m.key}`} x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feColorMatrix
                  in="b"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0"
                  result="g"
                />
                <feMerge>
                  <feMergeNode in="g" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {metrics.map((m, i) => {
            const r = radii[i] ?? radii[radii.length - 1];
            const c = 2 * Math.PI * r;
            const p = ringsReady ? clampPct(m.pct) / 100 : 0;
            const dash = c * p;
            const gap = Math.max(0.001, c - dash);
            /** Orbiting “beacon” on each track; alternate direction per ring. */
            const orbitDeg = i % 2 === 0 ? 360 : -360;
            const orbitSec = 14 + i * 5;
            const dotR = Math.min(3.85, stroke * 0.42);
            return (
              <g key={m.key}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(148,163,184,0.12)"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  filter={`url(#${uid}-glow-${m.key})`}
                  className={cn(
                    "motion-safe:transition-[stroke-dasharray] motion-safe:duration-[1100ms] motion-safe:ease-out motion-safe:animate-living-dual-ring-arc",
                  )}
                  style={{ transitionDelay: ringsReady ? `${i * 90}ms` : "0ms" }}
                />
                <g>
                  {!reduceMotion ? (
                    <animateTransform
                      attributeName="transform"
                      attributeType="XML"
                      type="rotate"
                      from={`0 ${cx} ${cy}`}
                      to={`${orbitDeg} ${cx} ${cy}`}
                      dur={`${orbitSec}s`}
                      repeatCount="indefinite"
                      calcMode="linear"
                    />
                  ) : null}
                  <circle
                    cx={cx}
                    cy={cy - r}
                    r={dotR}
                    fill={m.color}
                    fillOpacity={0.92}
                    filter={`url(#${uid}-glow-${m.key})`}
                    className="motion-safe:animate-living-dual-ring-arc"
                  />
                </g>
              </g>
            );
          })}
        </svg>

        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
          aria-hidden
        >
          <div className="relative aspect-square w-[min(100%,40cqw)] max-w-[168px]">
            <div className="animate-living-dual-ring-halo-spin absolute inset-0 rounded-full border border-dashed border-primary/15 dark:border-cyan-400/18" />
            <div className="animate-living-dual-ring-halo-breathe absolute inset-[10%] rounded-full border border-primary/12 dark:border-cyan-300/14" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[2] flex min-h-0 min-w-0 flex-col items-center justify-center px-5 pb-1 text-center sm:px-6">
          {/*
            Inner bore ≈ 2×(r₀ − stroke/2) in SVG units; as % of ring box ≈ 37cqw.
            Keep readout + clamp max below that so “100.0%” never collides with tracks.
          */}
          <div className="animate-living-dual-ring-readout-float flex w-full min-w-0 flex-col items-center">
            <div
              className="animate-living-quad-hub-readout w-full max-w-[min(100%,72cqw)] whitespace-nowrap text-center font-sans font-semibold tabular-nums tracking-tighter text-slate-800 leading-none dark:text-slate-50"
              style={{ fontSize: "max(0.9375rem, min(1.625rem, 9cqw))" }}
            >
              {fmtPct1(livingPct)}
            </div>
            <div
              className="animate-living-quad-hub-readout mt-0.5 w-full max-w-[min(100%,78cqw)] whitespace-nowrap text-center font-sans font-semibold tabular-nums tracking-tight text-slate-700 dark:text-slate-200/90 leading-none"
              style={{ animationDelay: "120ms", fontSize: "max(0.8125rem, min(1.25rem, 6.25cqw))" }}
            >
              {fmtInt(livingCenter)}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-1.5 w-full max-w-full space-y-1 text-[8px] font-semibold uppercase leading-none tracking-wide sm:mt-2 sm:space-y-1 sm:text-[10px] md:text-[11px]",
          branchRingFootprintClass,
        )}
      >
        {metrics.map((m) => (
          <div
            key={m.key}
            className="flex min-w-0 items-baseline justify-between gap-x-1.5 gap-y-0 text-slate-600 dark:text-slate-300/90 sm:gap-x-2"
          >
            <span className="flex min-w-0 items-baseline gap-1 sm:gap-1.5">
              <span
                className="relative top-[0.18em] h-1 w-1 shrink-0 rounded-full shadow-[0_0_4px_currentColor] sm:h-1.5 sm:w-1.5 md:top-[0.16em] md:h-[7px] md:w-[7px] dark:shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: m.color, color: m.color }}
              />
              <span className="min-w-0 truncate tracking-[0.04em] sm:tracking-[0.1em] md:tracking-[0.12em]">
                {m.label}
              </span>
            </span>
            <span className="flex shrink-0 items-baseline justify-end gap-1 tabular-nums text-[7px] text-slate-700 sm:text-[8px] md:gap-1.5 md:text-[11px] dark:text-slate-200/90">
              <span className="whitespace-nowrap">{fmtPct1(m.pct)}</span>
              <span className="text-slate-500/90" aria-hidden>
                ·
              </span>
              <span className="whitespace-nowrap" style={{ color: m.color }}>
                {m.legendDisplay ?? fmtInt(m.value)}
              </span>
            </span>
          </div>
        ))}
        {intelGuide ? (
          <div className="mt-2 flex w-full justify-center">
            <IntelGuideBadge className="max-w-full" tip={tips.branchPulse} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminDualRingHud({
  leftMetrics,
  rightMetrics,
  centerUnits,
  rightCenterValue,
  className,
}: {
  leftMetrics: DualRingMetric[];
  rightMetrics: DualRingMetric[];
  /** Middle pill: branch operator total (managers + resellers + dealers) */
  centerUnits: number;
  /** Large number under % on the right gauge (e.g. sum of the three headline values) */
  rightCenterValue: number;
  className?: string;
}) {
  const { tips } = useDashboardIntel();
  const avg = (arr: DualRingMetric[]) => (arr.length ? arr.reduce((s, m) => s + clampPct(m.pct), 0) / arr.length : 0);
  const staffLeftMetrics = leftMetrics.filter((m) => m.key !== "usr");
  const leftCenterPct = avg(staffLeftMetrics.length > 0 ? staffLeftMetrics : leftMetrics);
  const rightCenterPct = avg(rightMetrics);
  const branchTotal = (staffLeftMetrics.length > 0 ? staffLeftMetrics : leftMetrics).reduce(
    (s, m) => s + m.value,
    0,
  );
  const displayUnits = useLivingCount(Math.max(0, Math.round(centerUnits)));

  return (
    <section
      className={cn(
        hudDashShell,
        "relative flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-visible px-2 py-2 sm:px-4 sm:py-3",
        className,
      )}
      aria-label="Branch units and subscriber pulse"
    >
      <div className="pointer-events-none absolute left-5 top-2 z-[6] hidden sm:block">
        <div className={cn(rsTextKicker, "text-slate-500 dark:text-slate-200/45")}>BRANCH PULSE</div>
      </div>
      <div className="pointer-events-none absolute right-2 top-2 z-[6] w-max sm:right-3 sm:top-3">
        <IntelGuideBadge size="sm" tip={tips.branchPulse} />
      </div>
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-x-hidden px-0 py-3 sm:px-2 sm:py-4">
        <div className="mx-auto grid w-full min-w-0 max-w-[54rem] grid-cols-[minmax(0,1fr)_minmax(5.25rem,auto)_minmax(0,1fr)] items-end gap-x-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,auto)_minmax(0,1fr)] sm:gap-x-6 md:gap-x-8 min-[1666px]:gap-x-10">
          <div className="min-w-0 overflow-hidden">
            <TripleRingCluster metrics={leftMetrics} centerPct={leftCenterPct} centerValue={branchTotal} />
          </div>

          {/* Center hub — same scale as QuadStatusGauges; shifted up 20px to sit in the ring band */}
          <div className="flex w-full min-w-0 flex-col items-center justify-end self-center px-0 sm:px-2">
            <div className="-translate-y-5 sm:-translate-y-[30px]">
              <div className={cn(branchPulseHubClass, branchPulseHubShellClass)}>
                <div className="animate-session-label-shine text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-100/70 sm:text-[10px] sm:tracking-[0.16em]">
                  Total
                </div>
                <div className="animate-living-quad-hub-readout mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {fmtInt(displayUnits)}
                </div>
                <div className="animate-session-label-shine mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-200/85 sm:text-[10px] sm:tracking-[0.12em]">
                  Units
                </div>
              </div>
            </div>
            <div className="pointer-events-none invisible mt-1.5 w-full min-w-[5.25rem] space-y-1 sm:mt-2 sm:min-w-[6rem] sm:space-y-1" aria-hidden>
              <div className="h-[1.125rem] sm:h-[0.9375rem] md:h-[1rem]" />
              <div className="h-[1.125rem] sm:h-[0.9375rem] md:h-[1rem]" />
              <div className="h-[1.125rem] sm:h-[0.9375rem] md:h-[1rem]" />
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <TripleRingCluster
              metrics={rightMetrics}
              centerPct={rightCenterPct}
              centerValue={rightCenterValue}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
