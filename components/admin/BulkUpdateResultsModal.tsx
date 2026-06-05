"use client";

import { createPortal } from "react-dom";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

export type BulkUpdateResultRow = {
  account: string;
  ok: boolean;
  message: string;
};

/** Bulk renew / delete result summary — same HUD shell as Add user modal. */
export function BulkUpdateResultsModal({
  open,
  results,
  onClose,
}: {
  open: boolean;
  results: BulkUpdateResultRow[];
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[320] flex items-center justify-center p-2.5 sm:p-4",
        managersToolbarModalBackdropClass,
        "bg-black/60 backdrop-blur-md dark:bg-black/55",
      )}
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-update-results-title"
        className={cn(
          "relative z-10 flex max-h-[min(85vh,40rem)] w-full max-w-lg flex-col overflow-hidden",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden bg-card/90 dark:bg-[hsl(222_47%_6%/0.94)]">
          <div className="shrink-0 border-b border-cyan-600/15 px-4 py-3 dark:border-b-cyan-400/10 sm:px-5">
            <h2 id="bulk-update-results-title" className="text-base font-semibold tracking-tight text-foreground">
              Update results
            </h2>
          </div>
          <ul className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {results.map((row, i) => (
              <li
                key={`${row.account}-${i}`}
                className={cn(
                  "rounded-md px-3 py-2 text-sm leading-relaxed",
                  row.ok
                    ? cn(managersToolbarModalInsetPanelClass, "text-foreground")
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/12 dark:text-rose-300",
                )}
              >
                {row.message}
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center justify-end border-t border-cyan-600/15 px-4 py-3 dark:border-t-cyan-400/10 sm:px-5">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              onClick={onClose}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
