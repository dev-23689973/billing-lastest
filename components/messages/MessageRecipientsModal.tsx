"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import {
  MessageRecipientPickList,
  type MessageRecipientPickItem,
} from "@/components/messages/MessageRecipientPickList";
import { Button } from "@/components/ui/button";
import {
  adminHudModalBackdropPerfClass,
  managersToolbarFormInputClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

/** Fixed height so list scrolls inside and footer stays visible. */
const MODAL_HEIGHT_CLASS = "h-[min(90dvh,36rem)] max-h-[min(90dvh,36rem)]";

const modalPanelClass = cn(
  "hud-modal-opaque-panel relative z-[1] flex w-full max-w-xl flex-col overflow-hidden rounded-[inherit]",
  MODAL_HEIGHT_CLASS,
  "bg-white text-foreground dark:bg-[hsl(222_47%_7%)]",
);

const listRegionClass = cn(
  "thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",
  "rounded-lg border border-border/60 bg-slate-50 dark:bg-[hsl(222_47%_9%)]",
);

function itemMatchesFilter(item: MessageRecipientPickItem, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    item.label.toLowerCase().includes(s) ||
    (item.meta?.toLowerCase().includes(s) ?? false) ||
    item.id.toLowerCase().includes(s)
  );
}

export function MessageRecipientsModal({
  open,
  onOpenChange,
  title,
  subtitle,
  pickItems,
  initialSelected,
  onApply,
  searchPlaceholder,
  onSearchEnter,
  emptyListMessage = "No matches for this filter.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  pickItems: MessageRecipientPickItem[];
  initialSelected: Set<string>;
  onApply: (selected: Set<string>) => void;
  searchPlaceholder: string;
  onSearchEnter?: (query: string) => void;
  emptyListMessage?: string;
}) {
  const titleId = useId();
  const searchId = useId();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);
  const [draft, setDraft] = useState<Set<string>>(() => new Set(initialSelected));
  const [listReady, setListReady] = useState(false);

  const selectedKey = useMemo(
    () =>
      [...initialSelected]
        .sort((a, b) => a.localeCompare(b))
        .join(","),
    [initialSelected],
  );

  useEffect(() => {
    if (!open) {
      setListReady(false);
      return;
    }
    setDraft(new Set(initialSelected));
    setFilter("");
    const id = requestAnimationFrame(() => setListReady(true));
    return () => cancelAnimationFrame(id);
  }, [open, selectedKey, initialSelected]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const visibleItems = useMemo(
    () => pickItems.filter((item) => itemMatchesFilter(item, deferredFilter)),
    [pickItems, deferredFilter],
  );

  const toggle = useCallback((id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setVisible = useCallback(
    (checked: boolean) => {
      setDraft((prev) => {
        const next = new Set(prev);
        for (const item of visibleItems) {
          if (checked) next.add(item.id);
          else next.delete(item.id);
        }
        return next;
      });
    },
    [visibleItems],
  );

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4",
        adminHudModalBackdropPerfClass,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "relative z-10 flex w-full max-w-xl flex-col",
          MODAL_HEIGHT_CLASS,
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(modalPanelClass, "h-full min-h-0")}>
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-white px-4 py-3 dark:border-cyan-400/10 dark:bg-[hsl(222_47%_7%)] sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
                <span className="inline-flex items-center rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-cyan-900 dark:text-cyan-100">
                  {draft.size} / {pickItems.length}
                </span>
              </div>
              {subtitle ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 bg-white px-4 py-3 dark:bg-[hsl(222_47%_7%)] sm:px-5">
            <div className="relative shrink-0">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80"
                aria-hidden
              />
              <input
                id={searchId}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearchEnter?.(filter);
                    const q = filter.trim().toLowerCase();
                    if (!q) return;
                    const hit = pickItems.find(
                      (item) =>
                        item.id.toLowerCase() === q ||
                        item.label.toLowerCase() === q,
                    );
                    if (hit) {
                      setDraft((prev) => {
                        const next = new Set(prev);
                        next.add(hit.id);
                        return next;
                      });
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className={cn(managersToolbarFormInputClass, "h-9 pl-8 text-sm")}
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-background px-2 py-1 font-medium text-foreground transition-colors hover:bg-muted/40"
                  onClick={() => setVisible(true)}
                  disabled={!visibleItems.length}
                >
                  Select all shown
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border/60 bg-background px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  onClick={() => setVisible(false)}
                  disabled={!visibleItems.length}
                >
                  Clear shown
                </button>
              </div>
              <span className="tabular-nums text-muted-foreground">
                Showing <span className="font-medium text-foreground">{visibleItems.length}</span> of{" "}
                {pickItems.length}
              </span>
            </div>

            <div ref={listScrollRef} className={listRegionClass}>
              {!listReady ? (
                <div className="flex min-h-[12rem] items-center justify-center gap-2 px-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading list…
                </div>
              ) : (
                <MessageRecipientPickList
                  items={visibleItems}
                  selected={draft}
                  onToggle={toggle}
                  scrollRef={listScrollRef}
                  emptyMessage={emptyListMessage}
                />
              )}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 bg-slate-50 px-4 py-3 dark:border-cyan-400/10 dark:bg-[hsl(222_47%_9%)] sm:px-5">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(draft);
                onOpenChange(false);
              }}
            >
              Apply{draft.size > 0 ? ` (${draft.size})` : ""}
            </Button>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
