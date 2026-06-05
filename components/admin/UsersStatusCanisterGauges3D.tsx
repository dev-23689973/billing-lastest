/**
 * Users KPI — gaming hex conduits with plasma fill (count / total per status).
 */

"use client";

import Link from "next/link";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { Activity, Ban, Clock, UserMinus } from "lucide-react";

import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { useTheme } from "@/contexts/ThemeContext";
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

type StatusTheme = {
  label: string;
  accent: string;
  glow: string;
  plasma: readonly [string, string, string];
  Icon: (typeof GAUGE_SPECS)[number]["light"]["Icon"];
};

const GAUGE_SPECS = [
  {
    key: "active" as const,
    light: {
      label: "Active",
      accent: "#059669",
      glow: "0,230,118",
      plasma: ["#00695c", "#00c853", "#69f0ae"],
      Icon: Activity,
    },
    dark: {
      label: "Active",
      accent: "#69f0ae",
      glow: "0,230,118",
      plasma: ["#004d40", "#00e676", "#b9f6ca"],
      Icon: Activity,
    },
  },
  {
    key: "inactive" as const,
    light: {
      label: "Inactive",
      accent: "#2563eb",
      glow: "41,121,255",
      plasma: ["#1a237e", "#448aff", "#82b1ff"],
      Icon: UserMinus,
    },
    dark: {
      label: "Inactive",
      accent: "#82b1ff",
      glow: "68,138,255",
      plasma: ["#0d47a1", "#2979ff", "#bbdefb"],
      Icon: UserMinus,
    },
  },
  {
    key: "expired" as const,
    light: {
      label: "Expired",
      accent: "#dc2626",
      glow: "255,23,68",
      plasma: ["#b71c1c", "#ff1744", "#ff8a80"],
      Icon: Ban,
    },
    dark: {
      label: "Expired",
      accent: "#ff8a80",
      glow: "255,82,82",
      plasma: ["#7f0000", "#ff5252", "#ffcdd2"],
      Icon: Ban,
    },
  },
  {
    key: "expiring" as const,
    light: {
      label: "Soon",
      accent: "#d97706",
      glow: "255,145,0",
      plasma: ["#e65100", "#ff9100", "#ffd180"],
      Icon: Clock,
    },
    dark: {
      label: "Soon",
      accent: "#ffd180",
      glow: "255,171,0",
      plasma: ["#bf360c", "#ffab00", "#ffe082"],
      Icon: Clock,
    },
  },
] as const;

const HREF_KEYS: Record<(typeof GAUGE_SPECS)[number]["key"], keyof UsersStatusGaugeHrefs> = {
  active: "active",
  inactive: "inactive",
  expired: "expired",
  expiring: "expiring",
};

/** Chamfered hex conduit (viewBox 0 0 64 172). */
const VB = { w: 64, h: 172 };
const SHELL = "16,22 48,22 54,28 54,132 48,138 16,138 10,132 10,28";
const CHAMBER = "18,26 46,26 50,30 50,130 46,134 18,134 14,130 14,30";
const CHAMBER_Y = 26;
const CHAMBER_H = 108;
const BASE_Y = CHAMBER_Y + CHAMBER_H;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pctOfTotal(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((count / total) * 100));
}

function GamingConduitSvg({
  pct,
  statusTheme,
  isLight,
  animDelayMs,
  muted = false,
}: {
  pct: number;
  statusTheme: StatusTheme;
  isLight: boolean;
  animDelayMs: number;
  muted?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [mounted, setMounted] = useState(false);
  const fillPct = muted || pct <= 0 ? 0 : pct;
  const fillScale = fillPct / 100;
  const [deep, mid, bright] = statusTheme.plasma;
  const gid = `conduit-${uid}`;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const style = {
    "--fill-scale": String(fillScale),
    "--glow-rgb": statusTheme.glow,
    "--accent": statusTheme.accent,
    animationDelay: `${animDelayMs}ms`,
  } as CSSProperties;

  const shellFill = isLight ? "#eef2f7" : "#0c1220";
  const voidFill = isLight ? "#f8fafc" : "#060a14";
  const gridStroke = isLight ? "rgba(15,23,42,0.08)" : "rgba(34,211,238,0.12)";

  return (
    <div
      className={cn("game-conduit-stage relative h-full w-full max-w-[3.5rem]", isLight && "game-conduit-light")}
      style={style}
    >
      <HudCornerOverlay tone="bright" className="absolute inset-0 z-[5] opacity-90" />

      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMax meet"
        className="game-conduit-svg relative z-[1] mx-auto h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${gid}-plasma`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={deep} />
            <stop offset="38%" stopColor={mid} />
            <stop offset="50%" stopColor={bright} />
            <stop offset="62%" stopColor={mid} />
            <stop offset="100%" stopColor={deep} />
          </linearGradient>
          <linearGradient id={`${gid}-plasma-v`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? 0.45 : 0.35} />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity={isLight ? 0.12 : 0.28} />
          </linearGradient>
          <linearGradient id={`${gid}-crest`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={deep} />
            <stop offset="50%" stopColor={bright} />
            <stop offset="100%" stopColor={deep} />
          </linearGradient>
          <linearGradient id={`${gid}-cap`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLight ? "#ffffff" : "#1e293b"} />
            <stop offset="100%" stopColor={isLight ? "#cbd5e1" : "#0f172a"} />
          </linearGradient>
          <clipPath id={`${gid}-clip`}>
            <polygon points={CHAMBER} />
          </clipPath>
          <filter id={`${gid}-glow`} x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground bloom */}
        <ellipse cx={32} cy={BASE_Y + 14} rx={18} ry={3.5} fill={`rgb(${statusTheme.glow})`} opacity={isLight ? 0.2 : 0.45} />

        {/* Base platform */}
        <polygon points="8,142 56,142 52,148 12,148" fill={isLight ? "#cbd5e1" : "#1e293b"} stroke={statusTheme.accent} strokeWidth="0.6" strokeOpacity="0.5" />
        <polygon points="14,148 50,148 46,152 18,152" fill={isLight ? "#e2e8f0" : "#334155"} />

        {/* Outer shell */}
        <polygon
          points={SHELL}
          fill={shellFill}
          stroke={statusTheme.accent}
          strokeWidth="1.2"
          strokeOpacity={isLight ? 0.55 : 0.85}
        />

        {/* Empty void chamber */}
        <polygon points={CHAMBER} fill={voidFill} />

        {/* Hologrid in empty area */}
        <g clipPath={`url(#${gid}-clip)`} opacity={isLight ? 0.55 : 0.85}>
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={14}
              y1={30 + i * 14}
              x2={50}
              y2={30 + i * 14}
              stroke={gridStroke}
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={18 + i * 10}
              y1={CHAMBER_Y}
              x2={18 + i * 10}
              y2={BASE_Y}
              stroke={gridStroke}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Plasma fill */}
        {fillPct > 0 ? (
          <g clipPath={`url(#${gid}-clip)`} filter={`url(#${gid}-glow)`}>
            <g
              className={cn("game-plasma-group", mounted && "game-plasma-charge")}
              style={{
                transformOrigin: "32px 134px",
                transformBox: "view-box",
              }}
            >
              <rect x={14} y={CHAMBER_Y} width={36} height={CHAMBER_H} fill={`url(#${gid}-plasma)`} />
              <rect x={14} y={CHAMBER_Y} width={36} height={CHAMBER_H} fill={`url(#${gid}-plasma-v)`} />
              <rect
                className="game-plasma-scan"
                x={14}
                y={CHAMBER_Y}
                width={36}
                height={CHAMBER_H}
                fill="#ffffff"
                opacity="0.12"
              />
              {/* Energy crest */}
              <polygon
                className="game-plasma-crest"
                points={`14,${CHAMBER_Y + 2} 32,${CHAMBER_Y - 4} 50,${CHAMBER_Y + 2} 32,${CHAMBER_Y + 6}`}
                fill={`url(#${gid}-crest)`}
              />
              <line x1={16} y1={CHAMBER_Y + 3} x2={48} y2={CHAMBER_Y + 3} stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
              {/* Core sparks */}
              <circle className="game-spark game-spark-a" cx={22} cy={BASE_Y - 10} r={1.1} fill={bright} />
              <circle className="game-spark game-spark-b" cx={34} cy={BASE_Y - 22} r={0.75} fill="#ffffff" />
              <circle className="game-spark game-spark-c" cx={28} cy={BASE_Y - 38} r={0.55} fill={bright} />
            </g>
          </g>
        ) : null}

        {/* Side LED ticks */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x={52.5}
            y={32 + i * 16}
            width={2.5}
            height={1.2}
            rx={0.4}
            fill={statusTheme.accent}
            opacity={0.35 + (i % 2) * 0.25}
          />
        ))}

        {/* Front edge glow line */}
        <line x1={32} y1={24} x2={32} y2={136} stroke={statusTheme.accent} strokeWidth="0.5" opacity={isLight ? 0.25 : 0.45} />

        {/* Top angular cap */}
        <polygon points="12,18 52,18 48,24 16,24" fill={`url(#${gid}-cap)`} stroke={statusTheme.accent} strokeWidth="0.8" strokeOpacity="0.6" />
        <polygon points="20,14 44,14 40,18 24,18" fill={statusTheme.accent} opacity={isLight ? 0.35 : 0.55} />
        <polygon className="game-cap-pulse" points="26,10 38,10 32,16" fill={statusTheme.accent} opacity="0.85" />
      </svg>
    </div>
  );
}

function GaugeColumn({
  pct,
  count,
  statusTheme,
  isLight,
  href,
  muted,
  animDelayMs,
}: {
  pct: number;
  count: number;
  statusTheme: StatusTheme;
  isLight: boolean;
  href?: string;
  muted?: boolean;
  animDelayMs: number;
}) {
  const { label, accent, glow, Icon } = statusTheme;
  const glowText = `0 0 10px rgba(${glow},${isLight ? 0.45 : 0.9}), 0 0 22px rgba(${glow},${isLight ? 0.2 : 0.45})`;

  const inner = (
    <>
      <span
        className={cn(
          "game-pct font-black tabular-nums tracking-widest",
          rsTextCaption,
          "text-sm sm:text-base",
          muted && "opacity-45",
        )}
        style={{ color: accent, textShadow: glowText }}
      >
        {pct}%
      </span>

      <div className="relative mx-auto w-full min-w-0 max-w-[5.75rem] flex-1 px-0.5 sm:max-w-[6.75rem]">
        <div className="relative h-[9.5rem] w-full sm:h-[10.5rem] md:h-[11.25rem]">
          <div className="relative z-[1] flex h-full w-full items-end justify-center pb-0.5 pt-1">
            <GamingConduitSvg
              pct={pct}
              statusTheme={statusTheme}
              isLight={isLight}
              animDelayMs={animDelayMs}
              muted={muted}
            />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col items-center gap-0.5 text-center", muted && "opacity-45")}>
        <span
          className={cn("font-bold uppercase tracking-[0.2em]", rsTextKicker)}
          style={{ color: accent, textShadow: `0 0 8px rgba(${glow},${isLight ? 0.35 : 0.65})` }}
        >
          {label}
        </span>
        <span className={cn("font-semibold tabular-nums text-muted-foreground/90", rsTextCaption)}>{formatInt(count)}</span>
        <Icon
          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
          style={{ color: accent, filter: `drop-shadow(0 0 5px rgba(${glow},0.75))` }}
          strokeWidth={2.25}
          aria-hidden
        />
      </div>
    </>
  );

  const colClass = cn(
    "game-col group/col flex min-w-0 flex-1 flex-col items-center justify-between gap-1 py-0.5",
    href && "rounded-sm outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-400/75",
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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const exp = expiringEnabled ? expiring : 0;
  const denom = Math.max(0, total);
  const counts = { active, inactive, expired, expiring: exp };

  const ariaSummary = GAUGE_SPECS.map((spec) => {
    const count = counts[spec.key];
    const t = isLight ? spec.light : spec.dark;
    return `${t.label} ${pctOfTotal(count, denom)}% (${formatInt(count)})`;
  }).join(", ");

  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col justify-center", className)}
      role="group"
      aria-label={`User status gaming conduits: ${ariaSummary}.`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.game-conduit-stage {
  perspective: 340px;
  filter: drop-shadow(0 8px 18px rgba(var(--glow-rgb), ${isLight ? "0.15" : "0.35"}));
  animation: gameConduitFloat 4s ease-in-out infinite;
}
@keyframes gameConduitFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
.game-conduit-svg {
  transform: rotateX(8deg) rotateY(-2deg);
  transform-origin: center bottom;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.group\\/col:hover .game-conduit-svg {
  transform: rotateX(4deg) rotateY(0deg) translateY(-4px) scale(1.02);
}
.game-plasma-group {
  transform: scaleY(0.001);
  will-change: transform;
}
.game-plasma-charge {
  animation: gamePlasmaCharge 1.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: inherit;
}
@keyframes gamePlasmaCharge {
  0% { transform: scaleY(0.001); filter: brightness(2) saturate(1.4); }
  65% { transform: scaleY(calc(var(--fill-scale) * 1.04)); filter: brightness(1.35); }
  100% { transform: scaleY(var(--fill-scale)); filter: brightness(1); }
}
.game-plasma-scan {
  animation: gameScanSweep 2.4s linear infinite;
  transform-origin: center bottom;
}
@keyframes gameScanSweep {
  0% { transform: translateY(100%); opacity: 0; }
  20% { opacity: 0.35; }
  100% { transform: translateY(-120%); opacity: 0; }
}
.game-plasma-crest {
  animation: gameCrestPulse 2.4s ease-in-out infinite;
}
@keyframes gameCrestPulse {
  0%, 100% { opacity: 0.85; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.08); }
}
.game-cap-pulse {
  animation: gameCapPulse 2s ease-in-out infinite;
}
@keyframes gameCapPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
.game-spark {
  animation: gameSparkRise 2.8s ease-in infinite;
}
.game-spark-a { animation-delay: 0s; }
.game-spark-b { animation-delay: 0.9s; }
.game-spark-c { animation-delay: 1.8s; }
@keyframes gameSparkRise {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 0.4; }
  100% { transform: translateY(-42px); opacity: 0; }
}
.game-conduit-light .game-conduit-svg {
  filter: saturate(1.08);
}
@media (prefers-reduced-motion: reduce) {
  .game-conduit-stage, .game-plasma-crest, .game-cap-pulse, .game-spark { animation: none; }
  .game-conduit-svg { transform: none; }
  .group\\/col:hover .game-conduit-svg { transform: none; }
  .game-plasma-charge { animation: none; transform: scaleY(var(--fill-scale)); }
}
`,
        }}
      />

      <div className="grid w-full min-w-0 grid-cols-4 items-stretch gap-x-1.5 sm:gap-x-3 md:gap-x-4">
        {GAUGE_SPECS.map((spec, i) => (
          <GaugeColumn
            key={spec.key}
            pct={pctOfTotal(counts[spec.key], denom)}
            count={counts[spec.key]}
            statusTheme={isLight ? spec.light : spec.dark}
            isLight={isLight}
            href={hrefs?.[HREF_KEYS[spec.key]]}
            muted={spec.key === "expiring" && !expiringEnabled}
            animDelayMs={i * 130}
          />
        ))}
      </div>
    </div>
  );
}
