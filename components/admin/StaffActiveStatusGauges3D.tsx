/**
 * Three role status strips: semi-circular SVG dial + counts + active % per card.
 * Responsive grid; no forced min-width so narrow viewports do not clip or leave dead space.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";

import { HudGroundShadow } from "@/components/dashboard/hud/HudGroundShadow";
import { cn } from "@/lib/cn";
import type { StaffHubFilterHrefs, StaffRoleFilter } from "@/lib/adminStaffHubFilters";

export type StaffActiveStatusGauges3DProps = {
  managerActive: number;
  managerInactive: number;
  resellerActive: number;
  resellerInactive: number;
  dealerActive: number;
  dealerInactive: number;
  filterHrefs?: StaffHubFilterHrefs;
  activeType?: StaffRoleFilter;
  className?: string;
  hideManagers?: boolean;
  hideResellers?: boolean;
};

const ROLES = [
  {
    key: "manager",
    label: "Managers",
    fill: "#7c3aed",
    segments: ["#4c1d95", "#5b21b6", "#6d28d9", "#7c3aed", "#a78bfa"],
  },
  {
    key: "reseller",
    label: "Resellers",
    fill: "#06b6d4",
    segments: ["#0e7490", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"],
  },
  {
    key: "dealer",
    label: "Dealers",
    fill: "#f43f5e",
    segments: ["#881337", "#be123c", "#e11d48", "#f43f5e", "#fda4af"],
  },
] as const;

const ROLE_SHORT_LABEL: Record<(typeof ROLES)[number]["key"], string> = {
  manager: "manager",
  reseller: "reseller",
  dealer: "dealer",
};

const GAP = 0.055;
const ARC = Math.PI;
const VB = { w: 100, h: 62, cx: 50, cy: 56, rOut: 38, rIn: 30.5 };
/** Crop around arc + needle; tuned so slice fill reaches the top of the card column. */
const VB_VIEW = { x: 6, y: 12, w: 88, h: 46 };

const GAUGE_ASPECT = VB_VIEW.w / VB_VIEW.h;
const GAUGE_HEIGHT_PX = 62;
const GAUGE_WIDTH_PX = Math.round(GAUGE_HEIGHT_PX * GAUGE_ASPECT);
const GAUGE_HEIGHT_MOBILE_PX = 48;
const GAUGE_WIDTH_MOBILE_PX = Math.round(GAUGE_HEIGHT_MOBILE_PX * GAUGE_ASPECT);
/** ~dial + padding per card × 3 + row gaps */
const CARD_PAD_GAP_PX = 28;
export const STAFF_ACTIVE_GAUGES_ROW_MIN_PX = (GAUGE_WIDTH_PX + CARD_PAD_GAP_PX) * 3 + 24;

function gaugeSizePx(compact: boolean) {
  return compact
    ? { width: GAUGE_WIDTH_MOBILE_PX, height: GAUGE_HEIGHT_MOBILE_PX }
    : { width: GAUGE_WIDTH_PX, height: GAUGE_HEIGHT_PX };
}

/** Quantize for SVG output so SSR and browser agree (avoids hydration mismatches on path d / coords). */
function roundSvg(n: number, decimals = 5): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

function useCompactGaugeLayout() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

function polar(cx: number, cy: number, r: number, rad: number) {
  return { x: roundSvg(cx + r * Math.cos(rad)), y: roundSvg(cy - r * Math.sin(rad)) };
}

function donutSlicePath(cx: number, cy: number, rIn: number, rOut: number, aLo: number, aHi: number) {
  const pLoO = polar(cx, cy, rOut, aLo);
  const pHiO = polar(cx, cy, rOut, aHi);
  const pHiI = polar(cx, cy, rIn, aHi);
  const pLoI = polar(cx, cy, rIn, aLo);
  return [
    `M ${pLoO.x} ${pLoO.y}`,
    `A ${rOut} ${rOut} 0 0 1 ${pHiO.x} ${pHiO.y}`,
    `L ${pHiI.x} ${pHiI.y}`,
    `A ${rIn} ${rIn} 0 0 0 ${pLoI.x} ${pLoI.y}`,
    "Z",
  ].join(" ");
}

function useSegmentPaths() {
  return useMemo(() => {
    const { cx, cy, rOut, rIn } = VB;
    const segW = (ARC - 4 * GAP) / 5;
    const paths: string[] = [];
    for (let i = 0; i < 5; i++) {
      const a0 = Math.PI - i * (segW + GAP);
      const a1 = a0 - segW;
      paths.push(donutSlicePath(cx, cy, rIn, rOut, a1, a0));
    }
    return paths;
  }, []);
}

function TickLines({ tickColor }: { tickColor: string }) {
  const { cx, cy, rIn } = VB;
  const n = 26;
  const r0 = rIn - 2.75;
  const r1 = rIn - 0.35;
  const lines = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number; w: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ang = Math.PI * (1 - t);
      const long = i % 4 === 0;
      const rr0 = long ? r0 - 1.75 : r0;
      const p0 = polar(cx, cy, rr0, ang);
      const p1 = polar(cx, cy, r1, ang);
      arr.push({
        x1: roundSvg(p0.x),
        y1: roundSvg(p0.y),
        x2: roundSvg(p1.x),
        y2: roundSvg(p1.y),
        w: long ? 1.15 : 0.65,
      });
    }
    return arr;
  }, []);
  return (
    <g stroke={tickColor} strokeLinecap="round">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={l.w} />
      ))}
    </g>
  );
}

function SvgGauge({
  segments,
  fill,
  active,
  inactive,
  reduceMotion,
  motionDelayMs,
  ariaLabel,
  widthPx,
  heightPx,
  className,
}: {
  segments: readonly string[];
  fill: string;
  active: number;
  inactive: number;
  reduceMotion: boolean;
  motionDelayMs: number;
  ariaLabel: string;
  widthPx: number;
  heightPx: number;
  className?: string;
}) {
  const tickFilterId = useId().replace(/:/g, "");
  const segPaths = useSegmentPaths();
  const total = active + inactive;
  const ratio = total > 0 ? active / total : 0;
  const needleDeg = roundSvg(180 * ratio - 90, 4);
  const { cx, cy } = VB;
  const arcD = `M ${roundSvg(cx - 11)} ${roundSvg(cy + 1.5)} A 11 11 0 0 1 ${roundSvg(cx + 11)} ${roundSvg(cy + 1.5)}`;
  const polyPts = `${roundSvg(cx - 1.6)},${roundSvg(cy)} ${roundSvg(cx + 1.6)},${roundSvg(cy)} ${roundSvg(cx)},${roundSvg(cy - 28.5)}`;

  return (
    <svg
      width={widthPx}
      height={heightPx}
      viewBox={`${VB_VIEW.x} ${VB_VIEW.y} ${VB_VIEW.w} ${VB_VIEW.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "block shrink-0",
        !reduceMotion && "motion-safe:max-lg:[animation:staffGaugeDrift_2.85s_ease-in-out_infinite]",
        className,
      )}
      style={
        !reduceMotion ? ({ animationDelay: `${motionDelayMs}ms` } satisfies CSSProperties) : undefined
      }
    >
      <defs>
        <filter id={tickFilterId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>
      {segPaths.map((d, i) => (
        <path key={i} d={d} fill={segments[i]} stroke="rgba(0,0,0,0.12)" strokeWidth={0.35} />
      ))}
      <g filter={`url(#${tickFilterId})`}>
        <TickLines tickColor="rgba(248, 250, 252, 0.94)" />
      </g>
      <path
        d={arcD}
        fill="none"
        stroke={fill}
        strokeWidth={1.25}
        strokeDasharray="2 3"
        strokeLinecap="round"
        opacity={0.85}
      />
      <g
        transform={`rotate(${needleDeg} ${roundSvg(cx)} ${roundSvg(cy)})`}
        style={
          reduceMotion
            ? undefined
            : { transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)" }
        }
      >
        <polygon points={polyPts} fill="#dc2626" stroke="#991b1b" strokeWidth={0.35} />
        <circle cx={roundSvg(cx)} cy={roundSvg(cy)} r={4.2} fill="#0a0a0a" stroke="#262626" strokeWidth={0.4} />
      </g>
    </svg>
  );
}

const ROLE_FILTER_HREF: Record<(typeof ROLES)[number]["key"], keyof StaffHubFilterHrefs> = {
  manager: "manager",
  reseller: "reseller",
  dealer: "dealer",
};

export function StaffActiveStatusGauges3D({
  managerActive,
  managerInactive,
  resellerActive,
  resellerInactive,
  dealerActive,
  dealerInactive,
  filterHrefs,
  activeType,
  className,
  hideManagers = false,
  hideResellers = false,
}: StaffActiveStatusGauges3DProps) {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const compactGauge = useCompactGaugeLayout();
  const gaugePx = gaugeSizePx(compactGauge);

  const navigateFilter = useCallback(
    (href: string) => {
      requestAnimationFrame(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  const units =
    hideManagers && hideResellers
      ? [{ ...ROLES[2], active: dealerActive, inactive: dealerInactive }]
      : hideManagers
        ? [
            { ...ROLES[1], active: resellerActive, inactive: resellerInactive },
            { ...ROLES[2], active: dealerActive, inactive: dealerInactive },
          ]
        : hideResellers
          ? [
              { ...ROLES[0], active: managerActive, inactive: managerInactive },
              { ...ROLES[2], active: dealerActive, inactive: dealerInactive },
            ]
          : [
              { ...ROLES[0], active: managerActive, inactive: managerInactive },
              { ...ROLES[1], active: resellerActive, inactive: resellerInactive },
              { ...ROLES[2], active: dealerActive, inactive: dealerInactive },
            ];
  const groupAria = units
    .map((u) => {
      const t = u.active + u.inactive;
      const p = t > 0 ? Math.round((u.active / t) * 100) : 0;
      return `${u.label}: ${formatInt(u.active)} active, ${formatInt(u.inactive)} inactive, ${p}% active share`;
    })
    .join(". ");

  return (
    <div
      className={cn(
        "box-border flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl bg-transparent px-1 py-0 sm:px-1.5",
        className,
      )}
      role="group"
      aria-label={`Active vs inactive by role. ${groupAria}.`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes staffGaugeDrift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}
`,
        }}
      />
      <div className="flex w-full min-w-0 flex-1 flex-row flex-nowrap items-stretch justify-between gap-1.5 sm:gap-x-3">
        {units.map((u, i) => {
          const total = u.active + u.inactive;
          const pct = total > 0 ? Math.round((u.active / total) * 100) : 0;
          const href = filterHrefs ? filterHrefs[ROLE_FILTER_HREF[u.key]] : undefined;
          const isActive = activeType === u.key;
          const cardClassName = cn(
            "relative isolate box-border flex min-w-0 flex-1 flex-col items-center overflow-hidden rounded-xl border border-border/40 bg-transparent px-1.5 py-1 transition-colors duration-200 sm:px-2",
            "hover:border-border/55",
          );
          const cardTitle = `${u.label}: ${formatInt(u.active)} active (${pct}%), ${formatInt(u.inactive)} inactive`;
          const cardInner = (
            <div className={cardClassName} title={cardTitle}>
              <div
                className="pointer-events-none absolute right-1.5 top-1 z-[2] flex flex-col items-end leading-none"
                aria-hidden
              >
                <span
                  className="text-[12px] font-bold tabular-nums tracking-tight antialiased sm:text-[13px]"
                  style={{ color: u.fill }}
                >
                  {pct}%
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75 sm:text-[9px]">
                  active
                </span>
              </div>

              <div
                className="relative flex w-full shrink-0 items-end justify-center overflow-visible pt-3.5"
                style={{ height: gaugePx.height + 14, minHeight: gaugePx.height + 14 }}
              >
                <HudGroundShadow size="sm" className="bottom-0.5" />
                <div className="relative z-[1]">
                  <SvgGauge
                    segments={u.segments}
                    fill={u.fill}
                    active={u.active}
                    inactive={u.inactive}
                    reduceMotion={reduceMotion}
                    motionDelayMs={i * 120}
                    widthPx={gaugePx.width}
                    heightPx={gaugePx.height}
                    ariaLabel={cardTitle}
                  />
                </div>
              </div>

              <p className="flex w-full min-w-0 flex-nowrap items-center justify-center gap-1 truncate pb-0.5 text-center text-[10px] leading-snug antialiased sm:gap-1.5 sm:text-[11px]">
                <span className="shrink-0 font-semibold lowercase tracking-wide" style={{ color: u.fill }}>
                  {ROLE_SHORT_LABEL[u.key]}
                </span>
                <span className="shrink-0 text-foreground/25" aria-hidden>
                  ·
                </span>
                <span className="min-w-0 truncate font-medium tabular-nums tracking-tight text-muted-foreground/90">
                  <span className="font-semibold text-foreground/95" style={{ color: u.fill }}>
                    {formatInt(u.active)}
                  </span>
                  <span className="text-muted-foreground/90"> act</span>
                  <span className="mx-0.5 text-foreground/30" aria-hidden>
                    ·
                  </span>
                  <span className="font-semibold text-foreground/90">{formatInt(u.inactive)}</span>
                  <span className="text-muted-foreground/90"> in</span>
                </span>
              </p>
            </div>
          );
          if (!href) return <div key={u.key} className="flex min-w-0 flex-1">{cardInner}</div>;
          return (
            <Link
              key={u.key}
              href={href}
              prefetch={false}
              className={cn(
                "flex min-w-0 flex-1 overflow-hidden rounded-xl outline-none transition-[ring-color]",
                "ring-1 ring-slate-200/80 hover:ring-cyan-500/30",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                "dark:ring-border/50 dark:hover:ring-cyan-400/35",
              )}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigateFilter(href);
              }}
            >
              {cardInner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
