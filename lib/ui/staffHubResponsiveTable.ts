import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const STAFF_HUB_TABLE_CONTAINER = "staff";

/** Horizontal + vertical scroll; min-content columns (see staff-hub-responsive-table.css). */
export const staffHubTableScrollShellClass = cn(
  "thin-scrollbar staff-hub-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${STAFF_HUB_TABLE_CONTAINER}`,
);

/** Full-page staff list: scroll inside shell; footer stays visible below the table. */
export const staffHubEmbeddedTableScrollShellClass = cn(
  staffHubTableScrollShellClass,
  "app-data-table-scroll min-h-0 w-full min-w-0 flex-1 [--app-data-table-max-h:100%]",
);

export const STAFF_HUB_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

export const staffHubCellInnerClass = "inline-block whitespace-nowrap";

const STAFF_COL_CELL = "table-cell staff-hub-col-cell";

function staffColClass(columnId: string): string {
  return cn(STAFF_COL_CELL, `staff-hub-col-${columnId}`);
}

const STAFF_HIDE_CLASS: Record<string, string> = {
  activeUsers: "staff-hub-hide-activeUsers",
  expiredUsers: "staff-hub-hide-expiredUsers",
  state: "staff-hub-hide-state",
  dealerCount: "staff-hub-hide-dealerCount",
  parentReseller: "staff-hub-hide-parentReseller",
  name: "staff-hub-hide-name",
  totalUsers: "staff-hub-hide-totalUsers",
  status: "staff-hub-hide-status",
  credits: "staff-hub-hide-credits",
  type: "staff-hub-hide-type",
  createdAt: "staff-hub-hide-createdAt",
};

const STAFF_DETAIL_CLASS: Record<string, string> = {
  activeUsers: "staff-hub-detail-activeUsers staff-hub-detail-grid",
  expiredUsers: "staff-hub-detail-expiredUsers staff-hub-detail-grid",
  state: "staff-hub-detail-state staff-hub-detail-grid",
  dealerCount: "staff-hub-detail-dealerCount staff-hub-detail-grid",
  parentReseller: "staff-hub-detail-parentReseller staff-hub-detail-grid",
  name: "staff-hub-detail-name staff-hub-detail-grid",
  totalUsers: "staff-hub-detail-totalUsers staff-hub-detail-grid",
  status: "staff-hub-detail-status staff-hub-detail-grid",
  credits: "staff-hub-detail-credits staff-hub-detail-grid",
  type: "staff-hub-detail-type staff-hub-detail-grid",
  createdAt: "staff-hub-detail-createdAt staff-hub-detail-grid",
};

/** Hide first → last when container narrows; expand row shows hidden fields. */
export const STAFF_HUB_COL_TABLE_CLASS: Record<string, string> = {
  username: staffColClass("username"),
  activeUsers: cn(staffColClass("activeUsers"), STAFF_HIDE_CLASS.activeUsers),
  expiredUsers: cn(staffColClass("expiredUsers"), STAFF_HIDE_CLASS.expiredUsers),
  state: cn(staffColClass("state"), STAFF_HIDE_CLASS.state),
  dealerCount: cn(staffColClass("dealerCount"), STAFF_HIDE_CLASS.dealerCount),
  parentReseller: cn(staffColClass("parentReseller"), STAFF_HIDE_CLASS.parentReseller),
  name: cn(staffColClass("name"), STAFF_HIDE_CLASS.name),
  totalUsers: cn(staffColClass("totalUsers"), STAFF_HIDE_CLASS.totalUsers),
  status: cn(staffColClass("status"), STAFF_HIDE_CLASS.status),
  credits: cn(staffColClass("credits"), STAFF_HIDE_CLASS.credits),
  type: cn(staffColClass("type"), STAFF_HIDE_CLASS.type),
  createdAt: cn(staffColClass("createdAt"), STAFF_HIDE_CLASS.createdAt),
};

export const STAFF_HUB_COL_DETAIL_PANEL_CLASS: Record<string, string> = STAFF_DETAIL_CLASS;

export const STAFF_HUB_EXPAND_TRIGGER_CLASS = "staff-hub-expand-btn";

export function staffHubColTableClass(columnId: string): string {
  return STAFF_HUB_COL_TABLE_CLASS[columnId] ?? STAFF_COL_CELL;
}

export function staffHubColDetailPanelClass(columnId: string): string {
  return STAFF_HUB_COL_DETAIL_PANEL_CLASS[columnId] ?? "hidden";
}

export function staffHubExpandTriggerClass(_columnIds: readonly string[]): string {
  return responsiveExpandTriggerClass(STAFF_HUB_EXPAND_TRIGGER_CLASS);
}

export const staffHubActionsColClass = cn(
  "staff-hub-actions-col table-cell text-center whitespace-nowrap",
);

export const STAFF_HUB_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(STAFF_HUB_COL_DETAIL_PANEL_CLASS));

export function staffHubHeaderLabelClass(columnId: string): string | undefined {
  if (columnId === "dealerCount") return "staff-hub-th-dealerCount";
  return undefined;
}
