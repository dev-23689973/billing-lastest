"use client";

import { createPortal } from "react-dom";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

export function ConfirmStatusChangeModal({
  entityName,
  currentStatusLabel,
  nextStatusLabel,
  saving,
  onCancel,
  onConfirm,
  titleId = "status-change-confirm-title",
  zIndexClass = "z-[320]",
}: {
  entityName: string;
  currentStatusLabel: string;
  nextStatusLabel: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  titleId?: string;
  zIndexClass?: string;
}) {
  const confirmButtonClassName =
    nextStatusLabel === "Active"
      ? "bg-emerald-600 text-white hover:bg-emerald-500"
      : "bg-rose-600 text-white hover:bg-rose-500";

  const modal = (
    <div
      className={cn("fixed inset-0 flex items-center justify-center p-4", zIndexClass)}
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onConfirm();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
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
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 w-full max-w-sm overflow-hidden shadow-xl",
          managersToolbarModalShellClass,
        )}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] p-5 sm:p-6">
          <h3 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            Confirm status change
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Update <span className="font-medium text-foreground">{entityName}</span> from{" "}
            <span className="font-medium text-foreground">{currentStatusLabel}</span> to{" "}
            <span className="font-medium text-foreground">{nextStatusLabel}</span>?
          </p>
          <div className="mt-4 rounded-md border border-cyan-600/22 bg-muted/15 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:border-cyan-400/14 dark:bg-[hsl(222_47%_9%/0.5)]">
            This change will be saved immediately.
          </div>
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-cyan-600/15 pt-4 dark:border-t-cyan-400/10">
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="inline-flex h-9 items-center rounded-md border border-cyan-600/22 bg-background/60 px-3.5 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-400/14"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onConfirm}
              autoFocus
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                confirmButtonClassName,
              )}
            >
              {saving ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
