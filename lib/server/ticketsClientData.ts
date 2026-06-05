import type { RowDataPacket } from "mysql2";
import { stripClientPayload } from "@/lib/dto/redact";
import { revalidatePath } from "next/cache";
import { revalidateAdminDashboardCaches } from "@/lib/dashboard/revalidateAdminDashboardCaches";
import { getBillingPool } from "@/lib/db/pool";
import { getTicketChannelsDisplayForTicket } from "@/lib/repos/ticketChannels";
import {
  assertPortalTicketAccess,
  deleteTicketById,
  findItvByChannelNumber,
  getPortalTicketScope,
  getTicketById,
  getTicketOwnerUsername,
  getTicketOwnerUsernamesByIds,
  insertTicket,
  insertTicketComment,
  listItvByGenreId,
  listTicketComments,
  listTvGenres,
  portalTicketRoleFromSessionType,
  priorityLabel,
  statusLabel,
  updateTicketPriorityAndStatus,
  type PortalTicketRole,
} from "@/lib/repos/tickets";
import {
  getTicketTableRowById,
  listTicketsTablePaged,
  type TicketTablePagedInput,
} from "@/lib/repos/ticketsTablePaged";
import { dismissTicketAlertForUser } from "@/lib/repos/ticketAlertDismissals";
import {
  assertAdminTicketNotificationAccess,
} from "@/lib/repos/tickets";
import type { SessionPayload } from "@/lib/session";
import { canCreateTicket } from "@/lib/tickets/canCreateTicket";

type Fail = { ok: false; error: string; status: number };

function fail(error: string, status: number): Fail {
  return { ok: false, error, status };
}

function revalidateTicketScopes() {
  revalidatePath("/admin/tickets/dashboard");
  revalidatePath("/manager/tickets");
  revalidatePath("/manager/tickets/dashboard");
  revalidatePath("/dealer/tickets");
  revalidatePath("/dealer/tickets/dashboard");
  revalidatePath("/reseller/tickets");
  revalidatePath("/reseller/tickets/dashboard");
}

export type TicketPreviewClientDto = {
  id: number;
  subject: string;
  html: string;
  content: string;
  status_id: number;
  priority_id: number;
  statusLabel: string;
  priorityLabel: string;
  categoryTitle: string;
  creatorUsername: string;
  agentUsername: string;
  channelName: string;
  channels: Array<{ channel_id: number; channel_number: number; name: string }>;
  updatedAt: number;
  createdAt: number;
};

export type TicketCommentClientRow = {
  id: number;
  html: string;
  author: string;
  updated_at: number;
};

export type TicketChannelClientRow = {
  id: number;
  name: string;
  number: number;
  tv_genre_id: number;
};

function scopeFromSession(session: SessionPayload): TicketTablePagedInput["scope"] | null {
  if (session.type === "ROOT") return "admin";
  const role = portalTicketRoleFromSessionType(session.type);
  if (!role) return null;
  return { username: session.username, role };
}

async function resolveTicketCommentAccess(ticketId: number, session: SessionPayload) {
  let commentUserId = 0;
  if (session.type !== "ROOT") {
    const role = portalTicketRoleFromSessionType(session.type);
    if (!role) return fail("forbidden", 403);
    const allowed = await assertPortalTicketAccess(session.username, role, ticketId);
    if (!allowed) return fail("forbidden", 403);
    const scope = await getPortalTicketScope(session.username, role);
    if (!scope) return fail("forbidden", 403);
    commentUserId = scope.billingUserId;
  }
  return { ok: true as const, commentUserId, actorUsername: session.username };
}

async function canViewTicket(ticketId: number, session: SessionPayload) {
  if (session.type === "ROOT") return { ok: true as const };
  const role = portalTicketRoleFromSessionType(session.type);
  if (!role) return fail("forbidden", 403);
  const allowed = await assertPortalTicketAccess(session.username, role, ticketId);
  if (!allowed) return fail("forbidden", 403);
  return { ok: true as const };
}

export async function loadTicketPreviewForClient(ticketId: number, session: SessionPayload) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) return fail("bad_ticket_id", 400);

  const access = await canViewTicket(ticketId, session);
  if (!access.ok) return access;

  const ticket = await getTicketById(ticketId);
  if (!ticket) return fail("not_found", 404);

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

  const data: TicketPreviewClientDto = {
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
  };

  return stripClientPayload({ ok: true as const, data });
}

export async function loadTicketCommentsForClient(ticketId: number, session: SessionPayload) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) return fail("bad_ticket_id", 400);

  const access = await resolveTicketCommentAccess(ticketId, session);
  if (!access.ok) return access;

  const comments = await listTicketComments(ticketId);
  const authorMap = await getTicketOwnerUsernamesByIds(comments.map((c) => c.user_id));
  const rows: TicketCommentClientRow[] = comments.map((c) => ({
    id: c.id,
    html: c.html,
    author: c.user_id === 0 ? "admin" : (authorMap.get(c.user_id) ?? "admin"),
    updated_at: c.updated_at,
  }));

  return { ok: true as const, comments: rows };
}

export async function postTicketCommentForClient(ticketId: number, comment: string, session: SessionPayload) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) return fail("bad_ticket_id", 400);

  const access = await resolveTicketCommentAccess(ticketId, session);
  if (!access.ok) return access;

  if (session.type !== "ROOT") {
    const ticket = await getTicketById(ticketId);
    if (!ticket || ticket.status_id === 2) return fail("ticket_fixed", 403);
  }

  const trimmed = String(comment ?? "").trim();
  if (!trimmed) return fail("comment_required", 400);

  await insertTicketComment(ticketId, trimmed, access.commentUserId, access.actorUsername);
  if (session.type === "ROOT") {
    revalidateAdminDashboardCaches();
  }
  return { ok: true as const };
}

export async function manageTicketForClient(
  ticketId: number,
  input: { action: "delete" } | { action: "update"; status: number; priority: number },
  session: SessionPayload,
) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) return fail("bad_ticket_id", 400);
  if (session.type !== "ROOT") return fail("forbidden", 403);

  if (input.action === "delete") {
    const ok = await deleteTicketById(ticketId, session.username);
    if (!ok) return fail("delete_failed", 400);
  } else {
    const { status, priority } = input;
    if (!Number.isFinite(status) || status < 1 || status > 3) return fail("bad_status", 400);
    if (!Number.isFinite(priority) || priority < 1 || priority > 3) return fail("bad_priority", 400);
    const ok = await updateTicketPriorityAndStatus(ticketId, priority, status, 0, session.username);
    if (!ok) return fail("update_failed", 400);
  }

  revalidateAdminDashboardCaches();
  revalidateTicketScopes();

  return { ok: true as const };
}

export async function dismissTicketAlertForClient(ticketId: number, session: SessionPayload) {
  if (!Number.isFinite(ticketId) || ticketId <= 0) return { ok: false as const, error: "invalid_ticket" };

  let allowed = false;
  if (session.type === "ROOT") {
    allowed = await assertAdminTicketNotificationAccess(ticketId);
  } else {
    const role = portalTicketRoleFromSessionType(session.type);
    if (!role) return { ok: false as const, error: "unauthorized" };
    allowed = await assertPortalTicketAccess(session.username, role, ticketId);
  }

  if (!allowed) return { ok: false as const, error: "forbidden" };

  const ok = await dismissTicketAlertForUser(session.username, ticketId);
  return { ok };
}

export type CreateTicketClientInput = {
  subject: string;
  description: string;
  priority: number;
  category_id: number;
  channels?: Array<{ channel_id: number; channel_number: number }>;
  flags?: {
    no_audio?: boolean;
    no_video?: boolean;
    stream_error?: boolean;
    no_epg?: boolean;
    catch_up_needed?: boolean;
    epg_needed?: boolean;
    file_missing?: boolean;
    wrong_channel_name?: boolean;
  };
};

function parseCreateChannels(input: CreateTicketClientInput): Array<{ channel_id: number; channel_number: number }> {
  const fromList = Array.isArray(input.channels) ? input.channels : [];
  return fromList
    .map((ch) => ({
      channel_id: Number(ch.channel_id),
      channel_number: Number(ch.channel_number),
    }))
    .filter(
      (ch) =>
        Number.isFinite(ch.channel_id) &&
        ch.channel_id > 0 &&
        Number.isFinite(ch.channel_number) &&
        ch.channel_number > 0,
    );
}

export async function createTicketForClient(input: CreateTicketClientInput, session: SessionPayload) {
  if (!(await canCreateTicket(session))) return fail("forbidden", 403);

  let userId = 0;
  {
    const role: PortalTicketRole | null =
      session.type === "MNGR" ? "MNGR" : session.type === "SRSLR" ? "SRSLR" : session.type === "RSLR" ? "RSLR" : null;
    if (!role) return fail("forbidden", 403);
    const scope = await getPortalTicketScope(session.username, role);
    if (!scope) return fail("forbidden", 403);
    userId = scope.billingUserId;
  }

  const subject = String(input.subject ?? "").trim();
  const descriptionHtml = String(input.description ?? "");
  const priority = Number(input.priority);
  const category_id = Number(input.category_id);
  const channels = parseCreateChannels(input);

  if (!subject || !Number.isFinite(priority) || priority < 1 || priority > 3) {
    return fail("validation", 400);
  }
  if (!Number.isFinite(category_id) || category_id <= 0) {
    return fail("validation", 400);
  }

  try {
    const id = await insertTicket({
      subject,
      descriptionHtml,
      priority_id: priority,
      category_id,
      channels,
      flags: {
        no_audio: Boolean(input.flags?.no_audio),
        no_video: Boolean(input.flags?.no_video),
        stream_error: Boolean(input.flags?.stream_error),
        no_epg: Boolean(input.flags?.no_epg),
        catch_up_needed: Boolean(input.flags?.catch_up_needed),
        epg_needed: Boolean(input.flags?.epg_needed),
        file_missing: Boolean(input.flags?.file_missing),
        wrong_channel_name: Boolean(input.flags?.wrong_channel_name),
      },
      user_id: userId,
      actorUsername: session.username,
    });

    revalidateAdminDashboardCaches();
    revalidateTicketScopes();

    return { ok: true as const, id, channelCount: channels.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("createTicketForClient failed:", error);
    return { ok: false as const, error: "db", detail: message, status: 500 };
  }
}

export async function loadTicketChannelByNumberForClient(channelNumber: number, session: SessionPayload) {
  const canRead =
    session.type === "ROOT" ||
    session.type === "MNGR" ||
    session.type === "SRSLR" ||
    session.type === "RSLR";
  if (!canRead) return fail("forbidden", 403);
  if (!Number.isFinite(channelNumber) || channelNumber <= 0) return fail("bad_request", 400);

  const row = await findItvByChannelNumber(channelNumber);
  return { ok: true as const, channels: row ? [row as TicketChannelClientRow] : [] };
}

export async function loadTicketChannelsForClient(categoryId: number, session: SessionPayload) {
  const canRead =
    session.type === "ROOT" ||
    session.type === "MNGR" ||
    session.type === "SRSLR" ||
    session.type === "RSLR";
  if (!canRead) return fail("forbidden", 403);
  if (!Number.isFinite(categoryId) || categoryId <= 0) return fail("bad_request", 400);

  const channels = await listItvByGenreId(categoryId);
  return { ok: true as const, channels: channels as TicketChannelClientRow[] };
}

export async function loadTicketsTableForClient(
  session: SessionPayload,
  input: {
    q?: string;
    status?: string;
    priority?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
    ticketId?: number;
  },
) {
  const scope = scopeFromSession(session);
  if (!scope) return fail("forbidden", 403);

  const tableInput: TicketTablePagedInput = {
    scope,
    q: input.q,
    status: input.status,
    priority: input.priority,
    sort: input.sort,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 25,
  };

  try {
    const result = await listTicketsTablePaged(tableInput);
    let focusRow = null;
    const ticketId = Number(input.ticketId ?? 0);
    if (Number.isFinite(ticketId) && ticketId > 0) {
      const onPage = result.rows.some((r) => r.id === ticketId);
      if (!onPage) {
        focusRow = await getTicketTableRowById(tableInput, ticketId);
      }
    }
    return stripClientPayload({ ok: true as const, ...result, focusRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("loadTicketsTableForClient failed:", error);
    return fail(message, 500);
  }
}
