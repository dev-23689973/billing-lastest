import type { TransactionColumnKey } from "@/components/admin/transactionsTableFormatters";

/** Fixed rem per column; `remarks` uses fill width (see REMARKS_COL_WIDTH). */
const MODAL_COL_WIDTH_REM: Record<string, number> = {
  type: 5.5,
  credits: 5.25,
  months: 4,
  account: 7,
  timestamp: 10.5,
  coverageStart: 5.5,
  coverageEnd: 5.5,
};

export const TRANSACTIONS_MODAL_ACTIONS_COL_WIDTH_REM = 3;

/** Only fixed metric columns get a width; `remarks` is omitted so it fills the row. */
export function transactionModalColWidthStyle(columnId: string): string | undefined {
  if (columnId === "remarks") return undefined;
  const rem = MODAL_COL_WIDTH_REM[columnId];
  return rem != null ? `${rem}rem` : undefined;
}

export function buildTransactionModalColWidths(
  columnIds: readonly TransactionColumnKey[],
  includeActionsCol?: boolean,
): Array<{ columnId: string; width?: string }> {
  const cols: Array<{ columnId: string; width?: string }> = columnIds.map((columnId) => ({
    columnId,
    width: transactionModalColWidthStyle(columnId),
  }));
  if (includeActionsCol) {
    cols.push({
      columnId: "__actions__",
      width: `${TRANSACTIONS_MODAL_ACTIONS_COL_WIDTH_REM}rem`,
    });
  }
  return cols;
}
