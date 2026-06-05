"use client";

import type { ReactNode } from "react";
import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import type { PortalInboxRow } from "@/components/portal/PortalStaffInboxTable";
import {
  portalStaffInboxStatusLabel,
  portalStaffInboxStatusPill,
} from "@/lib/ui/portalStaffInboxStatus";
import { PORTAL_INBOX_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/portalInboxResponsiveTable";
import type { PortalInboxColumnKey } from "@/lib/ui/portalInboxComputeHiddenColumns";
export const PORTAL_INBOX_COLUMN_LABELS: Record<PortalInboxColumnKey, string> = {
  title: "Title",
  message: "Message",
  from: "From",
  status: "Status",
  sentAt: "Sent at",
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inboxSentAt(row: PortalInboxRow): string {
  const status = row.inboxStatus;
  const raw =
    status === "active"
      ? row.createdAt
      : status === "dismiss"
        ? row.dismissedAt || row.createdAt
        : row.readAt || row.dismissedAt || row.createdAt;
  return raw ? String(raw) : "—";
}

export function buildPortalInboxRowDetailItems(
  row: PortalInboxRow,
  columnIds: readonly PortalInboxColumnKey[],
  hiddenColumnIds?: readonly string[],
): StaffHubDetailItem[] {
  const hiddenSet =
    hiddenColumnIds && hiddenColumnIds.length > 0 ? new Set(hiddenColumnIds) : null;
  const titleText = (row.title ?? "").trim();
  const preview = stripHtml(row.body).trim();
  const fromLabel = row.sentBy || "Administration";
  const status = row.inboxStatus;
  const items: StaffHubDetailItem[] = [];

  for (const col of columnIds) {
    if (!PORTAL_INBOX_RESPONSIVE_HIDE_COLUMN_IDS.has(col)) continue;
    if (hiddenSet && !hiddenSet.has(col)) continue;

    let value: ReactNode;
    switch (col) {
      case "title":
        value = titleText || "—";
        break;
      case "message":
        value = <span className="whitespace-normal break-words text-right">{preview || "—"}</span>;
        break;
      case "from":
        value = fromLabel;
        break;
      case "status":
        value = (
          <span className={portalStaffInboxStatusPill(status)}>{portalStaffInboxStatusLabel[status]}</span>
        );
        break;
      case "sentAt":
        value = inboxSentAt(row);
        break;
      default:
        value = "—";
    }

    items.push({
      columnId: col,
      label: PORTAL_INBOX_COLUMN_LABELS[col],
      value,
    });
  }

  return items;
}
