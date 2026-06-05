/**
 * Users KPI — four rounded-triangular glass vials with colored water fill.
 * Matches reference: transparent empty tube, white caps, chrome rings, visible liquid surface.
 * Fill height = status count / total.
 */

"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { Activity, Ban, Clock, UserMinus } from "lucide-react";

import { HudGroundShadow } from "@/components/dashboard/hud/HudGroundShadow";
import { cn } from "@/lib/cn";
import { rsTextCaption, rsTextKicker } from "@/lib/ui/responsiveScale";

export type UsersStatusGaugeHrefs = {
  all: string;
  active: string;
  inactive: string;
  expired: string;
  expiring: string;
};

export type UsersStatusCanisterGauges3DProps = {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  expiring: number;
  expiringEnabled: boolean;
  hrefs?: UsersStatusGaugeHrefs;
  className?: string;
};

const GAUGE_SPECS = [
  {
    key: "active" as const,
    label: "Active",
    accent: "#16a34a",
    waterDeep: "#15803d",
    waterMid: "#22c55e",
    waterLight: "#86efac",
    waterSurface: "#14532d",
    Icon: Activity,
  },
  {
    key: "inactive" as const,
    label: "Inactive",
    accent: "#475569",
    waterDeep: "#334155",
    waterMid: "#64748b",
    waterLight: "#cbd5e1",
    waterSurface: "#1e293b",
    Icon: UserMinus,
  },
  {
    key: "expired" as const,
    label: "Expired",
    accent: "#dc2626",
    waterDeep: "#b91c1c",
    waterMid: "#ef4444",
    waterLight: "#fca5a5",
    waterSurface: "#7f1d1d",
    Icon: Ban,
  },
  {
    key: "expiring" as const,
    label: "Soon",
    accent: "#ea580c",
    waterDeep: "#c2410c",
    waterMid: "#f97316",
    waterLight: "#fdba74",
    waterSurface: "#9a3412",
    Icon: Clock,
  },
] as const;

const HREF_KEYS: Record<(typeof GAUGE_SPECS)[number]["key"], keyof UsersStatusGaugeHrefs> = {
  active: "active",
  inactive: "inactive",
  expired: "expired",
  expiring: "expiring",
};

/** Rounded equilateral triangle — glass tube outer shell. */
const TUBE_OUTER =
  "M50 18 C54 18 58 21 62 25 L88 68 C91 72 91 77 89 81 L72 198 C70 203 66 206 61 206 H39 C34 206 30 203 28 198 L11 81 C9 77 9 72 12 68 L38 25 C42 21 46 18 50 18 Z";

/** Inset tube interior for liquid clip. */
const TUBE_INNER =
  "M50 30 C53 30 56 32 59 35 L81 72 C83 75 83 79 81 82 L66 192 C64 196 61 198 57 198 H43 C39 198 36 196 34 192 L19 82 C17 79 17 75 19 72 L41 35 C44 32 47 30 50 30 Z";

const BODY_TOP = 30;
const BODY_BOTTOM = 198;
const BODY_H = BODY_BOTTOM - BODY_TOP;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pctOfTotal(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((count / total) * 100));
}

function TriVialGauge({
  pct,
  waterDeep,
  waterMid,
  waterLight,
  waterSurface,
  animDelayMs,
  muted = false,
}: {
  pct: number;
  waterDeep: string;
  waterMid: string;
  waterLight: string;
  waterSurface: string;
  animDelayMs: number;
  muted?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [mounted, setMounted] = useState(false);
  const fillPct = muted || pct <= 0 ? 0 : pct;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const showWater = fillPct > 0;

  return (
    <div
      className="vial-gauge-3d relative mx-auto h-full w-[3rem] sm:w-[3.35rem] md:w-[3.65rem]"
      style={{ perspective: "280px" }}
    >
      <div className="vial-gauge-tilt relative h-full w-full [transform-style:preserve-3d]">
        <svg
          viewBox="0 0 100 228"
          className="h-full w-full overflow-visible drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)]"
          aria-hidden
        >
          <defs>
            <clipPath id={`${uid}-clip`}>
              <path d={TUBE_INNER} />
            </clipPath>
            <linearGradient id={`${uid}-water`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={waterDeep} />
              <stop offset="36%" stopColor={waterMid} />
              <stop offset="50%" stopColor={waterLight} />
              <stop offset="64%" stopColor={waterMid} />
              <stop offset="100%" stopColor={waterDeep} />
            </linearGradient>
            <linearGradient id={`${uid}-water-depth`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
            </linearGradient>
            <linearGradient id={`${uid}-glass-edge`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="18%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="82%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
            </linearGradient>
            <linearGradient id={`${uid}-chrome`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="55%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id={`${uid}-cap`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          {/* Base plate */}
          <ellipse cx="50" cy="216" rx="34" ry="7" fill="#111827" opacity="0.85" />
          <ellipse cx="50" cy="214" rx="30" ry="5.5" fill="#374151" />

          {/* Bottom white cap block */}
          <path d="M28 198 L34 192 L66 192 L72 198 L72 206 L28 206 Z" fill={`url(#${uid}-cap)`} />
          {/* Bottom chrome ring */}
          <ellipse cx="50" cy="192" rx="33" ry="5.5" fill="none" stroke={`url(#${uid}-chrome)`} strokeWidth="2.2" />

          {/* Back interior edges (visible through empty glass) */}
          <path
            d="M50 30 L81 72 L66 192 M50 30 L19 72 L34 192"
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1.2"
          />

          {/* Glass tube shell — transparent */}
          <path
            d={TUBE_OUTER}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.4"
          />
          <path d={TUBE_INNER} fill="rgba(248,250,252,0.04)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" />

          {/* Colored water — clipped to tube interior */}
          {showWater ? (
            <g clipPath={`url(#${uid}-clip)`}>
              <g
                className={cn("vial-water-group", mounted && "vial-water-group-active")}
                style={
                  {
                    "--fill-scale": fillPct / 100,
                    animationDelay: `${animDelayMs}ms`,
                    transformOrigin: `50px ${BODY_BOTTOM}px`,
                  } as CSSProperties
                }
                opacity={muted ? 0.45 : 1}
              >
                <rect x="8" y={BODY_TOP} width="84" height={BODY_H} fill={`url(#${uid}-water)`} />
                <rect
                  x="8"
                  y={BODY_TOP}
                  width="84"
                  height={BODY_H}
                  fill={`url(#${uid}-water-depth)`}
                  opacity="0.55"
                />
                {/* Liquid top surface — sits at top of full rect, scales with group */}
                <ellipse cx="50" cy={BODY_TOP + 4} rx="30" ry="7" fill={waterSurface} opacity="0.92" />
                <ellipse cx="50" cy={BODY_TOP + 2} rx="22" ry="3.5" fill="rgba(255,255,255,0.25)" />
              </g>
            </g>
          ) : null}

          {/* Front glass highlights */}
          <path
            d="M44 28 L42 80 L41 170 L43 198"
            fill="none"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M58 32 L60 90 L61 175 L59 198"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Glass edge shading overlay */}
          <path d={TUBE_INNER} fill={`url(#${uid}-glass-edge)`} opacity="0.35" />

          {/* Top chrome ring */}
          <ellipse cx="50" cy="30" rx="33" ry="5.5" fill="none" stroke={`url(#${uid}-chrome)`} strokeWidth="2.2" />

          {/* Top white cap */}
          <path d="M38 18 C42 14 58 14 62 18 L62 26 C58 30 42 30 38 26 Z" fill={`url(#${uid}-cap)`} />
          <ellipse cx="50" cy="18" rx="14" ry="4.5" fill="#ffffff" opacity="0.95" />
        </svg>
      </div>
    </div>
  );
}

function PipeGaugeColumn({
  label,
  pct,
  count,
  accent,
  waterDeep,
  waterMid,
  waterLight,
  waterSurface,
  Icon,
  href,
  muted = false,
  animDelayMs,
}: {
  label: string;
  pct: number;
  count: number;
  accent: string;
  waterDeep: string;
  waterMid: string;
  waterLight: string;
  waterSurface: string;
  Icon: (typeof GAUGE_SPECS)[number]["Icon"];
  href?: string;
  muted?: boolean;
  animDelayMs: number;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "font-bold tabular-nums tracking-tight antialiased",
          rsTextCaption,
          "text-sm sm:text-base",
          muted && "opacity-45",
        )}
        style={{ color: accent }}
      >
        {pct}%
      </span>

      <div className="relative mx-auto w-full min-w-0 max-w-[5.75rem] flex-1 px-0.5 sm:max-w-[6.75rem]">
        <div className="relative h-[9.5rem] w-full sm:h-[10.5rem] md:h-[11.5rem]">
          <HudGroundShadow size="sm" className="bottom-1" />
          <div className="relative z-[1] flex h-full w-full items-end justify-center pb-0.5 pt-1">
            <TriVialGauge
              pct={pct}
              waterDeep={waterDeep}
              waterMid={waterMid}
              waterLight={waterLight}
              waterSurface={waterSurface}
              animDelayMs={animDelayMs}
              muted={muted}
            />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col items-center gap-0.5 text-center", muted && "opacity-45")}>
        <span className={cn("font-semibold uppercase tracking-[0.14em]", rsTextKicker)} style={{ color: accent }}>
          {label}
        </span>
        <span className={cn("font-medium tabular-nums text-muted-foreground/90", rsTextCaption)}>
          {formatInt(count)}
        </span>
        <Icon className="h-3.5 w-3.5 opacity-80 sm:h-4 sm:w-4" style={{ color: accent }} strokeWidth={2} aria-hidden />
      </div>
    </>
  );

  const colClass = cn(
    "flex min-w-0 flex-1 flex-col items-center justify-between gap-1 py-0.5",
    href &&
      "group rounded-lg outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-400/75",
  );

  if (!href) return <div className={colClass}>{inner}</div>;

  return (
    <Link href={href} prefetch={false} className={colClass} title={`${label}: ${pct}% (${formatInt(count)})`}>
      {inner}
    </Link>
  );
}

export function UsersStatusCanisterGauges3D({
  total,
  active,
  inactive,
  expired,
  expiring,
  expiringEnabled,
  hrefs,
  className,
}: UsersStatusCanisterGauges3DProps) {
  const exp = expiringEnabled ? expiring : 0;
  const denom = Math.max(0, total);
  const counts = { active, inactive, expired, expiring: exp };

  const ariaSummary = GAUGE_SPECS.map((spec) => {
    const count = counts[spec.key];
    return `${spec.label} ${pctOfTotal(count, denom)}% (${formatInt(count)})`;
  }).join(", ");

  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col justify-center", className)}
      role="group"
      aria-label={`User status vial gauges: ${ariaSummary}.`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.vial-gauge-tilt {
  transform: rotateX(9deg) rotateY(-7deg);
  transform-origin: center 88%;
}
.vial-water-group {
  transform: scaleY(0);
}
.vial-water-group-active {
  animation: vialWaterRise 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: inherit;
}
@keyframes vialWaterRise {
  from { transform: scaleY(0); }
  to { transform: scaleY(var(--fill-scale)); }
}
@media (prefers-reduced-motion: reduce) {
  .vial-gauge-tilt { transform: none; }
  .vial-water-group-active { animation: none; transform: scaleY(var(--fill-scale)); }
}
`,
        }}
      />

      <div className="grid w-full min-w-0 grid-cols-4 items-stretch gap-x-1.5 sm:gap-x-3 md:gap-x-4">
        {GAUGE_SPECS.map((spec, i) => (
          <PipeGaugeColumn
            key={spec.key}
            label={spec.label}
            pct={pctOfTotal(counts[spec.key], denom)}
            count={counts[spec.key]}
            accent={spec.accent}
            waterDeep={spec.waterDeep}
            waterMid={spec.waterMid}
            waterLight={spec.waterLight}
            waterSurface={spec.waterSurface}
            Icon={spec.Icon}
            href={hrefs?.[HREF_KEYS[spec.key]]}
            muted={spec.key === "expiring" && !expiringEnabled}
            animDelayMs={i * 130}
          />
        ))}
      </div>
    </div>
  );
}
