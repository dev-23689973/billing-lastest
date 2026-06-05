"use client";

import { createPortal } from "react-dom";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  zIndexClass?: string;
  maxWidthClass?: string;
};

/**
 * Centered HUD confirm dialog portaled to `document.body`.
 * Resets inherited `whitespace-nowrap` from subscribers table action cells.
 */
export function HudRowActionConfirmModal({
  open,
  onClose,
  kicker,
  title,
  children,
  footer,
  zIndexClass = "z-[140]",
  maxWidthClass = "max-w-md",
}: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 flex items-center justify-center p-3 whitespace-normal", zIndexClass)}
      role="presentation"
      onClick={onClose}
    >
      <button
        type="button"
        className={cn("absolute inset-0", managersToolbarModalBackdropClass)}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 box-border w-[min(100%,28rem)] overflow-hidden shadow-xl break-words",
          maxWidthClass,
          managersToolbarModalShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] min-w-0">
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{kicker}</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-foreground">{title}</p>
            <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{children}</div>
          </div>
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
