"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Placement = "top" | "bottom";

/** Above sticky table chrome and row layers. */
const POPOVER_Z = "z-[1200]";

export function ConfirmStatusChangePopover({
  anchorRef,
  entityName,
  currentStatusLabel,
  nextStatusLabel,
  saving,
  onCancel,
  onConfirm,
  titleId = "status-change-confirm-title",
}: {
  anchorRef: RefObject<HTMLElement | null>;
  entityName: string;
  currentStatusLabel: string;
  nextStatusLabel: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  titleId?: string;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: Placement } | null>(null);

  const confirmClass =
    nextStatusLabel === "Active"
      ? "bg-emerald-600 text-white hover:bg-emerald-500"
      : "bg-rose-600 text-white hover:bg-rose-500";

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    function place() {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const estimatedHeight = 36;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: Placement =
        spaceBelow < estimatedHeight + gap && rect.top > estimatedHeight + gap ? "top" : "bottom";
      const top = placement === "bottom" ? rect.bottom + gap : rect.top - gap;
      const left = rect.left + rect.width / 2;
      setCoords({ top, left, placement });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, onConfirm]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onCancel();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [anchorRef, onCancel]);

  if (!coords || typeof document === "undefined") return null;

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      title={`${entityName}: ${currentStatusLabel} → ${nextStatusLabel}`}
      className={cn(
        "fixed overflow-hidden rounded-md border border-slate-200 bg-[#ffffff] text-slate-900",
        "shadow-[0_10px_28px_rgba(15,23,42,0.22)]",
        "dark:border-slate-500 dark:bg-[#1a2332] dark:text-slate-100 dark:shadow-[0_10px_32px_rgba(0,0,0,0.55)]",
        POPOVER_Z,
      )}
      style={{
        top: coords.top,
        left: coords.left,
        transform: coords.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="relative flex items-center gap-2 bg-[#ffffff] px-2 py-1.5 dark:bg-[#1a2332]">
        <p id={titleId} className="relative z-[1] whitespace-nowrap text-[11px] font-medium leading-none">
          <span className="text-slate-600 dark:text-slate-400">{currentStatusLabel}</span>
          <span className="mx-1 text-slate-400">→</span>
          <span
            className={cn(
              nextStatusLabel === "Active"
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300",
            )}
          >
            {nextStatusLabel}
          </span>
          <span className="text-slate-600 dark:text-slate-400">?</span>
        </p>
        <div className="relative z-[1] flex shrink-0 items-center gap-1 border-l border-slate-200 bg-[#ffffff] pl-2 dark:border-slate-500 dark:bg-[#1a2332]">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="inline-flex h-6 items-center rounded px-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            No
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            autoFocus
            className={cn(
              "inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold disabled:opacity-50",
              confirmClass,
            )}
          >
            {saving ? "…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popover, document.body);
}
