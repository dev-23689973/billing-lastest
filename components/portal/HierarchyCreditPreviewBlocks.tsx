"use client";

import { cn } from "@/lib/cn";
import { computePromoBonusesForAddCapped } from "@/lib/addCreditLadder";
import type { PromoTier } from "@/lib/promoBonus";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

const addPreviewShellClass = cn(
  "space-y-2 rounded-lg border px-3 py-2.5 text-xs",
  "border-emerald-300/90 bg-white shadow-[0_1px_3px_rgb(15_23_42/0.08)]",
  "dark:border-emerald-400/25 dark:bg-emerald-500/5 dark:shadow-none",
);

const addPreviewShellComfortableClass = "px-3 py-2.5 text-xs";

const recoverPreviewShellClass = cn(
  "space-y-2 rounded-lg border px-3 py-2.5 text-xs",
  "border-amber-300/90 bg-white shadow-[0_1px_3px_rgb(15_23_42/0.08)]",
  "dark:border-amber-400/25 dark:bg-amber-500/5 dark:shadow-none",
);

export function HierarchyAddCreditPreviewDetail({
  principal,
  currentBalance,
  p1,
  p2,
  activeClients,
  applyPromo = true,
  hideFooterProjected,
  hideActiveSubs,
  size = "default",
}: {
  principal: number;
  currentBalance: number;
  p1: PromoTier[];
  p2: PromoTier[];
  activeClients: number;
  /** When false (additional wallet cap), only principal is credited. */
  applyPromo?: boolean;
  /** When true, omit the bottom “projected balance” line (parent shows it once). */
  hideFooterProjected?: boolean;
  /** Hide Promo 2 client-count row (e.g. new staff with no subscribers yet). */
  hideActiveSubs?: boolean;
  size?: "default" | "comfortable";
}) {
  const r = applyPromo
    ? computePromoBonusesForAddCapped(principal, activeClients, p1, p2)
    : { pct1: 0, pct2: 0, bonus1: 0, bonus2: 0 };
  const totalCredited = principal + r.bonus1 + r.bonus2;
  const comfortable = size === "comfortable";

  return (
    <div className={cn(addPreviewShellClass, comfortable && addPreviewShellComfortableClass)}>
      <p className={cn("text-xs font-semibold text-emerald-800", comfortable && "text-sm", "dark:text-emerald-200/95")}>
        Add preview
      </p>
      <dl
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-slate-600 dark:text-muted-foreground",
          comfortable ? "text-xs" : "text-[11px]",
        )}
      >
        <dt className="min-w-0 leading-snug">Principal (your amount)</dt>
        <dd className="shrink-0 text-right font-mono tabular-nums text-slate-900 dark:text-foreground">{fmt(principal)}</dd>
        {applyPromo ? (
          <>
            <dt className="min-w-0 leading-snug">
              Promo 1 ({r.pct1}%){r.bonus1 <= 0 ? <span className="text-slate-500 dark:text-muted-foreground/80"> — amount tier</span> : null}
            </dt>
            <dd className="shrink-0 text-right font-mono tabular-nums text-slate-900 dark:text-foreground">+{fmt(r.bonus1)}</dd>
            <dt className="min-w-0 leading-snug">
              Promo 2 ({r.pct2}%){r.bonus2 <= 0 ? <span className="text-slate-500 dark:text-muted-foreground/80"> — active subs tier</span> : null}
            </dt>
            <dd className="shrink-0 text-right font-mono tabular-nums text-slate-900 dark:text-foreground">+{fmt(r.bonus2)}</dd>
          </>
        ) : null}
        <dt className="min-w-0 font-medium leading-snug text-slate-800 dark:text-foreground">Total credited</dt>
        <dd className="shrink-0 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-200">
          {fmt(totalCredited)}
        </dd>
        {!hideActiveSubs ? (
          <>
            <dt className="min-w-0 leading-snug text-slate-500 dark:text-muted-foreground">Active subs (Promo 2 axis)</dt>
            <dd className="shrink-0 text-right font-mono tabular-nums text-slate-900 dark:text-foreground">{fmt(activeClients)}</dd>
          </>
        ) : null}
      </dl>
      {!hideFooterProjected ? (
        <p
          className={cn(
            "border-t border-emerald-200/80 pt-2 text-slate-600 dark:border-emerald-400/20 dark:text-muted-foreground",
            comfortable ? "text-sm" : "text-[11px]",
          )}
        >
          Projected balance after add:{" "}
          <span className="font-semibold text-emerald-700 dark:text-emerald-200">
            {fmt(currentBalance + totalCredited)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Single-line opening balance for create-staff (no subscriber count). */
export function HierarchyAddCreditPreviewCompact({
  principal,
  p1,
  p2,
  activeClients,
  applyPromo = true,
}: {
  principal: number;
  p1: PromoTier[];
  p2: PromoTier[];
  activeClients: number;
  applyPromo?: boolean;
}) {
  const r = applyPromo
    ? computePromoBonusesForAddCapped(principal, activeClients, p1, p2)
    : { bonus1: 0, bonus2: 0 };
  const total = principal + r.bonus1 + r.bonus2;
  const showBreakdown = applyPromo && (r.bonus1 > 0 || r.bonus2 > 0);
  const breakdown = showBreakdown
    ? [
        `${fmt(principal)} principal`,
        r.bonus1 > 0 ? `+${fmt(r.bonus1)} P1` : null,
        r.bonus2 > 0 ? `+${fmt(r.bonus2)} P2` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border px-3 py-2.5",
        "border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-400/28 dark:bg-emerald-500/[0.07]",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">Opening balance</p>
        {breakdown ? <p className="truncate text-[11px] text-muted-foreground">{breakdown}</p> : null}
      </div>
      <p className="shrink-0 text-xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
        {fmt(total)}
      </p>
    </div>
  );
}

export function HierarchyRecoverCreditPreviewDetail({
  currentBalance,
  principal,
  debitTotal,
  matchedGrant,
  hideFooterProjected,
  size = "default",
}: {
  currentBalance: number;
  principal: number;
  debitTotal: number;
  matchedGrant: boolean;
  hideFooterProjected?: boolean;
  size?: "default" | "comfortable";
}) {
  const projected = Math.max(0, currentBalance - debitTotal);
  const insufficient = debitTotal > currentBalance;
  const comfortable = size === "comfortable";

  return (
    <div className={cn(recoverPreviewShellClass, comfortable && addPreviewShellComfortableClass)}>
      <p className={cn("text-xs font-semibold text-amber-900", comfortable && "text-sm", "dark:text-amber-200/95")}>
        Recover preview
      </p>
      <dl
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-slate-600 dark:text-muted-foreground",
          comfortable ? "text-xs" : "text-[11px]",
        )}
      >
        <dt>Principal entered</dt>
        <dd className="text-right font-mono tabular-nums text-slate-900 dark:text-foreground">{fmt(principal)}</dd>
        <dt>Debit from balance</dt>
        <dd className="text-right font-mono tabular-nums text-slate-900 dark:text-foreground">{fmt(debitTotal)}</dd>
        {matchedGrant ? (
          <>
            <dt className="align-top">Grant match</dt>
            <dd
              className={cn(
                "max-w-[14rem] text-right leading-snug text-slate-600 dark:text-muted-foreground",
                comfortable ? "text-sm" : "text-[11px]",
              )}
            >
              FIFO grant matched — debit is the full credited load (includes promo when it was part of that grant).
            </dd>
          </>
        ) : null}
      </dl>
      {hideFooterProjected ? (
        insufficient ? (
          <p
            className={cn(
              "border-t border-amber-200/80 pt-2 text-destructive dark:border-amber-400/20",
              comfortable ? "text-sm" : "text-[11px]",
            )}
          >
            Insufficient balance for this debit ({fmt(debitTotal)} needed).
          </p>
        ) : null
      ) : (
        <p
          className={cn(
            "border-t border-amber-200/80 pt-2 text-slate-600 dark:border-amber-400/20 dark:text-muted-foreground",
            comfortable ? "text-sm" : "text-[11px]",
          )}
        >
          Projected balance after recover:{" "}
          <span
            className={cn(
              "font-semibold",
              insufficient ? "text-destructive" : "text-amber-800 dark:text-amber-200",
            )}
          >
            {fmt(projected)}
          </span>
          {insufficient ? (
            <span className="block pt-1 text-destructive">
              Insufficient balance for this debit ({fmt(debitTotal)} needed).
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

export type HierarchyCreditPreviewBundle = {
  p1: PromoTier[];
  p2: PromoTier[];
  activeClients: number;
};
