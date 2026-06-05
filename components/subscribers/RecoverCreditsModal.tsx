"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CalendarDays, Gift, RotateCcw, Wallet, X } from "lucide-react";
import { BulkRenewValiditySelect } from "@/components/admin/BulkRenewValiditySelect";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatRenewExpiryDateShort } from "@/lib/renewModalDisplay";
import {
  rsGapStack,
  rsIconSm,
  rsPadPanelBody,
  rsPadPanelHeader,
  rsTextBody,
  rsTextCaption,
  rsTextHeadingSm,
  rsTextKicker,
  rsTextLabel,
} from "@/lib/ui/responsiveScale";
import { formatValidityMonthLabel } from "@/lib/validityOptions";
import type { ValidityOption } from "@/lib/validityOptions";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function SectionLabel({
  id,
  icon: Icon,
  label,
  tone,
}: {
  id?: string;
  icon: typeof Wallet;
  label: string;
  tone: "credit" | "bonus";
}) {
  const toneClass =
    tone === "credit"
      ? "text-violet-700 dark:text-violet-300"
      : "text-amber-800 dark:text-amber-200";
  return (
    <div id={id} className="mb-1.5 flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          tone === "credit"
            ? "bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200"
            : "bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100",
        )}
      >
        <Icon className={rsIconSm} aria-hidden />
      </span>
      <span className={cn(rsTextLabel, "font-semibold", toneClass)}>{label}</span>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  highlight,
  icon: Icon,
  valueTone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: typeof Wallet;
  valueTone?: "credit" | "bonus" | "neutral";
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <span className={cn("flex min-w-0 flex-1 items-center gap-1 truncate", rsTextCaption, "text-muted-foreground")}>
        {Icon ? <Icon className={cn(rsIconSm, "shrink-0 opacity-70")} aria-hidden /> : null}
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-right font-mono tabular-nums",
          rsTextBody,
          highlight
            ? valueTone === "credit"
              ? "font-semibold text-violet-700 dark:text-violet-300"
              : valueTone === "bonus"
                ? "font-semibold text-amber-800 dark:text-amber-200"
                : "font-semibold text-emerald-700 dark:text-emerald-300"
            : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const creditPoolShell =
  "min-w-0 rounded-md border border-violet-200/90 bg-violet-50/85 px-2 py-1.5 dark:border-violet-500/30 dark:bg-violet-500/10 sm:px-2.5 sm:py-2";
const bonusPoolShell =
  "min-w-0 rounded-md border border-amber-200/90 bg-amber-50/85 px-2 py-1.5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:px-2.5 sm:py-2";

export type RecoverCreditsModalProps = {
  account: string;
  open: boolean;
  onClose: () => void;
  loading: boolean;
  recoverCreditMonths: string;
  onRecoverCreditMonthsChange: (value: string) => void;
  recoverBonusMonths: string;
  onRecoverBonusMonthsChange: (value: string) => void;
  recoverCreditOptions: ValidityOption[];
  recoverBonusOptions: ValidityOption[];
  recoverCreditCurrent: number | null;
  recoverBonusCurrent: number | null;
  recoverCreditInt: number;
  recoverBonusInt: number;
  recoverCreditAfter: number | null;
  recoverBonusAfter: number | null;
  recoverCurrentExpiry: Date | null;
  recoverAfterExpiry: Date | null;
  canSubmit: boolean;
  pending: boolean;
  onSubmit: () => void;
};

export function RecoverCreditsModal({
  account,
  open,
  onClose,
  loading,
  recoverCreditMonths,
  onRecoverCreditMonthsChange,
  recoverBonusMonths,
  onRecoverBonusMonthsChange,
  recoverCreditOptions,
  recoverBonusOptions,
  recoverCreditCurrent,
  recoverBonusCurrent,
  recoverCreditInt,
  recoverBonusInt,
  recoverCreditAfter,
  recoverBonusAfter,
  recoverCurrentExpiry,
  recoverAfterExpiry,
  canSubmit,
  pending,
  onSubmit,
}: RecoverCreditsModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const hasPools = (recoverCreditCurrent ?? 0) > 0 || (recoverBonusCurrent ?? 0) > 0;
  const creditSelectId = `recover-credit-${account}`;
  const bonusSelectId = `recover-bonus-${account}`;

  const currentExpiryLabel = formatRenewExpiryDateShort(recoverCurrentExpiry);
  const afterExpiryLabel = formatRenewExpiryDateShort(recoverAfterExpiry);
  const recoverMonthsOff = Math.max(0, recoverCreditInt) + Math.max(0, recoverBonusInt);
  const recoverSelectionSummary =
    recoverMonthsOff > 0 ? formatValidityMonthLabel(recoverMonthsOff, recoverCreditInt) : null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[150] flex items-center justify-center p-2 whitespace-normal sm:p-3 md:p-4",
        managersToolbarModalBackdropClass,
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recover-credits-title"
        className={cn(
          "relative z-10 box-border flex max-h-[calc(100dvh-0.75rem)] w-[min(100%,clamp(16.5rem,92vw,30rem))] flex-col overflow-hidden break-words",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-2 border-b border-border/60",
            rsPadPanelHeader,
            "py-2.5 sm:py-3",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <RotateCcw
                className={cn(rsIconSm, "shrink-0 text-violet-600 dark:text-violet-400")}
                aria-hidden
              />
              <h2 id="recover-credits-title" className={cn(rsTextHeadingSm, "text-foreground")}>
                Recover credits
              </h2>
            </div>
            <p className={cn("mt-0.5 truncate", rsTextCaption, "text-muted-foreground")}>
              Account <span className="font-semibold text-foreground">{account}</span>
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/40 hover:text-foreground sm:h-8 sm:w-8"
            aria-label="Close"
            onClick={onClose}
          >
            <X className={rsIconSm} aria-hidden />
          </button>
        </div>

        <div className={cn("min-h-0 shrink overflow-hidden", rsPadPanelBody, "py-2.5 sm:py-3")}>
          <div className={cn("flex flex-col", rsGapStack, "gap-2 sm:gap-2.5")}>
            <p className={cn(rsTextCaption, "leading-snug text-muted-foreground")}>
              New expiry must stay after today. Credits refund to wallet; bonus shortens expiry only.
            </p>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <div className={creditPoolShell}>
                <div className="flex items-center gap-1.5">
                  <Wallet className={cn(rsIconSm, "shrink-0 text-violet-600 dark:text-violet-300")} aria-hidden />
                  <p className={cn(rsTextKicker, "text-violet-800/90 dark:text-violet-200/90")}>Credit</p>
                </div>
                <p className={cn(rsTextHeadingSm, "mt-0.5 font-mono tabular-nums text-violet-950 dark:text-violet-50")}>
                  {loading ? "…" : fmt(recoverCreditCurrent ?? 0)}
                </p>
                <p className={cn(rsTextCaption, "mt-0.5 text-violet-700/80 dark:text-violet-300/80")}>Refunds wallet</p>
              </div>
              <div className={bonusPoolShell}>
                <div className="flex items-center gap-1.5">
                  <Gift className={cn(rsIconSm, "shrink-0 text-amber-700 dark:text-amber-200")} aria-hidden />
                  <p className={cn(rsTextKicker, "text-amber-900/90 dark:text-amber-100/90")}>Bonus</p>
                </div>
                <p className={cn(rsTextHeadingSm, "mt-0.5 font-mono tabular-nums text-amber-950 dark:text-amber-50")}>
                  {loading ? "…" : fmt(recoverBonusCurrent ?? 0)}
                </p>
                <p className={cn(rsTextCaption, "mt-0.5 text-amber-800/80 dark:text-amber-200/80")}>Expiry only</p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
              <div className={cn(creditPoolShell, "overflow-hidden")}>
                <SectionLabel icon={Wallet} label="Credit preview" tone="credit" />
                <div className="space-y-0.5 sm:space-y-1">
                  {recoverSelectionSummary ? (
                    <p className={cn(rsTextBody, "break-words font-semibold leading-snug text-violet-950 dark:text-violet-50")}>
                      {recoverSelectionSummary}
                    </p>
                  ) : null}
                  <PreviewRow
                    icon={Wallet}
                    label="Wallet refund"
                    value={loading ? "…" : fmt(Math.max(0, recoverCreditInt))}
                    highlight={recoverCreditInt > 0}
                    valueTone="credit"
                  />
                  <PreviewRow
                    icon={Gift}
                    label="Bonus off expiry"
                    value={loading ? "…" : fmt(Math.max(0, recoverBonusInt))}
                    highlight={recoverBonusInt > 0}
                    valueTone="bonus"
                  />
                  <PreviewRow
                    label="Left (cr · bonus)"
                    value={
                      loading || recoverCreditAfter == null || recoverBonusAfter == null
                        ? "…"
                        : `${fmt(recoverCreditAfter)} · ${fmt(recoverBonusAfter)}`
                    }
                    highlight
                  />
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-md border border-slate-200/90 bg-slate-50/90 px-2 py-1.5 sm:px-2.5 sm:py-2 dark:border-slate-600/30 dark:bg-slate-900/40">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300">
                    <CalendarDays className={rsIconSm} aria-hidden />
                  </span>
                  <p className={cn(rsTextLabel, "font-semibold text-foreground")}>Expiry</p>
                </div>
                <div className="mt-1 space-y-0.5 sm:space-y-1">
                  <PreviewRow label="Current" value={loading ? "…" : (currentExpiryLabel ?? "—")} />
                  <PreviewRow
                    label="After"
                    value={
                      loading ? "…" : recoverMonthsOff > 0 ? (afterExpiryLabel ?? "—") : "—"
                    }
                    highlight={recoverMonthsOff > 0}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <div className={creditPoolShell}>
                <SectionLabel id={creditSelectId} icon={Wallet} label="Credit months" tone="credit" />
                {recoverCreditOptions.length > 0 ? (
                  <BulkRenewValiditySelect
                    value={recoverCreditMonths}
                    onValueChange={onRecoverCreditMonthsChange}
                    options={recoverCreditOptions}
                    labelledBy={creditSelectId}
                    triggerClassName="w-full min-w-0 border-violet-200/80 bg-background/90 dark:border-violet-500/35"
                    size="compact"
                  />
                ) : (
                  <p
                    className={cn(
                      "rounded-md border border-violet-200/60 bg-background/70 px-2 py-1.5",
                      rsTextCaption,
                      "text-violet-800/90 dark:text-violet-200/90",
                    )}
                  >
                    {loading ? "Loading…" : "None recoverable."}
                  </p>
                )}
              </div>
              <div className={bonusPoolShell}>
                <SectionLabel id={bonusSelectId} icon={Gift} label="Bonus months" tone="bonus" />
                {recoverBonusOptions.length > 1 ? (
                  <BulkRenewValiditySelect
                    value={recoverBonusMonths}
                    onValueChange={onRecoverBonusMonthsChange}
                    options={recoverBonusOptions}
                    labelledBy={bonusSelectId}
                    triggerClassName="w-full min-w-0 border-amber-200/80 bg-background/90 dark:border-amber-500/35"
                    size="compact"
                  />
                ) : (
                  <p
                    className={cn(
                      "rounded-md border border-amber-200/60 bg-background/70 px-2 py-1.5",
                      rsTextCaption,
                      "text-amber-900/90 dark:text-amber-100/90",
                    )}
                  >
                    {loading ? "Loading…" : "None recoverable."}
                  </p>
                )}
              </div>
            </div>

            {!loading && !hasPools ? (
              <p
                className={cn(
                  "rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 leading-snug text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
                  rsTextCaption,
                )}
              >
                Nothing to recover — would expire the account or only remove time already used.
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-t border-border/60 sm:gap-2",
            rsPadPanelHeader,
            "py-2.5 sm:py-3",
          )}
        >
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1 bg-violet-600 text-white hover:bg-violet-500"
            onClick={onSubmit}
            disabled={pending || loading || !hasPools || !canSubmit}
          >
            {pending ? "Working…" : "Recover"}
            {!pending ? <ArrowUpRight className={cn(rsIconSm)} aria-hidden /> : null}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
