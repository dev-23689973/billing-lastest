"use client";

import { cn } from "@/lib/cn";

const tickDefault = "border-cyan-600/28 dark:border-cyan-400/[0.2]";
/** Brighter L-brackets (floating menus / image-2 style). */
const tickBright = "border-cyan-500/55 dark:border-cyan-300/60";
/** Support / tickets HUD panels (amber brackets — distinct from message delivery cyan). */
const tickAmber = "border-amber-500/50 dark:border-amber-400/55";

/** L-bracket corners matching managers toolbar `SelectContent` (`hudCorners`). */
export function HudCornerOverlay({
  className,
  tone = "default",
}: {
  className?: string;
  /** `bright` — stronger cyan corners (row action menus, page-size style). */
  tone?: "default" | "bright" | "amber";
}) {
  const tick = tone === "bright" ? tickBright : tone === "amber" ? tickAmber : tickDefault;
  const sz = tone === "bright" ? "h-3 w-3" : "h-2.5 w-2.5";
  return (
    <div className={cn("hud-corner-overlay pointer-events-none absolute inset-0 z-[2]", className)} aria-hidden>
      <span className={cn("absolute left-0 top-0 border-l border-t", sz, tick)} />
      <span className={cn("absolute right-0 top-0 border-r border-t", sz, tick)} />
      <span className={cn("absolute bottom-0 left-0 border-b border-l", sz, tick)} />
      <span className={cn("absolute bottom-0 right-0 border-b border-r", sz, tick)} />
    </div>
  );
}
