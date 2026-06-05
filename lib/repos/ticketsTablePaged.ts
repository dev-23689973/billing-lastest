import type { RowDataPacket } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";
import {
  getPortalTicketScope,
  listTvGenres,
  portalTicketOwnerWhere,
  type PortalTicketRole,
  type TicketDashboardTableRow,
} from "@/lib/repos/tickets";
import {
  TICKET_TABLE_FROM_SQL,
  TICKET_TABLE_FROM_SQL_MINIMAL,
  TICKET_TABLE_SELECT_SQL,
  TICKET_TABLE_SELECT_SQL_MINIMAL,
} from "@/lib/repos/ticketTableSql";
import { resolveTicketsChannelDisplay } from "@/lib/repos/ticketChannels";

export type TicketTableSort =
  | "updated_desc"
  | "updated_asc"
  | "id_desc"
  | "id_asc"
  | "created_desc"
  | "created_asc"
  | "priority_desc"
  | "priority_asc"
  | "status_desc"
  | "status_asc"
  | "subject_asc"
  | "subject_desc"
  | "category_asc"
  | "category_desc"
  | "comments_desc"
  | "comments_asc";

const SORT_ORDER: Record<TicketTableSort, string> = {
  id_asc: "t.id ASC",
  id_desc: "t.id DESC",
  created_asc: "t.created_at ASC, t.id ASC",
  created_desc: "t.created_at DESC, t.id DESC",
  updated_asc: "t.updated_at ASC, t.id ASC",
  updated_desc: "t.updated_at DESC, t.id DESC",
  priority_desc: "t.priority_id ASC, t.updated_at DESC, t.id DESC",
  priority_asc: "t.priority_id DESC, t.updated_at DESC, t.id DESC",
  status_asc: "t.status_id ASC, t.updated_at DESC, t.id DESC",
  status_desc: "t.status_id DESC, t.updated_at DESC, t.id DESC",
  subject_asc: "t.subject ASC, t.updated_at DESC, t.id DESC",
  subject_desc: "t.subject DESC, t.updated_at DESC, t.id DESC",
  category_asc: "t.category_id ASC, t.updated_at DESC, t.id DESC",
  category_desc: "t.category_id DESC, t.updated_at DESC, t.id DESC",
  comments_asc: "comment_count ASC, t.updated_at DESC, t.id DESC",
  comments_desc: "comment_count DESC, t.updated_at DESC, t.id DESC",
};

export function parseTicketTableSort(raw: string | undefined): TicketTableSort {
  const s = String(raw ?? "").trim() as TicketTableSort;
  return s in SORT_ORDER ? s : "updated_desc";
}

export type TicketTablePagedInput = {
  scope: "admin" | { username: string; role: PortalTicketRole };
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type TicketTablePagedResult = {
  rows: TicketDashboardTableRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function clampPageSize(n: number) {
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function clampPage(n: number) {
  return Math.max(1, Math.floor(n));
}

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

function buildWhere(input: TicketTablePagedInput): { sql: string; params: Array<number | string> } {
  const parts: string[] = [];
  const params: Array<number | string> = [];

  const status = String(input.status ?? "").trim();
  if (status === "other") {
    parts.push("t.status_id NOT IN (1, 2, 3)");
  } else if (status && /^[123]$/.test(status)) {
    parts.push("t.status_id = ?");
    params.push(Number(status));
  }

  const priority = String(input.priority ?? "").trim();
  if (priority && /^[123]$/.test(priority)) {
    parts.push("t.priority_id = ?");
    params.push(Number(priority));
  }

  const q = String(input.q ?? "").trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const idNum = Number(q);
    if (Number.isFinite(idNum) && idNum > 0 && String(idNum) === q) {
      parts.push(
        `(t.id = ? OR t.subject LIKE ? OR t.content LIKE ? OR owner.username LIKE ? OR agent.username LIKE ? OR lc.content LIKE ?)`,
      );
      params.push(idNum, like, like, like, like, like);
    } else {
      parts.push(
        `(t.subject LIKE ? OR t.content LIKE ? OR owner.username LIKE ? OR agent.username LIKE ? OR lc.content LIKE ?)`,
      );
      params.push(like, like, like, like, like);
    }
  }

  const sql = parts.length ? parts.join(" AND ") : "1=1";
  return { sql, params };
}

async function resolveOwnerWhere(
  input: TicketTablePagedInput,
): Promise<{ sql: string; params: Array<number | string> } | null> {
  if (input.scope === "admin") {
    return { sql: "1=1", params: [] };
  }
  const scope = await getPortalTicketScope(input.scope.username, input.scope.role);
  if (!scope) return null;
  const owner = portalTicketOwnerWhere(scope, "t.user_id");
  return { sql: owner.sql, params: owner.params };
}

async function hydrateTicketTableRows(rows: RowDataPacket[]): Promise<TicketDashboardTableRow[]> {
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

async function countTicketsTable(
  pool: ReturnType<typeof getBillingPool>,
  fromSql: string,
  whereSql: string,
  allParams: Array<number | string>,
): Promise<number> {
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS n ${fromSql} ${whereSql}`,
    allParams,
  );
  return Number(countRows[0]?.n ?? 0);
}

async function selectTicketsTablePage(
  pool: ReturnType<typeof getBillingPool>,
  selectSql: string,
  fromSql: string,
  whereSql: string,
  orderSql: string,
  allParams: Array<number | string>,
  pageSize: number,
  offset: number,
): Promise<RowDataPacket[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${selectSql} ${fromSql} ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`,
    allParams,
  );
  return rows;
}

export async function listTicketsTablePaged(input: TicketTablePagedInput): Promise<TicketTablePagedResult> {
  const owner = await resolveOwnerWhere(input);
  if (!owner) {
    return { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  }

  const filter = buildWhere(input);
  const whereSql = `WHERE (${owner.sql}) AND (${filter.sql})`;
  const allParams = [...owner.params, ...filter.params];

  const pageSize = clampPageSize(Number(input.pageSize ?? 25));
  const sort = parseTicketTableSort(input.sort);
  const orderSql = SORT_ORDER[sort];

  const pool = getBillingPool();
  let selectSql = TICKET_TABLE_SELECT_SQL;
  let fromSql = TICKET_TABLE_FROM_SQL;
  let total = 0;

  try {
    total = await countTicketsTable(pool, fromSql, whereSql, allParams);
  } catch (primaryError) {
    console.warn("listTicketsTablePaged: full count failed, retrying without comments:", primaryError);
    selectSql = TICKET_TABLE_SELECT_SQL_MINIMAL;
    fromSql = TICKET_TABLE_FROM_SQL_MINIMAL;
    total = await countTicketsTable(pool, fromSql, whereSql, allParams);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(clampPage(Number(input.page ?? 1)), totalPages);
  const offset = (page - 1) * pageSize;

  let rows: RowDataPacket[] = [];
  try {
    rows = await selectTicketsTablePage(
      pool,
      selectSql,
      fromSql,
      whereSql,
      orderSql,
      allParams,
      pageSize,
      offset,
    );
  } catch (selectError) {
    if (fromSql === TICKET_TABLE_FROM_SQL) {
      console.warn("listTicketsTablePaged: full select failed, retrying without comments:", selectError);
      selectSql = TICKET_TABLE_SELECT_SQL_MINIMAL;
      fromSql = TICKET_TABLE_FROM_SQL_MINIMAL;
      rows = await selectTicketsTablePage(
        pool,
        selectSql,
        fromSql,
        whereSql,
        orderSql,
        allParams,
        pageSize,
        offset,
      );
    } else {
      throw selectError;
    }
  }
  const hydrated = await hydrateTicketTableRows(rows);
  return { rows: hydrated, total, page, pageSize, totalPages };
}

/** Load one ticket row for deep-link modal when it is not on the current page. */
export async function getTicketTableRowById(
  input: TicketTablePagedInput,
  ticketId: number,
): Promise<TicketDashboardTableRow | null> {
  const id = Math.floor(ticketId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const owner = await resolveOwnerWhere(input);
  if (!owner) return null;

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${TICKET_TABLE_SELECT_SQL} ${TICKET_TABLE_FROM_SQL} WHERE (${owner.sql}) AND t.id = ? LIMIT 1`,
    [...owner.params, id],
  );
  if (!rows.length) return null;
  const hydrated = await hydrateTicketTableRows(rows);
  return hydrated[0] ?? null;
}
