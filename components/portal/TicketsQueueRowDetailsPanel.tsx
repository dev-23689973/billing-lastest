"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  buildTicketsQueueRowDetailItems,
  ticketsQueueExpandPanelColumnIds,
  type TicketsQueuePickerColumnKey,
} from "@/components/portal/ticketsQueueBuildRowDetails";
import type { TicketsQueueCellRenderOpts } from "@/components/portal/ticketsQueueTableCells";
import type { TicketDashboardTableRow } from "@/lib/repos/tickets";
import { useTicketsQueueTableContext } from "@/lib/ui/ticketsQueueTableContext";

type Props = {
  row: TicketDashboardTableRow;
  visibleColumns: ReadonlySet<TicketsQueuePickerColumnKey>;
  cellOpts?: TicketsQueueCellRenderOpts;
};

export function TicketsQueueRowDetailsPanel({ row, visibleColumns, cellOpts }: Props) {
  const { hiddenColumnIds } = useTicketsQueueTableContext();
  const panelColumnIds = ticketsQueueExpandPanelColumnIds(visibleColumns, hiddenColumnIds);
  const items = buildTicketsQueueRowDetailItems(row, panelColumnIds, cellOpts);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
