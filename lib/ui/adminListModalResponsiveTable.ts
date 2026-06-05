import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const ADMIN_LIST_MODAL_TABLE_CONTAINER = "list-modal";

export const adminListModalTableScrollShellClass = cn(
  "thin-scrollbar admin-list-modal-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${ADMIN_LIST_MODAL_TABLE_CONTAINER}`,
);

export const ADMIN_LIST_MODAL_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

const LIST_MODAL_COL_CELL = "table-cell admin-list-modal-col-cell";
const LIST_MODAL_HIDE_CLASS: Record<string, string> = {
  name: "admin-list-modal-hide-name",
  credits: "admin-list-modal-hide-credits",
  dealerCount: "admin-list-modal-hide-dealerCount",
  parentReseller: "admin-list-modal-hide-parentReseller",
  status: "admin-list-modal-hide-status",
  state: "admin-list-modal-hide-state",
  type: "admin-list-modal-hide-type",
  activeUsers: "admin-list-modal-hide-activeUsers",
  expiredUsers: "admin-list-modal-hide-expiredUsers",
  totalUsers: "admin-list-modal-hide-totalUsers",
};

function listModalColClass(columnId: string): string {
  return cn(LIST_MODAL_COL_CELL, `admin-list-modal-col-${columnId}`);
}

export const ADMIN_LIST_MODAL_COL_TABLE_CLASS: Record<string, string> = {
  username: listModalColClass("username"),
  name: cn(listModalColClass("name"), LIST_MODAL_HIDE_CLASS.name),
  credits: cn(listModalColClass("credits"), LIST_MODAL_HIDE_CLASS.credits),
  dealerCount: cn(listModalColClass("dealerCount"), LIST_MODAL_HIDE_CLASS.dealerCount),
  parentReseller: cn(listModalColClass("parentReseller"), LIST_MODAL_HIDE_CLASS.parentReseller),
  status: cn(listModalColClass("status"), LIST_MODAL_HIDE_CLASS.status),
  state: cn(listModalColClass("state"), LIST_MODAL_HIDE_CLASS.state),
  type: cn(listModalColClass("type"), LIST_MODAL_HIDE_CLASS.type),
  activeUsers: cn(listModalColClass("activeUsers"), LIST_MODAL_HIDE_CLASS.activeUsers),
  expiredUsers: cn(listModalColClass("expiredUsers"), LIST_MODAL_HIDE_CLASS.expiredUsers),
  totalUsers: cn(listModalColClass("totalUsers"), LIST_MODAL_HIDE_CLASS.totalUsers),
};

export function adminListModalColTableClass(columnId: string): string {
  return ADMIN_LIST_MODAL_COL_TABLE_CLASS[columnId] ?? LIST_MODAL_COL_CELL;
}

export const ADMIN_LIST_MODAL_EXPAND_TRIGGER_CLASS = "admin-list-modal-expand-btn";

export function adminListModalExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(ADMIN_LIST_MODAL_EXPAND_TRIGGER_CLASS);
}

export const adminListModalActionsColClass = cn(
  "admin-list-modal-actions-col table-cell text-center whitespace-nowrap",
);

export const ADMIN_LIST_MODAL_RESPONSIVE_HIDE_COLUMN_IDS = new Set(
  Object.keys(LIST_MODAL_HIDE_CLASS),
);
