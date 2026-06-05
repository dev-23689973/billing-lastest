"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  buildStaffHubRowDetailItems,
  type StaffHubRowCellContext,
} from "@/components/admin/staffHubBuildRowDetails";
import type { StaffHubTableClientRow } from "@/lib/dto/staffList";
import { useStaffHubTableContext } from "@/lib/ui/staffHubTableContext";

type Props = {
  row: StaffHubTableClientRow;
  columnLabels: Record<string, string>;
  tableColumnIds: readonly string[];
  cellCtx: StaffHubRowCellContext;
};

/** Expand panel content — only columns currently hidden from the table, left column first. */
export function StaffHubRowDetailsPanel({ row, columnLabels, tableColumnIds, cellCtx }: Props) {
  const { hiddenColumnIds } = useStaffHubTableContext();
  const items = buildStaffHubRowDetailItems(
    row,
    columnLabels,
    tableColumnIds,
    cellCtx,
    hiddenColumnIds,
  );
  return <StaffHubHiddenDetailsPanel items={items} />;
}
