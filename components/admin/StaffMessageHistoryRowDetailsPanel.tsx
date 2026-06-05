"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { buildStaffMessageHistoryRowDetailItems } from "@/components/admin/staffMessageHistoryBuildRowDetails";
import type { StaffMessageHistoryColumnKey } from "@/components/admin/staffMessageHistoryTableCells";
import type { PortalStaffMessageRow } from "@/lib/repos/portalStaffMessages";
import { useMessageHistoryTableContext } from "@/lib/ui/messageHistoryTableContext";

type Props = {
  row: PortalStaffMessageRow;
  tableColumnIds: readonly StaffMessageHistoryColumnKey[];
};

export function StaffMessageHistoryRowDetailsPanel({ row, tableColumnIds }: Props) {
  const { hiddenColumnIds } = useMessageHistoryTableContext();
  const items = buildStaffMessageHistoryRowDetailItems(row, tableColumnIds, hiddenColumnIds);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
