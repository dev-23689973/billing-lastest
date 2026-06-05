"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { messageHistoryEmbeddedRowClass } from "@/lib/ui/messageHistoryTableCompact";
import {
  messageHistoryActionsColClass,
  messageHistoryExpandTriggerClass,
} from "@/lib/ui/messageHistoryResponsiveTable";
import { useMessageHistoryTableContext } from "@/lib/ui/messageHistoryTableContext";
import { embeddedTableTdClass } from "@/lib/ui/embeddedTableTypography";
import { cn } from "@/lib/cn";

type Props = {
  colSpan: number;
  actions?: ReactNode;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
};

export function MessageHistoryExpandableRow({
  colSpan,
  actions = null,
  details,
  children,
  expandPersistId,
}: Props) {
  const { hasHiddenColumns } = useMessageHistoryTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={messageHistoryExpandTriggerClass()}
      tdClassName={cn("text-center", embeddedTableTdClass(undefined, "tight"))}
      actionsColClass={messageHistoryActionsColClass}
      actions={actions}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName={messageHistoryEmbeddedRowClass}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
