import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const TRANSACTIONS_TABLE_CONTAINER = "txn";

export const transactionsTableScrollShellClass = cn(
  "thin-scrollbar transactions-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${TRANSACTIONS_TABLE_CONTAINER}`,
);

export const TRANSACTIONS_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

/** Full-width modal history table (`data-txn-layout="fluid"`). */
export const TRANSACTIONS_MODAL_TABLE_CLASS = cn(
  "w-full max-w-full table-fixed border-collapse text-left tabular-nums",
);

/** `<col>` only — do not use `table-cell` on col elements. */
export function transactionsColgroupClass(columnId: string): string {
  return `transactions-col-${columnId}`;
}

const TXN_COL_CELL = "table-cell transactions-col-cell";
const TXN_HIDE_CLASS: Record<string, string> = {
  type: "transactions-hide-type",
  credits: "transactions-hide-credits",
  months: "transactions-hide-months",
  account: "transactions-hide-account",
  coverageStart: "transactions-hide-coverageStart",
  coverageEnd: "transactions-hide-coverageEnd",
  remarks: "transactions-hide-remarks",
  timestamp: "transactions-hide-timestamp",
};

function txnColClass(columnId: string): string {
  return cn(TXN_COL_CELL, `transactions-col-${columnId}`);
}

export const TRANSACTIONS_COL_TABLE_CLASS: Record<string, string> = {
  type: cn(txnColClass("type"), TXN_HIDE_CLASS.type),
  credits: cn(txnColClass("credits"), TXN_HIDE_CLASS.credits),
  months: cn(txnColClass("months"), TXN_HIDE_CLASS.months),
  account: cn(txnColClass("account"), TXN_HIDE_CLASS.account),
  coverageStart: cn(txnColClass("coverageStart"), TXN_HIDE_CLASS.coverageStart),
  coverageEnd: cn(txnColClass("coverageEnd"), TXN_HIDE_CLASS.coverageEnd),
  remarks: cn(txnColClass("remarks"), TXN_HIDE_CLASS.remarks),
  timestamp: cn(txnColClass("timestamp"), TXN_HIDE_CLASS.timestamp),
};

export function transactionsColTableClass(columnId: string): string {
  return TRANSACTIONS_COL_TABLE_CLASS[columnId] ?? TXN_COL_CELL;
}

export const TRANSACTIONS_EXPAND_TRIGGER_CLASS = "transactions-expand-btn";

export function transactionsExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(TRANSACTIONS_EXPAND_TRIGGER_CLASS);
}

export const transactionsActionsColClass = cn(
  "transactions-actions-col table-cell text-center whitespace-nowrap",
);

export const TRANSACTIONS_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(TRANSACTIONS_COL_TABLE_CLASS));
