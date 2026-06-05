"use client";

import type { ReactNode } from "react";
import {
  messageHistoryEmbeddedPillClass,
  messageHistorySentByShort,
  messageHistoryTimestampShort,
} from "@/lib/ui/messageHistoryTableCompact";
import {
  stalkerMessageDeliveryStatusLabel,
  stalkerMessageDeliveryStatusPillClass,
} from "@/lib/ui/stalkerMessageDeliveryStatus";
import {
  stalkerMessagePriorityLabel,
  stalkerMessagePriorityPillClass,
} from "@/lib/ui/stalkerMessagePriority";
import type { AdminRecentStalkerSendMessageRow } from "@/lib/repos/billing";
import { cn } from "@/lib/cn";

export type StbMessageHistoryColumnKey =
  | "recipient"
  | "title"
  | "message"
  | "priority"
  | "sentBy"
  | "sentAt"
  | "status";

export const STB_MESSAGE_HISTORY_COLUMN_LABELS: Record<StbMessageHistoryColumnKey, string> = {
  recipient: "Recipient",
  title: "Title",
  message: "Message",
  priority: "Priority",
  sentBy: "Sent by",
  sentAt: "Timestamp",
  status: "Status",
};

export function renderStbMessageColumnCell(
  col: StbMessageHistoryColumnKey,
  row: AdminRecentStalkerSendMessageRow,
  sentByLabel: string,
  opts?: { inDetailPanel?: boolean },
): ReactNode {
  const titlePreview = (row.title ?? "").trim();
  const preview = (row.msg ?? "").trim();
  const inPanel = opts?.inDetailPanel;

  switch (col) {
    case "recipient": {
      const label = row.login ?? `uid:${row.uid}`;
      return inPanel ? label : <span className="message-history-cell-truncate">{label}</span>;
    }
    case "title":
      return inPanel ? (
        <span className="block min-w-0 text-foreground">{titlePreview || "—"}</span>
      ) : (
        <span className="message-history-cell-truncate">{titlePreview || "—"}</span>
      );
    case "message":
      return inPanel ? (
        <span className="block min-w-0 text-foreground">{preview || "—"}</span>
      ) : (
        <span className="message-history-cell-truncate">{preview || "—"}</span>
      );
    case "priority":
      return (
        <span className={cn(messageHistoryEmbeddedPillClass, stalkerMessagePriorityPillClass(row.priority))}>
          {stalkerMessagePriorityLabel(row.priority)}
        </span>
      );
    case "sentBy":
      return inPanel ? sentByLabel : messageHistorySentByShort(sentByLabel);
    case "sentAt":
      return inPanel ? row.addtime ?? "—" : messageHistoryTimestampShort(row.addtime);
    case "status":
      return (
        <span
          className={cn(
            messageHistoryEmbeddedPillClass,
            "rounded-full",
            stalkerMessageDeliveryStatusPillClass(row.need_confirm),
          )}
        >
          {stalkerMessageDeliveryStatusLabel(row.need_confirm)}
        </span>
      );
    default:
      return "—";
  }
}
