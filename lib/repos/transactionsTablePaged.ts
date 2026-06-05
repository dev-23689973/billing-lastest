import type { RowDataPacket } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";
import {
  ADMIN_TRANSACTION_SELECT_SQL,
  mapAdminTransactionRow,
  type AdminTransactionRow,
} from "@/lib/repos/billing";

export type TransactionTablePagedInput = {
  username: string;
  q?: string;
  type?: string;
  ledgerPreset?: string;
  page?: number;
  pageSize?: number;
  /** When set, returns up to this many rows (export) instead of paginating. */
  exportMax?: number;
};

export type TransactionTablePagedResult = {
  rows: AdminTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  txnCount7d: number;
};

function isMissingCreatedByColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === "ER_BAD_FIELD_ERROR" && String(e?.message ?? "").includes("created_by");
}

function withoutCreatedByColumn(sql: string): string {
  return sql.replace(/,\s*`?created_by`?/i, "");
}

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

function buildWhere(input: TransactionTablePagedInput): { sql: string; params: Array<string | number> } {
  const parts: string[] = ["username = ?"];
  const params: Array<string | number> = [input.username.trim()];

  const type = String(input.type ?? "").trim().toUpperCase();
  if (type && type !== "ALL") {
    parts.push("type = ?");
    params.push(type);
  }

  const preset = String(input.ledgerPreset ?? "").trim();
  if (preset === "ADMIN_MANAGER") {
    parts.push(`(
      (type = 'DBIT' AND account IS NOT NULL AND TRIM(account) <> '' AND LOWER(remarks) REGEXP ?)
      OR (type = 'CRDT' AND LOWER(remarks) REGEXP ?)
    )`);
    params.push("received [0-9]+ credits", "recovered from");
  }

  const q = String(input.q ?? "").trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    parts.push(
      `(
        \`transaction\` LIKE ? OR username LIKE ? OR COALESCE(created_by, '') LIKE ?
        OR COALESCE(account, '') LIKE ? OR type LIKE ? OR COALESCE(remarks, '') LIKE ?
        OR COALESCE(\`timestamp\`, '') LIKE ? OR CAST(periods AS CHAR) LIKE ? OR COALESCE(amount, '') LIKE ?
      )`,
    );
    params.push(like, like, like, like, like, like, like, like, like);
  }

  return { sql: parts.join(" AND "), params };
}

async function queryRows(sql: string, params: Array<string | number>): Promise<AdminTransactionRow[]> {
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(sql, params);
  } catch (err) {
    if (!isMissingCreatedByColumnError(err)) throw err;
    [rows] = await pool.query<RowDataPacket[]>(withoutCreatedByColumn(sql), params);
  }
  return rows.map(mapAdminTransactionRow);
}

function clampPageSize(n: number) {
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function clampPage(n: number) {
  return Math.max(1, Math.floor(n));
}

export async function countTransactionsLast7Days(username: string): Promise<number> {
  const u = username.trim();
  if (!u) return 0;
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM transactions
     WHERE username = ? AND \`timestamp\` >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [u],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function listTransactionsTablePaged(
  input: TransactionTablePagedInput,
): Promise<TransactionTablePagedResult> {
  const u = input.username.trim();
  if (!u) {
    return { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1, txnCount7d: 0 };
  }

  const filter = buildWhere(input);
  const whereSql = `WHERE ${filter.sql}`;

  const pool = getBillingPool();
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM transactions ${whereSql}`,
    filter.params,
  );
  const total = Number(countRows[0]?.n ?? 0);

  const exportMax = input.exportMax;
  if (exportMax != null && exportMax > 0) {
    const lim = Math.min(5000, Math.floor(exportMax));
    const rows = await queryRows(
      `SELECT ${ADMIN_TRANSACTION_SELECT_SQL} FROM transactions ${whereSql} ORDER BY \`timestamp\` DESC LIMIT ${lim}`,
      filter.params,
    );
    const txnCount7d = await countTransactionsLast7Days(u);
    return { rows, total, page: 1, pageSize: lim, totalPages: 1, txnCount7d };
  }

  const pageSize = clampPageSize(Number(input.pageSize ?? 25));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(clampPage(Number(input.page ?? 1)), totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await queryRows(
    `SELECT ${ADMIN_TRANSACTION_SELECT_SQL} FROM transactions ${whereSql} ORDER BY \`timestamp\` DESC LIMIT ${pageSize} OFFSET ${offset}`,
    filter.params,
  );

  const txnCount7d = await countTransactionsLast7Days(u);
  return { rows, total, page, pageSize, totalPages, txnCount7d };
}

/** Recent rows for wallet ledger panel (unfiltered by table search/type). */
export async function listTransactionsForLedgerSummary(
  username: string,
  limit = 2000,
): Promise<AdminTransactionRow[]> {
  const u = username.trim();
  if (!u) return [];
  const lim = Math.max(1, Math.min(2000, Math.floor(limit)));
  return queryRows(
    `SELECT ${ADMIN_TRANSACTION_SELECT_SQL} FROM transactions WHERE username = ? ORDER BY \`timestamp\` DESC LIMIT ${lim}`,
    [u],
  );
}
