"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock, CreditCard, X } from "lucide-react";
import { toast } from "sonner";
import { RenewPeriodSelect } from "@/components/subscribers/RenewPeriodSelect";
import { SubscriberRenewRecoverSuccessModal } from "@/components/subscribers/SubscriberRenewRecoverSuccessModal";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  addMonthsToRenewExpiry,
  formatRelativeDayCountFromToday,
  formatRenewExpiryDateShort,
  formatRenewSubmitLabel,
  parseRenewExpiryDate,
  renewPeriodMonths,
} from "@/lib/renewModalDisplay";
import { rsIconSm, rsTextBody, rsTextHeadingSm } from "@/lib/ui/responsiveScale";
import {
  clampValiditySelection,
  filterRenewValidityOptionsByDebitCredits,
  validityOptionChargedCredits,
  type ValidityOption,
} from "@/lib/validityOptions";
import {
  buildSubscriberRenewSuccessDetails,
  type SubscriberRenewRecoverSuccessDetails,
} from "@/lib/subscriberRenewRecoverSuccess";

export type SubscriberRenewAvailability = {
  expiresAt: string | null;
  recoverableCredits: number | null;
  debitUsername: string | null;
  debitCredits: number | null;
  autoRenewEnabled: boolean;
  autoRenewCyclesRemaining: number;
};

type Props = {
  account: string;
  displayName?: string | null;
  open: boolean;
  onClose: () => void;
  validityOptions: ValidityOption[];
  loadAvailability: () => Promise<SubscriberRenewAvailability | null>;
  onSubmit: (validity: string) => Promise<{ ok: boolean; message?: string }>;
  onAfterSuccess?: () => void;
};

export function SubscriberRenewAccountModal({
  account,
  displayName,
  open,
  onClose,
  validityOptions,
  loadAvailability,
  onSubmit,
  onAfterSuccess,
}: Props) {
  const [validity, setValidity] = useState("1");
  const [availability, setAvailability] = useState<SubscriberRenewAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SubscriberRenewRecoverSuccessDetails | null>(null);
  const [pending, startTransition] = useTransition();

  const debitBalance = availability?.debitCredits ?? null;

  const renewValidityOptions = useMemo(
    () => filterRenewValidityOptionsByDebitCredits(validityOptions, debitBalance),
    [validityOptions, debitBalance],
  );

  const noAffordableValidity = !availabilityLoading && renewValidityOptions.length === 0;
  const selectedOption = renewValidityOptions.find((o) => o.value === validity);
  const chargedCredits = selectedOption != null ? validityOptionChargedCredits(selectedOption) : null;

  const renewCurrentExpiry = parseRenewExpiryDate(availability?.expiresAt);
  const previewMonths = selectedOption ? renewPeriodMonths(selectedOption) : 0;
  const renewAfterExpiry =
    renewCurrentExpiry && previewMonths > 0 ? addMonthsToRenewExpiry(renewCurrentExpiry, previewMonths) : null;

  const load = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const data = await loadAvailability();
      if (!data) return;
      setAvailability(data);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [loadAvailability]);

  useEffect(() => {
    if (!open) return;
    setValidity("1");
    setAvailability(null);
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || availabilityLoading) return;
    setValidity((prev) => clampValiditySelection(prev, renewValidityOptions));
  }, [open, availabilityLoading, renewValidityOptions]);

  function dismissSuccess() {
    setSuccessDetails(null);
    onClose();
    onAfterSuccess?.();
  }

  function runSubmit() {
    if (noAffordableValidity || !selectedOption) {
      toast.warning("No renewal period fits the current debit wallet balance.");
      return;
    }
    const walletBefore =
      debitBalance != null && Number.isFinite(debitBalance) ? Math.max(0, Math.floor(debitBalance)) : 0;
    startTransition(async () => {
      const res = await onSubmit(validity);
      if (!res.ok) {
        toast.error(res.message || "Renew failed.");
        return;
      }
      setSuccessDetails(
        buildSubscriberRenewSuccessDetails({
          account,
          displayName: displayName ?? undefined,
          debitUsername: availability?.debitUsername,
          walletBefore,
          selectedOption,
          expiryBefore: renewCurrentExpiry,
          expiryAfter: renewAfterExpiry,
        }),
      );
    });
  }

  useEffect(() => {
    if (open) return;
    if (successDetails) return;
    setValidity("1");
    setAvailability(null);
  }, [open, successDetails]);

  if (typeof document === "undefined") return null;

  if (successDetails) {
    return <SubscriberRenewRecoverSuccessModal open details={successDetails} onDismiss={dismissSuccess} />;
  }

  if (!open) return null;

  const currentExpiryLabel = formatRenewExpiryDateShort(renewCurrentExpiry);
  const currentRelative = formatRelativeDayCountFromToday(renewCurrentExpiry);
  const newExpiryLabel = formatRenewExpiryDateShort(renewAfterExpiry);
  const newRelative = formatRelativeDayCountFromToday(renewAfterExpiry);
  const availableCredits =
    debitBalance != null && Number.isFinite(debitBalance) ? Math.max(0, Math.floor(debitBalance)) : null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[150] flex items-center justify-center p-4 whitespace-normal", managersToolbarModalBackdropClass)}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="renew-account-title"
        className={cn(
          "relative z-10 box-border w-[min(100%,32rem)] overflow-hidden break-words",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock className={cn(rsIconSm, "text-foreground")} aria-hidden />
              <h2 id="renew-account-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                Renew Account{" "}
                <span className="text-blue-600 dark:text-blue-400">{account}</span>
              </h2>
            </div>
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

        <div className="space-y-4 px-5 py-4">
          <div>
            <label id={`renew-validity-${account}`} className="mb-2 block text-sm font-semibold text-foreground">
              Renewal Period
            </label>
            {availabilityLoading || debitBalance == null ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Loading renewal periods…
              </p>
            ) : noAffordableValidity ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {debitBalance === 0
                  ? "Debit wallet has no credits. Add credits before renewing."
                  : "No renewal period fits the current debit wallet balance."}
              </p>
            ) : (
              <RenewPeriodSelect
                value={validity}
                onValueChange={setValidity}
                options={renewValidityOptions}
                labelledBy={`renew-validity-${account}`}
                disabled={pending}
              />
            )}
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-500/25 dark:bg-sky-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className={cn(rsIconSm, "text-sky-600 dark:text-sky-300")} aria-hidden />
              Spending Insights
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Credits Applied:</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {availabilityLoading || chargedCredits == null ? "—" : chargedCredits}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Available credits:</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {availabilityLoading || availableCredits == null ? "—" : availableCredits}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600/30 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-foreground">Present Expiration Date</p>
            <p className={cn("mt-2 flex flex-wrap items-center gap-2", rsTextBody, "text-muted-foreground")}>
              <CalendarDays className={cn(rsIconSm, "text-slate-500")} aria-hidden />
              <span className="font-semibold text-foreground">{availabilityLoading ? "Loading…" : currentExpiryLabel ?? "—"}</span>
              {currentRelative ? <span className="font-medium text-emerald-600 dark:text-emerald-400">{currentRelative}</span> : null}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <p className="text-sm font-semibold text-foreground">Extended Expiration Date</p>
            <p className={cn("mt-2 flex flex-wrap items-center gap-2", rsTextBody)}>
              <CalendarDays className={cn(rsIconSm, "text-emerald-600 dark:text-emerald-300")} aria-hidden />
              <span className="font-semibold text-emerald-700 dark:text-emerald-200">
                {availabilityLoading || noAffordableValidity ? "—" : newExpiryLabel ?? "—"}
              </span>
              {newRelative && !noAffordableValidity ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{newRelative}</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-500"
            onClick={runSubmit}
            disabled={pending || availabilityLoading || noAffordableValidity}
          >
            {pending ? "Working…" : formatRenewSubmitLabel(selectedOption)}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
