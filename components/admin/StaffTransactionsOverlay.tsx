"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EndUserTransactionsTable } from "@/components/admin/EndUserTransactionsTable";
import { useStaffTransactionsLazy } from "@/components/admin/useStaffTransactionsLazy";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
  staffDetailsOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import type { AdminTransactionRow } from "@/lib/repos/billing";

export function StaffTransactionsOverlay({
  username,
  open,
  onClose,
  initialTransactions = [],
  transactionsApiBase = "/api/admin",
}: {
  username: string;
  open: boolean;
  onClose: () => void;
  initialTransactions?: AdminTransactionRow[];
  transactionsApiBase?: "/api/admin" | "/api/manager" | "/api/reseller";
}) {
  const [portalReady, setPortalReady] = useState(false);
  const { rows, loading, walletBalance } = useStaffTransactionsLazy(username, open, initialTransactions, transactionsApiBase);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !portalReady || typeof document === "undefined") return null;

  return createPortal(
    <div className={staffDetailsOverlayShellClass} role="presentation">
      <button
        type="button"
        className={cn("absolute inset-0", managersToolbarModalBackdropClass)}
        aria-label="Close transactions"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 box-border flex w-full max-w-[min(96vw,1400px)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden sm:max-h-[calc(100dvh-2.5rem)]",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="hud-modal-opaque-panel relative z-[1] flex min-h-0 w-full flex-col overflow-hidden rounded-[inherit] bg-white p-2.5 dark:bg-[hsl(222_47%_6%/0.94)] sm:p-3">
          <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 pb-2 dark:border-b-cyan-400/10">
            <div>
              <h3 className="text-base font-semibold leading-tight text-foreground">Transactions</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                User: <span className="font-mono font-semibold text-foreground">{username}</span>
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {loading ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
              Loading transactions…
            </p>
          ) : (
            <div className="flex min-h-0 w-full flex-col overflow-hidden">
              <EndUserTransactionsTable
                rows={rows}
                fillHeight
                ledgerNetMode="walletSigned"
                modalColumnPreset="staff"
                walletBalance={walletBalance ?? undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
