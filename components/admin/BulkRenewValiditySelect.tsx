"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarFormInputClass,
  managersToolbarSearchableDropdownItemClass,
  managersToolbarSearchableDropdownItemCompactClass,
  managersToolbarSearchableDropdownListBoxClass,
  managersToolbarSearchableDropdownListClass,
  managersToolbarSearchableDropdownScrollFillClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

export type BulkRenewValidityOption = { value: string; label: string };

const VIEW_MARGIN = 8;
const ANCHOR_GAP = 6;

function splitValidityLabel(label: string): { primary: string; secondary: string | null } {
  const trimmed = label.trim();
  const match = /^(.+?)\s*\((.+)\)\s*$/.exec(trimmed);
  if (!match) return { primary: trimmed, secondary: null };
  return { primary: match[1].trim(), secondary: match[2].trim() };
}

export function BulkRenewValiditySelect({
  value,
  onValueChange,
  options,
  triggerClassName,
  labelledBy,
  size = "default",
  searchPlaceholder = "Search validity...",
  emptyMessage = "No options match your search.",
  triggerPlaceholder = "Select…",
  preferOpenUp = false,
}: {
  value: string;
  onValueChange: (next: string) => void;
  options: BulkRenewValidityOption[];
  triggerClassName?: string;
  labelledBy?: string;
  size?: "default" | "compact";
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerPlaceholder?: string;
  /** Open list above trigger (renew modal footer — avoids viewport clip). */
  preferOpenUp?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelBox, setPanelBox] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 200,
    maxHeight: 280,
  });

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === value);
  const itemClass =
    size === "compact" ? managersToolbarSearchableDropdownItemCompactClass : managersToolbarSearchableDropdownItemClass;

  const reposition = useCallback(() => {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const panel = panelRef.current;
    const panelH = panel?.scrollHeight || 280;
    const width = Math.max(1, r.width);
    const left = Math.max(VIEW_MARGIN, Math.min(r.left, window.innerWidth - width - VIEW_MARGIN));
    const spaceBelow = window.innerHeight - r.bottom - ANCHOR_GAP - VIEW_MARGIN;
    const spaceAbove = r.top - ANCHOR_GAP - VIEW_MARGIN;
    const minComfort = 200;
    let openUp = preferOpenUp;
    if (!preferOpenUp) {
      if (spaceBelow < minComfort && spaceAbove > spaceBelow) {
        openUp = true;
      } else if (panelH <= spaceBelow) {
        openUp = false;
      } else if (panelH <= spaceAbove) {
        openUp = true;
      } else {
        openUp = spaceAbove > spaceBelow;
      }
    } else if (spaceAbove < minComfort && spaceBelow > spaceAbove) {
      openUp = false;
    }
    const maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow);
    const top = openUp
      ? Math.max(VIEW_MARGIN, r.top - ANCHOR_GAP - Math.min(panelH, maxHeight))
      : r.bottom + ANCHOR_GAP;
    setPanelBox({ top, left, width, maxHeight });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
  }, [open, reposition, filteredOptions.length]);

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
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const dropdownPanel =
    open && mounted ? (
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[400] flex min-h-0 flex-col gap-2 overflow-hidden p-2 text-popover-foreground shadow-xl",
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
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(managersToolbarFormInputClass, "shrink-0")}
          aria-labelledby={labelledBy}
        />
        <div className={cn(managersToolbarSearchableDropdownListBoxClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <div
            role="listbox"
            aria-labelledby={labelledBy}
            className={cn(managersToolbarSearchableDropdownListClass, managersToolbarSearchableDropdownScrollFillClass)}
          >
            {filteredOptions.map((o) => {
              const parts = splitValidityLabel(o.label);
              const selectedRow = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onValueChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(itemClass, "!justify-start items-start gap-2", selectedRow && "bg-primary/10 font-medium")}
                  role="option"
                  aria-selected={selectedRow}
                >
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    {selectedRow ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0 flex-1 text-left leading-snug">
                    <span className="block truncate text-sm font-medium text-foreground">{parts.primary}</span>
                    {parts.secondary ? (
                      <span className="block truncate text-xs text-muted-foreground">{parts.secondary}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 ? (
              <p className="px-2.5 py-1.5 text-left text-[13px] text-muted-foreground">{emptyMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          managersToolbarSelectTriggerClass,
          "!shrink min-w-0 font-normal",
          size === "compact" && "h-8 px-2 sm:px-2",
          triggerClassName,
        )}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-left leading-none">{selected?.label ?? triggerPlaceholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-80" aria-hidden />
      </button>

      {dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}

