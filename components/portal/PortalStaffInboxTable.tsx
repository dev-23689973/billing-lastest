"use client";

import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { usePortalStaffMessages } from "@/components/messages/portal-staff-messages-context";
import { PortalStaffMessageDetailModal } from "@/components/messages/PortalStaffMessageDetailModal";
import { PortalInboxExpandableRow } from "@/components/portal/PortalInboxExpandableRow";
import { PortalInboxRowDetailsPanel } from "@/components/portal/PortalInboxRowDetailsPanel";
import { PortalInboxTableScrollShell } from "@/components/portal/PortalInboxTableScrollShell";
import {
  portalInboxActionsHeaderCell,
  portalInboxHeaderCell,
  portalInboxLabelTd,
  portalInboxMessageTd,
  portalInboxTitleTd,
  portalInboxStatusTd,
  portalInboxTrailFillTd,
} from "@/components/portal/portalInboxTableUi";
import type { PortalStaffInboxStatus, PortalStaffPendingMessage } from "@/lib/portalStaffInbox";
import {
  portalStaffInboxCheckboxClass,
  portalStaffInboxStatusLabel,
  portalStaffInboxStatusPill,
} from "@/lib/ui/portalStaffInboxStatus";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  messageHistoryEmbeddedPillClass,
  messageHistoryEmbeddedRowClass,
  messageHistorySentByShort,
  messageHistoryTimestampShort,
} from "@/lib/ui/messageHistoryTableCompact";
import { PORTAL_INBOX_COLUMN_IDS } from "@/lib/ui/portalInboxComputeHiddenColumns";
import { PORTAL_INBOX_TABLE_CLASS } from "@/lib/ui/portalInboxResponsiveTable";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import { cn } from "@/lib/cn";

export type PortalInboxRow = PortalStaffPendingMessage & {
  inboxStatus: PortalStaffInboxStatus;
};

const INBOX_COLS = PORTAL_INBOX_COLUMN_IDS;
const INBOX_TRAIL_COL = "sentAt" as const;

const INBOX_HEADER_SHORT = {
  title: "Title",
  message: "Msg",
  from: "From",
  status: "Sts",
  sentAt: "At",
} as const;

const INBOX_HEADER_FULL = {
  title: "Title",
  message: "Message",
  from: "From",
  status: "Status",
  sentAt: "Sent at",
} as const;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function InboxRowActions({
  row,
  status,
  pending,
  onMarkRead,
  onOpen,
}: {
  row: PortalInboxRow;
  status: PortalStaffInboxStatus;
  pending: boolean;
  onMarkRead: (recipientId: number) => void;
  onOpen: (row: PortalInboxRow) => void;
}) {
  const isChecked = status === "dismiss" || status === "read";
  const isCheckboxDisabled = status === "read" || pending;

  return (
    <>
      <input
        type="checkbox"
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded border-border focus-visible:ring-2 sm:h-4 sm:w-4",
          portalStaffInboxCheckboxClass(status, pending),
        )}
        checked={isChecked}
        disabled={isCheckboxDisabled}
        aria-label={`${portalStaffInboxStatusLabel[status]} — ${
          status === "read" ? "locked" : "click to mark read"
        }`}
        title={
          status === "read"
            ? "Read — cannot change"
            : pending
              ? "Updating…"
              : status === "active"
                ? "Active — click to mark read"
                : "Dismiss — click to mark read"
        }
        onChange={(e) => {
          e.preventDefault();
          if (pending || status === "read") return;
          if (status === "active" || status === "dismiss") onMarkRead(row.recipientId);
        }}
        onClick={(e) => e.preventDefault()}
      />
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-foreground transition hover:bg-muted/25 sm:h-7 sm:w-7"
        aria-label="View message detail"
        title="View detail"
      >
        <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
      </button>
    </>
  );
}

function EmbeddedInboxTable({
  rows,
  onMarkRead,
  onOpen,
  pendingId,
}: {
  rows: PortalInboxRow[];
  onMarkRead: (recipientId: number) => void;
  onOpen: (row: PortalInboxRow) => void;
  pendingId: number | null;
}) {
  const colSpan = INBOX_COLS.length + 1;

  return (
    <PortalInboxTableScrollShell columnIds={INBOX_COLS}>
      <table className={PORTAL_INBOX_TABLE_CLASS}>
        <thead>
          <tr>
            {INBOX_COLS.map((col) => (
              <th
                key={col}
                className={portalInboxHeaderCell(
                  col,
                  col === "status" ? "text-center" : undefined,
                  col === INBOX_TRAIL_COL,
                )}
              >
                {responsiveTableColumnHeader(INBOX_HEADER_SHORT[col], INBOX_HEADER_FULL[col])}
              </th>
            ))}
            <th className={portalInboxActionsHeaderCell("text-center")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-2 py-5 text-center text-[11px] text-muted-foreground">
                No portal messages match the current filters.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const titleText = (row.title ?? "").trim();
            const titleShort = titleText.length > 48 ? `${titleText.slice(0, 45)}…` : titleText;
            const bodyPreview = stripHtml(row.body).trim();
            const bodyShort = bodyPreview.length > 96 ? `${bodyPreview.slice(0, 93)}…` : bodyPreview;
            const status = row.inboxStatus;
            const pending = pendingId === row.recipientId;
            const fromLabel = row.sentBy || "Administration";
            const sentAtRaw =
              status === "active"
                ? row.createdAt
                : status === "dismiss"
                  ? row.dismissedAt || row.createdAt
                  : row.readAt || row.dismissedAt || row.createdAt;

            return (
              <PortalInboxExpandableRow
                key={row.recipientId}
                colSpan={colSpan}
                expandPersistId={`portal-inbox:${row.recipientId}`}
                active={status === "active"}
                actions={
                  <InboxRowActions
                    row={row}
                    status={status}
                    pending={pending}
                    onMarkRead={onMarkRead}
                    onOpen={onOpen}
                  />
                }
                details={<PortalInboxRowDetailsPanel row={row} />}
              >
                <td className={portalInboxTitleTd("text-foreground")} title={titleText || undefined}>
                  <span className="portal-inbox-cell-truncate block">{titleShort || "—"}</span>
                </td>
                <td className={portalInboxMessageTd("text-foreground")} title={bodyPreview || undefined}>
                  <span className="portal-inbox-cell-truncate block">{bodyShort || "—"}</span>
                </td>
                <td className={portalInboxLabelTd("from", "text-muted-foreground")} title={fromLabel}>
                  <span className="portal-inbox-cell-truncate block">{messageHistorySentByShort(fromLabel)}</span>
                </td>
                <td className={portalInboxStatusTd("text-center")}>
                  <span
                    className={cn(
                      messageHistoryEmbeddedPillClass,
                      "font-bold uppercase tracking-wide",
                      portalStaffInboxStatusPill(status),
                    )}
                  >
                    {portalStaffInboxStatusLabel[status]}
                  </span>
                </td>
                <td
                  className={portalInboxTrailFillTd("sentAt", "text-muted-foreground")}
                  title={sentAtRaw ? String(sentAtRaw) : undefined}
                >
                  <span className="portal-inbox-cell-truncate block">
                    {messageHistoryTimestampShort(sentAtRaw)}
                  </span>
                </td>
              </PortalInboxExpandableRow>
            );
          })}
        </tbody>
      </table>
    </PortalInboxTableScrollShell>
  );
}

function PlainInboxTable({
  rows,
  onMarkRead,
  onOpen,
  pendingId,
}: {
  rows: PortalInboxRow[];
  onMarkRead: (recipientId: number) => void;
  onOpen: (row: PortalInboxRow) => void;
  pendingId: number | null;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className={dataTableStickyTh(undefined, "comfortable")}>Title</th>
          <th className={dataTableStickyTh(undefined, "comfortable")}>Message</th>
          <th className={dataTableStickyTh("whitespace-nowrap", "comfortable")}>From</th>
          <th className={dataTableStickyTh("whitespace-nowrap", "comfortable")}>Status</th>
          <th className={dataTableStickyTh("whitespace-nowrap", "comfortable")}>Sent at</th>
          <th className={dataTableStickyTh("whitespace-nowrap text-right", "comfortable")}>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground sm:px-6">
              No portal messages match the current filters.
            </td>
          </tr>
        ) : null}
        {rows.map((row) => {
          const titleText = (row.title ?? "").trim();
          const titleShort = titleText.length > 48 ? `${titleText.slice(0, 45)}…` : titleText;
          const bodyPreview = stripHtml(row.body).trim();
          const bodyShort = bodyPreview.length > 96 ? `${bodyPreview.slice(0, 93)}…` : bodyPreview;
          const status = row.inboxStatus;
          const pending = pendingId === row.recipientId;
          const fromLabel = row.sentBy || "Administration";
          const sentAtRaw =
            status === "active"
              ? row.createdAt
              : status === "dismiss"
                ? row.dismissedAt || row.createdAt
                : row.readAt || row.dismissedAt || row.createdAt;

          return (
            <tr
              key={row.recipientId}
              className={cn(
                messageHistoryEmbeddedRowClass,
                status === "active" && "bg-destructive/[0.03]",
              )}
            >
              <td className="max-w-[12rem] px-4 py-2.5 text-foreground" title={titleText || undefined}>
                <span className="line-clamp-2">{titleShort || "—"}</span>
              </td>
              <td className="max-w-[280px] px-4 py-2.5 text-foreground" title={bodyPreview || undefined}>
                <span className="line-clamp-2">{bodyShort || "—"}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fromLabel}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <span className={portalStaffInboxStatusPill(status)}>{portalStaffInboxStatusLabel[status]}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                {sentAtRaw || "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <div className="inline-flex items-center justify-end gap-2">
                  <InboxRowActions
                    row={row}
                    status={status}
                    pending={pending}
                    onMarkRead={onMarkRead}
                    onOpen={onOpen}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PortalStaffInboxTable({
  rows,
  embedded = false,
}: {
  rows: PortalInboxRow[];
  embedded?: boolean;
}) {
  const { markRead } = usePortalStaffMessages();
  const [detail, setDetail] = useState<PortalInboxRow | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function handleMarkRead(recipientId: number) {
    setPendingId(recipientId);
    startTransition(async () => {
      try {
        await markRead(recipientId);
      } finally {
        setPendingId(null);
      }
    });
  }

  const tableProps = {
    rows,
    onMarkRead: handleMarkRead,
    onOpen: setDetail,
    pendingId,
  };

  if (embedded) {
    return (
      <>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <EmbeddedInboxTable {...tableProps} />
        </div>
        {detail ? (
          <PortalStaffMessageDetailModal
            message={detail}
            inboxStatus={detail.inboxStatus}
            onClose={() => setDetail(null)}
            onDismissed={() => setDetail(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="min-w-0">
      <PlainInboxTable {...tableProps} />
      {detail ? (
        <PortalStaffMessageDetailModal
          message={detail}
          inboxStatus={detail.inboxStatus}
          onClose={() => setDetail(null)}
          onDismissed={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}

const INBOX_STATUS_PRIORITY: Record<PortalStaffInboxStatus, number> = {
  active: 1,
  dismiss: 2,
  read: 3,
};

export function buildPortalInboxRows(
  active: PortalStaffPendingMessage[],
  dismiss: PortalStaffPendingMessage[],
  read: PortalStaffPendingMessage[],
): PortalInboxRow[] {
  const mapRow = (m: PortalStaffPendingMessage, inboxStatus: PortalStaffInboxStatus): PortalInboxRow => ({
    ...m,
    inboxStatus,
  });
  const byRecipientId = new Map<number, PortalInboxRow>();
  const upsert = (list: PortalStaffPendingMessage[], inboxStatus: PortalStaffInboxStatus) => {
    for (const m of list) {
      const row = mapRow(m, inboxStatus);
      const existing = byRecipientId.get(m.recipientId);
      if (!existing || INBOX_STATUS_PRIORITY[inboxStatus] > INBOX_STATUS_PRIORITY[existing.inboxStatus]) {
        byRecipientId.set(m.recipientId, row);
      }
    }
  };
  upsert(active, "active");
  upsert(dismiss, "dismiss");
  upsert(read, "read");
  return [...byRecipientId.values()].sort((a, b) => {
    const ta =
      a.inboxStatus === "active"
        ? a.createdAt
        : a.inboxStatus === "dismiss"
          ? a.dismissedAt ?? a.createdAt
          : a.readAt ?? a.dismissedAt ?? a.createdAt;
    const tb =
      b.inboxStatus === "active"
        ? b.createdAt
        : b.inboxStatus === "dismiss"
          ? b.dismissedAt ?? b.createdAt
          : b.readAt ?? b.dismissedAt ?? b.createdAt;
    return String(tb).localeCompare(String(ta));
  });
}

export function filterPortalInboxRows(
  rows: PortalInboxRow[],
  search: string,
  status: "all" | "active" | "dismiss" | "read",
): PortalInboxRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (status !== "all" && row.inboxStatus !== status) return false;
    if (!q) return true;
    return (
      stripHtml(row.body).toLowerCase().includes(q) ||
      (row.title ?? "").toLowerCase().includes(q) ||
      (row.sentBy ?? "").toLowerCase().includes(q) ||
      (row.createdAt ?? "").toLowerCase().includes(q) ||
      (row.dismissedAt ?? "").toLowerCase().includes(q) ||
      (row.readAt ?? "").toLowerCase().includes(q)
    );
  });
}
