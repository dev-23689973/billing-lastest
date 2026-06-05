"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { embeddedTableTdClass } from "@/lib/ui/embeddedTableTypography";
import {
  adminListModalActionsColClass,
  adminListModalExpandTriggerClass,
} from "@/lib/ui/adminListModalResponsiveTable";
import { useAdminListModalTableContext } from "@/lib/ui/adminListModalTableContext";
import { cn } from "@/lib/cn";

type Props = {
  colSpan: number;
  details: ReactNode;
  children: ReactNode;
  rowClassName?: string;
  expandPersistId?: string;
};

export function AdminListModalExpandableRow({
  colSpan,
  details,
  children,
  rowClassName,
  expandPersistId,
}: Props) {
  const { hasHiddenColumns } = useAdminListModalTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={adminListModalExpandTriggerClass()}
      tdClassName={cn("text-center", embeddedTableTdClass(undefined, "tight"))}
      actionsColClass={adminListModalActionsColClass}
      actions={null}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName={rowClassName}
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
