"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { embeddedTableTdClass } from "@/lib/ui/embeddedTableTypography";
import {
  transactionsActionsColClass,
  transactionsExpandTriggerClass,
} from "@/lib/ui/transactionsResponsiveTable";
import { useTransactionsTableContext } from "@/lib/ui/transactionsTableContext";
import { cn } from "@/lib/cn";

type Props = {
  colSpan: number;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
};

export function TransactionsExpandableRow({ colSpan, details, children, expandPersistId }: Props) {
  const { hasHiddenColumns } = useTransactionsTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={transactionsExpandTriggerClass()}
      tdClassName={cn("text-center", embeddedTableTdClass(undefined, "tight"))}
      actionsColClass={transactionsActionsColClass}
      actions={null}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName="border-b border-border/35 transition-[background-color] duration-150 ease-out odd:bg-background/[0.06] hover:bg-muted/30"
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
