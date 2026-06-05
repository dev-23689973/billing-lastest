"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { managersToolbarSelectTriggerClass } from "@/components/admin/managers-toolbar-icon-button";
import {
  ANNOUNCEMENT_FONT_SIZE_PRESETS,
  clampAnnouncementFontSizePx,
  formatAnnouncementFontSizePx,
  parseAnnouncementFontSizePx,
} from "@/lib/announcement-typography";
import { cn } from "@/lib/cn";

type Props = {
  onApply: (sizePx: string) => void;
  onKeepSelection?: () => void;
  defaultPx?: number;
};

export function AnnouncementEditorFontSizeControl({ onApply, onKeepSelection, defaultPx = 15 }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [currentPx, setCurrentPx] = useState(String(defaultPx));
  const [open, setOpen] = useState(false);

  const applyPx = useCallback(
    (raw: unknown) => {
      const parsed = parseAnnouncementFontSizePx(raw);
      const px = parsed ?? clampAnnouncementFontSizePx(defaultPx);
      const formatted = formatAnnouncementFontSizePx(px);
      setCurrentPx(String(px));
      onApply(formatted);
    },
    [defaultPx, onApply],
  );

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
        aria-label="Font size"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
        className={cn(
          managersToolbarSelectTriggerClass,
          "inline-flex h-8 min-w-[5.75rem] items-center gap-1 px-2 sm:min-w-[6.25rem]",
        )}
      >
        <span className="tabular-nums">{currentPx}</span>
        <span className="text-[10px] font-medium text-muted-foreground">px</span>
        <ChevronDown className={cn("ml-auto h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Font size"
          className="announcement-toolbar-popover absolute left-0 top-[calc(100%+4px)] z-[260] w-[8.5rem] overflow-hidden rounded-lg"
          data-announcement-toolbar-popover
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="announcement-toolbar-popover-list thin-scrollbar max-h-[min(14rem,40vh)] overflow-y-auto p-1">
            {ANNOUNCEMENT_FONT_SIZE_PRESETS.map((px) => (
              <button
                key={px}
                type="button"
                role="option"
                aria-selected={currentPx === String(px)}
                data-active={currentPx === String(px) ? "true" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onKeepSelection?.();
                }}
                onClick={() => {
                  onKeepSelection?.();
                  applyPx(px);
                  setOpen(false);
                }}
                className="announcement-toolbar-popover-option flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium tabular-nums transition-colors"
              >
                <span>{px}</span>
                <span className="text-[10px] text-muted-foreground">px</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
