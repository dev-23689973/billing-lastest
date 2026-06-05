/** Message / inbox payloads safe for client components. */

export type PortalStaffMessageClientRow = {
  id: number;
  title: string;
  body: string;
  priority: number;
  sentAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  senderUsername: string;
};

export function toPortalStaffMessageClientRows(
  rows: Array<{
    id: number;
    title?: string | null;
    body?: string | null;
    priority?: number | null;
    sentAt?: string | null;
    readAt?: string | null;
    dismissedAt?: string | null;
    senderUsername?: string | null;
  }>,
): PortalStaffMessageClientRow[] {
  return rows.map((r) => ({
    id: r.id,
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    priority: Number(r.priority ?? 0),
    sentAt: r.sentAt ?? null,
    readAt: r.readAt ?? null,
    dismissedAt: r.dismissedAt ?? null,
    senderUsername: String(r.senderUsername ?? ""),
  }));
}
