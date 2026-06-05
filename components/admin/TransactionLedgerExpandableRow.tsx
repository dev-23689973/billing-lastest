"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { adminEmbeddedListRowClass, adminEmbeddedListTdClass } from "@/lib/ui/adminEmbeddedListTable";
import {
  transactionLedgerActionsColClass,
  transactionLedgerExpandTriggerClass,
} from "@/lib/ui/transactionLedgerResponsiveTable";
import { useTransactionLedgerTableContext } from "@/lib/ui/transactionLedgerTableContext";
import { cn } from "@/lib/cn";

const LEDGER_TD = cn(adminEmbeddedListTdClass, "text-center overflow-hidden");

type Props = {
  colSpan: number;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
};

export function TransactionLedgerExpandableRow({ colSpan, details, children, expandPersistId }: Props) {
  const { hasHiddenColumns } = useTransactionLedgerTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={transactionLedgerExpandTriggerClass()}
      tdClassName={LEDGER_TD}
      actionsColClass={transactionLedgerActionsColClass}
      actions={null}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName={adminEmbeddedListRowClass}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
