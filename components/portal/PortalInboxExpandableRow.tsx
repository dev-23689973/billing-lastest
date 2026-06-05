"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { PORTAL_INBOX_ACTIONS_TD } from "@/components/portal/portalInboxTableUi";
import { messageHistoryEmbeddedRowClass } from "@/lib/ui/messageHistoryTableCompact";
import {
  portalInboxActionsColClass,
  portalInboxExpandTriggerClass,
} from "@/lib/ui/portalInboxResponsiveTable";
import { usePortalInboxTableContext } from "@/lib/ui/portalInboxTableContext";
import { cn } from "@/lib/cn";

type Props = {
  colSpan: number;
  actions: ReactNode;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
  active?: boolean;
};

export function PortalInboxExpandableRow({
  colSpan,
  actions,
  details,
  children,
  expandPersistId,
  active = false,
}: Props) {
  const { hasHiddenColumns } = usePortalInboxTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={portalInboxExpandTriggerClass()}
      tdClassName={PORTAL_INBOX_ACTIONS_TD}
      actionsColClass={portalInboxActionsColClass}
      actions={actions}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName={active ? cn(messageHistoryEmbeddedRowClass, "bg-destructive/[0.03]") : messageHistoryEmbeddedRowClass}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
