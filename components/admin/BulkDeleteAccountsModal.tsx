"use client";

import { createPortal } from "react-dom";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

export function BulkDeleteAccountsModal({
  open,
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[320] flex items-center justify-center p-4"
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <button
        type="button"
        className={cn("absolute inset-0", managersToolbarModalBackdropClass)}
        aria-label="Close"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        className={cn("relative z-10 w-full max-w-md overflow-hidden", managersToolbarModalOpaqueShellClass)}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] p-5 sm:p-6">
          <h2 id="bulk-delete-title" className="text-base font-semibold tracking-tight text-foreground">
            Bulk delete
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Permanently delete <span className="font-medium text-foreground">{count}</span> selected account(s)?
          </p>
          <div className="mt-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/12 dark:text-rose-300">
            This cannot be undone. All account data will be permanently removed.
          </div>
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-cyan-600/15 pt-4 dark:border-t-cyan-400/10">
            <button
              type="button"
              disabled={pending}
              onClick={onCancel}
              className="inline-flex h-9 items-center rounded-md border border-cyan-600/22 bg-background/60 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-400/14"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onConfirm}
              className="inline-flex h-9 items-center rounded-md bg-rose-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Working…" : "Delete selected"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
