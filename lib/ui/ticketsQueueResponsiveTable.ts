import { cn } from "@/lib/cn";
import { responsiveExpandTriggerClass } from "@/lib/ui/responsiveDataTable";

export const ticketsQueueTableScrollShellClass = cn(
  "thin-scrollbar tickets-queue-table-scroll w-full max-w-full min-h-0 min-w-0",
  "max-h-[var(--app-data-table-max-h,none)]",
  "@container/tickets-queue",
);

export const TICKETS_QUEUE_RESPONSIVE_TABLE_CLASS = cn(
  "w-max min-w-full border-collapse text-left tabular-nums font-mono",
  "text-[11px] leading-tight sm:text-xs",
);

const COL_CELL = "table-cell tickets-queue-col-cell";
const HIDE_CLASS: Record<string, string> = {
  category: "tickets-queue-hide-category",
  channel: "tickets-queue-hide-channel",
  createdBy: "tickets-queue-hide-createdBy",
  assignedAgent: "tickets-queue-hide-assignedAgent",
  priority: "tickets-queue-hide-priority",
  content: "tickets-queue-hide-content",
  comments: "tickets-queue-hide-comments",
  created: "tickets-queue-hide-created",
  updated: "tickets-queue-hide-updated",
};
const c = (id: string) => cn(COL_CELL, `tickets-queue-col-${id}`);
export const TICKETS_QUEUE_COL_TABLE_CLASS: Record<string, string> = {
  subject: c("subject"),
  category: cn(c("category"), HIDE_CLASS.category),
  channel: cn(c("channel"), HIDE_CLASS.channel),
  createdBy: cn(c("createdBy"), HIDE_CLASS.createdBy),
  assignedAgent: cn(c("assignedAgent"), HIDE_CLASS.assignedAgent),
  priority: cn(c("priority"), HIDE_CLASS.priority),
  status: c("status"),
  content: cn(c("content"), HIDE_CLASS.content),
  comments: cn(c("comments"), HIDE_CLASS.comments),
  created: cn(c("created"), HIDE_CLASS.created),
  updated: cn(c("updated"), HIDE_CLASS.updated),
};
export const TICKETS_QUEUE_RESPONSIVE_HIDE_COLUMN_IDS = new Set(Object.keys(HIDE_CLASS));
export const TICKETS_QUEUE_COL_TRAIL_FILL_CLASS = "tickets-queue-col-trail-fill";
/** Column that grows on wide viewports (not the last date column). */
export const TICKETS_QUEUE_TRAIL_FILL_COLUMN_ID = "content";
export const TICKETS_QUEUE_EXPAND_TRIGGER_CLASS = "tickets-queue-expand-btn";
export const ticketsQueueActionsColClass = cn("tickets-queue-actions-col table-cell text-center whitespace-nowrap");

export function ticketsQueueColTableClass(columnId: string): string {
  return TICKETS_QUEUE_COL_TABLE_CLASS[columnId] ?? COL_CELL;
}

export function ticketsQueueExpandTriggerClass(): string {
  return responsiveExpandTriggerClass(TICKETS_QUEUE_EXPAND_TRIGGER_CLASS);
}
