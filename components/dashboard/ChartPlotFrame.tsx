import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * HUD-style frame around the Recharts plot only (not titles/footers).
 * Default: soft panel + gradient hairlines. `plain`: borderless, no fill/shadow (for minimal HUD blocks).
 */
export function ChartPlotFrame({
  className,
  children,
  plain = false,
}: {
  className?: string;
  children: ReactNode;
  /** No background, shadow, ring, or accent lines — layout wrapper only. */
  plain?: boolean;
}) {
  if (plain) {
    return <div className={cn("relative min-h-0 min-w-0 overflow-visible", className)}>{children}</div>;
  }
  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden rounded-xl",
        "border border-cyan-500/25",
        "bg-[linear-gradient(145deg,rgba(34,211,238,0.08)_0%,rgba(15,23,42,0.42)_36%,transparent_52%,rgba(168,85,247,0.06)_100%)]",
        "shadow-[inset_0_1px_0_rgba(34,211,238,0.14),0_0_32px_-14px_rgba(34,211,238,0.3)]",
        "ring-1 ring-inset ring-white/[0.07]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-px bg-gradient-to-r from-transparent via-cyan-400/65 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}
