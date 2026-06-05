import { cn } from "@/lib/cn";

/** Faint engineering grid behind HUD panels (reusable). */
export function HudGridBackdrop({
  className,
  gridSizePx = 64,
  lineOpacity = 0.06,
}: {
  className?: string;
  /** Square cell size in px */
  gridSizePx?: number;
  lineOpacity?: number;
}) {
  const line = `rgba(148,163,184,${lineOpacity})`;
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", className)}
      style={{
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
      }}
      aria-hidden
    />
  );
}
