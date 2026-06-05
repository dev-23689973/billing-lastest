"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, Check, ChevronDown } from "lucide-react";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarSearchableDropdownItemCompactClass,
  managersToolbarSearchableDropdownListBoxClass,
  managersToolbarSearchableDropdownListClass,
  managersToolbarSearchableDropdownScrollFillClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { formatRenewPeriodOptionLabel, isRenewPromoOption } from "@/lib/renewModalDisplay";
import { cn } from "@/lib/cn";
import type { ValidityOption } from "@/lib/validityOptions";

const VIEW_MARGIN = 8;
const ANCHOR_GAP = 6;

export function RenewPeriodSelect({
  value,
  onValueChange,
  options,
  labelledBy,
  disabled = false,
}: {
  value: string;
  onValueChange: (next: string) => void;
  options: ValidityOption[];
  labelledBy?: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [panelBox, setPanelBox] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 360,
  });

  const labeledOptions = useMemo(
    () => options.map((o) => ({ ...o, displayLabel: formatRenewPeriodOptionLabel(o), promo: isRenewPromoOption(o) })),
    [options],
  );
  const selected = labeledOptions.find((o) => o.value === value);

  const reposition = useCallback(() => {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const width = Math.max(r.width, 320);
    const left = Math.min(Math.max(VIEW_MARGIN, r.left), window.innerWidth - width - VIEW_MARGIN);
    const spaceBelow = window.innerHeight - r.bottom - ANCHOR_GAP - VIEW_MARGIN;
    const spaceAbove = r.top - ANCHOR_GAP - VIEW_MARGIN;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, openUp ? spaceAbove : spaceBelow);
    const top = openUp ? Math.max(VIEW_MARGIN, r.top - ANCHOR_GAP - Math.min(maxHeight, 360)) : r.bottom + ANCHOR_GAP;
    setPanelBox({ top, left, width, maxHeight });
  }, []);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
  }, [open, reposition, labeledOptions.length]);

  useEffect(() => {
    if (!open) return;
    function onReflow() {
      reposition();
    }
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const dropdownPanel =
    open && mounted ? (
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[420] flex min-h-0 flex-col overflow-hidden p-1.5 text-popover-foreground shadow-xl",
          managersToolbarDropdownPanelClass,
        )}
        style={{
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          maxHeight: panelBox.maxHeight,
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className={cn(managersToolbarSearchableDropdownListBoxClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <div
            role="listbox"
            aria-labelledby={labelledBy}
            className={cn(managersToolbarSearchableDropdownListClass, managersToolbarSearchableDropdownScrollFillClass)}
          >
            {labeledOptions.map((o) => {
              const selectedRow = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onValueChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    managersToolbarSearchableDropdownItemCompactClass,
                    "!justify-start gap-2 text-left",
                    selectedRow && "bg-violet-500/10 font-medium text-foreground",
                    !selectedRow && o.promo && "text-emerald-700 dark:text-emerald-300",
                  )}
                  role="option"
                  aria-selected={selectedRow}
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    {selectedRow ? (
                      <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" aria-hidden />
                    ) : (
                      <Calculator className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{o.displayLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          managersToolbarSelectTriggerClass,
          "!shrink min-w-0 font-normal",
          "h-11 gap-2 border-violet-500/35 px-3 focus-visible:border-violet-500 focus-visible:ring-violet-500/20",
          open && "border-violet-500 ring-2 ring-violet-500/15",
        )}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Calculator className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left text-sm leading-none">
          {selected?.displayLabel ?? "Select renewal period…"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-80" aria-hidden />
      </button>
      {dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}
