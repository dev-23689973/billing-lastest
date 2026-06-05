import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  StaffHubRowCellContent,
  type StaffHubRowCellContext,
} from "@/components/admin/StaffHubRowCellContent";
import type { StaffHubTableClientRow } from "@/lib/dto/staffList";
import { STAFF_HUB_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/staffHubResponsiveTable";

export type { StaffHubRowCellContext };

export function portalStaffHubRowForDetails(r: {
  rowType: "RESELLER" | "DEALER";
  username: string;
  name: string;
  status: string;
  credits: number;
  dealerCount: number;
  parentReseller: string;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  stateCurrentLogin: string;
  stateLastLogin: string;
}): StaffHubTableClientRow {
  return {
    rowType: r.rowType,
    username: r.username,
    name: r.name,
    status: r.status,
    credits: r.credits,
    dealerCount: r.dealerCount,
    managerResellerCount: 0,
    managerDealerCount: 0,
    parentReseller: r.parentReseller,
    createdAt: "",
    activeUsers: r.activeUsers,
    expiredUsers: r.expiredUsers,
    totalUsers: r.totalUsers,
    canDelete: false,
    stateCurrentLogin: r.stateCurrentLogin,
    stateLastLogin: r.stateLastLogin,
    lastLoginIp: "",
    currentLoginIp: "",
  };
}

export function buildStaffHubRowDetailItems(
  row: StaffHubTableClientRow,
  columnLabels: Record<string, string>,
  columnIds: readonly string[],
  cellCtx: StaffHubRowCellContext,
  hiddenColumnIds?: readonly string[],
): StaffHubDetailItem[] {
  const hiddenSet =
    hiddenColumnIds && hiddenColumnIds.length > 0 ? new Set(hiddenColumnIds) : null;
  const items: StaffHubDetailItem[] = [];
  for (const col of columnIds) {
    if (col === "username" || !STAFF_HUB_RESPONSIVE_HIDE_COLUMN_IDS.has(col)) continue;
    if (hiddenSet && !hiddenSet.has(col)) continue;
    items.push({
      columnId: col,
      label: columnLabels[col] ?? col,
      value: (
        <StaffHubRowCellContent columnId={col} row={row} ctx={{ ...cellCtx, inDetailPanel: true }} />
      ),
    });
  }
  return items;
}
