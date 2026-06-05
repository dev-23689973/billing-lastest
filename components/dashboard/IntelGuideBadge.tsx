"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Content for an intel-guide popup. Description text in `body` should explain
 * what the section / chart / table shows and what each field means.
 */
export type IntelTip = {
  title: string;
  body: ReactNode;
};

/** HUD intel mark: lowercase “i” inside concentric cyan rings + outer glow (shared across dashboards). */
export function IntelGuideMark({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const halo = size === "sm" ? "-inset-[3px]" : "-inset-[4px]";
  const innerInset = size === "sm" ? "inset-[2px]" : "inset-[3px]";
  const glyph = size === "sm" ? "text-[11px]" : "text-[13px]";

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full", box)} aria-hidden>
      <span
        className={cn(
          "pointer-events-none absolute rounded-full bg-primary/10 blur-[2px] dark:bg-cyan-400/[0.14] dark:blur-[3.5px]",
          halo,
        )}
      />
      <span className="pointer-events-none absolute inset-0 rounded-full border border-primary/30 shadow-[0_0_8px_rgba(8,145,178,0.2)] dark:border-cyan-400/40 dark:shadow-[0_0_16px_rgba(34,211,238,0.45),inset_0_0_12px_rgba(34,211,238,0.06)]" />
      <span
        className={cn(
          "pointer-events-none absolute rounded-full border border-primary/25 dark:border-cyan-100/80",
          innerInset,
        )}
      />
      <span
        className={cn(
          "intel-guide-mark-glyph relative z-[1] font-mono font-semibold lowercase leading-none tracking-tight text-primary dark:text-cyan-50",
          glyph,
        )}
      >
        i
      </span>
    </span>
  );
}

type PopupPlacement = "top" | "bottom";
type PopupCoords = { top: number; left: number; width: number; placement: PopupPlacement };

/**
 * Compute popup coordinates anchored to a trigger rect.
 *  - Prefers placement below the trigger; flips above if there isn't enough room.
 *  - Right-aligns to the trigger's right edge by default and then clamps to the
 *    viewport edges with an 8px gutter on both sides.
 */
function computeTipCoords(triggerRect: DOMRect, popupHeight: number): PopupCoords {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, width: 260, placement: "bottom" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const width = Math.max(220, Math.min(320, vw - 2 * margin));
  const spaceBelow = vh - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const placement: PopupPlacement =
    spaceBelow >= popupHeight + margin || spaceBelow >= spaceAbove ? "bottom" : "top";
  let left = triggerRect.right - width;
  if (left < margin) left = margin;
  if (left + width > vw - margin) left = vw - margin - width;
  const top = placement === "bottom" ? triggerRect.bottom + margin : Math.max(margin, triggerRect.top - margin - popupHeight);
  return { top, left, width, placement };
}

/** HUD intel — ringed “i” only by default; pass `showLabel` for pill + text. */
export function IntelGuideBadge({
  label = "INTEL_GUIDE",
  size = "sm",
  orientation = "horizontal",
  showLabel = false,
  tip,
  className,
  onClick,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  label?: string;
  size?: "sm" | "md";
  /** Vertical stack (mark on top) — avoids `rotate-*` layout drift in tight corners. */
  orientation?: "horizontal" | "vertical";
  /** When true, shows `label` next to the mark in the bordered pill. Default false (icon only). */
  showLabel?: boolean;
  /**
   * Optional hover popup content. When provided, the badge becomes interactive:
   * hover/focus opens the popup, click toggles, and the popup itself is hoverable
   * so users can read it / interact with links inside.
   */
  tip?: IntelTip;
}) {
  const hasLabel = showLabel && label.trim().length > 0;
  const tipId = useId();

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopupCoords | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const popupHeight = popupRef.current?.offsetHeight ?? 180;
    setCoords(computeTipCoords(trigger.getBoundingClientRect(), popupHeight));
  }, []);

  useIsoLayout(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, updatePosition]);

  // After the popup actually mounts we know its real height — re-measure.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(id);
  }, [open, updatePosition]);

  // Outside-click / Escape to dismiss (covers touch + keyboard).
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const interactive = !!tip;

  const rowSm =
    "inline-flex flex-row items-center gap-2 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em]";
  const rowMd =
    "inline-flex flex-row items-center gap-2.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]";
  const colSm =
    "inline-flex flex-col items-center gap-1.5 px-1 py-1 text-[8px] font-semibold uppercase tracking-[0.2em] leading-none";
  const colMd =
    "inline-flex flex-col items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] leading-none";

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (interactive) setOpen((prev) => !prev);
    onClick?.(e);
  };

  return (
    <>
      <div
        ref={triggerRef}
        role={interactive ? "button" : "status"}
        tabIndex={interactive ? 0 : -1}
        aria-label={label}
        aria-haspopup={interactive ? "dialog" : undefined}
        aria-expanded={interactive ? open : undefined}
        aria-describedby={interactive && open ? tipId : undefined}
        onMouseEnter={interactive ? openNow : undefined}
        onMouseLeave={interactive ? scheduleClose : undefined}
        onFocus={interactive ? openNow : undefined}
        onBlur={interactive ? scheduleClose : undefined}
        onClick={handleClick}
        className={cn(
          "pointer-events-auto animate-living-admin-badge rounded-full",
          interactive &&
            "cursor-help select-none transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 dark:focus-visible:ring-cyan-400/60",
          hasLabel
            ? cn(
                "border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm backdrop-blur-sm dark:border-cyan-400/14 dark:bg-slate-950/40 dark:text-slate-400/95 dark:shadow-none",
                orientation === "vertical"
                  ? size === "sm"
                    ? colSm
                    : colMd
                  : size === "sm"
                    ? rowSm
                    : rowMd,
              )
            : "inline-flex items-center justify-center border-0 bg-transparent p-0 shadow-none backdrop-blur-0",
          className,
        )}
        {...rest}
      >
        <IntelGuideMark size={size} />
        {hasLabel ? (
          <span
            className={cn(
              "max-w-[11rem] truncate",
              orientation === "vertical" &&
                "max-h-[9rem] max-w-none [text-orientation:mixed] [writing-mode:vertical-rl]",
            )}
          >
            {label}
          </span>
        ) : null}
      </div>

      {interactive && open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              id={tipId}
              role="tooltip"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              style={
                coords
                  ? { top: coords.top, left: coords.left, width: coords.width, opacity: 1 }
                  : { top: -9999, left: -9999, opacity: 0 }
              }
              className={cn(
                "intel-guide-popup thin-scrollbar pointer-events-auto fixed isolate z-[400] max-h-[70vh] overflow-y-auto overscroll-contain rounded-lg border p-3 font-mono text-[11px] leading-relaxed sm:p-3.5 [scrollbar-gutter:stable]",
                "border-slate-200/90 bg-white text-slate-700 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80",
                "dark:scrollbar-surface-dark dark:border-cyan-400/30 dark:bg-slate-950/95 dark:text-slate-200 dark:shadow-[0_10px_32px_rgba(2,6,23,0.7)] dark:ring-cyan-500/10 dark:backdrop-blur-md",
              )}
            >
              {tip?.title ? (
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary dark:text-cyan-300">
                  <span
                    className="h-1 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_4px_rgba(8,145,178,0.35)] dark:bg-cyan-400 dark:shadow-[0_0_6px_rgba(34,211,238,0.7)]"
                    aria-hidden
                  />
                  {tip.title}
                </p>
              ) : null}
              <div
                className={cn(
                  "intel-guide-popup-body space-y-1.5 text-slate-600",
                  "[&_a]:text-primary [&_a:hover]:text-primary/80 [&_a]:underline-offset-2 [&_a:hover]:underline",
                  "[&_code]:rounded [&_code]:border [&_code]:border-slate-200 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-slate-800",
                  "dark:text-slate-300/95 dark:[&_a]:text-cyan-300 dark:[&_a:hover]:text-cyan-200",
                  "dark:[&_code]:border-cyan-400/15 dark:[&_code]:bg-slate-900/70 dark:[&_code]:text-cyan-100/95",
                )}
              >
                {tip?.body}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
