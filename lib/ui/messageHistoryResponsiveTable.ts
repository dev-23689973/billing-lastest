import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const MESSAGE_HISTORY_TABLE_CONTAINER = "message-history";

export const messageHistoryTableScrollShellClass = cn(
  "thin-scrollbar message-history-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  `@container/${MESSAGE_HISTORY_TABLE_CONTAINER}`,
);

export const MESSAGE_HISTORY_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums",
  "text-[11px] leading-tight sm:text-xs",
);

const MSG_COL_CELL = "table-cell message-history-col-cell";

function msgColClass(columnId: string): string {
  return cn(MSG_COL_CELL, `message-history-col-${columnId}`);
}

const MSG_HIDE_CLASS: Record<string, string> = {
  message: "message-history-hide-message",
  audience: "message-history-hide-audience",
  priority: "message-history-hide-priority",
  sentBy: "message-history-hide-sentBy",
  recipients: "message-history-hide-recipients",
  dismissed: "message-history-hide-dismissed",
  read: "message-history-hide-read",
  sentAt: "message-history-hide-sentAt",
  recipient: "message-history-hide-recipient",
  status: "message-history-hide-status",
};

export const MESSAGE_HISTORY_COL_TABLE_CLASS: Record<string, string> = {
  title: msgColClass("title"),
  message: msgColClass("message"),
  audience: cn(msgColClass("audience"), MSG_HIDE_CLASS.audience),
  priority: cn(msgColClass("priority"), MSG_HIDE_CLASS.priority),
  sentBy: cn(msgColClass("sentBy"), MSG_HIDE_CLASS.sentBy),
  recipients: cn(msgColClass("recipients"), MSG_HIDE_CLASS.recipients),
  dismissed: cn(msgColClass("dismissed"), MSG_HIDE_CLASS.dismissed),
  read: cn(msgColClass("read"), MSG_HIDE_CLASS.read),
  sentAt: cn(msgColClass("sentAt"), MSG_HIDE_CLASS.sentAt),
  recipient: msgColClass("recipient"),
  status: cn(msgColClass("status"), MSG_HIDE_CLASS.status),
};

export const MESSAGE_HISTORY_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(MSG_HIDE_CLASS));

/** Last visible data column before actions — absorbs slack next to the chevron. */
export const MESSAGE_HISTORY_COL_TRAIL_FILL_CLASS = "message-history-col-trail-fill";

export function messageHistoryColTableClass(columnId: string): string {
  return MESSAGE_HISTORY_COL_TABLE_CLASS[columnId] ?? MSG_COL_CELL;
}

export const MESSAGE_HISTORY_EXPAND_TRIGGER_CLASS = "message-history-expand-btn";

export function messageHistoryExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(MESSAGE_HISTORY_EXPAND_TRIGGER_CLASS);
}

export const messageHistoryActionsColClass = cn(
  "message-history-actions-col table-cell text-center whitespace-nowrap",
);
