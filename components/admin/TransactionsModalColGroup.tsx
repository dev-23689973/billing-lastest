import { buildTransactionModalColWidths } from "@/lib/ui/transactionsModalColumnWidths";
import {
  transactionsActionsColClass,
  transactionsColgroupClass,
} from "@/lib/ui/transactionsResponsiveTable";
import type { TransactionColumnKey } from "@/components/admin/transactionsTableFormatters";

export function TransactionsModalColGroup({
  columnIds,
  includeActionsCol,
}: {
  columnIds: readonly TransactionColumnKey[];
  includeActionsCol?: boolean;
}) {
  const cols = buildTransactionModalColWidths(columnIds, includeActionsCol);

  return (
    <colgroup>
      {cols.map(({ columnId, width }) =>
        columnId === "__actions__" ? (
          <col
            key={columnId}
            className={transactionsActionsColClass}
            style={width ? { width } : undefined}
          />
        ) : (
          <col
            key={columnId}
            className={transactionsColgroupClass(columnId)}
            style={width ? { width } : undefined}
          />
        ),
      )}
    </colgroup>
  );
}
