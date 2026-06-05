"use client";

import type { ReactNode } from "react";
import {
  messageHistoryAudienceShort,
  messageHistorySentByShort,
  messageHistoryTimestampShort,
} from "@/lib/ui/messageHistoryTableCompact";
import {
  stalkerMessagePriorityLabel,
  stalkerMessagePriorityPillClass,
} from "@/lib/ui/stalkerMessagePriority";
import { messageHistoryEmbeddedPillClass } from "@/lib/ui/messageHistoryTableCompact";
import type { PortalStaffMessageRow } from "@/lib/repos/portalStaffMessages";
import { cn } from "@/lib/cn";

export type StaffMessageHistoryColumnKey =
  | "title"
  | "message"
  | "audience"
  | "priority"
  | "sentBy"
  | "recipients"
  | "dismissed"
  | "read"
  | "sentAt";

export const STAFF_MESSAGE_HISTORY_COLUMN_LABELS: Record<StaffMessageHistoryColumnKey, string> = {
  title: "Title",
  message: "Message",
  audience: "Audience",
  priority: "Priority",
  sentBy: "Sent by",
  recipients: "Recipients",
  dismissed: "Dismissed",
  read: "Read",
  sentAt: "Sent at",
};

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function staffMessageAudienceLabel(audienceType: string): string {
  switch (audienceType) {
    case "all_staff":
      return "All staff";
    case "managers":
      return "Managers";
    case "resellers":
      return "Resellers";
    case "dealers":
      return "Dealers";
    case "downstream_all":
      return "Downstream";
    case "downstream_resellers":
      return "Resellers";
    case "downstream_dealers":
      return "Dealers";
    case "custom":
      return "Custom";
    default:
      return audienceType.replace(/_/g, " ");
  }
}

export function renderStaffMessageColumnCell(
  col: StaffMessageHistoryColumnKey,
  row: PortalStaffMessageRow,
  opts?: { inDetailPanel?: boolean },
): ReactNode {
  const titleText = (row.title ?? "").trim();
  const bodyPreview = (row.body ?? "").trim();
  const inPanel = opts?.inDetailPanel;

  switch (col) {
    case "title":
      return inPanel ? titleText || "—" : titleText || "—";
    case "message":
      return inPanel ? (
        <span className="block min-w-0 whitespace-pre-wrap text-foreground">{bodyPreview || "—"}</span>
      ) : (
        bodyPreview || "—"
      );
    case "audience":
      return inPanel
        ? staffMessageAudienceLabel(row.audienceType)
        : messageHistoryAudienceShort(row.audienceType);
    case "priority":
      return (
        <span className={cn(messageHistoryEmbeddedPillClass, stalkerMessagePriorityPillClass(row.priority))}>
          {stalkerMessagePriorityLabel(row.priority)}
        </span>
      );
    case "sentBy":
      return inPanel ? row.sentBy || "—" : messageHistorySentByShort(row.sentBy || "");
    case "recipients":
      return formatInt(row.recipientCount);
    case "dismissed":
      return formatInt(row.dismissedCount);
    case "read":
      return formatInt(row.readCount);
    case "sentAt":
      return inPanel ? row.createdAt || "—" : messageHistoryTimestampShort(row.createdAt);
    default:
      return "—";
  }
}
