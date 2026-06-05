"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { managersToolbarSelectTriggerClass } from "@/components/admin/managers-toolbar-icon-button";
import { ANNOUNCEMENT_FONT_FAMILIES } from "@/lib/announcement-typography";
import { cn } from "@/lib/cn";

type Props = {
  onApply: (familyKey: string) => void;
  onKeepSelection?: () => void;
};

const FONT_OPTIONS = ANNOUNCEMENT_FONT_FAMILIES.filter((item) => item.value !== "default");

export function AnnouncementEditorFontFamilySelect({ onApply, onKeepSelection }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  const currentLabel = FONT_OPTIONS.find((item) => item.value === current)?.label ?? "Font";

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => onKeepSelection?.());
      }
      return next;
    });
  }, [onKeepSelection]);

  useEffect(() => {
    if (!open) return;
    onKeepSelection?.();
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onKeepSelection]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex shrink-0"
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Font family"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
        className={cn(
          managersToolbarSelectTriggerClass,
          "inline-flex h-8 w-[7.5rem] items-center gap-1 px-2 sm:w-[8.5rem]",
        )}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className={cn("ml-auto h-3 w-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Font family"
          className="announcement-toolbar-popover absolute left-0 top-[calc(100%+4px)] z-[260] w-[9.5rem] overflow-hidden rounded-lg"
          data-announcement-toolbar-popover
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="announcement-toolbar-popover-list thin-scrollbar max-h-[min(16rem,50vh)] overflow-y-auto p-1">
            {FONT_OPTIONS.map((item) => {
              const selected = current === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-active={selected ? "true" : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onKeepSelection?.();
                  }}
                  onClick={() => {
                    onKeepSelection?.();
                    setCurrent(item.value);
                    onApply(item.value);
                    setOpen(false);
                  }}
                  className="announcement-toolbar-popover-option relative flex w-full items-center rounded-md py-1.5 pl-7 pr-2 text-left text-xs font-medium transition-colors"
                  style={{ fontFamily: item.stack }}
                >
                  {selected ? (
                    <Check className="absolute left-1.5 h-3.5 w-3.5 text-primary" aria-hidden />
                  ) : null}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
