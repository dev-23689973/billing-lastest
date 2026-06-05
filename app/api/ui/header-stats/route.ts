import { apiJson } from "@/lib/dto/apiJson";
import type { RowDataPacket } from "mysql2/promise";
import { getSession } from "@/lib/session";
import { getBillingPool } from "@/lib/db/pool";
import { getCreditBalance } from "@/lib/repos/creditBalance";

function roleLabel(type: string): string {
  switch (type) {
    case "ROOT":
      return "Admin";
    case "MNGR":
      return "Manager";
    case "SRSLR":
      return "Reseller";
    case "RSLR":
      return "Dealer";
    default:
      return type || "User";
  }
}

export async function GET() {
  const s = await getSession();
  if (!s) return apiJson({ error: "unauthorized" }, { status: 401 });

  const pool = getBillingPool();
  const isAdmin = s.type === "ROOT";

  // Per user request: derive presence ONLY from `users.status`.
  // Scope: "their own users" (admin group or username_owner = current username).
  const [rows] = await pool.execute<RowDataPacket[]>(
    isAdmin
      ? "SELECT COUNT(*) AS c FROM users WHERE status = 1"
      : "SELECT COUNT(*) AS c FROM users WHERE username_owner = :u AND status = 1",
    isAdmin ? {} : { u: s.username.trim() },
  );
  const onlineByStatus = Number(rows[0]?.c ?? 0);

  const credits = isAdmin ? null : await getCreditBalance(s.username);

  return apiJson(
    {
      role: roleLabel(s.type),
      isAdmin,
      online: onlineByStatus,
      active: onlineByStatus,
      credits,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
      },
    },
  );
}

