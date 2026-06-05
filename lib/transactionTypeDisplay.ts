/**
 * Canonical labels for ledger transaction types.
 * UI must use these helpers — do not show raw internal type codes.
 */

import {
  SUBSCRIBER_TX_CREDIT,
  SUBSCRIBER_TX_DEBIT,
} from "@/lib/billing/subscriberTransactionTypes";

export type TransactionDbType = "DBIT" | "CRDT" | "BONUS" | typeof SUBSCRIBER_TX_DEBIT | typeof SUBSCRIBER_TX_CREDIT;

export type NormalizedTransactionType = TransactionDbType | "OTHER";

/** Map DB value and legacy UI aliases to a single type. */
export function normalizeTransactionType(type: string | null | undefined): NormalizedTransactionType {
  const t = String(type ?? "")
    .trim()
    .toUpperCase();
  if (t === "DBIT" || t === "BUY" || t === "DEBIT") return "DBIT";
  if (t === "CRDT" || t === "CREDIT") return "CRDT";
  if (t === SUBSCRIBER_TX_DEBIT) return SUBSCRIBER_TX_DEBIT;
  if (t === SUBSCRIBER_TX_CREDIT) return SUBSCRIBER_TX_CREDIT;
  if (t === "BONUS") return "BONUS";
  return "OTHER";
}

/** Operator-facing label for tables, filters, and exports. */
export function getTransactionTypeLabel(type: string | null | undefined): string {
  switch (normalizeTransactionType(type)) {
    case "DBIT":
      return "Debit";
    case "CRDT":
      return "Credit";
    case SUBSCRIBER_TX_DEBIT:
      return "Sub debit";
    case SUBSCRIBER_TX_CREDIT:
      return "Sub credit";
    case "BONUS":
      return "Bonus";
    default:
      return "Other";
  }
}

export function isDebitType(type: string | null | undefined): boolean {
  const n = normalizeTransactionType(type);
  return n === "DBIT" || n === SUBSCRIBER_TX_DEBIT;
}

export function isCreditType(type: string | null | undefined): boolean {
  const n = normalizeTransactionType(type);
  return n === "CRDT" || n === SUBSCRIBER_TX_CREDIT;
}

export const TRANSACTION_TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "DBIT", label: "Debit" },
  { value: "CRDT", label: "Credit" },
  { value: SUBSCRIBER_TX_DEBIT, label: "Sub debit" },
  { value: SUBSCRIBER_TX_CREDIT, label: "Sub credit" },
  { value: "BONUS", label: "Bonus" },
] as const;

export const LEDGER_TYPE_COLUMN_TIP =
  "Debit/Credit are hierarchy wallet moves. Sub debit/Sub credit are subscription register, renew, and recover. Bonus is a legacy promotional line.";

/** Chart / table accent colors — green = in (CRDT), amber = out (DBIT). */
export const TRANSACTION_TYPE_UI_COLORS = {
  CRDT: {
    stroke: "#34d399",
    text: "text-emerald-700 dark:text-emerald-300",
    badge:
      "border-emerald-700 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  DBIT: {
    stroke: "#fb923c",
    text: "text-amber-800 dark:text-amber-200",
    badge:
      "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100",
  },
  [SUBSCRIBER_TX_DEBIT]: {
    stroke: "#f59e0b",
    text: "text-orange-800 dark:text-orange-200",
    badge:
      "border-orange-600 bg-orange-100 text-orange-950 dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-100",
  },
  [SUBSCRIBER_TX_CREDIT]: {
    stroke: "#2dd4bf",
    text: "text-teal-800 dark:text-teal-200",
    badge:
      "border-teal-700 bg-teal-100 text-teal-950 dark:border-teal-400/40 dark:bg-teal-500/20 dark:text-teal-100",
  },
  BONUS: {
    stroke: "#c084fc",
    text: "text-fuchsia-700 dark:text-fuchsia-200",
    badge:
      "border-fuchsia-700 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
  },
  OTHER: {
    stroke: "#f87171",
    text: "text-rose-700 dark:text-rose-200",
    badge:
      "border-rose-700 bg-rose-100 text-rose-900 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-200",
  },
} as const;

export function getTransactionTypeBadgeClass(type: string | null | undefined): string {
  switch (normalizeTransactionType(type)) {
    case "BONUS":
      return TRANSACTION_TYPE_UI_COLORS.BONUS.badge;
    case "DBIT":
      return TRANSACTION_TYPE_UI_COLORS.DBIT.badge;
    case "CRDT":
      return TRANSACTION_TYPE_UI_COLORS.CRDT.badge;
    case SUBSCRIBER_TX_DEBIT:
      return TRANSACTION_TYPE_UI_COLORS[SUBSCRIBER_TX_DEBIT].badge;
    case SUBSCRIBER_TX_CREDIT:
      return TRANSACTION_TYPE_UI_COLORS[SUBSCRIBER_TX_CREDIT].badge;
    default:
      return TRANSACTION_TYPE_UI_COLORS.OTHER.badge;
  }
}
