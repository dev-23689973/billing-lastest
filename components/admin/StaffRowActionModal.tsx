"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  adminHudModalBackdropPerfClass,
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
  staffDetailsOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Width / height constraints on the dialog shell, e.g. `max-w-xl`. */
  dialogClassName?: string;
  ariaLabel?: string;
  /** When true, children are rendered without the opaque inner panel (editor supplies its own chrome). */
  bare?: boolean;
  /** Use a lighter backdrop (no blur) over large data tables. */
  perfBackdrop?: boolean;
};

export function StaffRowActionModal({
  open,
  onClose,
  children,
  dialogClassName,
  ariaLabel,
  bare = false,
  perfBackdrop = false,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !portalReady || typeof document === "undefined") return null;

  return createPortal(
    <div className={staffDetailsOverlayShellClass} role="presentation">
      <button
        type="button"
        className={cn(
          "absolute inset-0",
          perfBackdrop ? adminHudModalBackdropPerfClass : managersToolbarModalBackdropClass,
        )}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 box-border flex w-full max-h-[calc(100dvh-1rem)] min-w-0 flex-col overflow-hidden sm:max-h-[calc(100dvh-2.5rem)]",
          managersToolbarModalOpaqueShellClass,
          dialogClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {bare ? (
          children
        ) : (
          <>
            <HudCornerOverlay tone="bright" />
            <div className="hud-modal-opaque-panel relative z-[1] flex min-h-0 max-h-[inherit] min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain thin-scrollbar rounded-[inherit] bg-white dark:bg-[hsl(222_47%_6%/0.94)]">
              {children}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
