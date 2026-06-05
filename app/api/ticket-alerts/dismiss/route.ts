import { dismissTicketAlertForUser } from "@/lib/repos/ticketAlertDismissals";
import {
  assertAdminTicketNotificationAccess,
  assertPortalTicketAccess,
  portalTicketRoleFromSessionType,
} from "@/lib/repos/tickets";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return apiJson({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let ticketId = 0;
  try {
    const body = (await req.json()) as { ticketId?: number };
    ticketId = Math.floor(Number(body.ticketId ?? 0));
  } catch {
    return apiJson({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!ticketId) {
    return apiJson({ ok: false, error: "invalid_ticket" }, { status: 400 });
  }

  let allowed = false;
  if (session.type === "ROOT") {
    allowed = await assertAdminTicketNotificationAccess(ticketId);
  } else {
    const role = portalTicketRoleFromSessionType(session.type);
    if (!role) {
      return apiJson({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    allowed = await assertPortalTicketAccess(session.username, role, ticketId);
  }

  if (!allowed) {
    return apiJson({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ok = await dismissTicketAlertForUser(session.username, ticketId);
  return apiJson({ ok }, { headers: { "Cache-Control": "private, no-store" } });
}

