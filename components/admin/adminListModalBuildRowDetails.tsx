"use client";

import type { ReactNode } from "react";
import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { StaffTypeBadge } from "@/components/admin/HierarchyTableBadges";
import { StaffRealtimeStateCell } from "@/components/admin/StaffRealtimeStateCell";
import { cn } from "@/lib/cn";
import { ADMIN_LIST_MODAL_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/adminListModalResponsiveTable";

export type AdminListModalBranchRow = {
  type: "RESELLER" | "DEALER";
  username: string;
  name: string;
  parent: string;
  status: string;
  stateCurrentLogin: string;
  stateLastLogin: string;
  branchCount: number;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  credits: number;
};

export type AdminListModalColKey =
  | "name"
  | "username"
  | "credits"
  | "branchCount"
  | "parent"
  | "status"
  | "state"
  | "type"
  | "activeUsers"
  | "expiredUsers"
  | "totalUsers";

export const ADMIN_LIST_MODAL_COL_ORDER: readonly AdminListModalColKey[] = [
  "name",
  "username",
  "credits",
  "branchCount",
  "parent",
  "status",
  "state",
  "type",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
];

export const ADMIN_LIST_MODAL_TO_STAFF_COL: Record<AdminListModalColKey, string> = {
  name: "name",
  username: "username",
  credits: "credits",
  branchCount: "dealerCount",
  parent: "parentReseller",
  status: "status",
  state: "state",
  type: "type",
  activeUsers: "activeUsers",
  expiredUsers: "expiredUsers",
  totalUsers: "totalUsers",
};

const STAFF_TO_MODAL_COL = Object.fromEntries(
  Object.entries(ADMIN_LIST_MODAL_TO_STAFF_COL).map(([modal, staff]) => [staff, modal]),
) as Record<string, AdminListModalColKey>;

type VisibleCols = Record<AdminListModalColKey, boolean>;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

/** Columns that belong in the expand panel (picker-off or responsively hidden). */
export function adminListModalExpandPanelStaffIds(
  visibleCols: VisibleCols,
  showBranchColumn: boolean,
  responsiveHiddenIds: readonly string[],
): string[] {
  const responsiveHidden = new Set(responsiveHiddenIds);
  const ids: string[] = [];

  for (const modalKey of ADMIN_LIST_MODAL_COL_ORDER) {
    if (modalKey === "branchCount" && !showBranchColumn) continue;
    const staffId = ADMIN_LIST_MODAL_TO_STAFF_COL[modalKey];
    if (staffId === "username" || !ADMIN_LIST_MODAL_RESPONSIVE_HIDE_COLUMN_IDS.has(staffId)) continue;
    const pickerOff = !visibleCols[modalKey];
    const responsiveOff = responsiveHidden.has(staffId);
    if (pickerOff || responsiveOff) ids.push(staffId);
  }

  return ids;
}

export function adminListModalHasExpandPanel(
  visibleCols: VisibleCols,
  showBranchColumn: boolean,
  responsiveHiddenIds: readonly string[],
): boolean {
  return adminListModalExpandPanelStaffIds(visibleCols, showBranchColumn, responsiveHiddenIds).length > 0;
}

function renderAdminListModalDetailValue(staffId: string, row: AdminListModalBranchRow): ReactNode {
  switch (staffId) {
    case "name":
      return row.name || "—";
    case "credits":
      return <span className="tabular-nums">{formatInt(row.credits)}</span>;
    case "dealerCount":
      return row.branchCount > 0 ? formatInt(row.branchCount) : "—";
    case "parentReseller":
      return <span className="font-mono">{row.parent || "—"}</span>;
    case "status":
      return (
        <span
          className={cn(
            "inline-flex whitespace-nowrap rounded-full px-1.5 py-0 text-[10px] font-semibold ring-1",
            row.status === "Active"
              ? "border border-emerald-300 bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
              : "border border-rose-300 bg-rose-100 text-rose-800 ring-rose-200/80 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
          )}
        >
          {row.status === "Active" ? "On" : "Off"}
        </span>
      );
    case "state":
      return (
        <StaffRealtimeStateCell
          username={row.username}
          dbCurrentLogin={row.stateCurrentLogin}
          dbLastLogin={row.stateLastLogin}
          compact
        />
      );
    case "type":
      return <StaffTypeBadge rowType={row.type} />;
    case "activeUsers":
      return <span className="tabular-nums text-emerald-300">{formatInt(row.activeUsers)}</span>;
    case "expiredUsers":
      return <span className="tabular-nums text-amber-300">{formatInt(row.expiredUsers)}</span>;
    case "totalUsers":
      return <span className="tabular-nums">{formatInt(row.totalUsers)}</span>;
    default:
      return "—";
  }
}

export function buildAdminListModalRowDetailItems(
  row: AdminListModalBranchRow,
  columnLabels: Record<string, string>,
  panelStaffIds: readonly string[],
): StaffHubDetailItem[] {
  return panelStaffIds.map((col) => ({
    columnId: col,
    label: columnLabels[col] ?? STAFF_TO_MODAL_COL[col] ?? col,
    value: renderAdminListModalDetailValue(col, row),
  }));
}
