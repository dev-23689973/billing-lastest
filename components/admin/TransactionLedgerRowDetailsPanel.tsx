"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { buildTransactionLedgerRowDetailItems } from "@/components/admin/transactionLedgerBuildRowDetails";
import type { TransactionLedgerColumnKey } from "@/components/admin/transactionLedgerTableCells";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { useTransactionLedgerTableContext } from "@/lib/ui/transactionLedgerTableContext";

type Props = {
  row: AdminTransactionRow;
  tableColumnIds: readonly TransactionLedgerColumnKey[];
};

export function TransactionLedgerRowDetailsPanel({ row, tableColumnIds }: Props) {
  const { hiddenColumnIds } = useTransactionLedgerTableContext();
  const items = buildTransactionLedgerRowDetailItems(row, tableColumnIds, hiddenColumnIds);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
