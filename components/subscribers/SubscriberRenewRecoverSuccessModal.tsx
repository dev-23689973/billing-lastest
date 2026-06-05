"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check } from "lucide-react";
import {
  adminHudModalBackdropPerfClass,
  managersToolbarModalShellClass,
  nestedHudModalOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import type { SubscriberRenewRecoverSuccessDetails } from "@/lib/subscriberRenewRecoverSuccess";
import {
  rsIconSm,
  rsTextBody,
  rsTextCaption,
  rsTextHeadingSm,
  uiBadgeTagClass,
} from "@/lib/ui/responsiveScale";

const modalPanelClass = cn(
  "subscriber-renew-recover-success-dialog relative z-10 w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-visible p-0 sm:max-w-[24rem]",
  managersToolbarModalShellClass,
);

const monoNum = "font-mono tabular-nums tracking-tight";

function formatCreditsInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

type Props = {
  open: boolean;
  details: SubscriberRenewRecoverSuccessDetails;
  onDismiss: () => void;
};

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

function SuccessSummary({ details }: { details: SubscriberRenewRecoverSuccessDetails }) {
  const isRenew = details.mode === "renew";
  const walletChanged = details.walletBefore !== details.walletAfter;
  const expiryChanged =
    details.expiryBeforeLabel &&
    details.expiryAfterLabel &&
    details.expiryBeforeLabel !== details.expiryAfterLabel;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/60",
        "bg-card/95 shadow-sm dark:bg-[hsl(222_47%_8%/0.92)]",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border/50 px-3.5 py-3">
        <span
          className={cn(
            "shrink-0",
            uiBadgeTagClass,
            "border-sky-400/35 bg-sky-500/12 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
          )}
        >
          Account
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className={cn("truncate font-mono text-xs font-semibold text-foreground", monoNum)}>{details.account}</p>
          {details.displayName?.trim() ? (
            <p className={cn("mt-0.5 truncate", rsTextCaption, "text-muted-foreground")}>{details.displayName.trim()}</p>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-border/40 px-3.5">
        {isRenew && details.periodLabel ? (
          <StatRow label="Renewal period" value={details.periodLabel} />
        ) : null}
        {isRenew && details.chargedCredits != null ? (
          <StatRow label="Credits charged" value={formatCreditsInt(details.chargedCredits)} />
        ) : null}
        {isRenew && details.promoBonusMonths != null && details.promoBonusMonths > 0 ? (
          <StatRow label="Promo bonus" value={`+${formatCreditsInt(details.promoBonusMonths)} mo`} />
        ) : null}
        {!isRenew && details.creditMonthsRecovered != null && details.creditMonthsRecovered > 0 ? (
          <StatRow label="Credit months" value={formatCreditsInt(details.creditMonthsRecovered)} />
        ) : null}
        {!isRenew && details.bonusMonthsRecovered != null && details.bonusMonthsRecovered > 0 ? (
          <StatRow label="Bonus months" value={formatCreditsInt(details.bonusMonthsRecovered)} />
        ) : null}
      </div>

      {details.bulkWalletRows && details.bulkWalletRows.length > 1 ? (
        <div className="divide-y divide-border/40 border-t border-border/50">
          {details.bulkWalletRows.map((row) => (
            <div key={row.debitUsername} className="px-3.5 py-2.5">
              <p className={cn(rsTextCaption, "font-medium text-foreground")}>
                {row.debitUsername}{" "}
                <span className="font-normal text-muted-foreground">({row.accountCount} renewed)</span>
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className={cn(rsTextCaption, "text-muted-foreground")}>Wallet</span>
                <div className="flex items-center gap-2">
                  <span className={cn(monoNum, "text-xs text-muted-foreground")}>{formatCreditsInt(row.walletBefore)}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
                  <span className={cn(monoNum, "text-sm font-semibold text-emerald-700 dark:text-emerald-300")}>
                    {formatCreditsInt(row.walletAfter)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-border/50 bg-muted/20 px-3.5 py-3.5 dark:bg-white/[0.04]">
          <p className={cn(rsTextCaption, "text-center text-muted-foreground")}>
            {walletChanged ? "Updated wallet balance" : "Wallet balance"}
          </p>
          {walletChanged ? (
            <div className="mt-2 flex items-center justify-center gap-2 sm:gap-2.5">
              <span className={cn(monoNum, "text-sm text-muted-foreground")}>{formatCreditsInt(details.walletBefore)}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
              <span className={cn(monoNum, "text-xl font-semibold text-emerald-700 dark:text-emerald-300")}>
                {formatCreditsInt(details.walletAfter)}
              </span>
            </div>
          ) : (
            <p className={cn("mt-1.5 text-center text-xl font-semibold text-foreground", monoNum)}>
              {formatCreditsInt(details.walletAfter)}
            </p>
          )}
        </div>
      )}

      {expiryChanged ? (
        <div className="border-t border-border/50 px-3.5 py-3">
          <p className={cn(rsTextCaption, "text-center text-muted-foreground")}>Subscription expiry</p>
          <div className="mt-2 flex items-center justify-center gap-2 sm:gap-2.5">
            <span className={cn(monoNum, "text-xs text-muted-foreground")}>{details.expiryBeforeLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            <span className={cn(monoNum, "text-sm font-semibold text-foreground")}>{details.expiryAfterLabel}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SubscriberRenewRecoverSuccessModal({ open, details, onDismiss }: Props) {
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

  const isRenew = details.mode === "renew";
  const title = isRenew ? "Account renewed" : "Credits recovered";
  const subtitle = isRenew
    ? "Subscription was extended and credits were debited from your wallet."
    : "Selected subscription time was reversed and credits returned to your wallet.";

  return createPortal(
    <div className={cn(nestedHudModalOverlayShellClass, adminHudModalBackdropPerfClass, "z-[170]")} role="presentation">
      <button type="button" className="absolute inset-0" aria-label="Close dialog" onClick={onDismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscriber-renew-recover-success-title"
        aria-describedby="subscriber-renew-recover-success-desc"
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
              <h2 id="subscriber-renew-recover-success-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                {title}
              </h2>
              <p id="subscriber-renew-recover-success-desc" className={cn(rsTextCaption, "max-w-[18rem] text-muted-foreground")}>
                {subtitle}
              </p>
            </div>
          </div>

          <SuccessSummary details={details} />

          <Button type="button" className="w-full" onClick={onDismiss}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
