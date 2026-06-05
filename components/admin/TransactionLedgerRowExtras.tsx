"use client";

import type { ReactNode } from "react";
import { Undo2 } from "lucide-react";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { formatTransactionRemarksForDisplay } from "@/lib/formatTransactionRemarks";
import { ledgerBonusAmount } from "@/lib/transactionLedgerBonusAmount";
import { CATEGORY_SHORT_LABELS, parseTransactionMeta } from "@/lib/transactionLedgerAnalytics";
import { cn } from "@/lib/cn";

function MiniBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-wide shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Promo / base column — explicit light + dark fills (avoid inheriting table text on pale bg). */
const PROMO_BASE_BADGE = {
  base:
    "border-slate-600 bg-slate-100 text-slate-900 dark:border-slate-400/45 dark:bg-slate-600/35 dark:text-slate-100",
  p1:
    "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/45 dark:bg-amber-600/30 dark:text-amber-50",
  p2:
    "border-violet-700 bg-violet-100 text-violet-950 dark:border-violet-400/45 dark:bg-violet-600/30 dark:text-violet-50",
  pct1:
    "border-amber-600/90 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/22 dark:text-amber-100",
  pct2:
    "border-violet-600/90 bg-violet-50 text-violet-900 dark:border-violet-400/50 dark:bg-violet-500/22 dark:text-violet-100",
  recover:
    "border-rose-700 bg-rose-100 text-rose-950 dark:border-rose-400/45 dark:bg-rose-600/30 dark:text-rose-50",
} as const;

const CATEGORY_BADGE: Record<string, string> = {
  promo_grant:
    "border-violet-700 bg-violet-100 text-violet-950 dark:border-violet-400/45 dark:bg-violet-600/30 dark:text-violet-50",
  hierarchy_credit:
    "border-emerald-700 bg-emerald-100 text-emerald-950 dark:border-emerald-400/45 dark:bg-emerald-600/30 dark:text-emerald-50",
  hierarchy_send:
    "border-cyan-700 bg-cyan-100 text-cyan-950 dark:border-cyan-400/45 dark:bg-cyan-600/30 dark:text-cyan-50",
  recover:
    "border-rose-700 bg-rose-100 text-rose-950 dark:border-rose-400/45 dark:bg-rose-600/30 dark:text-rose-50",
  subscriber:
    "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/45 dark:bg-amber-600/30 dark:text-amber-50",
  bonus:
    "border-fuchsia-700 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-400/45 dark:bg-fuchsia-600/30 dark:text-fuchsia-50",
  other:
    "border-slate-600 bg-slate-100 text-slate-900 dark:border-slate-400/45 dark:bg-slate-600/35 dark:text-slate-100",
};

export function TransactionCategoryBadge({ row, compact = false }: { row: AdminTransactionRow; compact?: boolean }) {
  const meta = parseTransactionMeta(row);
  const label = compact ? (CATEGORY_SHORT_LABELS[meta.category] ?? meta.categoryLabel) : meta.categoryLabel;
  return <MiniBadge className={CATEGORY_BADGE[meta.category] ?? CATEGORY_BADGE.other}>{label}</MiniBadge>;
}

export function TransactionPromoBreakdown({ row, compact = false }: { row: AdminTransactionRow; compact?: boolean }) {
  const meta = parseTransactionMeta(row);
  const subBonus = meta.category === "subscriber" ? ledgerBonusAmount(row) : null;
  const hasPromo =
    meta.promo1 > 0 ||
    meta.promo2 > 0 ||
    meta.baseCredits != null ||
    meta.recoverOfTx != null ||
    (subBonus != null && subBonus > 0);
  if (!hasPromo) return <span className="text-[10px] text-muted-foreground">—</span>;

  return (
    <div className={cn(
      "flex items-center justify-center gap-0.5 sm:gap-1",
      compact ? "flex-wrap md:flex-nowrap" : "flex-wrap lg:flex-nowrap",
    )}>
      {meta.baseCredits != null ? (
        <MiniBadge className={PROMO_BASE_BADGE.base}>{compact ? `B${meta.baseCredits}` : `Base ${meta.baseCredits}`}</MiniBadge>
      ) : null}
      {meta.promo1 > 0 ? (
        <MiniBadge className={PROMO_BASE_BADGE.p1}>P1 +{meta.promo1}</MiniBadge>
      ) : null}
      {meta.promo2 > 0 ? (
        <MiniBadge className={PROMO_BASE_BADGE.p2}>P2 +{meta.promo2}</MiniBadge>
      ) : null}
      {meta.promoPct1 != null ? (
        <MiniBadge className={PROMO_BASE_BADGE.pct1}>{meta.promoPct1}%</MiniBadge>
      ) : null}
      {meta.promoPct2 != null ? (
        <MiniBadge className={PROMO_BASE_BADGE.pct2}>{meta.promoPct2}%</MiniBadge>
      ) : null}
      {meta.recoverOfTx != null ? (
        <MiniBadge className={PROMO_BASE_BADGE.recover}>
          <Undo2 className="h-2.5 w-2.5 shrink-0 stroke-[2.25]" stroke="currentColor" fill="none" aria-hidden />
          <span>Tx {meta.recoverOfTx}</span>
        </MiniBadge>
      ) : null}
      {subBonus != null && subBonus > 0 ? (
        <MiniBadge className={PROMO_BASE_BADGE.p2}>
          {compact ? `+${subBonus} mo` : `+${subBonus} bonus mo`}
        </MiniBadge>
      ) : null}
    </div>
  );
}

export function TransactionRemarksCell({ row, compact = false }: { row: AdminTransactionRow; compact?: boolean }) {
  const display = formatTransactionRemarksForDisplay(row.remarks);
  const raw = row.remarks?.trim() ?? "";
  return (
    <div className="min-w-0 w-full">
      <p
        className={cn(
          "block w-full min-w-0 truncate text-foreground",
          compact ? "text-[11px] sm:text-xs md:text-sm" : "text-xs md:text-sm",
        )}
        title={display || undefined}
      >
        {display || "—"}
      </p>
      {!compact && (raw.includes("[promo_grant:") || raw.includes("[grant_meta:")) ? (
        <p className="mt-0.5 truncate font-mono text-[9px] text-slate-500 dark:text-cyan-400/70" title={raw}>
          {raw.match(/\[[^\]]+\]/)?.[0] ?? ""}
        </p>
      ) : null}
    </div>
  );
}
