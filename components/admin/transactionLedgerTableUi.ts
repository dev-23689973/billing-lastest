import { cn } from "@/lib/cn";
import { adminEmbeddedListTh } from "@/lib/ui/adminEmbeddedListTable";
import {
  TRANSACTION_LEDGER_COL_FILL_CLASS,
  transactionLedgerActionsColClass,
  transactionLedgerColTableClass,
} from "@/lib/ui/transactionLedgerResponsiveTable";

export function transactionLedgerHeaderCell(columnId: string, className?: string, fill?: boolean) {
  return adminEmbeddedListTh(
    cn(
      transactionLedgerColTableClass(columnId),
      fill && TRANSACTION_LEDGER_COL_FILL_CLASS,
      className,
    ),
  );
}

export function transactionLedgerDataCell(columnId: string, className?: string, fill?: boolean) {
  return cn(
    transactionLedgerColTableClass(columnId),
    fill && TRANSACTION_LEDGER_COL_FILL_CLASS,
    className,
  );
}

export function transactionLedgerActionsHeaderCell(className?: string) {
  return adminEmbeddedListTh(cn(transactionLedgerActionsColClass, className));
}
