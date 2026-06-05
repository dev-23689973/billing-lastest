"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { buildStbMessageHistoryRowDetailItems } from "@/components/admin/stbMessageHistoryBuildRowDetails";
import type { StbMessageHistoryColumnKey } from "@/components/admin/stbMessageHistoryTableCells";
import type { AdminRecentStalkerSendMessageRow } from "@/lib/repos/billing";
import { useMessageHistoryTableContext } from "@/lib/ui/messageHistoryTableContext";

type Props = {
  row: AdminRecentStalkerSendMessageRow;
  sentByLabel: string;
  tableColumnIds: readonly StbMessageHistoryColumnKey[];
};

export function StbMessageHistoryRowDetailsPanel({ row, sentByLabel, tableColumnIds }: Props) {
  const { hiddenColumnIds } = useMessageHistoryTableContext();
  const items = buildStbMessageHistoryRowDetailItems(row, sentByLabel, tableColumnIds, hiddenColumnIds);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
