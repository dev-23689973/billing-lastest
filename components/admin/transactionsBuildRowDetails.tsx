import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import type { AccountTransactionRow } from "@/lib/repos/billing";
import {
  TRANSACTION_TABLE_COLUMNS,
  dash,
  normalizeTxnRemarks,
  type TransactionColumnKey,
  renderTransactionColumnCell,
} from "@/components/admin/transactionsTableFormatters";
import { TRANSACTIONS_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/transactionsResponsiveTable";

export function buildTransactionRowDetailItems(
  row: AccountTransactionRow,
  columnIds: readonly TransactionColumnKey[],
  hiddenColumnIds?: readonly string[],
): StaffHubDetailItem[] {
  const hiddenSet =
    hiddenColumnIds && hiddenColumnIds.length > 0 ? new Set(hiddenColumnIds) : null;
  const labels = Object.fromEntries(TRANSACTION_TABLE_COLUMNS.map((c) => [c.key, c.label])) as Record<
    TransactionColumnKey,
    string
  >;
  const items: StaffHubDetailItem[] = [];

  for (const col of columnIds) {
    if (!TRANSACTIONS_RESPONSIVE_HIDE_COLUMN_IDS.has(col)) continue;
    if (hiddenSet && !hiddenSet.has(col)) continue;
    items.push({
      columnId: col,
      label: labels[col] ?? col,
      value:
        col === "remarks" ? (
          <span
            className="block min-w-0 max-w-full text-foreground"
            title={normalizeTxnRemarks(row.remarks) || undefined}
          >
            {dash(normalizeTxnRemarks(row.remarks))}
          </span>
        ) : (
          renderTransactionColumnCell(col, row)
        ),
    });
  }

  return items;
}
