"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check } from "lucide-react";
import {
  OPERATOR_ROLE_SEGMENT_ACTIVE_CLASS,
  type OperatorRole,
} from "@/components/dashboard/operatorRoleColors";
import {
  adminHudModalBackdropPerfClass,
  managersToolbarModalShellClass,
  nestedHudModalOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import {
  rsIconSm,
  rsTextBody,
  rsTextCaption,
  rsTextHeadingSm,
  uiBadgeTagClass,
} from "@/lib/ui/responsiveScale";

const modalPanelClass = cn(
  "credits-success-dialog relative z-10 w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-visible p-0 sm:max-w-[24rem]",
  managersToolbarModalShellClass,
);

const monoNum = "font-mono tabular-nums tracking-tight";

function formatCreditsInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export type CreditsActionSuccessMode = "add" | "recover";

export type CreditsActionSuccessDetails = {
  mode: CreditsActionSuccessMode;
  staffType: "MANAGER" | "RESELLER" | "DEALER";
  username: string;
  displayName?: string;
  balanceBefore: number;
  balanceAfter: number;
  credited: number;
  principal?: number;
  promoBonus?: number;
  recoverGrantCount?: number;
  payerCreditsAfter?: number | null;
};

type Props = {
  open: boolean;
  details: CreditsActionSuccessDetails;
  onDismiss: () => void;
};

function staffTypeLabel(type: CreditsActionSuccessDetails["staffType"]) {
  if (type === "MANAGER") return "Manager";
  if (type === "RESELLER") return "Reseller";
  return "Dealer";
}

function staffTypeToRole(type: CreditsActionSuccessDetails["staffType"]): OperatorRole {
  if (type === "MANAGER") return "manager";
  if (type === "RESELLER") return "reseller";
  return "dealer";
}

function payerWalletLabel(type: CreditsActionSuccessDetails["staffType"]) {
  if (type === "MANAGER") return "Admin wallet";
  if (type === "RESELLER") return "Manager wallet";
  return "Reseller wallet";
}

function StatRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className={cn(rsTextBody, "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          monoNum,
          emphasize ? "text-sm font-semibold text-emerald-700 dark:text-emerald-300" : "text-xs text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CreditsSuccessSummary({ details }: { details: CreditsActionSuccessDetails }) {
  const isAdd = details.mode === "add";
  const role = staffTypeToRole(details.staffType);
  const principal = details.principal ?? details.credited;
  const promoBonus = Math.max(0, details.promoBonus ?? (isAdd ? details.credited - principal : 0));
  const showPromo = isAdd && promoBonus > 0;
  const showPayer =
    isAdd && details.payerCreditsAfter != null && Number.isFinite(details.payerCreditsAfter);
  const balanceChanged = details.balanceBefore !== details.balanceAfter;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/60",
        "bg-card/95 shadow-sm dark:bg-[hsl(222_47%_8%/0.92)]",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border/50 px-3.5 py-3">
        <span className={cn("shrink-0", uiBadgeTagClass, OPERATOR_ROLE_SEGMENT_ACTIVE_CLASS[role])}>
          {staffTypeLabel(details.staffType)}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className={cn("truncate font-mono text-xs font-semibold text-foreground", monoNum)}>{details.username}</p>
          {details.displayName?.trim() ? (
            <p className={cn("mt-0.5 truncate", rsTextCaption, "text-muted-foreground")}>{details.displayName.trim()}</p>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-border/40 px-3.5">
        <StatRow label={isAdd ? "Principal" : "Amount reversed"} value={formatCreditsInt(isAdd ? principal : details.credited)} />
        {showPromo ? (
          <StatRow label="Promo bonus" value={`+${formatCreditsInt(promoBonus)}`} />
        ) : null}
        {!isAdd && details.recoverGrantCount != null && details.recoverGrantCount > 0 ? (
          <StatRow label="Loads reversed" value={String(details.recoverGrantCount)} />
        ) : null}
        <StatRow
          label={isAdd ? "Total credited" : "Total recovered"}
          value={formatCreditsInt(details.credited)}
          emphasize
        />
      </div>

      <div className="border-t border-border/50 bg-muted/20 px-3.5 py-3.5 dark:bg-white/[0.04]">
        <p className={cn(rsTextCaption, "text-center text-muted-foreground")}>
          {balanceChanged ? "Updated wallet balance" : "Wallet balance"}
        </p>
        {balanceChanged ? (
          <div className="mt-2 flex items-center justify-center gap-2 sm:gap-2.5">
            <span className={cn(monoNum, "text-sm text-muted-foreground")}>{formatCreditsInt(details.balanceBefore)}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className={cn(monoNum, "text-xl font-semibold text-emerald-700 dark:text-emerald-300")}>
              {formatCreditsInt(details.balanceAfter)}
            </span>
          </div>
        ) : (
          <p className={cn("mt-1.5 text-center text-xl font-semibold text-foreground", monoNum)}>
            {formatCreditsInt(details.balanceAfter)}
          </p>
        )}
      </div>

      {showPayer ? (
        <div className="flex items-center justify-between gap-4 border-t border-border/50 px-3.5 py-2.5">
          <span className={cn(rsTextCaption, "text-muted-foreground")}>{payerWalletLabel(details.staffType)} remaining</span>
          <span className={cn(monoNum, "text-xs font-medium text-foreground")}>
            {formatCreditsInt(details.payerCreditsAfter!)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Centered confirmation above the staff credits editor (portaled above z-[320] editor). */
export function CreditsActionSuccessModal({ open, details, onDismiss }: Props) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onDismiss();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onDismiss]);

  if (!open || !portalReady || typeof document === "undefined") return null;

  const isAdd = details.mode === "add";
  const title = isAdd ? "Credits added" : "Credits recovered";
  const subtitle = isAdd
    ? "Opening balance has been applied to this account."
    : "Selected credit loads were reversed successfully.";

  return createPortal(
    <div className={cn(nestedHudModalOverlayShellClass, adminHudModalBackdropPerfClass)} role="presentation">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close dialog"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-success-dialog-title"
        aria-describedby="credits-success-dialog-desc"
        className={modalPanelClass}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] flex flex-col gap-4 rounded-[inherit] bg-inherit px-4 py-5 sm:px-5 sm:py-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                "bg-emerald-500/12 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:ring-emerald-400/30",
              )}
            >
              <Check className={cn(rsIconSm, "text-emerald-600 dark:text-emerald-300")} strokeWidth={2.5} aria-hidden />
            </div>
            <div className="space-y-1">
              <h2 id="credits-success-dialog-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                {title}
              </h2>
              <p id="credits-success-dialog-desc" className={cn(rsTextCaption, "max-w-[18rem] text-muted-foreground")}>
                {subtitle}
              </p>
            </div>
          </div>

          <CreditsSuccessSummary details={details} />

          <Button type="button" className="w-full" onClick={onDismiss}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
