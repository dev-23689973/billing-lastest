"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { STAFF_HUB_TD } from "@/components/admin/staffHubTableUi";
import { staffHubActionsColClass, staffHubExpandTriggerClass } from "@/lib/ui/staffHubResponsiveTable";
import { useStaffHubTableContext } from "@/lib/ui/staffHubTableContext";

type Props = {
  colSpan: number;
  tableColumnIds: readonly string[];
  expandTriggerClass?: string;
  actions: ReactNode;
  details: ReactNode;
  children: ReactNode;
  zebra?: boolean;
  rowClassName?: string;
  expandPersistId?: string;
};

export function StaffHubExpandableRow({
  colSpan,
  tableColumnIds,
  expandTriggerClass,
  actions,
  details,
  children,
  zebra = true,
  rowClassName,
  expandPersistId,
}: Props) {
  const expandClass = expandTriggerClass ?? staffHubExpandTriggerClass(tableColumnIds);
  const { hasHiddenColumns } = useStaffHubTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      detailsEnabled={hasHiddenColumns}
      colSpan={colSpan}
      expandButtonClass={expandClass}
      tdClassName={STAFF_HUB_TD}
      actionsColClass={staffHubActionsColClass}
      actions={actions}
      details={details}
      zebra={zebra}
      rowClassName={rowClassName}
      expandPersistId={expandPersistId}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
