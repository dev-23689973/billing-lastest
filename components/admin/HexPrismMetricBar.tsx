"use client";

import { useLivingSmooth } from "@/components/dashboard/useLivingCount";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cn";

type HexPrismMetricBarProps = {
  fillPercent: number;
  fillColor: string;
  shadeColor: string;
  className?: string;
  ariaLabel: string;
  staggerIndex?: number;
};

/**
 * Ledger activity-mix bar — static fill on light; dark gets a slow width tween only (no sheen/glow pulse).
 */
export function HexPrismMetricBar({
  fillPercent,
  fillColor,
  shadeColor,
  className,
  ariaLabel,
}: HexPrismMetricBarProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const livingPct = useLivingSmooth(fillPercent, 1400);
  const pct = Math.min(100, Math.max(0, isLight ? fillPercent : livingPct));

  const width =
    pct > 0.4 ? `${pct}%` : pct > 0 ? "4px" : "0%";

  return (
    <div
      className={cn(
        "relative h-3.5 w-full min-w-0 overflow-hidden rounded-[7px] p-[3px]",
        isLight
          ? "border border-slate-200 bg-slate-100"
          : "border border-cyan-500/12 bg-slate-950/55 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "relative h-full max-w-full overflow-hidden rounded-[5px]",
          !isLight &&
            "motion-safe:transition-[width] motion-safe:duration-[1.4s] motion-safe:ease-out",
        )}
        style={{
          width,
          background: `linear-gradient(90deg, ${shadeColor} 0%, ${fillColor} 50%, ${fillColor} 100%)`,
          boxShadow: isLight ? undefined : `0 0 6px -4px ${fillColor}40`,
        }}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 rounded-[inherit] bg-gradient-to-b to-transparent",
            isLight ? "h-[45%] from-white/30" : "h-[35%] from-white/20",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}
