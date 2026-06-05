import { apiJson } from "@/lib/dto/apiJson";
import { getSession } from "@/lib/session";
import {
  getTicketTableRowById,
  listTicketsTablePaged,
  type TicketTablePagedInput,
} from "@/lib/repos/ticketsTablePaged";
import { portalTicketRoleFromSessionType } from "@/lib/repos/tickets";

function scopeFromSession(session: NonNullable<Awaited<ReturnType<typeof getSession>>>): TicketTablePagedInput["scope"] | null {
  if (session.type === "ROOT") return "admin";
  const role = portalTicketRoleFromSessionType(session.type);
  if (!role) return null;
  return { username: session.username, role };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return apiJson({ error: "forbidden" }, { status: 401 });

  const scope = scopeFromSession(session);
  if (!scope) return apiJson({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;
  const sort = url.searchParams.get("sort") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
  const ticketIdRaw = url.searchParams.get("ticketId") ?? url.searchParams.get("ticket");

  const input: TicketTablePagedInput = {
    scope,
    q,
    status,
    priority,
    sort,
    page,
    pageSize,
  };

  try {
    const result = await listTicketsTablePaged(input);
    let focusRow = null;
    const ticketId = Number(String(ticketIdRaw ?? "").trim());
    if (Number.isFinite(ticketId) && ticketId > 0) {
      const onPage = result.rows.some((r) => r.id === ticketId);
      if (!onPage) {
        focusRow = await getTicketTableRowById(input, ticketId);
      }
    }
    return apiJson({ ...result, focusRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("GET /api/tickets/table failed:", error);
    return apiJson({ error: "db", detail: message }, { status: 500 });
  }
}
