import { getAdminNotificationPrefs } from "@/lib/data";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";
import {
  countOpenTicketsForNotification,
  listRecentOpenTicketsForNotification,
  priorityLabel,
  statusLabel,
} from "@/lib/repos/tickets";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiJson({ error: "unauthorized" }, { status: 401 });
  }

  let count = 0;
  let tickets: {
    id: number;
    subject: string;
    statusLabel: string;
    priorityLabel: string;
    updatedAt: number;
  }[] = [];

  if (session.type === "ROOT") {
    const prefs = await getAdminNotificationPrefs().catch(() => ({ notifyNewTickets: true }));
    if (prefs.notifyNewTickets) {
      const [c, rows] = await Promise.all([
        countOpenTicketsForNotification({ type: session.type, username: session.username }),
        listRecentOpenTicketsForNotification({ type: session.type, username: session.username }, 8),
      ]);
      count = c;
      tickets = rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        statusLabel: statusLabel(r.status_id),
        priorityLabel: priorityLabel(r.priority_id),
        updatedAt: r.updated_at,
      }));
    }
  } else if (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR") {
    const [c, rows] = await Promise.all([
      countOpenTicketsForNotification({ type: session.type, username: session.username }),
      listRecentOpenTicketsForNotification({ type: session.type, username: session.username }, 8),
    ]);
    count = c;
    tickets = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      statusLabel: statusLabel(r.status_id),
      priorityLabel: priorityLabel(r.priority_id),
      updatedAt: r.updated_at,
    }));
  }

  return apiJson({ count, tickets }, { headers: { "Cache-Control": "private, no-store" } });
}

