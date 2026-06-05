"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { RecoverGrantRowLabel, recoverGrantPlainText } from "@/components/portal/RecoverGrantRowLabel";
import { grantWalletDebitAmount, type HierarchyReversibleGrant } from "@/lib/billing/hierarchyRecover";
import {
  computeComboDropdownPanelPosFromTrigger,
  shouldAutoFocusComboSearch,
  type ComboDropdownPanelPos,
} from "@/lib/client/comboDropdownPanel";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function computeRecoverCreditsAvailable(
  currentBalance: number,
  grants: HierarchyReversibleGrant[],
  selectedIds: number[],
): number {
  const bal = Math.max(0, Math.floor(currentBalance));
  if (selectedIds.length < 1) {
    return grants.reduce((sum, g) => {
      if (g.isPartialRemainder || g.walletBalanceOnly) {
        return sum + grantWalletDebitAmount(g);
      }
      return sum;
    }, 0);
  }
  const map = new Map(grants.map((g) => [g.grantTxId, g]));
  let debit = 0;
  for (const id of selectedIds) {
    const row = map.get(id);
    if (row) debit += grantWalletDebitAmount(row);
  }
  if (selectedIds.length === 1) {
    const row = map.get(selectedIds[0]!);
    if (row && !row.isPartialRemainder && row.creditsAvailableAfter != null) {
      return Math.max(0, row.creditsAvailableAfter);
    }
  }
  return Math.max(0, bal - debit);
}

function grantHaystack(g: HierarchyReversibleGrant): string {
  return [recoverGrantPlainText(g), String(g.grantTxId)].join(" ").toLowerCase();
}

function formatRecoverGrantsSummary(
  selectedIds: number[],
  grants: HierarchyReversibleGrant[],
  placeholder: string,
): string {
  if (selectedIds.length < 1) return placeholder;
  const map = new Map(grants.map((x) => [x.grantTxId, x]));
  let total = 0;
  for (const id of selectedIds) {
    const row = map.get(id);
    if (row) total += grantWalletDebitAmount(row);
  }
  return `${selectedIds.length} load${selectedIds.length === 1 ? "" : "s"} · ${fmt(total)} credits`;
}

function comboTypography(size: "default" | "comfortable") {
  const c = size === "comfortable";
  return {
    trigger: cn(
      "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-input-background text-left font-medium text-foreground shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out",
      c ? "h-10 min-h-10 px-3 py-1.5 text-sm" : "h-10 min-h-[2.5rem] px-3 py-1 text-sm",
      "hover:bg-muted/30 hover:border-border",
      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    ),
    search: cn(
      "h-8 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      c ? "text-sm" : "text-sm",
    ),
    listRow: cn(
      "flex w-full min-w-0 cursor-pointer select-none items-start gap-2 rounded-md text-left font-normal leading-snug text-foreground outline-none transition-[background-color,color,box-shadow] duration-150 ease-out",
      c ? "px-2.5 py-2 text-xs sm:text-sm" : "px-2.5 py-1.5 text-xs",
      "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
      "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
    ),
    popup: cn(
      "thin-scrollbar overflow-y-auto rounded-lg border border-border bg-white p-1.5 text-foreground shadow-lg ring-1 ring-black/[0.08] dark:bg-popover dark:text-popover-foreground dark:ring-white/[0.1]",
      c ? "text-sm" : "text-sm",
    ),
    empty: c ? "px-2.5 py-3 text-center text-xs text-muted-foreground" : "px-2.5 py-3 text-center text-[11px] text-muted-foreground",
    check: c ? "h-4 w-4" : "h-4 w-4",
    checkIcon: c ? "h-3 w-3" : "h-3 w-3",
    chevron: c ? "h-4 w-4" : "h-4 w-4",
  };
}

export type RecoverGrantsMultiComboProps = {
  idPrefix: string;
  grants: HierarchyReversibleGrant[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  /** When set, renders one hidden input per selected id for server actions (`grant_tx_id`). */
  formGrantFieldName?: string;
  size?: "default" | "comfortable";
  "aria-labelledby"?: string;
  /** Shown on the closed trigger when nothing is selected. */
  placeholder?: string;
  /** Single-select replaces selection; default is multi-select. */
  selectionMode?: "single" | "multiple";
  /** Wallet balance — drives sticky “Credits Available” footer in the panel. */
  currentBalance?: number;
};

export function RecoverGrantsMultiCombo({
  idPrefix,
  grants,
  selectedIds,
  onSelectionChange,
  formGrantFieldName,
  size = "default",
  "aria-labelledby": ariaLabelledBy,
  placeholder = "Select loads to reverse…",
  selectionMode = "multiple",
  currentBalance = 0,
}: RecoverGrantsMultiComboProps) {
  const ty = comboTypography(size);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelPos, setPanelPos] = useState<ComboDropdownPanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const hasSelection = selectedIds.length > 0;
  const summary = formatRecoverGrantsSummary(selectedIds, grants, placeholder);
  const listId = `${idPrefix}-recover-grant-list`;

  const filteredGrants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grants;
    return grants.filter((g) => grantHaystack(g).includes(q));
  }, [grants, search]);

  const selectedDebitTotal = useMemo(() => {
    if (selectedIds.length < 1) return 0;
    const map = new Map(grants.map((g) => [g.grantTxId, g]));
    let total = 0;
    for (const id of selectedIds) {
      const row = map.get(id);
      if (row) total += grantWalletDebitAmount(row);
    }
    return total;
  }, [grants, selectedIds]);

  const creditsAvailable = useMemo(
    () => computeRecoverCreditsAvailable(currentBalance, grants, selectedIds),
    [currentBalance, grants, selectedIds],
  );

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPanelPos(computeComboDropdownPanelPosFromTrigger(el));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    const onReflow = () => updatePanelPos();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onReflow);
    vv?.addEventListener("scroll", onReflow);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      vv?.removeEventListener("resize", onReflow);
      vv?.removeEventListener("scroll", onReflow);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      if (shouldAutoFocusComboSearch()) searchRef.current?.focus();
    });
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const toggle = (grantTxId: number) => {
    const row = grants.find((g) => g.grantTxId === grantTxId);
    if (selectionMode === "single") {
      onSelectionChange(selectedIds.includes(grantTxId) ? [] : [grantTxId]);
      close();
      return;
    }
    const checked = selectedIds.includes(grantTxId);
    if (row?.walletBalanceOnly) {
      onSelectionChange(checked ? [] : [grantTxId]);
      return;
    }
    if (checked) {
      onSelectionChange(selectedIds.filter((x) => x !== grantTxId));
      return;
    }
    onSelectionChange([
      ...selectedIds.filter((id) => {
        const g = grants.find((x) => x.grantTxId === id);
        return !g?.walletBalanceOnly;
      }),
      grantTxId,
    ]);
  };

  const dropdownPanel =
    open && panelPos && mounted ? (
      <div
        ref={panelRef}
        id={listId}
        role="listbox"
        aria-label="Reversible credit loads"
        aria-multiselectable={selectionMode === "multiple"}
        className={cn(ty.popup, "flex flex-col")}
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          maxHeight: panelPos.maxHeight,
          zIndex: 400,
        }}
      >
        <div className="relative mb-1.5 px-0.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            placeholder="Search date or amounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-labelledby={ariaLabelledBy}
            aria-controls={listId}
            aria-expanded
            autoComplete="off"
            className={ty.search}
          />
        </div>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        {filteredGrants.length ? (
          filteredGrants.map((g) => {
            const checked = selectedIds.includes(g.grantTxId);
            const plain = recoverGrantPlainText(g);
            return (
              <button
                key={g.grantTxId}
                type="button"
                role="option"
                aria-selected={checked}
                aria-label={plain}
                className={cn(
                  ty.listRow,
                  checked ? "border border-cyan-500/35 bg-cyan-500/[0.12]" : "border border-transparent",
                )}
                onClick={() => toggle(g.grantTxId)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex shrink-0 items-center justify-center rounded border",
                    ty.check,
                    checked
                      ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-700 dark:text-cyan-200"
                      : "border-border/70 bg-background/40",
                  )}
                  aria-hidden
                >
                  {checked ? <Check className={ty.checkIcon} strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <RecoverGrantRowLabel grant={g} size={size} />
                </span>
              </button>
            );
          })
        ) : (
          <p className={ty.empty}>
            {grants.length < 1 ? "No reversible loads in this wallet." : "No loads match your filters."}
          </p>
        )}
        </div>
        {grants.length > 0 ? (
          <div className="mt-1.5 shrink-0 border-t border-amber-300/90 bg-amber-50/90 px-2.5 py-2 dark:border-amber-400/35 dark:bg-amber-500/10">
            {selectedDebitTotal > 0 ? (
              <p className={cn("mb-1 text-amber-900/90 dark:text-amber-200/90", size === "comfortable" ? "text-xs" : "text-[10px]")}>
                {fmt(selectedDebitTotal)} credits will be lost
                {selectedIds.length > 1 ? ` (${selectedIds.length} loads)` : ""}.
              </p>
            ) : null}
            <p
              className={cn(
                "font-semibold tabular-nums text-amber-800 dark:text-amber-300",
                size === "comfortable" ? "text-sm" : "text-xs",
              )}
            >
              {fmt(creditsAvailable)} Credits Available.
            </p>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0 w-full max-w-full">
      {formGrantFieldName
        ? selectedIds.map((id) => <input key={id} type="hidden" name={formGrantFieldName} value={String(id)} />)
        : null}
      <button
        ref={triggerRef}
        type="button"
        id={`${idPrefix}-recover-summary`}
        className={cn(ty.trigger, open && "border-ring ring-[3px] ring-ring/50")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={ariaLabelledBy}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !hasSelection && "font-normal text-muted-foreground",
          )}
        >
          {summary}
        </span>
        {open ? (
          <ChevronUp className={cn(ty.chevron, "shrink-0 text-muted-foreground opacity-80")} aria-hidden />
        ) : (
          <ChevronDown className={cn(ty.chevron, "shrink-0 text-muted-foreground opacity-80")} aria-hidden />
        )}
      </button>
      {mounted && dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}
