/** Client-safe portal staff inbox types (no DB imports). */

export type PortalStaffInboxStatus = "active" | "dismiss" | "read";

export type PortalStaffPendingMessage = {
  recipientId: number;
  messageId: number;
  title: string;
  body: string;
  sentBy: string;
  createdAt: string;
  dismissedAt?: string;
  readAt?: string;
  inboxStatus?: PortalStaffInboxStatus;
};

export function derivePortalStaffInboxStatus(row: {
  dismissedAt?: string;
  readAt?: string;
}): PortalStaffInboxStatus {
  if (row.readAt) return "read";
  if (row.dismissedAt) return "dismiss";
  return "active";
}
