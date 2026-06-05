"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { messageHistoryEmbeddedRowClass } from "@/lib/ui/messageHistoryTableCompact";
import { useTicketsQueueTableContext } from "@/lib/ui/ticketsQueueTableContext";
import { ticketsQueueActionsColClass, ticketsQueueExpandTriggerClass } from "@/lib/ui/ticketsQueueResponsiveTable";
import { TICKETS_QUEUE_TD } from "@/components/portal/ticketsQueueTableUi";

type Props = {
  colSpan: number;
  actions: ReactNode;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
};

export function TicketsQueueExpandableRow({ colSpan, actions, details, children, expandPersistId }: Props) {
  const { hasHiddenColumns } = useTicketsQueueTableContext();
  return (
    <ResponsiveDataTableExpandableRow
      detailsEnabled={hasHiddenColumns}
      colSpan={colSpan}
      expandButtonClass={ticketsQueueExpandTriggerClass()}
      tdClassName={TICKETS_QUEUE_TD}
      actionsColClass={ticketsQueueActionsColClass}
      actions={actions}
      details={details}
      rowClassName={messageHistoryEmbeddedRowClass}
      expandPersistId={expandPersistId}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
