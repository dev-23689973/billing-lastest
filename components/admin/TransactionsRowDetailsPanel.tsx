"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { buildTransactionRowDetailItems } from "@/components/admin/transactionsBuildRowDetails";
import type { TransactionColumnKey } from "@/components/admin/transactionsTableFormatters";
import type { AccountTransactionRow } from "@/lib/repos/billing";
import { useTransactionsTableContext } from "@/lib/ui/transactionsTableContext";

type Props = {
  row: AccountTransactionRow;
  tableColumnIds: readonly TransactionColumnKey[];
};

export function TransactionsRowDetailsPanel({ row, tableColumnIds }: Props) {
  const { hiddenColumnIds } = useTransactionsTableContext();
  const items = buildTransactionRowDetailItems(row, tableColumnIds, hiddenColumnIds);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
