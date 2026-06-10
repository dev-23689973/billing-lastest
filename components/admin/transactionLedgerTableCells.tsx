"use client";

import type { ReactNode } from "react";
import {
  TransactionCategoryBadge,
  TransactionPromoBreakdown,
  TransactionRemarksCell,
} from "@/components/admin/TransactionLedgerRowExtras";
import { TransactionTypeBadge } from "@/components/transactions/TransactionTypeBadge";
import { parseRowDate } from "@/lib/transactionLedgerAnalytics";
import { normalizeTransactionType } from "@/lib/transactionTypeDisplay";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { ledgerBonusAmount } from "@/lib/transactionLedgerBonusAmount";
import { parseHierarchyRecoverRemark } from "@/lib/hierarchyRecoverRemark";
import { ledgerPrincipalAmount, ledgerTotalAmount } from "@/lib/transactionLedgerAmount";
import { cn } from "@/lib/cn";

export type TransactionLedgerColumnKey =
  | "timestamp"
  | "user"
  | "account"
  | "type"
  | "category"
  | "amount"
  | "bonusAmt"
  | "totalAmt"
  | "promo"
  | "note";

export const TRANSACTION_LEDGER_TABLE_COLUMNS: { key: TransactionLedgerColumnKey; label: string }[] = [
  { key: "timestamp", label: "Time" },
  { key: "user", label: "User" },
  { key: "account", label: "Acct" },
  { key: "type", label: "Type" },
  { key: "category", label: "Cat" },
  { key: "amount", label: "Amt" },
  { key: "bonusAmt", label: "Bonus" },
  { key: "totalAmt", label: "Total" },
  { key: "promo", label: "Promo" },
  { key: "note", label: "Note" },
];

export const TRANSACTION_LEDGER_COLUMN_IDS: readonly TransactionLedgerColumnKey[] =
  TRANSACTION_LEDGER_TABLE_COLUMNS.map((c) => c.key);

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function ledgerDash(v: string | null | undefined) {
  if (v == null || v === "") return "—";
  return v;
}

export function formatLedgerTimestampShort(raw: string | null | undefined): { label: string; full: string } {
  if (!raw?.trim()) return { label: "—", full: "" };
  const full = raw.trim();
  const d = parseRowDate(full);
  if (!d) return { label: full, full };
  const date = d.toLocaleDateString(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return { label: `${date} ${time}`, full };
}

export function ledgerClip(content: ReactNode, title?: string) {
  return (
    <span className="block max-w-full truncate" title={title}>
      {content}
    </span>
  );
}

export function renderLedgerBonusAmountCell(r: AdminTransactionRow) {
  const bonus = ledgerBonusAmount(r);
  if (bonus == null || bonus < 1) return <span className="text-muted-foreground">—</span>;
  const recover = parseHierarchyRecoverRemark(r.remarks);
  const title = recover
    ? `${bonus} promo void on recover`
    : `${bonus} bonus (admin subsidy)`;
  return (
    <span className="font-medium tabular-nums text-fuchsia-700 dark:text-fuchsia-300" title={title}>
      +{formatInt(bonus)}
    </span>
  );
}

function renderSignedCreditsCell(
  value: number,
  opts?: { title?: string; mutedWhenZero?: boolean },
) {
  if (value === 0) {
    return opts?.mutedWhenZero !== false ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <span className="font-medium tabular-nums text-muted-foreground">0</span>
    );
  }
  const cls = value < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400";
  return (
    <span className={cn("font-medium tabular-nums", cls)} title={opts?.title}>
      {value > 0 ? "+" : ""}
      {formatInt(value)}
    </span>
  );
}

export function renderLedgerAmountCell(r: AdminTransactionRow) {
  const amtRaw = r.amount?.trim();
  if (amtRaw) {
    const n = Number(amtRaw.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n !== 0) {
      const cls = n < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400";
      const sign = n > 0 ? "+" : "";
      return (
        <span className={cn("font-medium tabular-nums", cls)}>
          {sign}
          {formatMoney(n)}
        </span>
      );
    }
  }
  const principal = ledgerPrincipalAmount(r);
  return renderSignedCreditsCell(principal, { title: `${principal} credits (principal)` });
}

export function renderLedgerTotalAmountCell(r: AdminTransactionRow) {
  const total = ledgerTotalAmount(r);
  return renderSignedCreditsCell(total, { title: `${total} credits (wallet total)` });
}

export function renderLedgerColumnCell(col: TransactionLedgerColumnKey, r: AdminTransactionRow, compact = true) {
  switch (col) {
    case "timestamp": {
      const ts = formatLedgerTimestampShort(r.timestamp);
      return ledgerClip(ts.label, ts.full || undefined);
    }
    case "user":
      return ledgerClip(ledgerDash(r.created_by ?? r.username));
    case "account":
      return ledgerClip(ledgerDash(r.account));
    case "type":
      return <TransactionTypeBadge type={r.type} size="sm" />;
    case "category":
      return <TransactionCategoryBadge row={r} compact={compact} />;
    case "amount":
      return renderLedgerAmountCell(r);
    case "bonusAmt":
      return renderLedgerBonusAmountCell(r);
    case "totalAmt":
      return renderLedgerTotalAmountCell(r);
    case "promo":
      return <TransactionPromoBreakdown row={r} compact={compact} />;
    case "note":
      return <TransactionRemarksCell row={r} compact={compact} />;
    default:
      return "—";
  }
}

export function renderLedgerTableColumnCell(
  col: TransactionLedgerColumnKey,
  r: AdminTransactionRow,
  opts?: { inDetailPanel?: boolean },
) {
  const compact = !opts?.inDetailPanel;
  if (col === "note" && opts?.inDetailPanel) {
    return <TransactionRemarksCell row={r} compact={false} />;
  }
  if (col === "promo" && opts?.inDetailPanel) {
    return <TransactionPromoBreakdown row={r} compact={false} />;
  }
  if (col === "type") {
    return <TransactionTypeBadge type={normalizeTransactionType(r.type)} size="sm" />;
  }
  return renderLedgerColumnCell(col, r, compact);
}
