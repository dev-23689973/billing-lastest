import type { RowDataPacket } from "mysql2";
import { getStalkerPool } from "@/lib/db/pool";

function mysqlMessage(err: unknown): string {
  const e = err as { message?: string };
  return e?.message != null ? String(e.message) : String(err);
}

const STALKER_DOMAIN_SEARCH_MAX_LOGINS = 500;

/**
 * Resolve billing account logins whose Stalker `users.domain` matches `query` (partial).
 * Used for subscriber list search when the Domain column is shown.
 */
export async function findAccountLoginsByStalkerDomainSearch(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  const stalker = getStalkerPool();
  if (!stalker) return [];

  const like = `%${q}%`;

  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT login FROM users
       WHERE domain IS NOT NULL AND TRIM(domain) <> '' AND domain LIKE ?
       LIMIT ${STALKER_DOMAIN_SEARCH_MAX_LOGINS}`,
      [like],
    );
    const out: string[] = [];
    for (const row of rows) {
      const login = String(row.login ?? "").trim();
      if (login) out.push(login);
    }
    return out;
  } catch (err) {
    console.warn("[findAccountLoginsByStalkerDomainSearch]", mysqlMessage(err));
    return [];
  }
}
