import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";
import { embeddedTableTextClass } from "@/lib/ui/embeddedTableTypography";

export const PORTAL_INBOX_TABLE_CONTAINER = "portal-inbox";

export const portalInboxTableScrollShellClass = cn(
  "thin-scrollbar portal-inbox-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${PORTAL_INBOX_TABLE_CONTAINER}`,
);

export const portalInboxEmbeddedTableScrollShellClass = cn(
  portalInboxTableScrollShellClass,
  "app-data-table-scroll min-h-0 flex-1 [--app-data-table-max-h:100%]",
);

export const PORTAL_INBOX_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
  embeddedTableTextClass,
);

const INBOX_COL_CELL = "table-cell portal-inbox-col-cell";

function inboxColClass(columnId: string): string {
  return cn(INBOX_COL_CELL, `portal-inbox-col-${columnId}`);
}

const INBOX_HIDE_CLASS: Record<string, string> = {
  from: "portal-inbox-hide-from",
  status: "portal-inbox-hide-status",
  sentAt: "portal-inbox-hide-sentAt",
};

export const PORTAL_INBOX_COL_TABLE_CLASS: Record<string, string> = {
  title: inboxColClass("title"),
  message: inboxColClass("message"),
  from: cn(inboxColClass("from"), INBOX_HIDE_CLASS.from),
  status: cn(inboxColClass("status"), INBOX_HIDE_CLASS.status),
  sentAt: cn(inboxColClass("sentAt"), INBOX_HIDE_CLASS.sentAt),
};

export const PORTAL_INBOX_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(INBOX_HIDE_CLASS));

export const PORTAL_INBOX_COL_TRAIL_FILL_CLASS = "portal-inbox-col-trail-fill";

export function portalInboxColTableClass(columnId: string): string {
  return PORTAL_INBOX_COL_TABLE_CLASS[columnId] ?? INBOX_COL_CELL;
}

export const PORTAL_INBOX_EXPAND_TRIGGER_CLASS = "portal-inbox-expand-btn";

export function portalInboxExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(PORTAL_INBOX_EXPAND_TRIGGER_CLASS);
}

export const portalInboxActionsColClass = cn(
  "portal-inbox-actions-col table-cell text-center whitespace-nowrap",
);
