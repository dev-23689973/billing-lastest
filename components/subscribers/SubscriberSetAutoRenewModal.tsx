"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CreditCard, Repeat, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { AutoRenewPeriodSelect } from "@/components/subscribers/AutoRenewPeriodSelect";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import {
  autoRenewPeriodSelectionFromAccount,
  buildAutoRenewPeriodSelectOptions,
  clampAutoRenewPeriodSelection,
  clampAutoRenewTotalCycles,
  formatAutoRenewUntilLabel,
  formatAutoRenewUntilMonthYear,
  parseAutoRenewPeriodSelection,
} from "@/lib/accountAutoRenew";
import { cn } from "@/lib/cn";
import { rsIconSm, rsTextBody, rsTextHeadingSm, rsTextKicker } from "@/lib/ui/responsiveScale";
import type { ValidityOption } from "@/lib/validityOptions";
import type { SubscriberRenewAvailability } from "@/components/subscribers/SubscriberRenewAccountModal";

type Props = {
  account: string;
  displayName?: string | null;
  open: boolean;
  onClose: () => void;
  validityOptions: ValidityOption[];
  loadAvailability: () => Promise<SubscriberRenewAvailability | null>;
  onSubmit: (period: string) => Promise<{ ok: boolean; message?: string }>;
};

export function SubscriberSetAutoRenewModal({
  account,
  displayName,
  open,
  onClose,
  validityOptions,
  loadAvailability,
  onSubmit,
}: Props) {
  const [availability, setAvailability] = useState<SubscriberRenewAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("disable");
  const [pending, startTransition] = useTransition();

  const debitBalance = availability?.debitCredits ?? null;
  const options = useMemo(
    () => buildAutoRenewPeriodSelectOptions(validityOptions, debitBalance),
    [validityOptions, debitBalance],
  );
  const paidOptions = useMemo(() => options.filter((o) => o.value !== "disable"), [options]);
  const noAffordablePeriod = !loading && availability != null && paidOptions.length === 0;
  const label = (displayName ?? account).trim() || account;
  const isDisableSelection = period === "disable";
  const parsed = parseAutoRenewPeriodSelection(period);

  const currentUntilLabel =
    availability?.autoRenewEnabled === true
      ? formatAutoRenewUntilMonthYear(availability.expiresAt, availability.autoRenewCyclesRemaining ?? 0) ??
        formatAutoRenewUntilLabel(availability.expiresAt, availability.autoRenewCyclesRemaining ?? 0)
      : null;

  const previewUntilLabel = useMemo(() => {
    if (!availability?.expiresAt || isDisableSelection) return null;
    const remaining = Math.max(0, parsed.totalCycles - 1);
    return formatAutoRenewUntilLabel(availability.expiresAt, remaining);
  }, [availability?.expiresAt, isDisableSelection, parsed.totalCycles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAvailability();
      if (!data) return;
      setAvailability(data);
      const initial = autoRenewPeriodSelectionFromAccount(data.autoRenewEnabled, data.autoRenewCyclesRemaining ?? 0);
      setPeriod(
        clampAutoRenewPeriodSelection(
          initial,
          buildAutoRenewPeriodSelectOptions(validityOptions, data.debitCredits),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [loadAvailability, validityOptions]);

  useEffect(() => {
    if (!open) return;
    setAvailability(null);
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || loading || availability == null) return;
    setPeriod((prev) => clampAutoRenewPeriodSelection(prev, options));
  }, [open, loading, availability, options]);

  function runSubmit() {
    if (noAffordablePeriod && !isDisableSelection) {
      toast.warning("Debit wallet has no credits for auto renewal.");
      return;
    }
    startTransition(async () => {
      const res = await onSubmit(period);
      if (!res.ok) {
        toast.error(res.message || "Could not update auto renewal.");
        return;
      }
      onClose();
      toast.success(
        isDisableSelection
          ? "Auto renewal disabled."
          : `Auto renewal set for ${parsed.totalCycles} month${parsed.totalCycles === 1 ? "" : "s"}.`,
      );
    });
  }

  if (!open || typeof document === "undefined") return null;

  const unchanged =
    availability != null &&
    period === autoRenewPeriodSelectionFromAccount(availability.autoRenewEnabled, availability.autoRenewCyclesRemaining ?? 0);

  const availableCredits =
    debitBalance != null && Number.isFinite(debitBalance) ? Math.max(0, Math.floor(debitBalance)) : null;
  const selectedCredits = isDisableSelection ? 0 : parsed.totalCycles;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[150] flex items-center justify-center p-4 whitespace-normal", managersToolbarModalBackdropClass)}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-auto-renew-title"
        className={cn(
          "relative z-10 box-border w-[min(100%,28rem)] overflow-hidden break-words",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Repeat className={cn(rsIconSm, "text-violet-600 dark:text-violet-300")} aria-hidden />
              <h2 id="set-auto-renew-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                Set Auto Renew
              </h2>
            </div>
            <p className={cn("mt-1", rsTextBody, "text-muted-foreground")}>
              Configure auto renewal for <span className="font-semibold text-foreground">{label}</span>
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

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-600/30 dark:bg-slate-900/40">
            <div className="flex items-center justify-between gap-3">
              <span className={cn(rsTextKicker, "normal-case tracking-normal text-muted-foreground")}>
                Current Auto Renew Period
              </span>
              {loading ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : currentUntilLabel != null ? (
                <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Enabled
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Disabled
                </span>
              )}
            </div>
            {currentUntilLabel ? (
              <p className={cn("mt-2 flex items-center gap-2", rsTextBody, "text-muted-foreground")}>
                <CalendarDays className={cn(rsIconSm, "text-violet-500/80")} aria-hidden />
                <span>
                  Active until{" "}
                  <span className="font-semibold text-foreground">{currentUntilLabel}</span>
                </span>
              </p>
            ) : null}
          </div>

          <div>
            <label id="auto-renew-period-label" className="mb-2 block text-sm font-semibold text-foreground">
              Select Auto Renew Period
            </label>
            {loading || debitBalance == null ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Loading auto renew periods…
              </p>
            ) : noAffordablePeriod ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {debitBalance === 0
                  ? "Debit wallet has no credits. Add credits before enabling auto renewal."
                  : "No auto renew period fits the current debit wallet balance."}
              </p>
            ) : (
              <AutoRenewPeriodSelect
                value={period}
                onValueChange={setPeriod}
                options={options}
                labelledBy="auto-renew-period-label"
                disabled={pending}
              />
            )}
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-500/25 dark:bg-sky-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CreditCard className={cn(rsIconSm, "text-sky-600 dark:text-sky-300")} aria-hidden />
              Cost Information
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Credits selected:</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {loading || availableCredits == null ? "—" : selectedCredits}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Available credits:</span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {loading || availableCredits == null ? "—" : availableCredits}
                </span>
              </div>
            </div>
          </div>

          {isDisableSelection ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
              <Shield className={cn(rsIconSm, "mt-0.5 shrink-0 text-amber-600 dark:text-amber-300")} aria-hidden />
              <p className={cn(rsTextBody, "text-amber-900 dark:text-amber-50")}>
                This will disable auto renewal for this account.
              </p>
            </div>
          ) : previewUntilLabel ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-3 text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-50">
              <CalendarDays className={cn(rsIconSm, "mt-0.5 shrink-0 text-violet-600 dark:text-violet-300")} aria-hidden />
              <p className={cn(rsTextBody)}>
                Auto renew until: <span className="font-semibold">{previewUntilLabel}</span>
              </p>
            </div>
          ) : null}
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
            disabled={pending || loading || unchanged || (noAffordablePeriod && !isDisableSelection)}
          >
            {pending ? "Saving…" : isDisableSelection ? "Disable Auto Renew" : "Set Auto Renew"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
