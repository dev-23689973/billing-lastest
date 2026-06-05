import type { RowDataPacket } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";
import { normalizeStaffUsername } from "@/lib/adminStaffPresence";

/** Resellers and dealers under a manager (includes the manager login). */
export async function listManagerSubtreeOperatorUsernames(managerUsername: string): Promise<string[]> {
  const pool = getBillingPool();
  const u = managerUsername.trim();
  if (!u) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'MNGR' AND username = ?
     UNION
     SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?
     UNION
     SELECT username FROM users WHERE type = 'RSLR' AND username_owner IN (
       SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?
     )`,
    [u, u, u],
  );
  return [...new Set(rows.map((r) => String(r.username ?? "").trim()).filter(Boolean))];
}

/** Dealer logins under a reseller (includes the reseller login). */
export async function listResellerSubtreeOperatorUsernames(resellerUsername: string): Promise<string[]> {
  const pool = getBillingPool();
  const u = resellerUsername.trim();
  if (!u) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'SRSLR' AND username = ?
     UNION
     SELECT username FROM users WHERE type = 'RSLR' AND username_owner = ?`,
    [u, u],
  );
  return [...new Set(rows.map((r) => String(r.username ?? "").trim()).filter(Boolean))];
}

/**
 * Staff logins in the viewer's branch, excluding the viewer.
 * ROOT returns `null` (no branch filter — show everyone online in the tooltip).
 */
export async function listStaffBranchPeerUsernames(input: {
  type: string;
  username: string;
}): Promise<string[] | null> {
  const self = input.username.trim();
  if (!self) return [];
  if (input.type === "ROOT") return null;

  let subtree: string[] = [];
  if (input.type === "MNGR") {
    subtree = await listManagerSubtreeOperatorUsernames(self);
  } else if (input.type === "SRSLR") {
    subtree = await listResellerSubtreeOperatorUsernames(self);
  }

  const selfKey = normalizeStaffUsername(self);
  return subtree.filter((u) => normalizeStaffUsername(u) !== selfKey);
}
