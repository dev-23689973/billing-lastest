"use client";

import { useMemo } from "react";
import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  adminListModalExpandPanelStaffIds,
  buildAdminListModalRowDetailItems,
  type AdminListModalBranchRow,
  type AdminListModalColKey,
} from "@/components/admin/adminListModalBuildRowDetails";
import { useAdminListModalTableContext } from "@/lib/ui/adminListModalTableContext";

type VisibleCols = Record<AdminListModalColKey, boolean>;

type Props = {
  row: AdminListModalBranchRow;
  columnLabels: Record<string, string>;
  visibleCols: VisibleCols;
  showBranchColumn: boolean;
};

export function AdminListModalRowDetailsPanel({
  row,
  columnLabels,
  visibleCols,
  showBranchColumn,
}: Props) {
  const { hiddenColumnIds } = useAdminListModalTableContext();

  const panelStaffIds = useMemo(
    () => adminListModalExpandPanelStaffIds(visibleCols, showBranchColumn, hiddenColumnIds),
    [visibleCols, showBranchColumn, hiddenColumnIds],
  );

  const items = buildAdminListModalRowDetailItems(row, columnLabels, panelStaffIds);
  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">No additional fields to show for this row.</p>
    );
  }
  return <StaffHubHiddenDetailsPanel items={items} />;
}
