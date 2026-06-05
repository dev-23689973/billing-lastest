import { getBillingPool } from "@/lib/db/pool";
import type { PortalTicketRole } from "@/lib/repos/tickets";
import type { SessionPayload } from "@/lib/session";
import type { RowDataPacket } from "mysql2";

export const PORTAL_TICKETS_CREATE_ENABLED_KEY = "portal_tickets_create_enabled";

function staffTypeForRole(role: PortalTicketRole): "MNGR" | "SRSLR" | "RSLR" {
  return role;
}

function configEnabled(raw: string | undefined | null, whenMissing: boolean): boolean {
  if (raw == null || raw === "") return whenMissing;
  return Number(raw) === 1;
}

/** Global admin toggle — default on when unset. */
export async function isPortalTicketsCreateGloballyEnabled(): Promise<boolean> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT value FROM configs WHERE `key` = ? LIMIT 1",
    [PORTAL_TICKETS_CREATE_ENABLED_KEY],
  );
  return configEnabled(rows[0]?.value != null ? String(rows[0].value) : null, true);
}

/** Per-user `users.tickets_enable`; managers/resellers default on when column is NULL. */
export async function isUserTicketsCreateEnabled(username: string, role: PortalTicketRole): Promise<boolean> {
  if (!(await isPortalTicketsCreateGloballyEnabled())) return false;

  const pool = getBillingPool();
  const u = username.trim();
  const type = staffTypeForRole(role);
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT tickets_enable FROM users WHERE username = ? AND type = ? LIMIT 1",
      [u, type],
    );
    const raw = rows[0]?.tickets_enable;
    if (raw == null) return role === "MNGR" || role === "SRSLR";
    return Number(raw) === 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("tickets_enable")) throw err;
    return role === "MNGR" || role === "SRSLR";
  }
}

export async function resolveCanCreateTicket(session: Pick<SessionPayload, "type" | "username">): Promise<boolean> {
  if (session.type === "ROOT") return false;
  if (session.type !== "MNGR" && session.type !== "SRSLR" && session.type !== "RSLR") return false;
  return isUserTicketsCreateEnabled(session.username, session.type);
}
