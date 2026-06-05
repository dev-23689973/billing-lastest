"use client";

import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  TICKETS_QUEUE_COL_ORDER,
  TICKETS_QUEUE_COLUMN_LABELS,
  renderTicketsQueueColumnCell,
  type TicketsQueueCellRenderOpts,
  type TicketsQueueColumnKey,
} from "@/components/portal/ticketsQueueTableCells";
import { TICKETS_QUEUE_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/ticketsQueueResponsiveTable";
import type { TicketDashboardTableRow } from "@/lib/repos/tickets";

export type TicketsQueuePickerColumnKey = TicketsQueueColumnKey | "actions";

export function ticketsQueueTableColumnIds(visibleColumns: ReadonlySet<TicketsQueuePickerColumnKey>): TicketsQueueColumnKey[] {
  return TICKETS_QUEUE_COL_ORDER.filter((k) => visibleColumns.has(k));
}

export function ticketsQueueExpandPanelColumnIds(
  visibleColumns: ReadonlySet<TicketsQueuePickerColumnKey>,
  responsiveHiddenIds: readonly string[],
): TicketsQueueColumnKey[] {
  const responsiveHidden = new Set(responsiveHiddenIds);
  const ids: TicketsQueueColumnKey[] = [];
  for (const k of TICKETS_QUEUE_COL_ORDER) {
    const pickerOff = !visibleColumns.has(k);
    const responsiveOff =
      TICKETS_QUEUE_RESPONSIVE_HIDE_COLUMN_IDS.has(k) && responsiveHidden.has(k);
    if (pickerOff || responsiveOff) ids.push(k);
  }
  return ids;
}

export function ticketsQueueHasExpandPanel(
  visibleColumns: ReadonlySet<TicketsQueuePickerColumnKey>,
  responsiveHiddenIds: readonly string[],
): boolean {
  return ticketsQueueExpandPanelColumnIds(visibleColumns, responsiveHiddenIds).length > 0;
}

export function buildTicketsQueueRowDetailItems(
  row: TicketDashboardTableRow,
  panelColumnIds: readonly TicketsQueueColumnKey[],
  cellOpts?: TicketsQueueCellRenderOpts,
): StaffHubDetailItem[] {
  return panelColumnIds.map((k) => ({
    columnId: k,
    label: TICKETS_QUEUE_COLUMN_LABELS[k],
    value: renderTicketsQueueColumnCell(k, row, { ...cellOpts, inDetailPanel: true }),
  }));
}
