import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const TRANSACTION_LEDGER_TABLE_CONTAINER = "ledger";

export const transactionLedgerTableScrollShellClass = cn(
  "thin-scrollbar transaction-ledger-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${TRANSACTION_LEDGER_TABLE_CONTAINER}`,
);

export const TRANSACTION_LEDGER_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

const LEDGER_COL_CELL = "table-cell transaction-ledger-col-cell";

function ledgerColClass(columnId: string): string {
  return cn(LEDGER_COL_CELL, `transaction-ledger-col-${columnId}`);
}

const LEDGER_HIDE_CLASS: Record<string, string> = {
  timestamp: "transaction-ledger-hide-timestamp",
  user: "transaction-ledger-hide-user",
  account: "transaction-ledger-hide-account",
  type: "transaction-ledger-hide-type",
  category: "transaction-ledger-hide-category",
  amount: "transaction-ledger-hide-amount",
  bonusAmt: "transaction-ledger-hide-bonusAmt",
  promo: "transaction-ledger-hide-promo",
  note: "transaction-ledger-hide-note",
};

export const TRANSACTION_LEDGER_COL_TABLE_CLASS: Record<string, string> = {
  timestamp: cn(ledgerColClass("timestamp"), LEDGER_HIDE_CLASS.timestamp),
  user: cn(ledgerColClass("user"), LEDGER_HIDE_CLASS.user),
  account: cn(ledgerColClass("account"), LEDGER_HIDE_CLASS.account),
  type: ledgerColClass("type"),
  category: cn(ledgerColClass("category"), LEDGER_HIDE_CLASS.category),
  amount: ledgerColClass("amount"),
  bonusAmt: cn(ledgerColClass("bonusAmt"), LEDGER_HIDE_CLASS.bonusAmt),
  promo: cn(ledgerColClass("promo"), LEDGER_HIDE_CLASS.promo),
  note: cn(ledgerColClass("note"), LEDGER_HIDE_CLASS.note),
};

export const TRANSACTION_LEDGER_RESPONSIVE_HIDE_COLUMN_IDS = new Set(
  Object.keys(LEDGER_HIDE_CLASS),
);

export const TRANSACTION_LEDGER_COL_FILL_CLASS = "transaction-ledger-col-fill";

export function transactionLedgerColTableClass(columnId: string): string {
  return TRANSACTION_LEDGER_COL_TABLE_CLASS[columnId] ?? LEDGER_COL_CELL;
}

export const TRANSACTION_LEDGER_EXPAND_TRIGGER_CLASS = "transaction-ledger-expand-btn";

export function transactionLedgerExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(TRANSACTION_LEDGER_EXPAND_TRIGGER_CLASS);
}

export const transactionLedgerActionsColClass = cn(
  "transaction-ledger-actions-col table-cell text-center whitespace-nowrap",
);
