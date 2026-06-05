import { cn } from "@/lib/cn";

const insetMap = {
  sm: { tl: "left-2 top-2", tr: "right-2 top-2", bl: "left-2 bottom-2", br: "right-2 bottom-2", arm: 10 },
  md: { tl: "left-3 top-3", tr: "right-3 top-3", bl: "left-3 bottom-3", br: "right-3 bottom-3", arm: 12 },
  lg: { tl: "left-4 top-4", tr: "right-4 top-4", bl: "left-4 bottom-4", br: "right-4 bottom-4", arm: 14 },
} as const;

/** Flush to panel edge — pairs with `frame` (menu-style overlap on thin border). */
const flushMap = {
  sm: { tl: "left-0 top-0", tr: "right-0 top-0", bl: "left-0 bottom-0", br: "right-0 bottom-0", arm: 11 },
  md: { tl: "left-0 top-0", tr: "right-0 top-0", bl: "left-0 bottom-0", br: "right-0 bottom-0", arm: 13 },
  lg: { tl: "left-0 top-0", tr: "right-0 top-0", bl: "left-0 bottom-0", br: "right-0 bottom-0", arm: 15 },
} as const;

/** One crisp L (two segments); stroke centered in viewBox */
function CornerSvg({
  variant,
  size,
  strokeWidth,
  className,
}: {
  variant: "tl" | "tr" | "bl" | "br";
  size: number;
  strokeWidth: 1 | 2;
  className?: string;
}) {
  const s = size;
  const o = strokeWidth / 2;
  const d =
    variant === "tl"
      ? `M ${o} ${o} H ${s - o} M ${o} ${o} V ${s - o}`
      : variant === "tr"
        ? `M ${s - o} ${o} H ${o} M ${s - o} ${o} V ${s - o}`
        : variant === "bl"
          ? `M ${o} ${s - o} H ${s - o} M ${o} ${s - o} V ${o}`
          : `M ${s - o} ${s - o} H ${o} M ${s - o} ${s - o} V ${o}`;

  return (
    <svg
      className={cn("shrink-0 overflow-visible", className)}
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      aria-hidden
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * HUD frame: optional thin continuous border + L corners (brighter / thicker when accenting).
 * “Living” = soft border + corner pulse (disabled when `prefers-reduced-motion: reduce` via CSS).
 */
export function HudCornerBrackets({
  className,
  inset = "md",
  frame = true,
  living = true,
  variant = "default",
}: {
  className?: string;
  inset?: keyof typeof insetMap;
  /** Thin cyan rectangle (context-menu style). */
  frame?: boolean;
  /** Subtle breathe on frame + staggered pulse on corners. */
  living?: boolean;
  /** `muted`: darker slate frame/corners for low-contrast panels (e.g. activity overview). */
  variant?: "default" | "muted";
}) {
  const useFlush = frame;
  const p = useFlush ? flushMap[inset] : insetMap[inset];
  const arm = p.arm;
  const accent = frame || living;
  const stroke: 1 | 2 = accent ? 2 : 1;
  const muted = variant === "muted";
  const cornerColor = muted
    ? accent
      ? "text-slate-400/75 dark:text-slate-500/50"
      : "text-slate-600 dark:text-slate-300/90 dark:text-slate-600/40"
    : accent
      ? "text-primary/50 dark:text-[rgb(103,232,249)]/55"
      : "text-primary/35 dark:text-[rgb(125,211,252)]/40";

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0", className)} aria-hidden>
      {frame ? (
        <div
          className={cn(
            "hud-living-panel-frame absolute inset-0 rounded-none border",
            muted
              ? "hud-living-panel-frame--muted border-slate-300/90 dark:border-slate-600/30"
              : "border-primary/25 dark:border-cyan-400/12",
            living && "hud-living-panel-frame--animate",
          )}
        />
      ) : null}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span
          key={corner}
          data-corner={corner}
          className={cn("absolute", p[corner], living && "hud-living-panel-corner--animate")}
        >
          <CornerSvg variant={corner} size={arm} strokeWidth={stroke} className={cornerColor} />
        </span>
      ))}
    </div>
  );
}
