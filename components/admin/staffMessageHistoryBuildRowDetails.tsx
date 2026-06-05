"use client";

import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  STAFF_MESSAGE_HISTORY_COLUMN_LABELS,
  renderStaffMessageColumnCell,
  type StaffMessageHistoryColumnKey,
} from "@/components/admin/staffMessageHistoryTableCells";
import type { PortalStaffMessageRow } from "@/lib/repos/portalStaffMessages";
import { MESSAGE_HISTORY_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/messageHistoryResponsiveTable";

export function buildStaffMessageHistoryRowDetailItems(
  row: PortalStaffMessageRow,
  columnIds: readonly StaffMessageHistoryColumnKey[],
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
      label: STAFF_MESSAGE_HISTORY_COLUMN_LABELS[col],
      value: renderStaffMessageColumnCell(col, row, { inDetailPanel: true }),
    });
  }

  return items;
}
