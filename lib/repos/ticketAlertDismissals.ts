import type { ResultSetHeader } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";

let tableReady: boolean | null = null;

export async function ensureTicketAlertDismissalsTable(): Promise<boolean> {
  if (tableReady) return true;
  const pool = getBillingPool();
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_alert_dismissals (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        ticket_id INT UNSIGNED NOT NULL,
        dismissed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ticket_alert_dismiss_user (username, ticket_id),
        KEY idx_ticket_alert_dismiss_ticket (ticket_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tableReady = true;
    return true;
  } catch (err) {
    console.error("[ticketAlertDismissals] ensure table failed:", err);
    return false;
  }
}

/** SQL fragment to exclude tickets the user dismissed from the header bell. */
export async function dismissedTicketExclusionClause(
  username: string,
): Promise<{ sql: string; params: string[] } | null> {
  if (!(await ensureTicketAlertDismissalsTable())) return null;
  return {
    sql: `id NOT IN (SELECT ticket_id FROM ticket_alert_dismissals WHERE username = ?)`,
    params: [username.trim()],
  };
}

export async function dismissTicketAlertForUser(username: string, ticketId: number): Promise<boolean> {
  if (!(await ensureTicketAlertDismissalsTable())) return false;
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `INSERT INTO ticket_alert_dismissals (username, ticket_id, dismissed_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE dismissed_at = NOW()`,
    [username.trim(), ticketId],
  );
  return res.affectedRows > 0;
}

/** When a ticket is reopened, show the alert again for everyone who dismissed it. */
export async function clearTicketAlertDismissalsForTicket(ticketId: number): Promise<void> {
  if (!(await ensureTicketAlertDismissalsTable())) return;
  const pool = getBillingPool();
  await pool.execute(`DELETE FROM ticket_alert_dismissals WHERE ticket_id = ?`, [ticketId]);
}
