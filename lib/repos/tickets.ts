import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";
import { TICKET_TABLE_FROM_SQL, TICKET_TABLE_SELECT_SQL } from "@/lib/repos/ticketTableSql";
import {
  emitTicketComment,
  emitTicketCreated,
  emitTicketDeleted,
  emitTicketUpdated,
} from "@/lib/realtime/emit";
import {
  clearTicketAlertDismissalsForTicket,
  dismissedTicketExclusionClause,
} from "@/lib/repos/ticketAlertDismissals";
import {
  deleteTicketChannelLinks,
  insertTicketChannelLinks,
  resolveTicketsChannelDisplay,
} from "@/lib/repos/ticketChannels";

export type TvGenreRow = { id: number; title: string };

export type ItvChannelRow = { id: number; name: string; number: number; tv_genre_id: number };

/** Stalker `tv_genre` — same query as PHP admin Tickets. */
export async function listTvGenres(): Promise<TvGenreRow[]> {
  const pool = getStalkerPool();
  if (!pool) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id, title FROM tv_genre ORDER BY id ASC`);
  return rows.map((r) => ({ id: Number(r.id), title: String(r.title ?? "") }));
}

export async function listItvByGenreId(tvGenreId: number): Promise<ItvChannelRow[]> {
  const pool = getStalkerPool();
  if (!pool) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, number, tv_genre_id FROM itv WHERE tv_genre_id = :gid ORDER BY id ASC`,
    { gid: tvGenreId },
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name ?? ""),
    number: Number(r.number ?? 0),
    tv_genre_id: Number(r.tv_genre_id ?? 0),
  }));
}

export async function findItvByChannelNumber(channelNumber: number): Promise<ItvChannelRow | null> {
  const pool = getStalkerPool();
  if (!pool) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, number, tv_genre_id FROM itv WHERE number = :n LIMIT 1`,
    { n: channelNumber },
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    number: Number(r.number ?? 0),
    tv_genre_id: Number(r.tv_genre_id ?? 0),
  };
}

export type AdminTicketRow = {
  id: number;
  subject: string;
  status_id: number;
  priority_id: number;
  category_id: number;
  updated_at: number;
  user_id: number;
  agent_id: number;
  categoryTitle: string;
};

function priorityLabel(p: number) {
  if (p === 1) return "High";
  if (p === 2) return "Normal";
  if (p === 3) return "Low";
  return String(p);
}

/** Matches PHP `getStatusFromID` wording (plain text). */
function statusLabel(s: number) {
  if (s === 1) return "In progress";
  if (s === 2) return "Fixed";
  if (s === 3) return "Re-opened";
  return String(s);
}

export { priorityLabel, statusLabel };

/** PHP `Tickets::dashboard` — global counts (not scoped to portal user). */
export type TicketDashboardCategoryRow = {
  categoryId: number;
  open: number;
  close: number;
  categoryTitle: string;
};

export type TicketDashboardStats = {
  openTickets: number;
  closeTickets: number;
  totalTickets: number;
  byCategory: TicketDashboardCategoryRow[];
};

export type TicketDashboardTableRow = AdminTicketRow & {
  created_at: number;
  channel_number: number;
  channel_id: number;
  channelName: string;
  content: string;
  creatorUsername: string;
  agentUsername: string;
  latestComment: string;
  latestCommentUser: string;
  commentCount: number;
};

export async function getTicketDashboardStats(): Promise<TicketDashboardStats> {
  const pool = getBillingPool();
  const [sumRes, catRes] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END), 0) AS close_n,
        COALESCE(SUM(CASE WHEN status_id <> 2 THEN 1 ELSE 0 END), 0) AS open_n
       FROM tickets`,
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(category_id, 0) AS cid,
              COALESCE(SUM(CASE WHEN status_id IN (1, 3) THEN 1 ELSE 0 END), 0) AS open_n,
              COALESCE(SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END), 0) AS close_n
       FROM tickets
       GROUP BY COALESCE(category_id, 0)
       ORDER BY cid ASC`,
    ),
  ]);
  const sumRows = sumRes[0];
  const catRows = catRes[0];
  const s0 = sumRows[0];
  const openTickets = Number(s0?.open_n ?? 0);
  const closeTickets = Number(s0?.close_n ?? 0);
  const genres = await listTvGenres();
  const genreMap = new Map(genres.map((g) => [g.id, g.title]));
  const byCategory: TicketDashboardCategoryRow[] = catRows.map((r) => {
    const categoryId = Number(r.cid ?? 0);
    return {
      categoryId,
      open: Number(r.open_n ?? 0),
      close: Number(r.close_n ?? 0),
      categoryTitle: genreMap.get(categoryId) ?? (categoryId === 0 ? "—" : `Category #${categoryId}`),
    };
  });
  return {
    openTickets,
    closeTickets,
    totalTickets: openTickets + closeTickets,
    byCategory,
  };
}

export async function listTicketsTableRows(limit = 500): Promise<TicketDashboardTableRow[]> {
  return listTicketsTableRowsInternal(limit);
}

async function listTicketsTableRowsInternal(
  limit: number,
  whereClause?: string,
  params: Array<number | string> = [],
): Promise<TicketDashboardTableRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(2000, Math.floor(limit)));
  const whereSql = whereClause ? `WHERE ${whereClause}` : "";
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${TICKET_TABLE_SELECT_SQL} ${TICKET_TABLE_FROM_SQL} ${whereSql} ORDER BY t.updated_at DESC, t.id DESC LIMIT ${lim}`,
    params,
  );
  const genres = await listTvGenres();
  const genreMap = new Map(genres.map((g) => [g.id, g.title]));
  const channelDisplay = await resolveTicketsChannelDisplay(
    rows.map((r) => ({
      id: Number(r.id),
      channel_id: Number(r.channel_id ?? 0),
      channel_number: Number(r.channel_number ?? 0),
    })),
  );
  return rows.map((r) => {
    const categoryId = Number(r.category_id ?? 0);
    const ticketId = Number(r.id);
    const display = channelDisplay.get(ticketId);
    const channelId = display?.primaryChannelId ?? Number(r.channel_id ?? 0);
    return {
      id: ticketId,
      subject: String(r.subject ?? ""),
      content: String(r.content ?? ""),
      status_id: Number(r.status_id ?? 0),
      priority_id: Number(r.priority_id ?? 0),
      category_id: categoryId,
      channel_number: display?.primaryChannelNumber ?? Number(r.channel_number ?? 0),
      channel_id: channelId,
      channelName: display?.channelName ?? "",
      created_at: Number(r.created_at ?? 0),
      updated_at: Number(r.updated_at ?? 0),
      user_id: Number(r.user_id ?? 0),
      agent_id: Number(r.agent_id ?? 0),
      creatorUsername: String(r.creator_username ?? "admin"),
      agentUsername: String(r.agent_username ?? "admin"),
      latestComment: String(r.latest_comment ?? ""),
      latestCommentUser: String(r.latest_comment_user ?? ""),
      commentCount: Number(r.comment_count ?? 0),
      categoryTitle: genreMap.get(categoryId) ?? (categoryId === 0 ? "—" : `Category #${categoryId}`),
    };
  });
}

export async function listTicketsTableRowsForPortalUser(
  username: string,
  role: PortalTicketRole,
  limit = 500,
): Promise<TicketDashboardTableRow[]> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return [];
  const owner = portalTicketOwnerWhere(scope, "t.user_id");
  return listTicketsTableRowsInternal(limit, owner.sql, owner.params);
}

/** Active = not completed (PHP: status_id <> '2'). Completed = status_id = 2. */
/** Open = `status_id <> 2` (same rule as `listTicketsForAdmin("active")`). */
export async function countOpenTicketsForAdmin(): Promise<number> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM tickets WHERE status_id <> 2`);
  return Number(rows[0]?.n ?? 0);
}

/**
 * Full ticket counts for admin dashboard (every row in `tickets`).
 * Billing `status_id`: 1 In progress, 2 Fixed, 3 Re-opened; anything else counts as Other.
 */
export type AdminTicketStatusOverview = {
  grandTotal: number;
  inProgress: number;
  fixed: number;
  reopened: number;
  /** Rows whose `status_id` is not 1, 2, or 3. */
  other: number;
};

export async function getAdminTicketStatusOverview(): Promise<AdminTicketStatusOverview> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS grand_total,
       COALESCE(SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END), 0) AS in_progress,
       COALESCE(SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END), 0) AS fixed,
       COALESCE(SUM(CASE WHEN status_id = 3 THEN 1 ELSE 0 END), 0) AS reopened,
       COALESCE(SUM(CASE WHEN status_id NOT IN (1, 2, 3) THEN 1 ELSE 0 END), 0) AS other
     FROM tickets`,
  );
  const r = rows[0];
  return {
    grandTotal: Number(r?.grand_total ?? 0),
    inProgress: Number(r?.in_progress ?? 0),
    fixed: Number(r?.fixed ?? 0),
    reopened: Number(r?.reopened ?? 0),
    other: Number(r?.other ?? 0),
  };
}

export async function getTicketStatusOverviewForPortalUser(
  username: string,
  role: PortalTicketRole,
): Promise<AdminTicketStatusOverview> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return { inProgress: 0, fixed: 0, reopened: 0, other: 0, grandTotal: 0 };
  const pool = getBillingPool();
  const owner = portalTicketOwnerWhere(scope);
  const agg = `COALESCE(SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END), 0) AS in_progress,
         COALESCE(SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END), 0) AS fixed,
         COALESCE(SUM(CASE WHEN status_id = 3 THEN 1 ELSE 0 END), 0) AS reopened,
         COALESCE(SUM(CASE WHEN status_id NOT IN (1, 2, 3) THEN 1 ELSE 0 END), 0) AS other`;
  const sql = `SELECT ${agg} FROM tickets WHERE ${owner.sql}`;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, owner.params);
  const r = rows[0];
  const inProgress = Number(r?.in_progress ?? 0);
  const fixed = Number(r?.fixed ?? 0);
  const reopened = Number(r?.reopened ?? 0);
  const other = Number(r?.other ?? 0);
  const grandTotal = inProgress + fixed + reopened + other;
  return { inProgress, fixed, reopened, other, grandTotal };
}

/** Scoped like `listTicketsForPortalUser` (show-all vs `user_id` owner). */
export async function countOpenTicketsForPortalUser(username: string, role: PortalTicketRole): Promise<number> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return 0;
  const pool = getBillingPool();
  const owner = portalTicketOwnerWhere(scope);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM tickets WHERE ${owner.sql} AND status_id <> 2`,
    owner.params,
  );
  return Number(rows[0]?.n ?? 0);
}

/** Open tickets for the header bell — excludes tickets you submitted yourself. */
export async function countOpenTicketsForNotification(input: {
  type: string;
  username: string;
}): Promise<number> {
  if (input.type === "ROOT") {
    const pool = getBillingPool();
    const base = `status_id <> 2 AND user_id > 0`;
    const excl = await dismissedTicketExclusionClause(input.username);
    const sql = excl
      ? `SELECT COUNT(*) AS n FROM tickets WHERE ${base} AND ${excl.sql}`
      : `SELECT COUNT(*) AS n FROM tickets WHERE ${base}`;
    const params = excl ? excl.params : [];
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return Number(rows[0]?.n ?? 0);
  }
  if (input.type === "MNGR" || input.type === "RSLR" || input.type === "SRSLR") {
    const role: PortalTicketRole =
      input.type === "MNGR" ? "MNGR" : input.type === "SRSLR" ? "SRSLR" : "RSLR";
    return countOpenPortalNotificationTickets(input.username, role);
  }
  return 0;
}

async function countOpenPortalNotificationTickets(username: string, role: PortalTicketRole): Promise<number> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return 0;
  const pool = getBillingPool();
  const { where, params } = portalNotificationWhere(scope);
  const excl = await dismissedTicketExclusionClause(username);
  const sql = excl ? `SELECT COUNT(*) AS n FROM tickets WHERE ${where} AND ${excl.sql}` : `SELECT COUNT(*) AS n FROM tickets WHERE ${where}`;
  const allParams = excl ? [...params, ...excl.params] : params;
  const [rows] = await pool.execute<RowDataPacket[]>(sql, allParams);
  return Number(rows[0]?.n ?? 0);
}

/** Portal bell — own open tickets assigned to an admin agent. */
function portalNotificationWhere(scope: PortalTicketScope): { where: string; params: number[] } {
  return {
    where: `user_id = ? AND status_id <> 2 AND agent_id > 0`,
    params: [scope.billingUserId],
  };
}

/** Bell preview list — excludes your own submissions (same rules as notification count). */
export async function listRecentOpenTicketsForNotification(
  input: { type: string; username: string },
  limit: number,
): Promise<AdminTicketRow[]> {
  if (input.type === "ROOT") {
    const pool = getBillingPool();
    const lim = Math.max(1, Math.min(15, Math.floor(limit)));
    const base = `status_id <> 2 AND user_id > 0`;
    const excl = await dismissedTicketExclusionClause(input.username);
    const sql = excl
      ? `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
         FROM tickets WHERE ${base} AND ${excl.sql} ORDER BY updated_at DESC LIMIT ${lim}`
      : `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
         FROM tickets WHERE ${base} ORDER BY updated_at DESC LIMIT ${lim}`;
    const params = excl ? excl.params : [];
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return mapRowsToAdminTickets(rows);
  }
  if (input.type === "MNGR" || input.type === "RSLR" || input.type === "SRSLR") {
    const role: PortalTicketRole =
      input.type === "MNGR" ? "MNGR" : input.type === "SRSLR" ? "SRSLR" : "RSLR";
    return listRecentPortalNotificationTickets(input.username, role, limit);
  }
  return [];
}

async function listRecentPortalNotificationTickets(
  username: string,
  role: PortalTicketRole,
  limit: number,
): Promise<AdminTicketRow[]> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return [];
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(15, Math.floor(limit)));
  const { where, params } = portalNotificationWhere(scope);
  const excl = await dismissedTicketExclusionClause(username);
  const sql = excl
    ? `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
       FROM tickets WHERE ${where} AND ${excl.sql} ORDER BY updated_at DESC LIMIT ${lim}`
    : `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
       FROM tickets WHERE ${where} ORDER BY updated_at DESC LIMIT ${lim}`;
  const allParams = excl ? [...params, ...excl.params] : params;
  const [rows] = await pool.query<RowDataPacket[]>(sql, allParams);
  return mapRowsToAdminTickets(rows);
}

/** Open tickets only, newest first — same scope rules as `listTicketsForPortalUser` ("active"). */
export async function listRecentOpenTicketsForPortalUser(
  username: string,
  role: PortalTicketRole,
  limit: number,
): Promise<AdminTicketRow[]> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return [];
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(15, Math.floor(limit)));
  const owner = portalTicketOwnerWhere(scope);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets WHERE ${owner.sql} AND status_id <> 2 ORDER BY updated_at DESC LIMIT ${lim}`,
    owner.params,
  );
  return mapRowsToAdminTickets(rows);
}

async function mapRowsToAdminTickets(rows: RowDataPacket[]): Promise<AdminTicketRow[]> {
  const genres = await listTvGenres();
  const genreMap = new Map(genres.map((g) => [g.id, g.title]));
  return rows.map((r) => ({
    id: Number(r.id),
    subject: String(r.subject ?? ""),
    status_id: Number(r.status_id ?? 0),
    priority_id: Number(r.priority_id ?? 0),
    category_id: Number(r.category_id ?? 0),
    updated_at: Number(r.updated_at ?? 0),
    user_id: Number(r.user_id ?? 0),
    agent_id: Number(r.agent_id ?? 0),
    categoryTitle: genreMap.get(Number(r.category_id ?? 0)) ?? "—",
  }));
}

export type AdminActiveTicketStatusFilter = 1 | 3 | "other";

export async function listTicketsForAdmin(
  filter: "active" | "completed",
  activeStatus?: AdminActiveTicketStatusFilter,
): Promise<AdminTicketRow[]> {
  const pool = getBillingPool();
  if (filter === "completed") {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
       FROM tickets WHERE status_id = 2 ORDER BY updated_at DESC`,
    );
    return mapRowsToAdminTickets(rows);
  }
  let where = `status_id <> 2`;
  if (activeStatus === 1) where += ` AND status_id = 1`;
  else if (activeStatus === 3) where += ` AND status_id = 3`;
  else if (activeStatus === "other") where += ` AND status_id NOT IN (1, 2, 3)`;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets WHERE ${where} ORDER BY updated_at DESC`,
  );
  return mapRowsToAdminTickets(rows);
}

/** Open tickets only, newest first — bounded for dashboard widgets. */
export async function listRecentOpenTicketsForAdmin(limit: number): Promise<AdminTicketRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets WHERE status_id <> 2 ORDER BY updated_at DESC LIMIT ${lim}`,
  );
  return mapRowsToAdminTickets(rows);
}

/** Any status, newest activity first — bounded for dashboard “recent” lists. */
export async function listRecentTicketsForAdmin(limit: number): Promise<AdminTicketRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets ORDER BY updated_at DESC
     LIMIT ${lim}`,
  );
  return mapRowsToAdminTickets(rows);
}

/** Any status, newest first — scoped to portal ticket visibility (manager / dealer). */
export async function listRecentTicketsForPortalUser(
  username: string,
  role: PortalTicketRole,
  limit: number,
): Promise<AdminTicketRow[]> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return [];
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const owner = portalTicketOwnerWhere(scope);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets WHERE ${owner.sql} ORDER BY updated_at DESC LIMIT ${lim}`,
    owner.params,
  );
  return mapRowsToAdminTickets(rows);
}

export type CreateTicketInput = {
  subject: string;
  descriptionHtml: string;
  priority_id: number;
  category_id: number;
  /** All channels owned by this ticket (first is also stored on `tickets.channel_*`). */
  channels: Array<{ channel_id: number; channel_number: number }>;
  flags: {
    no_audio: boolean;
    no_video: boolean;
    stream_error: boolean;
    no_epg: boolean;
    catch_up_needed: boolean;
    epg_needed: boolean;
    file_missing: boolean;
    wrong_channel_name: boolean;
  };
  user_id: number;
  /** Who created the ticket (for realtime + notification badge). */
  actorUsername?: string;
};

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, " ");
}

function flattenWhitespace(s: string) {
  return s.replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim();
}

export async function insertTicket(input: CreateTicketInput): Promise<number> {
  const channels = input.channels.filter(
    (ch) => Number.isFinite(ch.channel_id) && ch.channel_id > 0 && Number.isFinite(ch.channel_number) && ch.channel_number > 0,
  );
  const primary = channels[0] ?? { channel_id: 0, channel_number: 0 };
  const pool = getBillingPool();
  const now = Math.floor(Date.now() / 1000);
  const plain = flattenWhitespace(stripTags(input.descriptionHtml));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO tickets (
        subject, html, content, status_id, user_id, agent_id, created_at, updated_at,
        priority_id, channel_number, category_id, channel_id,
        no_audio, no_video, stream_error, no_epg, catch_up_needed, epg_needed, file_missing, wrong_channel_name
      ) VALUES (
        :subject, :html, :content, 1, :user_id, 0, :created_at, :updated_at,
        :priority_id, :channel_number, :category_id, :channel_id,
        :no_audio, :no_video, :stream_error, :no_epg, :catch_up_needed, :epg_needed, :file_missing, :wrong_channel_name
      )`,
      {
        subject: input.subject,
        html: input.descriptionHtml,
        content: plain,
        user_id: input.user_id,
        created_at: now,
        updated_at: now,
        priority_id: input.priority_id,
        channel_number: primary.channel_number,
        category_id: input.category_id,
        channel_id: primary.channel_id,
        no_audio: input.flags.no_audio ? 1 : 0,
        no_video: input.flags.no_video ? 1 : 0,
        stream_error: input.flags.stream_error ? 1 : 0,
        no_epg: input.flags.no_epg ? 1 : 0,
        catch_up_needed: input.flags.catch_up_needed ? 1 : 0,
        epg_needed: input.flags.epg_needed ? 1 : 0,
        file_missing: input.flags.file_missing ? 1 : 0,
        wrong_channel_name: input.flags.wrong_channel_name ? 1 : 0,
      },
    );
    const id = Number(res.insertId);
    if (channels.length > 0) {
      await insertTicketChannelLinks(conn, id, channels);
    }
    await conn.commit();
    emitTicketCreated({
      ticketId: id,
      subject: input.subject,
      statusId: 1,
      priorityId: input.priority_id,
      userId: input.user_id,
      actorUsername: input.actorUsername,
    });
    return id;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Portal parity: PHP sets `agent_id` to the portal user’s `users.id` (manager `get_user_id`, dealer `dealer_id`). Admin keeps 0. */
export async function markTicketCompleted(
  ticketId: number,
  agentBillingUserId = 0,
  actorUsername?: string,
): Promise<boolean> {
  const pool = getBillingPool();
  const now = Math.floor(Date.now() / 1000);
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE tickets SET status_id = 2, updated_at = :t, agent_id = :aid WHERE id = :id`,
    { t: now, id: ticketId, aid: agentBillingUserId },
  );
  if (res.affectedRows > 0) {
    emitTicketUpdated({ ticketId, statusId: 2, actorUsername });
  }
  return res.affectedRows > 0;
}

export type PortalTicketRole = "MNGR" | "SRSLR" | "RSLR";

export function portalTicketRoleFromSessionType(type: string): PortalTicketRole | null {
  if (type === "MNGR" || type === "SRSLR" || type === "RSLR") return type;
  return null;
}

export type PortalTicketScope = {
  billingUserId: number;
  canCreateTickets: boolean;
};

/** Portal staff see only tickets they filed (`user_id` = billing `users.id`). */
export function portalTicketOwnerWhere(
  scope: PortalTicketScope,
  column = "user_id",
): { sql: string; params: number[] } {
  return {
    sql: `${column} = ?`,
    params: [scope.billingUserId],
  };
}

export async function getPortalTicketScope(
  username: string,
  role: PortalTicketRole,
): Promise<PortalTicketScope | null> {
  const pool = getBillingPool();
  const u = username.trim();
  const type = role === "MNGR" ? "MNGR" : role === "SRSLR" ? "SRSLR" : "RSLR";
  const [idRows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ? AND type = ? LIMIT 1",
    [u, type],
  );
  const billingUserId = Number(idRows[0]?.id ?? 0);
  if (!billingUserId) return null;

  const { isUserTicketsCreateEnabled } = await import("@/lib/tickets/ticketCreatePolicy");
  const canCreateTickets = await isUserTicketsCreateEnabled(u, role);
  return { billingUserId, canCreateTickets };
}

export async function listTicketsForPortalUser(
  username: string,
  role: PortalTicketRole,
  filter: "active" | "completed",
  activeStatus?: AdminActiveTicketStatusFilter,
): Promise<AdminTicketRow[]> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return [];
  const pool = getBillingPool();
  let statusSql = filter === "completed" ? "status_id = 2" : "status_id <> 2";
  if (filter === "active" && activeStatus === 1) statusSql += ` AND status_id = 1`;
  else if (filter === "active" && activeStatus === 3) statusSql += ` AND status_id = 3`;
  else if (filter === "active" && activeStatus === "other") statusSql += ` AND status_id NOT IN (1, 2, 3)`;
  const owner = portalTicketOwnerWhere(scope);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, subject, status_id, priority_id, category_id, updated_at, user_id, agent_id
     FROM tickets WHERE ${owner.sql} AND ${statusSql} ORDER BY updated_at DESC`,
    owner.params,
  );
  const genres = await listTvGenres();
  const genreMap = new Map(genres.map((g) => [g.id, g.title]));
  return rows.map((r) => ({
    id: Number(r.id),
    subject: String(r.subject ?? ""),
    status_id: Number(r.status_id ?? 0),
    priority_id: Number(r.priority_id ?? 0),
    category_id: Number(r.category_id ?? 0),
    updated_at: Number(r.updated_at ?? 0),
    user_id: Number(r.user_id ?? 0),
    agent_id: Number(r.agent_id ?? 0),
    categoryTitle: genreMap.get(Number(r.category_id ?? 0)) ?? "—",
  }));
}

/** Admin header bell — portal-submitted open tickets only. */
export async function assertAdminTicketNotificationAccess(ticketId: number): Promise<boolean> {
  const t = await getTicketById(ticketId);
  if (!t) return false;
  if (t.status_id === 2) return false;
  return t.user_id > 0;
}

export async function assertPortalTicketAccess(username: string, role: PortalTicketRole, ticketId: number): Promise<boolean> {
  const scope = await getPortalTicketScope(username, role);
  if (!scope) return false;
  const t = await getTicketById(ticketId);
  if (!t) return false;
  return t.user_id === scope.billingUserId;
}

/** One-time cleanup for legacy `user_id = 0` rows (admin-created tickets). */
export async function deleteLegacyAdminCreatedTickets(): Promise<number> {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [idRows] = await conn.execute<RowDataPacket[]>("SELECT id FROM tickets WHERE user_id = 0");
    const ids = idRows.map((r) => Number(r.id)).filter((id) => id > 0);
    if (ids.length === 0) {
      await conn.commit();
      return 0;
    }
    const ph = ids.map(() => "?").join(",");
    await conn.execute(`DELETE FROM ticket_channels WHERE ticket_id IN (${ph})`, ids);
    await conn.execute(`DELETE FROM tickets_comments WHERE ticket_id IN (${ph})`, ids);
    await conn.execute(`DELETE FROM ticket_alert_dismissals WHERE ticket_id IN (${ph})`, ids);
    const [res] = await conn.execute<ResultSetHeader>(`DELETE FROM tickets WHERE id IN (${ph})`, ids);
    await conn.commit();
    return res.affectedRows;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export type TicketDetail = {
  id: number;
  subject: string;
  html: string;
  status_id: number;
  priority_id: number;
  category_id: number;
  channel_number: number;
  channel_id: number;
  created_at: number;
  updated_at: number;
  user_id: number;
  agent_id: number;
  no_audio: number;
  no_video: number;
  stream_error: number;
  no_epg: number;
  catch_up_needed: number;
  epg_needed: number;
  file_missing: number;
  wrong_channel_name: number;
};

export type TicketCommentRow = {
  id: number;
  html: string;
  user_id: number;
  created_at: number;
  updated_at: number;
};

/** Same option order as PHP `listOptions`. */
export function ticketProblemSummary(t: TicketDetail): string {
  const parts: string[] = [];
  if (t.no_video) parts.push("No Video");
  if (t.no_audio) parts.push("No Audio");
  if (t.stream_error) parts.push("Stream Error");
  if (t.no_epg) parts.push("No EPG");
  if (t.catch_up_needed) parts.push("Catch Up Needed");
  if (t.epg_needed) parts.push("EPG needed");
  if (t.file_missing) parts.push("File Missing On Catch Up");
  if (t.wrong_channel_name) parts.push("Wrong Channel Name");
  return parts.length ? parts.join(", ") : "—";
}

export async function getTicketOwnerUsername(userId: number): Promise<string> {
  if (userId === 0) return "admin";
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT username FROM users WHERE id = :id LIMIT 1", { id: userId });
  const u = rows[0]?.username;
  return u != null && String(u) !== "" ? String(u) : "admin";
}

export async function getTicketOwnerUsernamesByIds(userIds: number[]): Promise<Map<number, string>> {
  const ids = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0).map((id) => Math.floor(id)))];
  const map = new Map<number, string>();
  if (!ids.length) return map;
  const pool = getBillingPool();
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, username FROM users WHERE id IN (${placeholders})`,
    ids,
  );
  for (const r of rows) {
    const id = Number(r.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    const username = String(r.username ?? "").trim();
    if (username) map.set(id, username);
  }
  return map;
}

export async function getTicketById(ticketId: number): Promise<TicketDetail | null> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, subject, html, status_id, priority_id, category_id, channel_number, channel_id,
            created_at, updated_at, user_id, agent_id,
            no_audio, no_video, stream_error, no_epg, catch_up_needed, epg_needed, file_missing, wrong_channel_name
     FROM tickets WHERE id = :id LIMIT 1`,
    { id: ticketId },
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    subject: String(r.subject ?? ""),
    html: String(r.html ?? ""),
    status_id: Number(r.status_id ?? 0),
    priority_id: Number(r.priority_id ?? 0),
    category_id: Number(r.category_id ?? 0),
    channel_number: Number(r.channel_number ?? 0),
    channel_id: Number(r.channel_id ?? 0),
    created_at: Number(r.created_at ?? 0),
    updated_at: Number(r.updated_at ?? 0),
    user_id: Number(r.user_id ?? 0),
    agent_id: Number(r.agent_id ?? 0),
    no_audio: Number(r.no_audio ?? 0),
    no_video: Number(r.no_video ?? 0),
    stream_error: Number(r.stream_error ?? 0),
    no_epg: Number(r.no_epg ?? 0),
    catch_up_needed: Number(r.catch_up_needed ?? 0),
    epg_needed: Number(r.epg_needed ?? 0),
    file_missing: Number(r.file_missing ?? 0),
    wrong_channel_name: Number(r.wrong_channel_name ?? 0),
  };
}

export async function listTicketComments(ticketId: number): Promise<TicketCommentRow[]> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, html, user_id, created_at, updated_at FROM tickets_comments WHERE ticket_id = :tid ORDER BY created_at ASC`,
    { tid: ticketId },
  );
  return rows.map((r) => ({
    id: Number(r.id),
    html: String(r.html ?? ""),
    user_id: Number(r.user_id ?? 0),
    created_at: Number(r.created_at ?? 0),
    updated_at: Number(r.updated_at ?? 0),
  }));
}

export async function insertTicketComment(
  ticketId: number,
  commentHtml: string,
  commentUserId = 0,
  actorUsername?: string,
): Promise<void> {
  const pool = getBillingPool();
  const now = Math.floor(Date.now() / 1000);
  const plain = flattenWhitespace(stripTags(commentHtml));
  await pool.execute(
    `INSERT INTO tickets_comments (ticket_id, content, html, user_id, created_at, updated_at)
     VALUES (:tid, :content, :html, :uid, :t, :t)`,
    { tid: ticketId, content: plain, html: commentHtml, t: now, uid: commentUserId },
  );
  emitTicketComment({ ticketId, actorUsername });
}

export async function reopenTicket(
  ticketId: number,
  agentBillingUserId = 0,
  actorUsername?: string,
): Promise<boolean> {
  const pool = getBillingPool();
  const now = Math.floor(Date.now() / 1000);
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE tickets SET status_id = 3, updated_at = :t, agent_id = :aid WHERE id = :id`,
    { t: now, id: ticketId, aid: agentBillingUserId },
  );
  if (res.affectedRows > 0) {
    await clearTicketAlertDismissalsForTicket(ticketId);
    emitTicketUpdated({ ticketId, statusId: 3, actorUsername });
  }
  return res.affectedRows > 0;
}

export async function updateTicketPriorityAndStatus(
  ticketId: number,
  priority_id: number,
  status_id: number,
  agentBillingUserId = 0,
  actorUsername?: string,
): Promise<boolean> {
  if (priority_id < 1 || priority_id > 3 || status_id < 1 || status_id > 3) return false;
  const pool = getBillingPool();
  const now = Math.floor(Date.now() / 1000);
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE tickets SET priority_id = :p, status_id = :s, updated_at = :t, agent_id = :aid WHERE id = :id`,
    { p: priority_id, s: status_id, t: now, id: ticketId, aid: agentBillingUserId },
  );
  if (res.affectedRows > 0) {
    if (status_id !== 2) {
      await clearTicketAlertDismissalsForTicket(ticketId);
    }
    emitTicketUpdated({ ticketId, statusId: status_id, priorityId: priority_id, actorUsername });
  }
  return res.affectedRows > 0;
}

export async function deleteTicketById(ticketId: number, actorUsername?: string): Promise<boolean> {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await deleteTicketChannelLinks(conn, ticketId);
    await conn.execute("DELETE FROM tickets_comments WHERE ticket_id = :id", { id: ticketId });
    const [res] = await conn.execute<ResultSetHeader>("DELETE FROM tickets WHERE id = :id", { id: ticketId });
    await conn.commit();
    if (res.affectedRows > 0) {
      emitTicketDeleted({ ticketId, actorUsername });
    }
    return res.affectedRows > 0;
  } catch {
    await conn.rollback();
    return false;
  } finally {
    conn.release();
  }
}

export type TicketsDbHealth = {
  billing: {
    ticketsTable: boolean;
    commentsTable: boolean;
    ticketRows: number;
    commentRows: number;
    orphanComments: number;
    badStatusRows: number;
    badPriorityRows: number;
  };
  stalker: {
    connected: boolean;
    tvGenreTable: boolean;
    itvTable: boolean;
    tvGenreRows: number;
    itvRows: number;
  };
};

export async function getTicketsDbHealth(): Promise<TicketsDbHealth> {
  const billing = getBillingPool();
  const stalker = getStalkerPool();

  const b = {
    ticketsTable: false,
    commentsTable: false,
    ticketRows: 0,
    commentRows: 0,
    orphanComments: 0,
    badStatusRows: 0,
    badPriorityRows: 0,
  };

  try {
    await billing.execute("SELECT 1 FROM tickets LIMIT 1");
    b.ticketsTable = true;
    const [rows] = await billing.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS ticket_rows,
        COALESCE(SUM(CASE WHEN status_id NOT IN (1,2,3) THEN 1 ELSE 0 END),0) AS bad_status,
        COALESCE(SUM(CASE WHEN priority_id NOT IN (1,2,3) THEN 1 ELSE 0 END),0) AS bad_priority
       FROM tickets`,
    );
    b.ticketRows = Number(rows[0]?.ticket_rows ?? 0);
    b.badStatusRows = Number(rows[0]?.bad_status ?? 0);
    b.badPriorityRows = Number(rows[0]?.bad_priority ?? 0);
    const [legacyRows] = await billing.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS legacy_admin_tickets FROM tickets WHERE user_id = 0",
    );
    if (Number(legacyRows[0]?.legacy_admin_tickets ?? 0) > 0) {
      await deleteLegacyAdminCreatedTickets();
    }
  } catch {}

  try {
    await billing.execute("SELECT 1 FROM tickets_comments LIMIT 1");
    b.commentsTable = true;
    const [cRows] = await billing.execute<RowDataPacket[]>("SELECT COUNT(*) AS comment_rows FROM tickets_comments");
    b.commentRows = Number(cRows[0]?.comment_rows ?? 0);
    const [oRows] = await billing.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS orphan_rows
       FROM tickets_comments tc
       LEFT JOIN tickets t ON t.id = tc.ticket_id
       WHERE t.id IS NULL`,
    );
    b.orphanComments = Number(oRows[0]?.orphan_rows ?? 0);
  } catch {}

  const s = {
    connected: !!stalker,
    tvGenreTable: false,
    itvTable: false,
    tvGenreRows: 0,
    itvRows: 0,
  };
  if (stalker) {
    try {
      await stalker.execute("SELECT 1 FROM tv_genre LIMIT 1");
      s.tvGenreTable = true;
      const [gRows] = await stalker.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM tv_genre");
      s.tvGenreRows = Number(gRows[0]?.c ?? 0);
    } catch {}
    try {
      await stalker.execute("SELECT 1 FROM itv LIMIT 1");
      s.itvTable = true;
      const [iRows] = await stalker.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM itv");
      s.itvRows = Number(iRows[0]?.c ?? 0);
    } catch {}
  }

  return { billing: b, stalker: s };
}
