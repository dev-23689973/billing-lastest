"use client";

import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  STB_MESSAGE_HISTORY_COLUMN_LABELS,
  renderStbMessageColumnCell,
  type StbMessageHistoryColumnKey,
} from "@/components/admin/stbMessageHistoryTableCells";
import type { AdminRecentStalkerSendMessageRow } from "@/lib/repos/billing";
import { MESSAGE_HISTORY_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/messageHistoryResponsiveTable";

export function buildStbMessageHistoryRowDetailItems(
  row: AdminRecentStalkerSendMessageRow,
  sentByLabel: string,
  columnIds: readonly StbMessageHistoryColumnKey[],
  hiddenColumnIds?: readonly string[],
): StaffHubDetailItem[] {
  const hiddenSet =
    hiddenColumnIds && hiddenColumnIds.length > 0 ? new Set(hiddenColumnIds) : null;
  const items: StaffHubDetailItem[] = [];

  for (const col of columnIds) {
    if (!MESSAGE_HISTORY_RESPONSIVE_HIDE_COLUMN_IDS.has(col)) continue;
    if (hiddenSet && !hiddenSet.has(col)) continue;
    items.push({
      columnId: col,
      label: STB_MESSAGE_HISTORY_COLUMN_LABELS[col],
      value: renderStbMessageColumnCell(col, row, sentByLabel, { inDetailPanel: true }),
    });
  }

  return items;
}
