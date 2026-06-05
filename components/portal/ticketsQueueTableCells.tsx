"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { messageHistoryEmbeddedPillClass } from "@/lib/ui/messageHistoryTableCompact";
import {
  ticketPriorityBadgeClass,
  ticketPriorityLabel,
  ticketStatusBadgeClass,
  ticketStatusLabel,
} from "@/lib/ui/ticketBadges";
import { ticketPriorityCompactLabel, ticketStatusCompactLabel, ticketTableTimestampShort } from "@/lib/ui/ticketTableCompact";
import type { TicketDashboardTableRow } from "@/lib/repos/tickets";

export type TicketsQueueColumnKey =
  | "subject"
  | "category"
  | "channel"
  | "createdBy"
  | "assignedAgent"
  | "priority"
  | "status"
  | "content"
  | "comments"
  | "created"
  | "updated";

export const TICKETS_QUEUE_COLUMN_LABELS: Record<TicketsQueueColumnKey, string> = {
  subject: "Subject",
  category: "Category",
  channel: "Channel",
  createdBy: "Created by",
  assignedAgent: "Assigned agent",
  priority: "Priority",
  status: "Status",
  content: "Content",
  comments: "Comments",
  created: "Created",
  updated: "Updated",
};

export const TICKETS_QUEUE_COL_ORDER: readonly TicketsQueueColumnKey[] = [
  "subject",
  "content",
  "category",
  "channel",
  "createdBy",
  "assignedAgent",
  "priority",
  "status",
  "comments",
  "created",
  "updated",
];

export type TicketsQueueCellRenderOpts = {
  inDetailPanel?: boolean;
  onOpenComments?: (row: TicketDashboardTableRow) => void;
};
const trunc = (v: string) => {
  const t = v.trim();
  return t ? <span className="tickets-queue-cell-truncate">{t}</span> : "—";
};
const fmtTs = (v: number) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n * 1000).toLocaleString();
};

export function renderTicketsQueueColumnCell(
  col: TicketsQueueColumnKey,
  row: TicketDashboardTableRow,
  opts?: TicketsQueueCellRenderOpts,
): ReactNode {
  const inPanel = opts?.inDetailPanel;
  switch (col) {
    case "subject":
      return inPanel ? row.subject?.trim() || "—" : trunc(row.subject || "");
    case "category":
      return inPanel ? row.categoryTitle?.trim() || "—" : trunc(row.categoryTitle || "");
    case "channel":
      return inPanel ? row.channelName?.trim() || "—" : trunc(row.channelName || "");
    case "createdBy":
      return inPanel ? row.creatorUsername?.trim() || "—" : trunc(row.creatorUsername || "");
    case "assignedAgent":
      return inPanel ? row.agentUsername?.trim() || "—" : trunc(row.agentUsername || "");
    case "priority":
      return (
        <span className={cn(messageHistoryEmbeddedPillClass, "h-5 shrink-0 rounded-full", ticketPriorityBadgeClass(row.priority_id))}>
          {inPanel ? ticketPriorityLabel(row.priority_id) : ticketPriorityCompactLabel(row.priority_id)}
        </span>
      );
    case "status":
      return (
        <span className={cn(messageHistoryEmbeddedPillClass, "h-5 shrink-0 rounded-full", ticketStatusBadgeClass(row.status_id))}>
          {inPanel ? ticketStatusLabel(row.status_id) : ticketStatusCompactLabel(row.status_id)}
        </span>
      );
    case "content": {
      const plain = (row.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return inPanel ? <span className="block whitespace-normal break-words">{plain || "—"}</span> : trunc(plain);
    }
    case "comments":
      if (inPanel) return row.commentCount > 0 ? String(row.commentCount) : "—";
      if (row.commentCount > 0) {
        return (
          <button
            type="button"
            onClick={() => opts?.onOpenComments?.(row)}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/70 bg-muted/30 px-1.5 text-[10px] font-semibold leading-tight text-foreground transition hover:bg-muted/50"
          >
            {row.commentCount}
          </button>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    case "created":
      return inPanel ? fmtTs(row.created_at) : ticketTableTimestampShort(row.created_at);
    case "updated":
      return inPanel ? fmtTs(row.updated_at) : ticketTableTimestampShort(row.updated_at);
    default:
      return "—";
  }
}
