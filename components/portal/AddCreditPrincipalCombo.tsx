"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HierarchyAddCreditLadders, HierarchyAddCreditRung } from "@/lib/repos/billing";
import {
  formatAddCreditPrincipalSummary,
  resolveHierarchyAddCreditApplyPromo,
  type AddCreditPickKind,
} from "@/lib/formatAddCreditRungLabel";
import { AddCreditRungLabel } from "@/components/portal/AddCreditRungLabel";
import { formatAddCreditRungSearchText } from "@/lib/formatAddCreditRungLabel";
import { ADD_CREDIT_PRINCIPAL_STEP_HINT } from "@/lib/addCreditLadder";
import {
  computeComboDropdownPanelPosFromTrigger,
  computeComboDropdownPanelPosInContainer,
  shouldAutoFocusComboSearch,
  type ComboDropdownPanelPos,
} from "@/lib/client/comboDropdownPanel";

export type { AddCreditPickKind };

export type AddCreditPrincipalComboProps = {
  idPrefix: string;
  min: number;
  max: number;
  /** `null` = nothing selected yet (closed trigger shows placeholder). */
  amount: number | null;
  onAmountChange: (n: number | null, meta?: { pick: AddCreditPickKind }) => void;
  /** Promo ladder (100…) and additional ladder (billing min…); rows with `allowed: false` are disabled. */
  ladders: HierarchyAddCreditLadders;
  formFieldName: string;
  size?: "default" | "comfortable";
  "aria-labelledby"?: string;
  /** Shown on the closed trigger when no preset is selected. */
  placeholder?: string;
  /** Portals the list into this element (e.g. open `<dialog>`) so it stays above `showModal()` backdrop. */
  portalContainerRef?: RefObject<HTMLElement | null>;
};

/** Promo list cap when not searching (additional shows every built row — no head/tail gap). */
const VISIBLE_LIMIT_PROMO_SECTION = 120;

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
    listBtn: cn(
      "flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-md text-left font-normal leading-snug outline-none transition-[background-color,color,box-shadow] duration-150 ease-out",
      c ? "px-2.5 py-1.5 text-xs sm:text-sm" : "px-2.5 py-1.5 text-sm",
      "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
      "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
      "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
    ),
    popup: cn(
      "thin-scrollbar overflow-y-auto rounded-lg border border-border bg-white p-1.5 text-foreground shadow-lg ring-1 ring-black/[0.08] dark:bg-popover dark:text-popover-foreground dark:ring-white/[0.1]",
      c ? "text-sm" : "text-sm",
    ),
    sectionLabel: cn(
      "sticky top-0 z-[1] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
      "bg-white/95 text-emerald-800 backdrop-blur-sm dark:bg-popover/95 dark:text-emerald-200/90",
    ),
    sectionLabelMuted: cn(
      "sticky top-0 z-[1] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
      "bg-white/95 text-muted-foreground backdrop-blur-sm dark:bg-popover/95",
    ),
    chevron: c ? "h-4 w-4" : "h-4 w-4",
  };
}

function filterRungs(rungs: HierarchyAddCreditRung[], needle: string, promoLayout: boolean, limit: number) {
  if (!needle) {
    if (!promoLayout) return rungs;
    if (rungs.length <= limit) return rungs;
    const headCount = Math.min(28, rungs.length);
    const tailCount = Math.max(0, limit - headCount);
    const head = rungs.slice(0, headCount);
    const tail = tailCount > 0 ? rungs.slice(-tailCount) : [];
    const seen = new Set(head.map((r) => r.base));
    return [...head, ...tail.filter((r) => !seen.has(r.base))];
  }
  return rungs
    .filter(
      (r) =>
        String(r.base).includes(needle) || formatAddCreditRungSearchText(r, promoLayout).toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

function RungOption({
  r,
  amount,
  promoLayout,
  ty,
  clamp,
  onPick,
}: {
  r: HierarchyAddCreditRung;
  amount: number | null;
  promoLayout: boolean;
  ty: ReturnType<typeof comboTypography>;
  clamp: (n: number) => number;
  onPick: (base: number, pick: AddCreditPickKind) => void;
}) {
  const hasPromo = promoLayout && r.allowed;
  return (
    <button
      type="button"
      role="option"
      aria-selected={amount === r.base}
      disabled={!r.allowed}
      className={ty.listBtn}
      onClick={() => {
        if (!r.allowed) return;
        onPick(clamp(r.base), promoLayout ? "promo" : "additional");
      }}
    >
      <span className="min-w-0 flex-1 truncate">
        <AddCreditRungLabel rung={r} promoLayout={promoLayout} emphasized={hasPromo} />
      </span>
      {amount === r.base ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}

export function AddCreditPrincipalCombo({
  idPrefix,
  min,
  max,
  amount,
  onAmountChange,
  ladders,
  formFieldName,
  size = "default",
  "aria-labelledby": ariaLabelledBy,
  placeholder = "Select amount…",
  portalContainerRef,
}: AddCreditPrincipalComboProps) {
  const ty = comboTypography(size);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lastPick, setLastPick] = useState<AddCreditPickKind | null>(null);
  const [panelPos, setPanelPos] = useState<ComboDropdownPanelPos | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const clamp = useCallback((n: number) => Math.max(min, Math.min(max, Math.floor(n))), [min, max]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const container = portalContainerRef?.current;
    if (container) {
      setPanelPos(computeComboDropdownPanelPosInContainer(el, container));
    } else {
      setPanelPos(computeComboDropdownPanelPosFromTrigger(el));
    }
  }, [portalContainerRef]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setPortalRoot(null), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setPortalRoot(portalContainerRef?.current ?? document.body);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, portalContainerRef]);

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

  const hasSelection = amount != null && Number.isFinite(amount) && amount >= min;
  const summaryPromoRung = hasSelection ? ladders.promoRungs.find((r) => r.base === amount) : undefined;
  const summaryAdditionalRung = hasSelection ? ladders.additionalRungs.find((r) => r.base === amount) : undefined;
  const summaryInPromo =
    lastPick === "additional" ? false : lastPick === "promo" ? true : !!summaryPromoRung;
  const summaryRung =
    lastPick === "additional"
      ? (summaryAdditionalRung ?? summaryPromoRung)
      : (summaryPromoRung ?? summaryAdditionalRung);
  const summaryText = hasSelection ? formatAddCreditPrincipalSummary(amount, ladders) : placeholder;
  const needle = query.trim().toLowerCase();

  const filteredPromo = useMemo(
    () => filterRungs(ladders.promoRungs, needle, true, VISIBLE_LIMIT_PROMO_SECTION),
    [ladders.promoRungs, needle],
  );
  const filteredAdditional = useMemo(
    () => filterRungs(ladders.additionalRungs, needle, false, VISIBLE_LIMIT_PROMO_SECTION),
    [ladders.additionalRungs, needle],
  );

  const applyPromoForAmount =
    amount != null ? resolveHierarchyAddCreditApplyPromo(amount, ladders, lastPick) : true;

  const pick = (base: number, kind: AddCreditPickKind) => {
    setLastPick(kind);
    onAmountChange(clamp(base), { pick: kind });
    close();
  };

  const dropdownPanel =
    open && panelPos && mounted ? (
      <div
        ref={panelRef}
        id={`${idPrefix}-preset-list`}
        role="listbox"
        aria-label="Credit amounts"
        className={ty.popup}
        style={{
          position: panelPos.coordinateMode === "absolute" ? "absolute" : "fixed",
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          maxHeight: panelPos.maxHeight,
          zIndex: panelPos.coordinateMode === "absolute" ? 80 : 400,
        }}
      >
        <div className="relative mb-1.5 px-0.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            inputMode="numeric"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Search credit amounts…"
            className={ty.search}
            aria-label="Search credit amounts"
            role="combobox"
            aria-expanded
            aria-controls={`${idPrefix}-preset-list`}
            aria-autocomplete="list"
            autoComplete="off"
          />
        </div>
        {filteredPromo.length > 0 ? (
          <div className="mt-1 border-t border-border/60 pt-1">
            <p className={ty.sectionLabel}>
              Promo 1 + Promo 2
              {ladders.promoRungs[0]
                ? ` (${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(ladders.promoRungs[0].base)}, ${ADD_CREDIT_PRINCIPAL_STEP_HINT})`
                : ""}
            </p>
            {filteredPromo.map((r) => (
              <RungOption key={`p-${r.base}`} r={r} amount={amount} promoLayout={true} ty={ty} clamp={clamp} onPick={pick} />
            ))}
          </div>
        ) : null}
        {filteredAdditional.length > 0 ? (
          <div className="mt-1 border-t border-border/60 pt-1">
            <p className={ty.sectionLabelMuted}>
              Additional credits (from billing minimum
              {ladders.additionalRungs[0]
                ? `, ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(ladders.additionalRungs[0].base)}, ${ADD_CREDIT_PRINCIPAL_STEP_HINT}`
                : ""}
              )
            </p>
            {filteredAdditional.map((r) => (
              <RungOption key={`a-${r.base}`} r={r} amount={amount} promoLayout={false} ty={ty} clamp={clamp} onPick={pick} />
            ))}
          </div>
        ) : null}
        {!filteredPromo.length && !filteredAdditional.length ? (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">No matching amounts.</p>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative w-full">
      {hasSelection ? (
        <>
          <input type="hidden" name={formFieldName} value={String(amount)} />
          <input type="hidden" name="apply_promo" value={applyPromoForAmount ? "1" : "0"} />
        </>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        id={`${idPrefix}-summary`}
        className={cn(ty.trigger, open && "border-ring ring-[3px] ring-ring/50")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={ariaLabelledBy}
        aria-controls={open ? `${idPrefix}-preset-list` : undefined}
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
      >
        <span
          className={cn("min-w-0 flex-1 truncate text-left", !hasSelection && "font-normal text-muted-foreground")}
        >
          {hasSelection && summaryRung ? (
            <AddCreditRungLabel rung={summaryRung} promoLayout={summaryInPromo} emphasized={summaryInPromo} />
          ) : (
            summaryText
          )}
        </span>
        {open ? (
          <ChevronUp className={cn(ty.chevron, "shrink-0 text-muted-foreground opacity-80")} aria-hidden />
        ) : (
          <ChevronDown className={cn(ty.chevron, "shrink-0 text-muted-foreground opacity-80")} aria-hidden />
        )}
      </button>
      {mounted && dropdownPanel && portalRoot ? createPortal(dropdownPanel, portalRoot) : null}
    </div>
  );
}
