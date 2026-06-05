import type { RowDataPacket } from "mysql2";
import { apiJson } from "@/lib/dto/apiJson";
import { getBillingPool } from "@/lib/db/pool";
import { getSession } from "@/lib/session";
import { getTicketChannelsDisplayForTicket } from "@/lib/repos/ticketChannels";
import {
  assertPortalTicketAccess,
  getTicketById,
  getTicketOwnerUsername,
  listTvGenres,
  portalTicketRoleFromSessionType,
  priorityLabel,
  statusLabel,
} from "@/lib/repos/tickets";

type Params = { id: string };
type Ctx = { params: Promise<Params> | Params };

async function canViewTicket(ticketId: number) {
  const session = await getSession();
  if (!session) return { ok: false as const, status: 401 };

  if (session.type === "ROOT") return { ok: true as const };

  const role = portalTicketRoleFromSessionType(session.type);
  if (!role) return { ok: false as const, status: 403 };

  const allowed = await assertPortalTicketAccess(session.username, role, ticketId);
  if (!allowed) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET(_req: Request, ctx: Ctx) {
  const rawParams = await Promise.resolve(ctx.params);
  const ticketId = Number(rawParams.id);
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return apiJson({ error: "bad_ticket_id" }, { status: 400 });
  }

  const access = await canViewTicket(ticketId);
  if (!access.ok) return apiJson({ error: "forbidden" }, { status: access.status });

  const ticket = await getTicketById(ticketId);
  if (!ticket) return apiJson({ error: "not_found" }, { status: 404 });

  const pool = getBillingPool();
  const [contentRows] = await pool.execute<RowDataPacket[]>(
    "SELECT content FROM tickets WHERE id = ? LIMIT 1",
    [ticketId],
  );
  const content = String(contentRows[0]?.content ?? "").trim();

  const genres = await listTvGenres();
  const categoryTitle = genres.find((g) => g.id === ticket.category_id)?.title ?? "—";
  const [creatorUsername, agentUsername] = await Promise.all([
    getTicketOwnerUsername(ticket.user_id),
    getTicketOwnerUsername(ticket.agent_id),
  ]);
  const channelDisplay = await getTicketChannelsDisplayForTicket(ticket);

  return apiJson({
    id: ticket.id,
    subject: ticket.subject,
    html: ticket.html,
    content,
    status_id: ticket.status_id,
    priority_id: ticket.priority_id,
    statusLabel: statusLabel(ticket.status_id),
    priorityLabel: priorityLabel(ticket.priority_id),
    categoryTitle,
    creatorUsername,
    agentUsername,
    channelName: channelDisplay.channelName,
    channels: channelDisplay.channelIds.map((id, i) => ({
      channel_id: id,
      channel_number: channelDisplay.channelNumbers[i] ?? 0,
      name: channelDisplay.channelNames[i] ?? "",
    })),
    updatedAt: ticket.updated_at,
    createdAt: ticket.created_at,
  });
}
