"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/** Fixed head + %-width tail (flush join). Far-left edge = `>` profile (tip inset). Tail = right chevron only. */
const BELT_HEAD_W = 108;
const BELT_START_IN = 11;
const BELT_HEAD_LABEL_PAD_L = BELT_START_IN + 12;
const BELT_BODY_R_TIP = 12;

const BELT_HEAD_CLIP = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${BELT_START_IN}px 50%)`;
const BELT_BODY_CLIP = `polygon(0 0, calc(100% - ${BELT_BODY_R_TIP}px) 0, 100% 50%, calc(100% - ${BELT_BODY_R_TIP}px) 100%, 0 100%)`;
const BELT_CLIP_RECT = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

function beltHeadClipPath(isFirstInTier: boolean, isOnlyInTier: boolean): string {
  if (isOnlyInTier || isFirstInTier) return BELT_HEAD_CLIP;
  return BELT_CLIP_RECT;
}

function beltBodyClipPath(isLastInTier: boolean, isOnlyInTier: boolean): string {
  if (isOnlyInTier || isLastInTier) return BELT_BODY_CLIP;
  return BELT_CLIP_RECT;
}
/** Minimum paired-column width so title + value stay legible (e.g. EXPIRING SOON). */
const BELT_PAIR_COL_MIN = "8.5rem";
const BELT_PAIR_COL_MIN_LONG = "11rem";

function beltColumnMinWidth(row: StatusChevronBeltRow): string {
  if (row.key === "expiring" || row.key === "expiringSoon" || row.label.length > 11) {
    return BELT_PAIR_COL_MIN_LONG;
  }
  return BELT_PAIR_COL_MIN;
}

export type StatusChevronBeltRow = {
  key: string;
  label: string;
  subline: string;
  /** 0–100; `total` rows should use 100. */
  widthPct: number;
  /** Raw count for column width (preferred over rounded widthPct in paired rows). */
  shareWeight?: number;
  gradient: string;
  Icon: LucideIcon;
  iconClass: string;
  href?: string;
  muted?: boolean;
};

export function beltWidthPct(count: number, denominator: number, isTotal: boolean): number {
  if (isTotal) return 100;
  if (denominator <= 0 || count <= 0) return 0;
  const raw = Math.min(100, (count / denominator) * 100);
  return Math.min(100, Math.max(raw, 12));
}

/** True share of total (0–100) for proportional belt column width — no minimum floor. */
export function beltSharePct(count: number, denominator: number, isTotal = false): number {
  if (isTotal) return 100;
  if (denominator <= 0 || count <= 0) return 0;
  return Math.min(100, Math.round((count / denominator) * 100));
}

/** Grid columns sized by shareWeight (or widthPct) so paired belts match true value ratios. */
export function tierGridTemplateColumns(tier: StatusChevronBeltRow[]): string {
  if (tier.length <= 1) return "minmax(0, 1fr)";
  const weights = tier.map((r) => Math.max(0, r.shareWeight ?? r.widthPct));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return tier.map(() => "minmax(0, 1fr)").join(" ");
  return weights
    .map((w, i) => {
      const row = tier[i]!;
      const minW = beltColumnMinWidth(row);
      if (w <= 0) return `minmax(${minW}, 0.001fr)`;
      return `minmax(${minW}, ${Math.max(w, 0.001)}fr)`;
    })
    .join(" ");
}

/** Row 1: total · row 2: active + inactive · row 3: expired + expiring */
export function groupStatusBeltRows(rows: StatusChevronBeltRow[]): StatusChevronBeltRow[][] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const pick = (...keys: string[]) =>
    keys.map((k) => byKey.get(k)).filter((r): r is StatusChevronBeltRow => Boolean(r));

  const tiers: StatusChevronBeltRow[][] = [];
  const total = byKey.get("total");
  if (total) tiers.push([total]);

  const activity = pick("active", "inactive");
  if (activity.length) tiers.push(activity);

  const expiry = pick("expired", "expiring", "expiringSoon");
  if (expiry.length) tiers.push(expiry);

  const used = new Set(tiers.flat().map((r) => r.key));
  const rest = rows.filter((r) => !used.has(r.key));
  for (const r of rest) tiers.push([r]);

  return tiers.length ? tiers : rows.map((r) => [r]);
}

export function StatusChevronBelts({
  rows,
  className,
  density = "default",
}: {
  rows: StatusChevronBeltRow[];
  className?: string;
  density?: "default" | "compact";
}) {
  const compact = density === "compact";
  const headW = compact ? 76 : BELT_HEAD_W;
  const labelPadL = compact ? BELT_START_IN + 8 : BELT_HEAD_LABEL_PAD_L;
  const rowMinH = compact ? "min-h-[28px] sm:min-h-[30px]" : "min-h-[34px] sm:min-h-[40px]";

  return (
    <div
      className={cn(
        "relative min-h-0 w-full min-w-0 flex-1 self-stretch",
        className,
      )}
    >
      <div className="flex flex-col gap-y-0.5 sm:gap-y-1">
        {groupStatusBeltRows(rows).map((tier, tierIdx) => (
          <div
            key={tier.map((r) => r.key).join("-")}
            className={cn(
              tier.length > 1
                ? "grid w-full min-w-0 items-stretch gap-x-0 gap-y-0.5"
                : "w-full min-w-0",
            )}
            style={tier.length > 1 ? { gridTemplateColumns: tierGridTemplateColumns(tier) } : undefined}
          >
            {tier.map((r, colIdx) => {
              const rowIdx = tierIdx * 2 + colIdx;
              const tailPct = 100;
              const paired = tier.length > 1;
              const isOnlyInTier = tier.length === 1;
              const isFirstInTier = colIdx === 0;
              const isLastInTier = colIdx === tier.length - 1;
              const headClip = beltHeadClipPath(isFirstInTier, isOnlyInTier);
              const bodyClip = beltBodyClipPath(isLastInTier, isOnlyInTier);
              const headCol = paired ? "minmax(4.75rem, 36%)" : `${headW}px`;
              const rowLabelPadL = paired
                ? isFirstInTier
                  ? BELT_START_IN + 6
                  : compact
                    ? 6
                    : 8
                : labelPadL;

          const sharedSurface =
            "bg-gradient-to-r text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.07)_inset,0_-6px_14px_-6px_rgba(0,0,0,0.42)_inset]";

          const glossLayer = (
            <>
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.13]"
                style={{
                  background:
                    "linear-gradient(165deg, rgba(255,255,255,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)",
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/25 via-white/12 to-white/20" />
            </>
          );

          const inner = (
            <div
              className={cn(
                "relative grid w-full min-w-0 items-stretch overflow-hidden rounded-md transition-[filter] duration-200 ease-out",
                rowMinH,
                r.muted && "opacity-50",
              )}
              style={{
                gridTemplateColumns: `${headCol} minmax(0, 1fr)`,
              }}
            >
              <div
                className={cn(
                  "relative isolate min-h-full min-w-0 overflow-hidden transition-[filter] duration-200 ease-out",
                  (isOnlyInTier || isFirstInTier) && "rounded-l-md sm:rounded-l-lg",
                  "group-hover:brightness-[1.12]",
                  sharedSurface,
                  r.gradient,
                )}
                style={{ clipPath: headClip }}
              >
                {glossLayer}
                <div
                  className={cn("relative z-[2] flex h-full w-full flex-col items-center justify-center py-0.5 text-center", rowMinH)}
                  style={{ paddingLeft: rowLabelPadL, paddingRight: compact ? 6 : paired ? 6 : 8 }}
                >
                  <span className="w-full max-w-full text-[9px] font-bold leading-[1.15] tracking-wide text-white/55 transition-[color,text-shadow,transform,filter] duration-200 ease-out drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] motion-safe:group-hover:scale-[1.05] group-hover:text-cyan-50 group-hover:brightness-110 group-hover:[text-shadow:0_0_18px_rgba(236,254,255,1),0_0_36px_rgba(34,211,238,1),0_0_56px_rgba(6,182,212,0.65)] sm:text-[10px] sm:tracking-wider">
                    <span className="line-clamp-2 break-words hyphens-auto">{r.label}</span>
                  </span>
                </div>
              </div>

              <div className="relative min-h-full min-w-0">
                <div
                  className={cn(
                    "relative isolate h-full max-w-full overflow-hidden transition-[filter] duration-200 ease-out",
                    (isOnlyInTier || isLastInTier) && "rounded-r-md sm:rounded-r-lg",
                    rowMinH,
                    "group-hover:brightness-[1.12]",
                    sharedSurface,
                    r.gradient,
                  )}
                  style={{
                    width: `${tailPct}%`,
                    clipPath: bodyClip,
                  }}
                >
                  {glossLayer}
                  <div
                    className={cn(
                      "relative z-[1] grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1",
                      compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
                      rowMinH,
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 truncate text-center text-[11px] font-semibold tabular-nums tracking-tight text-white/55 transition-[color,text-shadow,font-weight,transform,filter] duration-200 ease-out drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] motion-safe:group-hover:scale-[1.06] group-hover:text-cyan-50 group-hover:font-bold group-hover:brightness-110 group-hover:[text-shadow:0_0_18px_rgba(236,254,255,1),0_0_36px_rgba(34,211,238,1),0_0_56px_rgba(6,182,212,0.65)] sm:text-[12px]",
                      )}
                    >
                      {r.subline}
                    </span>
                    <r.Icon
                      className={cn(
                        "pointer-events-none shrink-0 transition-[transform,filter,opacity,color] duration-200 ease-out will-change-transform",
                        compact ? "size-3.5" : "size-3.5 sm:size-4",
                        "motion-safe:group-hover:scale-[1.22] motion-safe:group-hover:-rotate-6",
                        "opacity-[0.82] group-hover:opacity-100",
                        "group-hover:drop-shadow-[0_0_16px_rgba(236,254,255,1),0_0_40px_rgba(34,211,238,1),0_0_64px_rgba(6,182,212,0.75)]",
                        r.iconClass,
                        "group-hover:!text-cyan-50",
                      )}
                      strokeWidth={1.85}
                      aria-hidden
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
                    <div
                      className={cn(
                        "users-belt-sheen-motion absolute -inset-y-6 left-0 h-[calc(100%+3rem)] w-[42%] bg-gradient-to-r from-transparent via-white/28 to-transparent opacity-80",
                        r.muted && "opacity-40",
                      )}
                      style={{ animationDelay: `${rowIdx * 1.15}s` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );

          const body = r.href ? (
            <Link
              href={r.href}
              className="group block w-full max-w-full outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-cyan-400/75"
            >
              {inner}
            </Link>
          ) : (
            <div className="group">{inner}</div>
          );

          return (
            <div key={r.key} className="relative min-w-0 overflow-hidden">
              {body}
            </div>
          );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
