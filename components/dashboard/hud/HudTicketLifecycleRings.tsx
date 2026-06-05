"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { useTheme } from "@/contexts/ThemeContext";
import { useLivingCount, useLivingSmooth } from "@/components/dashboard/useLivingCount";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";
import { dashboardTicketLifecycleRingsGrid } from "@/components/dashboard/hud/hudDashboardLayout";
import { cn } from "@/lib/cn";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

/** Match Branch Pulse center — one decimal when needed (e.g. 33.3%). */
function fmtPct1FromRatio(ratio: number) {
  const v = clamp01(ratio) * 100;
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

/** Stable SVG coords — avoids Node vs browser float hydration mismatches on tick marks / arcs. */
function roundSvgCoord(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Radial tick dial inside the ring bore (Branch Pulse / instrument look). */
function TicketHubTickMarks({
  cx,
  cy,
  rIn,
  isLight,
}: {
  cx: number;
  cy: number;
  rIn: number;
  isLight: boolean;
}) {
  const tickColor = isLight ? "rgba(100,116,139,0.5)" : "rgba(226,232,240,0.34)";
  const lines = useMemo(() => {
    const n = 36;
    const arr: { x1: number; y1: number; x2: number; y2: number; w: number }[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const long = i % 4 === 0;
      const r0 = rIn - (long ? 6 : 3.5);
      const r1 = rIn - 1;
      const x1 = roundSvgCoord(cx + r0 * Math.cos(ang));
      const y1 = roundSvgCoord(cy + r0 * Math.sin(ang));
      const x2 = roundSvgCoord(cx + r1 * Math.cos(ang));
      const y2 = roundSvgCoord(cy + r1 * Math.sin(ang));
      arr.push({ x1, y1, x2, y2, w: long ? 1.1 : 0.65 });
    }
    return arr;
  }, [cx, cy, rIn]);

  return (
    <g stroke={tickColor} strokeLinecap="round" aria-hidden>
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={l.w} />
      ))}
    </g>
  );
}

/** Arc from `startDeg` sweeping `sweepDeg` clockwise (0° = 3 o'clock, SVG y-down). */
function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
  if (sweepDeg <= 0.05) return "";
  const sr = (startDeg * Math.PI) / 180;
  const er = ((startDeg + sweepDeg) * Math.PI) / 180;
  const large = sweepDeg > 180 ? 1 : 0;
  const x0 = roundSvgCoord(cx + r * Math.cos(sr));
  const y0 = roundSvgCoord(cy + r * Math.sin(sr));
  const x1 = roundSvgCoord(cx + r * Math.cos(er));
  const y1 = roundSvgCoord(cy + r * Math.sin(er));
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

type RingPalette = {
  accent: string;
  glow: string;
  labelTint: string;
};

function DottedLifecycleRing({
  label,
  total,
  palette,
  isLight,
  size = "md",
  sweepRatio,
  livingCount,
  animIndex = 0,
}: {
  label: string;
  total: number;
  palette: RingPalette;
  isLight: boolean;
  size?: "md" | "sm";
  /** 0–1 animated share of `total` (drives arc + % readout). */
  sweepRatio: number;
  /** Count-up center value. */
  livingCount: number;
  /** Stagger living motion per ring (0–3). */
  animIndex?: number;
}) {
  const { accent, glow, labelTint } = palette;
  const [ringSpin, setRingSpin] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setRingSpin(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const pct = clamp01(sweepRatio);
  const sweep = pct * 360;
  const md = size === "md";
  const w = md ? 240 : 220;
  const h = md ? 240 : 220;
  const cx = w / 2;
  const cy = h / 2;
  const r = md ? 86 : 78;
  const strokeTrack = md ? 12 : 11;
  const strokeVal = md ? 13 : 12;
  const fullRing = pct >= 0.999;
  const valuePath = fullRing ? "" : arcPath(cx, cy, r, -90, sweep);

  const pctStr = total > 0 ? fmtPct1FromRatio(pct) : "0%";
  const tickR = r - strokeTrack * 0.5 - 10;
  /** Four rings share one row — scale to column width (narrow beside message traffic or full card). */
  const ringBox = md
    ? "@container/ticket-ring relative mx-auto aspect-square w-full max-w-[12.5rem] min-[400px]:max-w-[13.5rem] sm:max-w-[14rem] lg:max-w-[15rem] xl:max-w-[16rem]"
    : "@container/ticket-ring relative mx-auto aspect-square w-full max-w-[min(100%,8rem)] min-[400px]:max-w-[min(100%,8.75rem)] min-[640px]:max-w-[min(100%,9.5rem)] min-[1280px]:max-w-[min(100%,10.5rem)]";

  const hasArc = pct > 0.004;
  const ringGlow = isLight
    ? `drop-shadow(0 0 2px ${glow}) drop-shadow(0 0 6px ${glow})`
    : `drop-shadow(0 0 3px ${glow}) drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 18px ${glow})`;
  const trackStroke = isLight ? "rgba(148,163,184,0.55)" : "rgba(71,85,105,0.65)";
  const motionDelay = `${animIndex * 0.55}s`;
  const spinDuration = `${8.5 + animIndex * 1.25}s`;

  const valueArc = hasArc ? (
    <g transform={`rotate(0 ${cx} ${cy})`}>
      {ringSpin ? (
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`360 ${cx} ${cy}`}
          dur={spinDuration}
          begin={motionDelay}
          repeatCount="indefinite"
        />
      ) : null}
      {fullRing ? (
        <circle
          className="motion-safe:animate-living-ticket-ring-glow motion-reduce:animate-none"
          style={{ filter: ringGlow, animationDelay: motionDelay }}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={strokeVal}
          strokeLinecap="round"
          strokeDasharray="4 12"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ) : (
        <path
          className="motion-safe:animate-living-ticket-ring-glow motion-reduce:animate-none"
          d={valuePath}
          fill="none"
          stroke={accent}
          strokeWidth={strokeVal}
          strokeLinecap="round"
          strokeDasharray="4 12"
          style={{
            filter: ringGlow,
            transition: "d 0.35s cubic-bezier(0.2, 0.82, 0.2, 1)",
            animationDelay: motionDelay,
          }}
        />
      )}
    </g>
  ) : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-center overflow-visible py-0">
      <div className={cn("relative overflow-visible", ringBox)}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0 z-0 h-full w-full overflow-visible"
          overflow="visible"
          aria-hidden
        >
          <TicketHubTickMarks cx={cx} cy={cy} rIn={tickR} isLight={isLight} />
          <circle
            className="motion-safe:animate-living-ticket-track-dash motion-reduce:animate-none"
            style={{ animationDelay: motionDelay }}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={trackStroke}
            strokeWidth={strokeTrack}
            strokeLinecap="round"
            strokeDasharray="4 12"
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {valueArc}
        </svg>

        {/* Branch Pulse–style instrument hub: spinning dashed halos + float readout */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
          aria-hidden
        >
          <div
            className="relative aspect-square w-[58%]"
            style={{ animationDelay: motionDelay } as CSSProperties}
          >
            <div
              className={cn(
                "absolute inset-0 rounded-full border border-dashed motion-safe:animate-living-dual-ring-halo-spin motion-reduce:animate-none",
                isLight ? "border-primary/20" : "border-primary/15 dark:border-cyan-400/18",
              )}
              style={{ animationDelay: motionDelay } as CSSProperties}
            />
            <div
              className={cn(
                "absolute inset-[10%] rounded-full border motion-safe:animate-living-dual-ring-halo-breathe motion-reduce:animate-none",
                isLight ? "border-primary/15" : "border-primary/12 dark:border-cyan-300/14",
              )}
              style={{ animationDelay: motionDelay } as CSSProperties}
            />
            <div
              className={cn(
                "absolute inset-[18%] rounded-full",
                isLight
                  ? "bg-[radial-gradient(circle_at_50%_38%,rgb(255_255_255/0.95)_0%,rgb(241_245_249)_55%,rgb(226_232_240/0.9)_100%)]"
                  : "bg-[radial-gradient(circle_at_50%_32%,rgb(255_255_255/0.07)_0%,rgb(2_6_23/0.97)_48%,rgb(15_23_42/0.82)_100%)]",
              )}
              style={
                !isLight
                  ? ({ boxShadow: `inset 0 0 28px -10px ${glow}` } as CSSProperties)
                  : undefined
              }
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[2] flex min-h-0 min-w-0 flex-col items-center justify-center px-3 text-center">
          <div className="motion-safe:animate-living-dual-ring-readout-float motion-reduce:animate-none flex w-full min-w-0 flex-col items-center">
            <div
              className={cn(
                "motion-safe:animate-living-quad-hub-readout motion-reduce:animate-none w-full max-w-[min(100%,72cqw)] whitespace-nowrap text-center font-sans font-semibold tabular-nums tracking-tighter leading-none antialiased",
                isLight ? "text-slate-800" : "text-slate-50",
              )}
              style={
                {
                  animationDelay: motionDelay,
                  fontSize: md
                    ? "max(1rem, min(1.5rem, 9cqw))"
                    : "max(0.875rem, min(1.35rem, 8.5cqw))",
                } as CSSProperties
              }
            >
              {pctStr}
            </div>
            <div
              className={cn(
                "motion-safe:animate-living-quad-hub-readout motion-reduce:animate-none mt-0.5 w-full max-w-[min(100%,78cqw)] whitespace-nowrap text-center font-sans font-semibold tabular-nums tracking-tight leading-none antialiased",
                isLight ? "text-slate-700" : "text-slate-200/90",
              )}
              style={
                {
                  animationDelay: `calc(${motionDelay} + 120ms)`,
                  fontSize: md
                    ? "max(0.8125rem, min(1.125rem, 6.25cqw))"
                    : "max(0.75rem, min(1.0625rem, 5.75cqw))",
                } as CSSProperties
              }
            >
              {fmtInt(livingCount)}
            </div>
          </div>
        </div>
      </div>
      <span
        className={cn(
          "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] sm:text-[9px] md:text-[10px]",
          isLight
            ? "border border-slate-200/90 bg-white/90 shadow-sm"
            : "border-0 bg-transparent hud-glass-deck-border-tinted backdrop-blur-[2px] motion-safe:animate-living-ticket-label-shine motion-reduce:animate-none",
        )}
        style={
          {
            color: labelTint,
            "--living-ticket-glow": glow,
            animationDelay: motionDelay,
          } as CSSProperties
        }
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            "motion-safe:animate-living-ticket-label-dot motion-reduce:animate-none",
          )}
          style={{ backgroundColor: accent, animationDelay: motionDelay }}
          aria-hidden
        />
        {label}
      </span>
    </div>
  );
}

export function HudTicketLifecycleRings({ overview }: { overview: AdminTicketStatusOverview }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const total = Math.max(0, overview.grandTotal);
  const inv = total > 0 ? 1 / total : 0;

  const sweepFixed = useLivingSmooth(overview.fixed * inv, 1100);
  const sweepReopened = useLivingSmooth(overview.reopened * inv, 1100);
  const sweepProgress = useLivingSmooth(overview.inProgress * inv, 1100);
  const sweepOther = useLivingSmooth(overview.other * inv, 1100);

  const nFixed = useLivingCount(overview.fixed);
  const nReopened = useLivingCount(overview.reopened);
  const nProgress = useLivingCount(overview.inProgress);
  const nOther = useLivingCount(overview.other);

  const fixed: RingPalette & { label: string } = isLight
    ? {
        label: "Fixed",
        accent: "#0891b2",
        glow: "rgba(8,145,178,0.35)",
        labelTint: "#0e7490",
      }
    : {
        label: "Fixed",
        accent: "#67e8f9",
        glow: "rgba(103,232,249,0.55)",
        labelTint: "#cffafe",
      };
  const reopened: RingPalette & { label: string } = isLight
    ? {
        label: "Reopened",
        accent: "#db2777",
        glow: "rgba(219,39,119,0.35)",
        labelTint: "#be185d",
      }
    : {
        label: "Reopened",
        accent: "#f9a8d4",
        glow: "rgba(249,168,212,0.55)",
        labelTint: "#fce7f3",
      };
  const progress: RingPalette & { label: string } = isLight
    ? {
        label: "Progress",
        accent: "#7c3aed",
        glow: "rgba(124,58,237,0.32)",
        labelTint: "#6d28d9",
      }
    : {
        label: "Progress",
        accent: "#d8b4fe",
        glow: "rgba(216,180,254,0.55)",
        labelTint: "#f3e8ff",
      };
  const otherRing: RingPalette & { label: string } = isLight
    ? {
        label: "Other",
        accent: "#64748b",
        glow: "rgba(100,116,139,0.28)",
        labelTint: "#475569",
      }
    : {
        label: "Other",
        accent: "#cbd5e1",
        glow: "rgba(203,213,225,0.45)",
        labelTint: "#f1f5f9",
      };

  const sumShown = overview.fixed + overview.reopened + overview.inProgress + overview.other;
  const drift = total - sumShown;

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-visible pt-0">
      <div className={dashboardTicketLifecycleRingsGrid}>
        <div className="flex min-w-0 items-stretch justify-center px-0 max-[639px]:px-0 sm:px-0.5">
          <DottedLifecycleRing
            label={reopened.label}
            total={total}
            palette={reopened}
            isLight={isLight}
            size="sm"
            sweepRatio={sweepReopened}
            livingCount={nReopened}
            animIndex={0}
          />
        </div>
        <div className="flex min-w-0 items-stretch justify-center px-0 max-[639px]:px-0 sm:px-0.5">
          <DottedLifecycleRing
            label={fixed.label}
            total={total}
            palette={fixed}
            isLight={isLight}
            size="sm"
            sweepRatio={sweepFixed}
            livingCount={nFixed}
            animIndex={1}
          />
        </div>
        <div className="flex min-w-0 items-stretch justify-center px-0 max-[639px]:px-0 sm:px-0.5">
          <DottedLifecycleRing
            label={progress.label}
            total={total}
            palette={progress}
            isLight={isLight}
            size="sm"
            sweepRatio={sweepProgress}
            livingCount={nProgress}
            animIndex={2}
          />
        </div>
        <div className="flex min-w-0 items-stretch justify-center px-0 max-[639px]:px-0 sm:px-0.5">
          <DottedLifecycleRing
            label={otherRing.label}
            total={total}
            palette={otherRing}
            isLight={isLight}
            size="sm"
            sweepRatio={sweepOther}
            livingCount={nOther}
            animIndex={3}
          />
        </div>
      </div>
      {Math.abs(drift) > 0 ? (
        <p className="mt-1 text-center font-mono text-[9px] leading-snug text-amber-400/90">
          Totals mismatch ({sumShown} vs {total}). Refresh or check data.
        </p>
      ) : null}
    </div>
  );
}
