"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Clock, CreditCard, X } from "lucide-react";
import { RenewPeriodSelect } from "@/components/subscribers/RenewPeriodSelect";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import {
  anyWalletAffordableForBulkOption,
  bestOffWalletAverageCredits,
  bulkRenewWalletAfterBalance,
  chargedPerAccountForValidity,
  filterBulkRenewValidityOptions,
  walletAffordableForBulkOption,
  walletsRenewingAtPeriod,
  type BulkRenewAvailabilitySnapshot,
} from "@/lib/bulkRenewPlanning";
import { cn } from "@/lib/cn";
import { rsIconSm, rsTextBody, rsTextCaption, rsTextHeadingSm } from "@/lib/ui/responsiveScale";
import type { ValidityOption } from "@/lib/validityOptions";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  validityOptions: ValidityOption[];
  availability: BulkRenewAvailabilitySnapshot | null;
  loading: boolean;
  validity: string;
  onValidityChange: (value: string) => void;
  pending: boolean;
  onSubmit: () => void;
  title?: string;
};

export function BulkRenewAccountsModal({
  open,
  onClose,
  selectedCount,
  validityOptions,
  availability,
  loading,
  validity,
  onValidityChange,
  pending,
  onSubmit,
  title = "Renew selected accounts",
}: Props) {
  const wallets = availability?.wallets ?? [];

  const bestOffAvg = useMemo(() => bestOffWalletAverageCredits(wallets), [wallets]);

  const affordableOptions = useMemo(
    () => filterBulkRenewValidityOptions(validityOptions, wallets),
    [validityOptions, wallets],
  );

  const noPeriodOptions = !loading && affordableOptions.length === 0;

  const selectedOption = affordableOptions.find((o) => o.value === validity);
  const chargedPerAccount = chargedPerAccountForValidity(validity, selectedOption);
  const renewingWallets = selectedOption ? walletsRenewingAtPeriod(wallets, selectedOption) : [];
  const renewingAccountCount = renewingWallets.reduce((sum, w) => sum + w.accountCount, 0);
  const totalCharge = chargedPerAccount * renewingAccountCount;
  const canSubmit =
    !loading &&
    !!selectedOption &&
    anyWalletAffordableForBulkOption(wallets, selectedOption);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const singleWallet = wallets.length === 1 ? wallets[0] : null;
  const walletAfterSingle =
    singleWallet != null ? bulkRenewWalletAfterBalance(singleWallet, chargedPerAccount) : null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[150] flex items-center justify-center p-2 whitespace-normal sm:p-4", managersToolbarModalBackdropClass)}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-renew-title"
        className={cn(
          "relative z-10 box-border flex max-h-[calc(100dvh-1rem)] w-[min(100%,36rem)] flex-col overflow-hidden break-words",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock className={cn(rsIconSm, "text-foreground")} aria-hidden />
              <h2 id="bulk-renew-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                {title}
              </h2>
            </div>
            <p className={cn("mt-1", rsTextCaption, "text-muted-foreground")}>
              <span className="font-semibold text-foreground">{selectedCount}</span> account
              {selectedCount === 1 ? "" : "s"} selected
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            aria-label="Close"
            onClick={onClose}
          >
            <X className={rsIconSm} aria-hidden />
          </button>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-500/25 dark:bg-sky-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className={cn(rsIconSm, "text-sky-600 dark:text-sky-300")} aria-hidden />
              Cost information
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Best-off average (max period guide):</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {loading ? "…" : `~${fmt(Math.floor(bestOffAvg))} credits / account`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Credits per account:</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {loading || noPeriodOptions || !selectedOption ? "—" : fmt(chargedPerAccount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Total credits (renewing wallets):</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {loading || !selectedOption ? "—" : fmt(totalCharge)}
                </span>
              </div>
              {selectedOption && canSubmit ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Accounts renewing:</span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {renewingAccountCount} of {selectedCount}
                  </span>
                </div>
              ) : null}
              {singleWallet ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Available credits ({singleWallet.debitUsername}):</span>
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {loading ? "…" : fmt(singleWallet.debitCredits)}
                    </span>
                  </div>
                  {walletAfterSingle != null && canSubmit ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">After renewal:</span>
                      <span className="font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">
                        {fmt(walletAfterSingle)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {wallets.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600/30 dark:bg-slate-900/40">
              <p className={cn(rsTextBody, "font-semibold text-foreground")}>Debit wallets</p>
              <p className={cn("mt-1", rsTextCaption, "text-muted-foreground")}>
                Each wallet renews all of its selected accounts, or skips them entirely. Wallets that cannot afford the
                full group are left unchanged.
              </p>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className={cn(rsTextCaption, "text-muted-foreground")}>Loading wallet balances…</p>
                ) : (
                  wallets.map((wallet) => {
                    const walletCharge = chargedPerAccount * wallet.accountCount;
                    const after = bulkRenewWalletAfterBalance(wallet, chargedPerAccount);
                    const willRenew =
                      !!selectedOption && walletAffordableForBulkOption(wallet, selectedOption);
                    const avgMonths = wallet.accountCount > 0 ? wallet.debitCredits / wallet.accountCount : 0;
                    return (
                      <div
                        key={wallet.debitUsername}
                        className="rounded-md border border-border/50 bg-card/80 px-3 py-2 dark:bg-card/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(rsTextCaption, "font-semibold text-foreground")}>{wallet.debitUsername}</span>
                          <span
                            className={cn(
                              rsTextCaption,
                              "shrink-0 rounded-full px-2 py-0.5 font-semibold",
                              !selectedOption
                                ? "bg-muted text-muted-foreground"
                                : willRenew
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                            )}
                          >
                            {!selectedOption ? "—" : willRenew ? "Renew all" : "Skip"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                          <span className={cn(rsTextCaption, "text-muted-foreground")}>
                            {wallet.accountCount} account{wallet.accountCount === 1 ? "" : "s"} · ~{fmt(Math.floor(avgMonths))} cr/acct
                          </span>
                          <span className={cn(rsTextCaption, "tabular-nums text-muted-foreground")}>
                            Balance {fmt(wallet.debitCredits)}
                            {selectedOption ? (
                              <>
                                {" "}
                                →{" "}
                                <span className={willRenew ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                  {willRenew ? fmt(after) : fmt(wallet.debitCredits)}
                                </span>
                              </>
                            ) : null}
                          </span>
                        </div>
                        {selectedOption ? (
                          <p className={cn("mt-0.5", rsTextCaption, "tabular-nums text-muted-foreground")}>
                            Needs {fmt(walletCharge)} credits for this period
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              {availability && availability.unresolvedCount > 0 ? (
                <p className={cn("mt-2", rsTextCaption, "text-amber-700 dark:text-amber-300")}>
                  Could not load wallet data for {availability.unresolvedCount} account
                  {availability.unresolvedCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label id="bulk-renew-validity" className="mb-2 block text-sm font-semibold text-foreground">
              Renewal period
            </label>
            {loading ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Loading renewal periods…
              </p>
            ) : noPeriodOptions ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                No renewal period fits the best-off dealer average for this selection. Add credits to dealer wallets or
                select fewer accounts.
              </p>
            ) : (
              <RenewPeriodSelect
                value={validity}
                onValueChange={onValidityChange}
                options={affordableOptions}
                labelledBy="bulk-renew-validity"
                disabled={pending}
              />
            )}
            {!loading && !noPeriodOptions ? (
              <p className={cn("mt-1.5", rsTextCaption, "text-muted-foreground")}>
                Periods are shown up to the best-off dealer (highest credits per account). Only wallets that can afford
                all of their accounts at the chosen period will renew.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="bg-blue-600 text-white hover:bg-blue-500" onClick={onSubmit} disabled={pending || loading || !canSubmit}>
            {pending ? "Working…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
