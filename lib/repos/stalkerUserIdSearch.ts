import type { RowDataPacket } from "mysql2";
import { getStalkerPool } from "@/lib/db/pool";

function mysqlMessage(err: unknown): string {
  const e = err as { message?: string };
  return e?.message != null ? String(e.message) : String(err);
}

const STALKER_ID_SEARCH_MAX_LOGINS = 500;

/** True when the query is digits-only (Stalker `users.id` in the admin User ID column). */
export function isStalkerUserIdSearchQuery(raw: string): boolean {
  const s = raw.trim();
  return /^\d{1,12}$/.test(s);
}

/**
 * Resolve billing account logins whose Stalker user id matches `query` (partial or exact).
 * Used for admin users list search only (`showUserIdColumn`).
 */
export async function findAccountLoginsByStalkerUserIdSearch(query: string): Promise<string[]> {
  const q = query.trim();
  if (!isStalkerUserIdSearchQuery(q)) return [];

  const stalker = getStalkerPool();
  if (!stalker) return [];

  const id = Number.parseInt(q, 10);
  const like = `%${q}%`;

  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT login FROM users
       WHERE (CAST(id AS CHAR) LIKE ?${Number.isFinite(id) ? " OR id = ?" : ""})
       LIMIT ${STALKER_ID_SEARCH_MAX_LOGINS}`,
      Number.isFinite(id) ? [like, id] : [like],
    );
    const out: string[] = [];
    for (const row of rows) {
      const login = String(row.login ?? "").trim();
      if (login) out.push(login);
    }
    return out;
  } catch (err) {
    console.warn("[findAccountLoginsByStalkerUserIdSearch]", mysqlMessage(err));
    return [];
  }
}
