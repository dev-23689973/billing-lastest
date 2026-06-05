"use client";

import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  TRANSACTION_LEDGER_TABLE_COLUMNS,
  renderLedgerTableColumnCell,
  type TransactionLedgerColumnKey,
} from "@/components/admin/transactionLedgerTableCells";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { TRANSACTION_LEDGER_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/transactionLedgerResponsiveTable";

export function buildTransactionLedgerRowDetailItems(
  row: AdminTransactionRow,
  columnIds: readonly TransactionLedgerColumnKey[],
  hiddenColumnIds?: readonly string[],
): StaffHubDetailItem[] {
  const hiddenSet =
    hiddenColumnIds && hiddenColumnIds.length > 0 ? new Set(hiddenColumnIds) : null;
  const labels = Object.fromEntries(TRANSACTION_LEDGER_TABLE_COLUMNS.map((c) => [c.key, c.label])) as Record<
    TransactionLedgerColumnKey,
    string
  >;
  const items: StaffHubDetailItem[] = [];

  for (const col of columnIds) {
    if (!TRANSACTION_LEDGER_RESPONSIVE_HIDE_COLUMN_IDS.has(col)) continue;
    if (hiddenSet && !hiddenSet.has(col)) continue;
    items.push({
      columnId: col,
      label: labels[col] ?? col,
      value: renderLedgerTableColumnCell(col, row, { inDetailPanel: true }),
    });
  }

  return items;
}
