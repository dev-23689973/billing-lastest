import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";
import type { SubscribersUserColumnKey } from "@/lib/subscribers/subscribersTableModel";

export const SUBSCRIBERS_PAGE_TABLE_CONTAINER = "subscribers-page";

export const subscribersPageTableScrollShellClass = cn(
  "thin-scrollbar subscribers-page-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${SUBSCRIBERS_PAGE_TABLE_CONTAINER}`,
);

export const subscribersPageEmbeddedTableScrollShellClass = cn(
  subscribersPageTableScrollShellClass,
  "app-data-table-scroll min-h-0 w-full min-w-0 flex-1 [--app-data-table-max-h:100%]",
);

export const SUBSCRIBERS_PAGE_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
);

const PAGE_COL_CELL = "table-cell subscribers-page-col-cell";

function pageColClass(columnId: string): string {
  return cn(PAGE_COL_CELL, `subscribers-page-col-${columnId}`);
}

const PAGE_HIDE_CLASS: Record<SubscribersUserColumnKey, string> = {
  name: "subscribers-page-hide-name",
  username: "subscribers-page-hide-username",
  mac: "subscribers-page-hide-mac",
  domain: "subscribers-page-hide-domain",
  parents: "subscribers-page-hide-parents",
  status: "subscribers-page-hide-status",
  state: "subscribers-page-hide-state",
  created: "subscribers-page-hide-created",
  expiry: "subscribers-page-hide-expiry",
  autoRenew: "subscribers-page-hide-autoRenew",
  account: "subscribers-page-hide-account",
};

export const SUBSCRIBERS_PAGE_COL_TABLE_CLASS: Record<string, string> = {
  account: pageColClass("account"),
  name: cn(pageColClass("name"), PAGE_HIDE_CLASS.name),
  username: cn(pageColClass("username"), PAGE_HIDE_CLASS.username),
  mac: cn(pageColClass("mac"), PAGE_HIDE_CLASS.mac),
  domain: cn(pageColClass("domain"), PAGE_HIDE_CLASS.domain),
  parents: cn(pageColClass("parents"), PAGE_HIDE_CLASS.parents),
  status: cn(pageColClass("status"), PAGE_HIDE_CLASS.status),
  state: cn(pageColClass("state"), PAGE_HIDE_CLASS.state),
  created: cn(pageColClass("created"), PAGE_HIDE_CLASS.created),
  expiry: cn(pageColClass("expiry"), PAGE_HIDE_CLASS.expiry),
  autoRenew: cn(pageColClass("autoRenew"), PAGE_HIDE_CLASS.autoRenew),
};

export const SUBSCRIBERS_PAGE_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(PAGE_HIDE_CLASS));

export const SUBSCRIBERS_PAGE_EXPAND_TRIGGER_CLASS = "subscribers-page-expand-btn";

export function subscribersPageColTableClass(columnId: string): string {
  return SUBSCRIBERS_PAGE_COL_TABLE_CLASS[columnId] ?? PAGE_COL_CELL;
}

export function subscribersPageExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(SUBSCRIBERS_PAGE_EXPAND_TRIGGER_CLASS);
}

export const subscribersPageActionsColClass = cn(
  "subscribers-page-actions-col table-cell text-center whitespace-nowrap",
);

export const SUBSCRIBERS_PAGE_COL_FILL_CLASS = "subscribers-page-col-fill";
