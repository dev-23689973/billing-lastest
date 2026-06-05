import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  MESSAGE_HISTORY_COL_TRAIL_FILL_CLASS,
  messageHistoryActionsColClass,
  messageHistoryColTableClass,
} from "@/lib/ui/messageHistoryResponsiveTable";
import { embeddedTableTdClass, embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";

/** Title — capped width with ellipsis. */
export function messageHistoryTitleTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle px-2", extra)),
    messageHistoryColTableClass("title"),
  );
}

/** Message body (layout-specific width rules in CSS). */
export function messageHistoryMessageTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle px-2", extra)),
    messageHistoryColTableClass("message"),
  );
}

/** STB recipient — content width, no `min-w-0` squeeze. */
export function messageHistoryRecipientTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("whitespace-nowrap align-middle px-2", extra)),
    messageHistoryColTableClass("recipient"),
  );
}

/** # / Dis / Rd — centered counts, even spacing. */
export function messageHistoryMetricTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("whitespace-nowrap align-middle text-center tabular-nums px-2", extra)),
    messageHistoryColTableClass(columnId),
  );
}

/** Audience, sent by — short labels. */
export function messageHistoryLabelTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle whitespace-nowrap px-2", extra)),
    messageHistoryColTableClass(columnId),
  );
}

/** Sent at (staff) / last column — trail fill before chevron. */
export function messageHistoryTrailFillTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle whitespace-nowrap px-2", extra)),
    messageHistoryColTableClass(columnId),
    MESSAGE_HISTORY_COL_TRAIL_FILL_CLASS,
  );
}

/** Priority / status pills. */
export function messageHistoryPillTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("align-middle text-center px-2", extra)),
    messageHistoryColTableClass(columnId),
  );
}

export function messageHistoryHeaderCell(columnId: string, className?: string, trailFill?: boolean) {
  return dataTableStickyTh(
    cn(
      messageHistoryColTableClass(columnId),
      trailFill && MESSAGE_HISTORY_COL_TRAIL_FILL_CLASS,
      embeddedTableThClass(className, "tight"),
    ),
  );
}

export function messageHistoryActionsHeaderCell(className?: string) {
  return dataTableStickyTh(cn(messageHistoryActionsColClass, embeddedTableThClass(className, "tight")));
}

function staffMessageTd(
  col: string,
  cellExtra: string,
): string {
  if (col === "title") return messageHistoryTitleTd(cellExtra);
  if (col === "message") return messageHistoryMessageTd(cellExtra);
  if (col === "priority") return messageHistoryPillTd("priority", cellExtra);
  if (col === "recipients" || col === "dismissed" || col === "read") {
    return messageHistoryMetricTd(col, cellExtra);
  }
  if (col === "sentAt") return messageHistoryTrailFillTd("sentAt", cellExtra);
  return messageHistoryLabelTd(col, cellExtra);
}

function stbMessageTd(col: string, cellExtra: string): string {
  if (col === "recipient") return messageHistoryRecipientTd(cellExtra);
  if (col === "message") {
    return cn(messageHistoryMessageTd(cellExtra), MESSAGE_HISTORY_COL_TRAIL_FILL_CLASS);
  }
  if (col === "priority") return messageHistoryPillTd("priority", cellExtra);
  if (col === "status") return messageHistoryPillTd("status", cellExtra);
  return messageHistoryLabelTd(col, cellExtra);
}

export { staffMessageTd, stbMessageTd };
