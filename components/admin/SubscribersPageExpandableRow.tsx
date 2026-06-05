"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { SUBSCRIBERS_PAGE_TD } from "@/components/admin/subscribersPageTableUi";
import {
  subscribersPageActionsColClass,
  subscribersPageExpandTriggerClass,
} from "@/lib/ui/subscribersPageResponsiveTable";
import { useSubscribersPageTableContext } from "@/lib/ui/subscribersPageTableContext";
import { useSubscribersPageVirtualRowExpand } from "@/lib/ui/subscribersPageVirtualRowExpandContext";

type Props = {
  colSpan: number;
  actions: ReactNode;
  details: ReactNode;
  children: ReactNode;
  rowClassName?: string;
  expandPersistId?: string;
};

export function SubscribersPageExpandableRow({
  colSpan,
  actions,
  details,
  children,
  rowClassName,
  expandPersistId,
}: Props) {
  const { hasHiddenColumns } = useSubscribersPageTableContext();
  const virtualExpand = useSubscribersPageVirtualRowExpand();

  return (
    <ResponsiveDataTableExpandableRow
      detailsEnabled={hasHiddenColumns}
      colSpan={colSpan}
      expandButtonClass={subscribersPageExpandTriggerClass()}
      tdClassName={SUBSCRIBERS_PAGE_TD}
      actionsColClass={subscribersPageActionsColClass}
      actions={actions}
      details={details}
      rowClassName={rowClassName}
      expandPersistId={expandPersistId}
      onExpandChange={virtualExpand?.notifyExpanded}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
