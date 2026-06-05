"use client";

import { useEffect, useState } from "react";

import { hudDashShell } from "@/components/dashboard/hud/hudDashboardLayout";
import { cn } from "@/lib/cn";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { useLivingCount } from "@/components/dashboard/useLivingCount";
import { useTabVisible } from "@/lib/motionLifecycle";

type Tone = "cyan" | "indigo" | "pink" | "amber";

type Gauge = {
  key: string;
  label: string;
  value: number;
  total: number;
  tone: Tone;
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, n));
}

function fmtPct(v: number, t: number) {
  if (t <= 0) return "0%";
  return `${Math.round((Math.max(0, v) / t) * 100)}%`;
}

function toneColors(t: Tone) {
  switch (t) {
    case "cyan":
      return { fg: "#2dd4bf", glow: "rgba(45,212,191,0.55)" };
    case "indigo":
      return { fg: "#93c5fd", glow: "rgba(147,197,253,0.45)" };
    case "pink":
      return { fg: "#fb7185", glow: "rgba(251,113,133,0.42)" };
    case "amber":
      return { fg: "#fbbf24", glow: "rgba(251,191,36,0.38)" };
  }
}

/** One shared “clock hand” look on every gauge (capsule neon + pivot). Arc fill still uses tone `fg` / `glow`. */
const NEEDLE = {
  halo: "rgba(168,85,247,0.5)",
  sleeveDeep: "rgba(76,29,149,0.94)",
  sleeveLavender: "rgba(216,180,254,0.98)",
  core: "rgba(252,250,255,0.96)",
  pivotHot: "rgba(255,255,255,0.55)",
} as const;

const BALL_RAF_MIN_STEP_MS = 40;

function ArcGauge({
  label,
  value,
  total,
  tone,
  gaugeId,
  animIndex,
}: {
  label: string;
  value: number;
  total: number;
  tone: Tone;
  gaugeId: string;
  animIndex: number;
}) {
  const [motionMs, setMotionMs] = useState(0);
  const [oscillateBall, setOscillateBall] = useState(true);
  const tabVisible = useTabVisible();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setOscillateBall(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!oscillateBall || !tabVisible) return;
    let id = 0;
    let lastEmit = 0;
    const loop = (t: number) => {
      if (t - lastEmit >= BALL_RAF_MIN_STEP_MS) {
        lastEmit = t;
        setMotionMs(t);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [oscillateBall, tabVisible]);

  const pct = clamp01(total > 0 ? value / total : 0);
  const { fg, glow } = toneColors(tone);
  const gradPurple = `quad-purple-${gaugeId}`;

  // SVG arc geometry (semi-circle, top). Tight viewBox so 0%/100% sit close under the arc.
  const w = 220;
  const h = 112;
  const cx = w / 2;
  const cy = 88;
  const r = 70;
  const needleLen = 54;

  // Upper semicircle: path runs left → right along the TOP (bulge at cy − r).
  // SVG polar angle θ is measured from +x; along this arc θ goes π → 2π via 3π/2 (top).
  const a0 = Math.PI;
  const a1 = Math.PI * 2;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  const d = `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;

  // Keep a tiny padding from the ends so the needle never collides with 0%/100% labels.
  const pctPadded = clamp01(pct * 0.92 + 0.04);
  const arcLen = Math.PI * r;
  const dash = arcLen * pctPadded;
  const gap = Math.max(0, arcLen - dash);

  const needleAngle = -90 + pctPadded * 180; // -90..90

  // Ball oscillates along the filled segment only: arc parameter u ∈ [0, pctPadded].
  const span = Math.max(pctPadded, 1e-6);
  const wave = oscillateBall
    ? (Math.sin(motionMs / 1300 + animIndex * 0.95) + 1) / 2
    : 1;
  const uBall = wave * span;
  // Must use the same upper-arc parametrization as the path (NOT π→0, which traces the lower half).
  const ballAngle = a0 + (a1 - a0) * uBall;
  const ballRail = r;
  const ballX = Math.round((cx + Math.cos(ballAngle) * ballRail) * 100) / 100;
  const ballY = Math.round((cy + Math.sin(ballAngle) * ballRail) * 100) / 100;

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-col items-stretch">
      {/* Header (do NOT overlay the chart) */}
      <div className="w-full min-w-0 shrink-0 text-center leading-none ">
        <div
          className="animate-session-label-shine mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:text-[11px] sm:tracking-[0.2em] dark:text-slate-100/85"
          style={{ animationDelay: `${animIndex * 0.45}s` }}
        >
          {label}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 tabular-nums leading-tight">
          <span className="animate-session-readout-breathe text-xs font-semibold tracking-tight text-slate-900 sm:text-base dark:text-slate-50">
            {fmtInt(value)}
          </span>
          <span className="text-xs font-semibold tracking-wide sm:text-sm" style={{ color: fg }}>
            {fmtPct(value, total)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block w-full min-w-0 shrink-0 overflow-visible max-h-[108px] sm:max-h-[120px] min-[1666px]:max-h-[132px]"
        style={{ width: "100%", height: "auto", aspectRatio: `${w} / ${h}` }}
        shapeRendering="geometricPrecision"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradPurple} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(124,58,237,0.40)" />
            <stop offset="55%" stopColor="rgba(168,85,247,0.55)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.40)" />
          </linearGradient>
        </defs>

        {/* inner dark track */}
        <path d={d} fill="none" stroke="rgba(51,65,85,0.82)" strokeWidth="18" strokeLinecap="round" />

        {/* base purple remainder */}
        <path d={d} fill="none" stroke={`url(#${gradPurple})`} strokeWidth="14" strokeLinecap="round" />

        {/* value arc (no filter: drop-shadow was recompositing every parent paint and made dots flicker) */}
        <path
          d={d}
          fill="none"
          stroke={fg}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: "stroke-dasharray 0.95s cubic-bezier(0.2, 0.82, 0.2, 1)" }}
        />

        {/* thin highlight edge */}
        <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />

        {/* needle — same layered capsule on every dial */}
        <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLen}
            stroke={NEEDLE.halo}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLen}
            stroke={NEEDLE.sleeveDeep}
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLen}
            stroke={NEEDLE.sleeveLavender}
            strokeWidth="3.1"
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - needleLen}
            stroke={NEEDLE.core}
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        </g>

        {/* pivot — high-contrast, readable on dark HUD */}
        <circle
          cx={cx}
          cy={cy}
          r="11"
          fill="rgba(30,27,75,0.92)"
          stroke="rgba(147,197,253,0.55)"
          strokeWidth="1.75"
        />
        <circle cx={cx} cy={cy} r="7.5" fill="rgba(168,85,247,0.55)" stroke="rgba(196,181,254,0.45)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="3.6" fill="rgba(255,255,255,0.92)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />

        {/* value ball — soft halo; toned down on light panels */}
        <g transform={`translate(${ballX} ${ballY})`}>
          <circle r="11" fill={glow} className="opacity-[0.28] dark:opacity-[0.5]" />
          <circle r="8" fill={fg} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <circle r="2.4" cx="1.8" cy="-1.8" fill="rgba(255,255,255,0.65)" className="dark:opacity-100" />
        </g>

        {/* markers — y just below arc stroke (apex cy−r, endpoints ~cy) */}
        <text x="18" y="104" fill="rgba(226,232,240,0.5)" fontSize="10" fontWeight="700" className="dark:fill-slate-300/55">
          0%
        </text>
        <text x={w - 40} y="104" fill="rgba(226,232,240,0.5)" fontSize="10" fontWeight="700" className="dark:fill-slate-300/55">
          100%
        </text>
      </svg>
    </div>
  );
}

export function QuadStatusGauges({
  totalUsers,
  activeUsers,
  inactiveUsers,
  expiredUsers,
  expiringSoonUsers,
  className,
}: {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  expiredUsers: number;
  expiringSoonUsers: number;
  className?: string;
}) {
  const { tips } = useDashboardIntel();
  const gauges: Gauge[] = [
    { key: "active", label: "ACTIVE USERS", value: activeUsers, total: totalUsers, tone: "cyan" },
    { key: "inactive", label: "INACTIVE USERS", value: inactiveUsers, total: totalUsers, tone: "indigo" },
    { key: "expired", label: "EXPIRED USERS", value: expiredUsers, total: totalUsers, tone: "pink" },
    { key: "expiring", label: "EXPIRING SOON", value: expiringSoonUsers, total: totalUsers, tone: "amber" },
  ];

  const hubDisplayTotal = useLivingCount(Math.max(0, Math.round(totalUsers)));

  return (
    <section
      className={cn(hudDashShell, "relative mx-auto flex min-h-0 w-full flex-1 flex-col overflow-visible", className)}
    >
      {/* INTEL_GUIDE — pinned top-right (vertical stack; no rotate layout drift) */}
      <div className="pointer-events-none absolute right-2 top-2 z-[6] sm:right-3 sm:top-3">
        <IntelGuideBadge size="sm" orientation="vertical" tip={tips.quadStatusGauges} />
      </div>

      {/* 2×2 gauges — flex-1 + vertical center so panel matches Branch Pulse height */}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center overflow-visible px-3 py-3 sm:px-4 sm:py-5">
        <div className="grid w-full grid-cols-2 grid-rows-[auto_auto] items-end gap-x-3 gap-y-5 sm:gap-x-10 sm:gap-y-6 md:gap-x-12">
          {gauges.map((g, idx) => (
            <div
              key={g.key}
              className={cn(
                "flex h-fit max-h-full w-full min-w-0 items-end justify-center",
                idx === 0 && "sm:translate-x-1 md:translate-x-2",
                idx === 1 && "sm:-translate-x-1 md:-translate-x-2",
                idx === 2 && "sm:translate-x-1 md:translate-x-2",
                idx === 3 && "sm:-translate-x-1 md:-translate-x-2",
              )}
            >
              <div className="h-fit w-full min-w-0 max-w-[min(100%,11.5rem)] shrink-0 sm:max-w-none">
                <ArcGauge label={g.label} value={g.value} total={g.total} tone={g.tone} gaugeId={g.key} animIndex={idx} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pointer-events-none absolute left-1/2 top-[calc(50%+20px)] z-[3] -translate-x-1/2 -translate-y-1/2 text-center">
          <div
            className={cn(
              "animate-living-quad-hub-breathe relative flex aspect-square min-h-[5.25rem] min-w-[5.25rem] flex-col items-center justify-center rounded-full px-3 py-2.5 text-center sm:min-h-[6rem] sm:min-w-[6rem] sm:px-5 sm:py-3",
              "border border-slate-200/90 bg-white/90 shadow-sm dark:border-cyan-400/30 dark:bg-slate-950/40 dark:shadow-[0_0_28px_-4px_rgb(34_211_238/0.28)]",
            )}
          >
            <div className="animate-session-label-shine text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-100/70 sm:text-[10px] sm:tracking-[0.16em]">
              Users
            </div>
            <div className="animate-living-quad-hub-readout mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              {fmtInt(hubDisplayTotal)}
            </div>
            <div className="animate-session-label-shine mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-200/85 sm:text-[10px] sm:tracking-[0.12em]">
              By status
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

