import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const SUBSCRIBERS_FETCH_MODAL_TABLE_CONTAINER = "subscribers-modal";

export const subscribersFetchModalTableScrollShellClass = cn(
  "thin-scrollbar subscribers-fetch-modal-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${SUBSCRIBERS_FETCH_MODAL_TABLE_CONTAINER}`,
);

export const SUBSCRIBERS_FETCH_MODAL_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

export type SubscribersFetchModalColumnKey =
  | "account"
  | "user"
  | "hierarchy"
  | "package"
  | "mac"
  | "ip"
  | "autoRenew"
  | "status"
  | "expires"
  | "device";

export const SUBSCRIBERS_FETCH_MODAL_COL_ORDER: readonly SubscribersFetchModalColumnKey[] = [
  "account",
  "user",
  "hierarchy",
  "package",
  "mac",
  "ip",
  "autoRenew",
  "status",
  "expires",
  "device",
];

const MODAL_COL_CELL = "table-cell subscribers-fetch-modal-col-cell";
const MODAL_HIDE_CLASS: Record<string, string> = {
  user: "subscribers-fetch-modal-hide-user",
  hierarchy: "subscribers-fetch-modal-hide-hierarchy",
  package: "subscribers-fetch-modal-hide-package",
  mac: "subscribers-fetch-modal-hide-mac",
  ip: "subscribers-fetch-modal-hide-ip",
  autoRenew: "subscribers-fetch-modal-hide-autoRenew",
  status: "subscribers-fetch-modal-hide-status",
  expires: "subscribers-fetch-modal-hide-expires",
  device: "subscribers-fetch-modal-hide-device",
};

function modalColClass(columnId: string): string {
  return cn(MODAL_COL_CELL, `subscribers-fetch-modal-col-${columnId}`);
}

export const SUBSCRIBERS_FETCH_MODAL_COL_TABLE_CLASS: Record<string, string> = {
  account: modalColClass("account"),
  user: cn(modalColClass("user"), MODAL_HIDE_CLASS.user),
  hierarchy: cn(modalColClass("hierarchy"), MODAL_HIDE_CLASS.hierarchy),
  package: cn(modalColClass("package"), MODAL_HIDE_CLASS.package),
  mac: cn(modalColClass("mac"), MODAL_HIDE_CLASS.mac),
  ip: cn(modalColClass("ip"), MODAL_HIDE_CLASS.ip),
  autoRenew: cn(modalColClass("autoRenew"), MODAL_HIDE_CLASS.autoRenew),
  status: cn(modalColClass("status"), MODAL_HIDE_CLASS.status),
  expires: cn(modalColClass("expires"), MODAL_HIDE_CLASS.expires),
  device: cn(modalColClass("device"), MODAL_HIDE_CLASS.device),
};

export function subscribersFetchModalColTableClass(columnId: string): string {
  return SUBSCRIBERS_FETCH_MODAL_COL_TABLE_CLASS[columnId] ?? MODAL_COL_CELL;
}

export const SUBSCRIBERS_FETCH_MODAL_EXPAND_TRIGGER_CLASS = "subscribers-fetch-modal-expand-btn";

export function subscribersFetchModalExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(SUBSCRIBERS_FETCH_MODAL_EXPAND_TRIGGER_CLASS);
}

export const subscribersFetchModalActionsColClass = cn(
  "subscribers-fetch-modal-actions-col table-cell text-center whitespace-nowrap",
);

export const SUBSCRIBERS_FETCH_MODAL_RESPONSIVE_HIDE_COLUMN_IDS = new Set(
  Object.keys(MODAL_HIDE_CLASS),
);
