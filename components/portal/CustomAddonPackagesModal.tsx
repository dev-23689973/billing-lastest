"use client";

import { memo, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminHudModalBackdropPerfClass,
  managersToolbarFormInputClass,
  managersToolbarModalOpaqueShellClass,
  managersToolbarPackCheckboxTileCheckedClass,
  managersToolbarPackCheckboxTileClass,
  managersToolbarPackGridRowClass,
  nestedHudModalOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

export type CustomAddonPackage = { package_id: number; name: string };

const GRID_COLS = 3;
const ROW_ESTIMATE_PX = 34;
const VIRTUALIZE_MIN_ROWS = 12;

/** Fixed height so filtering/search does not resize the dialog. */
const MODAL_HEIGHT_CLASS = "h-[min(90dvh,36rem)] max-h-[min(90dvh,36rem)]";

/** Fully opaque — nested above Add/Edit user modal (z-320); must not show parent form through. */
const modalPanelClass = cn(
  "hud-modal-opaque-panel relative z-[1] flex w-full max-w-xl flex-col overflow-hidden rounded-[inherit]",
  MODAL_HEIGHT_CLASS,
  "bg-white text-foreground dark:bg-[hsl(222_47%_7%)]",
);

/** List viewport — flex-1 fills space between toolbar and footer; content scrolls inside. */
const scrollRegionClass = cn(
  "thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain",
  "rounded-lg border border-border/60 bg-slate-50 dark:bg-[hsl(222_47%_9%)]",
);

function packMatchesFilter(p: CustomAddonPackage, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const name = (p.name || "").toLowerCase();
  return name.includes(s) || String(p.package_id).includes(s);
}

const PackageRow = memo(function PackageRow({
  pack,
  checked,
  onToggle,
}: {
  pack: CustomAddonPackage;
  checked: boolean;
  onToggle: (id: number, next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        managersToolbarPackGridRowClass,
        checked && "bg-cyan-500/12 font-medium dark:bg-cyan-400/10",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(pack.package_id, e.currentTarget.checked)}
        className="sr-only"
      />
      <span
        className={cn(managersToolbarPackCheckboxTileClass, checked && managersToolbarPackCheckboxTileCheckedClass)}
        aria-hidden
      >
        <Check className={cn("h-2.5 w-2.5 stroke-[2.75]", !checked && "scale-75 opacity-0")} />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs leading-snug" title={pack.name || `Package #${pack.package_id}`}>
        {pack.name || `Package #${pack.package_id}`}
      </span>
    </label>
  );
});

function VirtualPackageGrid({
  scrollRef,
  rows,
  draft,
  onToggle,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  rows: CustomAddonPackage[][];
  draft: Set<number>;
  onToggle: (id: number, next: boolean) => void;
}) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 6,
  });

  const items = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div className="relative w-full p-2" style={{ height: totalHeight }}>
      {items.map((item) => {
        const rowPacks = rows[item.index] ?? [];
        return (
          <div
            key={item.key}
            className="absolute left-0 top-0 grid w-full grid-cols-3 gap-0.5 px-2"
            style={{ height: item.size, transform: `translateY(${item.start}px)` }}
          >
            {rowPacks.map((p) => (
              <PackageRow key={p.package_id} pack={p} checked={draft.has(p.package_id)} onToggle={onToggle} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function CustomAddonPackagesModal({
  open,
  onOpenChange,
  packages,
  initialSelectedIds,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: CustomAddonPackage[];
  initialSelectedIds: Set<number>;
  onApply: (selected: Set<number>) => void;
}) {
  const titleId = useId();
  const searchId = useId();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);
  const [draft, setDraft] = useState<Set<number>>(() => new Set(initialSelectedIds));
  const [listReady, setListReady] = useState(false);

  const selectedKey = useMemo(
    () =>
      [...initialSelectedIds]
        .sort((a, b) => a - b)
        .join(","),
    [initialSelectedIds],
  );

  useEffect(() => {
    if (!open) {
      setListReady(false);
      return;
    }
    setDraft(new Set(initialSelectedIds));
    setFilter("");
    const id = requestAnimationFrame(() => setListReady(true));
    return () => cancelAnimationFrame(id);
  }, [open, selectedKey, initialSelectedIds]);

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
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onOpenChange(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onOpenChange]);

  const visiblePackages = useMemo(
    () => packages.filter((p) => packMatchesFilter(p, deferredFilter)),
    [packages, deferredFilter],
  );

  const packageRows = useMemo(() => {
    const out: CustomAddonPackage[][] = [];
    for (let i = 0; i < visiblePackages.length; i += GRID_COLS) {
      out.push(visiblePackages.slice(i, i + GRID_COLS));
    }
    return out;
  }, [visiblePackages]);

  const togglePack = useMemo(
    () => (id: number, next: boolean) => {
      setDraft((prev) => {
        const already = prev.has(id);
        if (already === next) return prev;
        const nextSet = new Set(prev);
        if (next) nextSet.add(id);
        else nextSet.delete(id);
        return nextSet;
      });
    },
    [],
  );

  function setVisible(checked: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      visiblePackages.forEach((p) => {
        if (checked) next.add(p.package_id);
        else next.delete(p.package_id);
      });
      return next;
    });
  }

  if (!open) return null;

  return createPortal(
    <div
      className={cn(nestedHudModalOverlayShellClass, adminHudModalBackdropPerfClass)}
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
                Select packages
              </h2>
              <span className="inline-flex items-center rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-cyan-900 dark:text-cyan-100">
                {draft.size} / {packages.length}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Optional add-on channels for the custom plan.
            </p>
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
              placeholder="Search by name or ID…"
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
              >
                Select all shown
              </button>
              <button
                type="button"
                className="rounded-md border border-border/60 bg-background px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                onClick={() => setVisible(false)}
              >
                Clear shown
              </button>
            </div>
            <span className="tabular-nums text-muted-foreground">
              Showing <span className="font-medium text-foreground">{visiblePackages.length}</span> of {packages.length}
            </span>
          </div>

          <div ref={listScrollRef} className={scrollRegionClass}>
            <div className="min-h-full">
              {!listReady ? (
                <div className="flex min-h-[12rem] items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading list…
                </div>
              ) : visiblePackages.length === 0 ? (
                <div className="flex min-h-[12rem] items-center justify-center px-4 py-10">
                  <p className="text-center text-sm text-muted-foreground">No packages match your search.</p>
                </div>
              ) : packageRows.length >= VIRTUALIZE_MIN_ROWS ? (
                <VirtualPackageGrid scrollRef={listScrollRef} rows={packageRows} draft={draft} onToggle={togglePack} />
              ) : (
                <div className="p-2">
                  <div className="grid grid-cols-3 gap-0.5">
                    {visiblePackages.map((p) => (
                      <PackageRow
                        key={p.package_id}
                        pack={p}
                        checked={draft.has(p.package_id)}
                        onToggle={togglePack}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
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
