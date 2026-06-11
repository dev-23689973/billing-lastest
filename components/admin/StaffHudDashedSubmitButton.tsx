"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { OperatorRole } from "@/components/dashboard/operatorRoleColors";
import { cn } from "@/lib/cn";

const cornerPlusBase =
  "pointer-events-none absolute z-[2] flex h-3.5 w-3.5 items-center justify-center font-mono text-[12px] font-semibold leading-none";

const roleChrome: Record<
  OperatorRole,
  { button: string; svg: string; corner: string; label: string }
> = {
  manager: {
    button:
      "border border-violet-300 bg-white text-violet-800 shadow-sm hover:bg-violet-50 dark:border-0 dark:bg-violet-950/[0.38] dark:text-violet-300 dark:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.18)] dark:hover:bg-violet-500/[0.18] dark:hover:text-violet-200 focus-visible:ring-violet-400/40",
    svg: "text-violet-400 dark:text-violet-300",
    corner:
      "text-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.45)] dark:text-violet-200 dark:drop-shadow-[0_0_6px_rgba(167,139,250,0.35)]",
    label: "text-violet-600 dark:text-violet-300",
  },
  reseller: {
    button:
      "border border-cyan-600 bg-white text-cyan-800 shadow-sm hover:bg-cyan-50 dark:border-0 dark:bg-cyan-950/[0.38] dark:text-cyan-300 dark:shadow-[inset_0_0_0_1px_rgba(103,232,249,0.14)] dark:hover:bg-cyan-500/[0.18] dark:hover:text-cyan-200 focus-visible:ring-cyan-400/40",
    svg: "text-cyan-400 dark:text-cyan-300",
    corner:
      "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.45)] dark:text-cyan-200 dark:drop-shadow-[0_0_6px_rgba(103,232,249,0.35)]",
    label: "text-cyan-600 dark:text-cyan-300",
  },
  dealer: {
    button:
      "border border-rose-400 bg-white text-rose-800 shadow-sm hover:bg-rose-50 dark:border-0 dark:bg-rose-950/[0.38] dark:text-rose-300 dark:shadow-[inset_0_0_0_1px_rgba(251,113,133,0.18)] dark:hover:bg-rose-500/[0.18] dark:hover:text-rose-200 focus-visible:ring-rose-400/40",
    svg: "text-rose-400 dark:text-rose-300",
    corner:
      "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.45)] dark:text-rose-200 dark:drop-shadow-[0_0_6px_rgba(251,113,133,0.35)]",
    label: "text-rose-600 dark:text-rose-300",
  },
};

const outlineChrome = {
  button:
    "border border-slate-300 bg-white text-foreground shadow-sm hover:bg-slate-50 dark:border-0 dark:bg-white/[0.04] dark:text-zinc-100 dark:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)] dark:hover:bg-white/[0.07] focus-visible:ring-cyan-400/25",
  svg: "text-muted-foreground/85 dark:text-slate-400/90",
  corner: "text-muted-foreground/75 dark:text-slate-400/85",
  label: "text-foreground dark:text-zinc-100",
};

/** Optional glass fill for accent HUD actions (compose send, deductions save). */
export const staffHudAccentGlassClass = cn(
  "dark:backdrop-blur-sm dark:bg-cyan-950/15 dark:hover:bg-cyan-500/12",
  "dark:shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09)]",
);

export type StaffHudDashedButtonProps = ComponentPropsWithoutRef<"button"> & {
  role?: OperatorRole;
  /** Accent = role tint (Create manager). Outline = neutral frame (Reset). */
  variant?: "accent" | "outline";
};

/** SVG dashed frame + “+” corner marks (shared HUD button chrome). */
export function StaffHudDashedButton({
  className,
  children,
  disabled,
  role = "reseller",
  variant = "accent",
  type = "submit",
  ...rest
}: StaffHudDashedButtonProps) {
  const chrome = variant === "outline" ? outlineChrome : roleChrome[role];
  const cornerPlus = cn(cornerPlusBase, chrome.corner);

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "relative inline-flex w-full min-h-10 items-center justify-center gap-1.5 overflow-visible rounded-md border-0 px-4 py-2 text-sm font-semibold tracking-tight outline-none transition-[color,background-color,box-shadow]",
        chrome.button,
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-45 sm:w-auto",
        className,
      )}
      {...rest}
    >
      <svg
        className={cn(
          "pointer-events-none absolute inset-0 z-0 hidden h-full w-full overflow-visible dark:block",
          chrome.svg,
        )}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect
          x="1.25"
          y="1.25"
          width="97.5"
          height="97.5"
          rx="7"
          ry="7"
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.92}
          strokeWidth={1.25}
          strokeDasharray="1 3"
          vectorEffect="nonScalingStroke"
        />
      </svg>
      <span
        className={cn(cornerPlus, "left-0 top-0 hidden -translate-x-1/2 -translate-y-1/2 dark:flex")}
        aria-hidden
      >
        +
      </span>
      <span
        className={cn(cornerPlus, "right-0 top-0 hidden translate-x-1/2 -translate-y-1/2 dark:flex")}
        aria-hidden
      >
        +
      </span>
      <span
        className={cn(cornerPlus, "bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 dark:flex")}
        aria-hidden
      >
        +
      </span>
      <span
        className={cn(cornerPlus, "bottom-0 right-0 hidden translate-x-1/2 translate-y-1/2 dark:flex")}
        aria-hidden
      >
        +
      </span>
      <span className={cn("relative z-[1] inline-flex items-center gap-2 [&_svg]:text-current", chrome.label)}>
        {children}
      </span>
    </button>
  );
}
