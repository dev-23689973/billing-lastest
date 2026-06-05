"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const VIEW_MARGIN = 8;
const ANCHOR_GAP = 6;

export type SearchableFormSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SearchableFormSelectProps = {
  id: string;
  name: string;
  options: SearchableFormSelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (next: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  initialUnset?: boolean;
  className?: string;
  /** Shorter trigger (e.g. dense admin modals). */
  size?: "default" | "compact";
};

export function SearchableFormSelect({
  id,
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  disabled,
  required,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  initialUnset,
  className,
  size = "default",
}: SearchableFormSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [panelBox, setPanelBox] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 200,
    maxHeight: 280,
  });

  const isControlled = value !== undefined;
  const initialValue = initialUnset ? "" : (defaultValue ?? "");
  const [internalSelected, setInternalSelected] = useState(initialValue);
  const selected = isControlled ? (value ?? "") : internalSelected;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === selected),
    [options, selected],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, deferredQuery]);

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
    let openUp = false;
    if (panelH <= spaceBelow) {
      openUp = false;
    } else if (panelH <= spaceAbove) {
      openUp = true;
    } else {
      openUp = spaceAbove > spaceBelow;
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
  }, [open, reposition]);

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
    if (isControlled) return;
    if (defaultValue === undefined) return;
    setInternalSelected(defaultValue);
  }, [defaultValue, isControlled]);

  const dropdownPanel =
    open && mounted ? (
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[400] flex min-h-0 flex-col gap-2 overflow-hidden p-2.5 text-popover-foreground shadow-xl",
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
        />
        <div className={cn(managersToolbarSearchableDropdownListBoxClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <div
            role="listbox"
            className={cn(
              managersToolbarSearchableDropdownListClass,
              managersToolbarSearchableDropdownScrollFillClass,
            )}
          >
            {filtered.length ? (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.disabled) return;
                    if (!isControlled) setInternalSelected(opt.value);
                    onValueChange?.(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  disabled={opt.disabled}
                  className={cn(itemClass, selected === opt.value && "bg-primary/10 font-medium")}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected === opt.value ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
                </button>
              ))
            ) : (
              <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">No matching options.</p>
            )}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" id={id} name={name} value={selected} required={required} />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => startTransition(() => setOpen((v) => !v))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          managersToolbarSelectTriggerClass,
          "!shrink min-w-0 font-normal",
          size === "compact" ? "px-2 sm:px-2" : "",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left leading-none",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-80" aria-hidden />
      </button>

      {dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}
