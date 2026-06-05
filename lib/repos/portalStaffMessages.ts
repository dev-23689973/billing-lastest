import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";
import {
  derivePortalStaffInboxStatus,
  type PortalStaffInboxStatus,
  type PortalStaffPendingMessage,
} from "@/lib/portalStaffInbox";
import { emitStaffMessageCreated, emitStaffMessageDismissed, emitStaffMessageRead } from "@/lib/realtime/emit";

export type { PortalStaffInboxStatus, PortalStaffPendingMessage };
export { derivePortalStaffInboxStatus };

export type PortalStaffAudienceType =
  | "all_staff"
  | "managers"
  | "resellers"
  | "dealers"
  | "custom"
  | "downstream_all"
  | "downstream_resellers"
  | "downstream_dealers";

export type PortalOperatorStaffAudienceType =
  | "downstream_all"
  | "downstream_resellers"
  | "downstream_dealers"
  | "custom";

export type PortalStaffMessageScope = {
  ownerType: "MNGR" | "SRSLR";
  ownerUsername: string;
};

export type PortalOperatorStaffAudiencePreviewCounts = {
  downstream_all: number;
  downstream_resellers: number;
  downstream_dealers: number;
};

export type PortalStaffUserOption = {
  username: string;
  name: string;
  type: "MNGR" | "SRSLR" | "RSLR";
};

export type PortalStaffMessageRow = {
  id: number;
  title: string;
  body: string;
  audienceType: PortalStaffAudienceType;
  sentBy: string;
  priority: number;
  createdAt: string;
  recipientCount: number;
  dismissedCount: number;
  readCount: number;
};

const STAFF_TYPES = ["MNGR", "SRSLR", "RSLR"] as const;

/** Cached — inbox queries need read_at; older DBs may only have dismissed_at. */
let portalStaffRecipientsHasReadAt: boolean | null = null;

async function recipientsHasReadAtColumn(): Promise<boolean> {
  if (portalStaffRecipientsHasReadAt !== null) return portalStaffRecipientsHasReadAt;
  const pool = getBillingPool();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SHOW COLUMNS FROM portal_staff_message_recipients LIKE 'read_at'`,
    );
    portalStaffRecipientsHasReadAt = Array.isArray(rows) && rows.length > 0;
  } catch {
    portalStaffRecipientsHasReadAt = false;
  }
  return portalStaffRecipientsHasReadAt;
}

/** Admin aggregates: dismissed = dismiss-only (excludes rows already read). */
function sqlDismissedCountExpr(hasReadAt: boolean): string {
  return hasReadAt
    ? "SUM(CASE WHEN r.dismissed_at IS NOT NULL AND r.read_at IS NULL THEN 1 ELSE 0 END)"
    : "SUM(CASE WHEN r.dismissed_at IS NOT NULL THEN 1 ELSE 0 END)";
}

function sqlReadCountExpr(hasReadAt: boolean): string {
  return hasReadAt ? "SUM(CASE WHEN r.read_at IS NOT NULL THEN 1 ELSE 0 END)" : "0";
}

/** Adds read_at when migration was not run yet (required for dismiss → read). */
async function ensureReadAtColumn(): Promise<boolean> {
  if (await recipientsHasReadAtColumn()) return true;
  const pool = getBillingPool();
  try {
    await pool.execute(
      `ALTER TABLE portal_staff_message_recipients
       ADD COLUMN read_at DATETIME NULL DEFAULT NULL AFTER dismissed_at`,
    );
    portalStaffRecipientsHasReadAt = true;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate column/i.test(msg)) {
      portalStaffRecipientsHasReadAt = true;
      return true;
    }
    console.error("[portalStaffMessages] ensureReadAtColumn failed:", err);
    return false;
  }
}

function activeStaffWhere(types: readonly ("MNGR" | "SRSLR" | "RSLR")[]): { sql: string; params: string[] } {
  const ph = types.map(() => "?").join(",");
  return {
    sql: `type IN (${ph}) AND UPPER(TRIM(status)) = 'A'`,
    params: [...types],
  };
}

/** Active downstream staff visible to a manager or reseller (for custom picker). */
function staffDownstreamWhereClause(scope: PortalStaffMessageScope): { sql: string; params: string[] } {
  const owner = scope.ownerUsername.trim();
  if (!owner) return { sql: "1=0", params: [] };
  if (scope.ownerType === "MNGR") {
    return {
      sql: `(
        (type = 'SRSLR' AND username_owner = ?)
        OR (type = 'RSLR' AND username_owner IN (
          SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?
        ))
      ) AND UPPER(TRIM(status)) = 'A'`,
      params: [owner, owner],
    };
  }
  return {
    sql: `type = 'RSLR' AND username_owner = ? AND UPPER(TRIM(status)) = 'A'`,
    params: [owner],
  };
}

/** Portal staff popups (manager / reseller / dealer) are admin-only; operators use STB subscriber messaging only. */
export function canOperatorSendPortalStaffMessages(_ownerType: "MNGR" | "SRSLR" | "RSLR"): boolean {
  return false;
}

/** Managers/resellers always; dealers only when reseller enabled subscriber messaging. */
export async function canOperatorSendSubscriberMessages(
  ownerType: "MNGR" | "SRSLR" | "RSLR",
  ownerUsername: string,
): Promise<boolean> {
  if (ownerType === "MNGR" || ownerType === "SRSLR") return true;
  const { dealerSubscriberMessagesEnabled } = await import("@/lib/repos/billing");
  return dealerSubscriberMessagesEnabled(ownerUsername);
}

export async function listPortalStaffUsersForSelectScoped(
  scope: PortalStaffMessageScope,
  limit = 5000,
): Promise<PortalStaffUserOption[]> {
  const pool = getBillingPool();
  const lim = Math.min(10000, Math.max(1, Math.floor(limit)));
  const { sql, params } = staffDownstreamWhereClause(scope);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, name, type FROM users WHERE ${sql} ORDER BY type ASC, username ASC LIMIT ?`,
    [...params, lim],
  );
  return rows.map((r) => ({
    username: String(r.username ?? "").trim(),
    name: String(r.name ?? "").trim() || String(r.username ?? ""),
    type: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
  }));
}

export async function getPortalOperatorStaffAudiencePreviewCounts(
  scope: PortalStaffMessageScope,
): Promise<PortalOperatorStaffAudiencePreviewCounts> {
  const pool = getBillingPool();
  const owner = scope.ownerUsername.trim();
  if (!owner) return { downstream_all: 0, downstream_resellers: 0, downstream_dealers: 0 };

  if (scope.ownerType === "MNGR") {
    const [[resellers]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM users WHERE type = 'SRSLR' AND username_owner = ? AND UPPER(TRIM(status)) = 'A'`,
      [owner],
    );
    const [[dealers]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM users d
       INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR' AND r.username_owner = ?
       WHERE d.type = 'RSLR' AND UPPER(TRIM(d.status)) = 'A'`,
      [owner],
    );
    const res = Math.floor(Number(resellers?.c ?? 0));
    const dlr = Math.floor(Number(dealers?.c ?? 0));
    return { downstream_all: res + dlr, downstream_resellers: res, downstream_dealers: dlr };
  }

  const [[dealers]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE type = 'RSLR' AND username_owner = ? AND UPPER(TRIM(status)) = 'A'`,
    [owner],
  );
  const dlr = Math.floor(Number(dealers?.c ?? 0));
  return { downstream_all: dlr, downstream_resellers: 0, downstream_dealers: dlr };
}

async function resolvePortalStaffRecipientsScoped(
  scope: PortalStaffMessageScope,
  audienceType: PortalOperatorStaffAudienceType,
  customUsernames: string[],
): Promise<{ username: string; userType: "MNGR" | "SRSLR" | "RSLR" }[]> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = staffDownstreamWhereClause(scope);

  if (audienceType === "custom") {
    const names = [...new Set(customUsernames.map((u) => u.trim()).filter(Boolean))];
    if (!names.length) return [];
    const ph = names.map(() => "?").join(",");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT username, type FROM users
       WHERE username IN (${ph}) AND (${scopeSql})`,
      [...names, ...scopeParams],
    );
    return rows.map((r) => ({
      username: String(r.username ?? "").trim(),
      userType: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
    }));
  }

  let extra = "";
  if (audienceType === "downstream_resellers" && scope.ownerType === "MNGR") {
    extra = " AND type = 'SRSLR'";
  } else if (audienceType === "downstream_dealers") {
    extra = " AND type = 'RSLR'";
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, type FROM users WHERE (${scopeSql})${extra} ORDER BY username ASC`,
    scopeParams,
  );
  return rows.map((r) => ({
    username: String(r.username ?? "").trim(),
    userType: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
  }));
}

export async function listPortalStaffUsersForSelect(limit = 5000): Promise<PortalStaffUserOption[]> {
  const pool = getBillingPool();
  const lim = Math.min(10000, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, name, type
     FROM users
     WHERE type IN ('MNGR', 'SRSLR', 'RSLR')
     ORDER BY type ASC, username ASC
     LIMIT ?`,
    [lim],
  );
  return rows.map((r) => ({
    username: String(r.username ?? "").trim(),
    name: String(r.name ?? "").trim() || String(r.username ?? ""),
    type: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
  }));
}

export async function resolvePortalStaffRecipients(
  audienceType: PortalStaffAudienceType,
  customUsernames: string[],
  scope?: PortalStaffMessageScope,
): Promise<{ username: string; userType: "MNGR" | "SRSLR" | "RSLR" }[]> {
  if (scope) {
    const opAudience = audienceType as PortalOperatorStaffAudienceType;
    if (
      opAudience === "downstream_all" ||
      opAudience === "downstream_resellers" ||
      opAudience === "downstream_dealers" ||
      opAudience === "custom"
    ) {
      return resolvePortalStaffRecipientsScoped(scope, opAudience, customUsernames);
    }
    return [];
  }

  const pool = getBillingPool();
  if (audienceType === "custom") {
    const names = [...new Set(customUsernames.map((u) => u.trim()).filter(Boolean))];
    if (!names.length) return [];
    const ph = names.map(() => "?").join(",");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT username, type FROM users
       WHERE username IN (${ph}) AND type IN ('MNGR','SRSLR','RSLR') AND UPPER(TRIM(status)) = 'A'`,
      names,
    );
    return rows.map((r) => ({
      username: String(r.username ?? "").trim(),
      userType: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
    }));
  }

  let types: ("MNGR" | "SRSLR" | "RSLR")[] = [...STAFF_TYPES];
  if (audienceType === "managers") types = ["MNGR"];
  else if (audienceType === "resellers") types = ["SRSLR"];
  else if (audienceType === "dealers") types = ["RSLR"];

  const { sql, params } = activeStaffWhere(types);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, type FROM users WHERE ${sql} ORDER BY username ASC`,
    params,
  );
  return rows.map((r) => ({
    username: String(r.username ?? "").trim(),
    userType: String(r.type) as "MNGR" | "SRSLR" | "RSLR",
  }));
}

export async function createPortalStaffMessage(input: {
  title: string;
  body: string;
  audienceType: PortalStaffAudienceType;
  sentBy: string;
  priority?: number;
  customUsernames?: string[];
  /** When set, recipients are limited to this operator's downstream staff tree. */
  scope?: PortalStaffMessageScope;
}): Promise<{ messageId: number; recipientCount: number }> {
  const pool = getBillingPool();
  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim();
  if (!title || !body) return { messageId: 0, recipientCount: 0 };

  const recipients = await resolvePortalStaffRecipients(
    input.audienceType,
    input.customUsernames ?? [],
    input.scope,
  );
  if (!recipients.length) return { messageId: 0, recipientCount: 0 };

  const pri = Math.min(3, Math.max(1, Math.floor(input.priority ?? 2)));
  const [ins] = await pool.execute<ResultSetHeader>(
    `INSERT INTO portal_staff_messages (title, body, audience_type, sent_by, priority) VALUES (?, ?, ?, ?, ?)`,
    [title, body, input.audienceType, input.sentBy.slice(0, 64), pri],
  );
  const messageId = Number(ins.insertId ?? 0);
  if (!messageId) return { messageId: 0, recipientCount: 0 };

  const chunk = 200;
  for (let i = 0; i < recipients.length; i += chunk) {
    const part = recipients.slice(i, i + chunk);
    const values = part.map(() => "(?, ?, ?, NULL)").join(",");
    const params: (string | number)[] = [];
    for (const r of part) {
      params.push(messageId, r.username.trim(), r.userType);
    }
    await pool.execute(
      `INSERT INTO portal_staff_message_recipients (message_id, username, user_type, dismissed_at) VALUES ${values}`,
      params,
    );
  }

  emitStaffMessageCreated(
    { messageId, recipientCount: recipients.length, sentBy: input.sentBy },
    recipients.map((r) => r.username),
  );

  return { messageId, recipientCount: recipients.length };
}

function mapPortalStaffInboxRow(r: RowDataPacket): PortalStaffPendingMessage {
  const dismissedAt = r.dismissed_at != null ? String(r.dismissed_at) : undefined;
  const readAt = r.read_at != null ? String(r.read_at) : undefined;
  const inboxStatus = derivePortalStaffInboxStatus({ dismissedAt, readAt });
  return {
    recipientId: Number(r.recipient_id),
    messageId: Number(r.message_id),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    sentBy: String(r.sent_by ?? ""),
    createdAt: r.created_at != null ? String(r.created_at) : "",
    dismissedAt,
    readAt,
    inboxStatus,
  };
}

export async function listPendingPortalStaffMessagesForUser(
  username: string,
  limit = 50,
): Promise<PortalStaffPendingMessage[]> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return [];
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const hasReadAt = await recipientsHasReadAtColumn();
  const [rows] = await pool.query<RowDataPacket[]>(
    hasReadAt
      ? `SELECT r.id AS recipient_id, m.id AS message_id, m.title, m.body, m.sent_by, m.created_at, r.dismissed_at, r.read_at
         FROM portal_staff_message_recipients r
         INNER JOIN portal_staff_messages m ON m.id = r.message_id
         WHERE TRIM(r.username) = ? AND r.dismissed_at IS NULL AND r.read_at IS NULL
         ORDER BY m.created_at ASC, m.id ASC
         LIMIT ?`
      : `SELECT r.id AS recipient_id, m.id AS message_id, m.title, m.body, m.sent_by, m.created_at, r.dismissed_at
         FROM portal_staff_message_recipients r
         INNER JOIN portal_staff_messages m ON m.id = r.message_id
         WHERE TRIM(r.username) = ? AND r.dismissed_at IS NULL
         ORDER BY m.created_at ASC, m.id ASC
         LIMIT ?`,
    [u, lim],
  );
  return rows.map(mapPortalStaffInboxRow);
}

/** Dismissed from alerts but not yet marked read (checkbox checked, enabled). */
export async function listDismissPortalStaffMessagesForUser(
  username: string,
  limit = 50,
): Promise<PortalStaffPendingMessage[]> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return [];
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const hasReadAt = await recipientsHasReadAtColumn();
  const [rows] = await pool.query<RowDataPacket[]>(
    hasReadAt
      ? `SELECT r.id AS recipient_id, m.id AS message_id, m.title, m.body, m.sent_by, m.created_at, r.dismissed_at, r.read_at
         FROM portal_staff_message_recipients r
         INNER JOIN portal_staff_messages m ON m.id = r.message_id
         WHERE TRIM(r.username) = ? AND r.dismissed_at IS NOT NULL AND r.read_at IS NULL
         ORDER BY r.dismissed_at DESC, m.id DESC
         LIMIT ?`
      : `SELECT r.id AS recipient_id, m.id AS message_id, m.title, m.body, m.sent_by, m.created_at, r.dismissed_at
         FROM portal_staff_message_recipients r
         INNER JOIN portal_staff_messages m ON m.id = r.message_id
         WHERE TRIM(r.username) = ? AND r.dismissed_at IS NOT NULL
         ORDER BY r.dismissed_at DESC, m.id DESC
         LIMIT ?`,
    [u, lim],
  );
  return rows.map(mapPortalStaffInboxRow);
}

/** Read / locked (checkbox checked, disabled). */
export async function listReadPortalStaffMessagesForUser(
  username: string,
  limit = 50,
): Promise<PortalStaffPendingMessage[]> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return [];
  const hasReadAt = await recipientsHasReadAtColumn();
  if (!hasReadAt) return [];
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id AS recipient_id, m.id AS message_id, m.title, m.body, m.sent_by, m.created_at, r.dismissed_at, r.read_at
     FROM portal_staff_message_recipients r
     INNER JOIN portal_staff_messages m ON m.id = r.message_id
     WHERE TRIM(r.username) = ? AND r.read_at IS NOT NULL
     ORDER BY r.read_at DESC, m.id DESC
     LIMIT ?`,
    [u, lim],
  );
  return rows.map(mapPortalStaffInboxRow);
}

export async function dismissPortalStaffMessageRecipient(recipientId: number, username: string): Promise<boolean> {
  const pool = getBillingPool();
  const id = Math.floor(recipientId);
  const u = username.trim();
  if (!id || !u) return false;

  const [lookup] = await pool.query<RowDataPacket[]>(
    `SELECT message_id FROM portal_staff_message_recipients
     WHERE id = ? AND TRIM(username) = ? AND dismissed_at IS NULL`,
    [id, u],
  );
  const messageId = Number(lookup[0]?.message_id);
  if (!Number.isFinite(messageId)) return false;

  const [res] = await pool.execute(
    `UPDATE portal_staff_message_recipients
     SET dismissed_at = NOW()
     WHERE id = ? AND TRIM(username) = ? AND dismissed_at IS NULL`,
    [id, u],
  );
  const ok =
    (res as { affectedRows?: number }).affectedRows !== undefined &&
    Number((res as { affectedRows: number }).affectedRows) > 0;
  if (ok) {
    emitStaffMessageDismissed({ messageId, recipientId: id, username: u });
  }
  return ok;
}

export async function markPortalStaffMessageReadRecipient(recipientId: number, username: string): Promise<boolean> {
  const pool = getBillingPool();
  const id = Math.floor(recipientId);
  const u = username.trim();
  if (!id || !u) return false;
  if (!(await ensureReadAtColumn())) return false;

  const [lookup] = await pool.query<RowDataPacket[]>(
    `SELECT message_id FROM portal_staff_message_recipients
     WHERE id = ? AND TRIM(username) = ? AND read_at IS NULL`,
    [id, u],
  );
  const messageId = Number(lookup[0]?.message_id);
  if (!Number.isFinite(messageId)) return false;

  const [res] = await pool.execute(
    `UPDATE portal_staff_message_recipients
     SET read_at = NOW(), dismissed_at = NULL
     WHERE id = ? AND TRIM(username) = ? AND read_at IS NULL`,
    [id, u],
  );
  const ok =
    (res as { affectedRows?: number }).affectedRows !== undefined &&
    Number((res as { affectedRows: number }).affectedRows) > 0;
  if (ok) {
    emitStaffMessageRead({ messageId, recipientId: id, username: u });
  }
  return ok;
}

/** Staff popup sends visible to an operator (recipients in their downstream tree). */
export async function listOperatorRecentPortalStaffMessages(
  scope: PortalStaffMessageScope,
  limit = 30,
): Promise<PortalStaffMessageRow[]> {
  const pool = getBillingPool();
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  const owner = scope.ownerUsername.trim();
  if (!owner) return [];

  const scopeSql =
    scope.ownerType === "MNGR"
      ? `(r.user_type = 'SRSLR' AND EXISTS (
           SELECT 1 FROM users u WHERE u.username = r.username AND u.type = 'SRSLR' AND u.username_owner = ?
         ))
         OR (r.user_type = 'RSLR' AND EXISTS (
           SELECT 1 FROM users d
           INNER JOIN users sr ON sr.username = d.username_owner AND sr.type = 'SRSLR'
           WHERE d.username = r.username AND sr.username_owner = ?
         ))`
      : `r.user_type = 'RSLR' AND EXISTS (
           SELECT 1 FROM users d WHERE d.username = r.username AND d.type = 'RSLR' AND d.username_owner = ?
         )`;

  const scopeParams = scope.ownerType === "MNGR" ? [owner, owner] : [owner];
  const hasReadAt = await recipientsHasReadAtColumn();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.id, m.title, m.body, m.audience_type, m.sent_by, m.priority, m.created_at,
            COUNT(r.id) AS recipient_count,
            ${sqlDismissedCountExpr(hasReadAt)} AS dismissed_count,
            ${sqlReadCountExpr(hasReadAt)} AS read_count
     FROM portal_staff_messages m
     INNER JOIN portal_staff_message_recipients r ON r.message_id = m.id
     WHERE ${scopeSql}
     GROUP BY m.id
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    [...scopeParams, lim],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    audienceType: String(r.audience_type) as PortalStaffAudienceType,
    sentBy: String(r.sent_by ?? ""),
    priority: Number(r.priority ?? 2),
    createdAt: r.created_at != null ? String(r.created_at) : "",
    recipientCount: Number(r.recipient_count ?? 0),
    dismissedCount: Number(r.dismissed_count ?? 0),
    readCount: Number(r.read_count ?? 0),
  }));
}

export async function listRecentPortalStaffMessages(limit = 50): Promise<PortalStaffMessageRow[]> {
  const pool = getBillingPool();
  const lim = Math.min(200, Math.max(1, Math.floor(limit)));
  const hasReadAt = await recipientsHasReadAtColumn();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT m.id, m.title, m.body, m.audience_type, m.sent_by, m.priority, m.created_at,
            COUNT(r.id) AS recipient_count,
            ${sqlDismissedCountExpr(hasReadAt)} AS dismissed_count,
            ${sqlReadCountExpr(hasReadAt)} AS read_count
     FROM portal_staff_messages m
     LEFT JOIN portal_staff_message_recipients r ON r.message_id = m.id
     GROUP BY m.id
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ?`,
    [lim],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    audienceType: String(r.audience_type) as PortalStaffAudienceType,
    sentBy: String(r.sent_by ?? ""),
    priority: Number(r.priority ?? 2),
    createdAt: r.created_at != null ? String(r.created_at) : "",
    recipientCount: Number(r.recipient_count ?? 0),
    dismissedCount: Number(r.dismissed_count ?? 0),
    readCount: Number(r.read_count ?? 0),
  }));
}

export type PortalStaffAudiencePreviewCounts = {
  all_staff: number;
  managers: number;
  resellers: number;
  dealers: number;
};

export type AdminPortalStaffMessageDashboardStats = {
  messagesSent: number;
  recipientRows: number;
  dismissed: number;
  pendingDismiss: number;
};

export type PortalStaffRoleMessageStatus = {
  roleKey: "MNGR" | "SRSLR" | "RSLR";
  roleLabel: string;
  recipientRows: number;
  dismissed: number;
  pendingDismiss: number;
};

const PORTAL_STAFF_ROLE_ORDER: Array<{ key: PortalStaffRoleMessageStatus["roleKey"]; label: string }> = [
  { key: "MNGR", label: "Managers" },
  { key: "SRSLR", label: "Resellers" },
  { key: "RSLR", label: "Dealers" },
];

export function emptyPortalStaffMessageStatsByRole(): PortalStaffRoleMessageStatus[] {
  return PORTAL_STAFF_ROLE_ORDER.map((r) => ({
    roleKey: r.key,
    roleLabel: r.label,
    recipientRows: 0,
    dismissed: 0,
    pendingDismiss: 0,
  }));
}

export async function getAdminPortalStaffMessageDashboardStats(): Promise<AdminPortalStaffMessageDashboardStats> {
  const pool = getBillingPool();
  const hasReadAt = await recipientsHasReadAtColumn();
  const dismissedExpr = hasReadAt
    ? "SUM(CASE WHEN r.dismissed_at IS NOT NULL AND r.read_at IS NULL THEN 1 ELSE 0 END)"
    : "SUM(CASE WHEN r.dismissed_at IS NOT NULL THEN 1 ELSE 0 END)";
  try {
    const [[row]] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(DISTINCT m.id) AS messages_sent,
         COUNT(r.id) AS recipient_rows,
         ${dismissedExpr} AS dismissed,
         SUM(CASE WHEN r.dismissed_at IS NULL THEN 1 ELSE 0 END) AS pending_dismiss
       FROM portal_staff_messages m
       LEFT JOIN portal_staff_message_recipients r ON r.message_id = m.id`,
    );
    return {
      messagesSent: Number(row?.messages_sent ?? 0),
      recipientRows: Number(row?.recipient_rows ?? 0),
      dismissed: Number(row?.dismissed ?? 0),
      pendingDismiss: Number(row?.pending_dismiss ?? 0),
    };
  } catch {
    return { messagesSent: 0, recipientRows: 0, dismissed: 0, pendingDismiss: 0 };
  }
}

/** Inbox dismiss status per portal role (from recipient rows). */
export async function getAdminPortalStaffMessageStatsByRole(): Promise<PortalStaffRoleMessageStatus[]> {
  const pool = getBillingPool();
  const hasReadAt = await recipientsHasReadAtColumn();
  const dismissedExpr = hasReadAt
    ? "SUM(CASE WHEN r.dismissed_at IS NOT NULL AND r.read_at IS NULL THEN 1 ELSE 0 END)"
    : "SUM(CASE WHEN r.dismissed_at IS NOT NULL THEN 1 ELSE 0 END)";
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         r.user_type,
         COUNT(r.id) AS recipient_rows,
         ${dismissedExpr} AS dismissed,
         SUM(CASE WHEN r.dismissed_at IS NULL THEN 1 ELSE 0 END) AS pending_dismiss
       FROM portal_staff_message_recipients r
       GROUP BY r.user_type`,
    );
    const byType = new Map<string, RowDataPacket>();
    for (const row of rows) {
      byType.set(String(row.user_type), row);
    }
    return PORTAL_STAFF_ROLE_ORDER.map(({ key, label }) => {
      const row = byType.get(key);
      return {
        roleKey: key,
        roleLabel: label,
        recipientRows: Math.floor(Number(row?.recipient_rows ?? 0)),
        dismissed: Math.floor(Number(row?.dismissed ?? 0)),
        pendingDismiss: Math.floor(Number(row?.pending_dismiss ?? 0)),
      };
    });
  } catch {
    return emptyPortalStaffMessageStatsByRole();
  }
}

export async function getPortalStaffAudiencePreviewCounts(): Promise<PortalStaffAudiencePreviewCounts> {
  const pool = getBillingPool();
  const [[allRow]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE type IN ('MNGR','SRSLR','RSLR') AND UPPER(TRIM(status)) = 'A'`,
  );
  const [[mRow]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE type = 'MNGR' AND UPPER(TRIM(status)) = 'A'`,
  );
  const [[rRow]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE type = 'SRSLR' AND UPPER(TRIM(status)) = 'A'`,
  );
  const [[dRow]] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users WHERE type = 'RSLR' AND UPPER(TRIM(status)) = 'A'`,
  );
  return {
    all_staff: Math.floor(Number(allRow?.c ?? 0)),
    managers: Math.floor(Number(mRow?.c ?? 0)),
    resellers: Math.floor(Number(rRow?.c ?? 0)),
    dealers: Math.floor(Number(dRow?.c ?? 0)),
  };
}

export type BillingSubscriberMessageOption = { account: string };

/** Billing subscriber accounts for STB custom selection (not full Stalker user list). */
export async function listBillingSubscriberAccountsForMessageSelect(limit = 8000): Promise<BillingSubscriberMessageOption[]> {
  const pool = getBillingPool();
  const lim = Math.min(20000, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct
     FROM accounts a
     WHERE a.account IS NOT NULL AND TRIM(a.account) <> ''
     ORDER BY a.account ASC
     LIMIT ?`,
    [lim],
  );
  return rows.map((r) => ({ account: String(r.acct ?? "").trim() })).filter((r) => r.account);
}
