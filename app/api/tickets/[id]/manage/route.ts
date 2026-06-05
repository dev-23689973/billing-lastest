import { revalidatePath } from "next/cache";
import { revalidateAdminDashboardCaches } from "@/lib/dashboard/revalidateAdminDashboardCaches";
import { getSession } from "@/lib/session";
import { deleteTicketById, updateTicketPriorityAndStatus } from "@/lib/repos/tickets";
import { apiJson } from "@/lib/dto/apiJson";

type Params = { id: string };
type Ctx = { params: Promise<Params> | Params };

function revalidateTicketScopes() {
  revalidatePath("/admin/tickets/dashboard");
  revalidatePath("/manager/tickets");
  revalidatePath("/manager/tickets/dashboard");
  revalidatePath("/dealer/tickets");
  revalidatePath("/dealer/tickets/dashboard");
  revalidatePath("/reseller/tickets");
  revalidatePath("/reseller/tickets/dashboard");
}

/** Admin only — portal staff may reply via comments, not update/delete tickets. */
export async function POST(req: Request, ctx: Ctx) {
  const rawParams = await Promise.resolve(ctx.params);
  const ticketId = Number(rawParams.id);
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    return apiJson({ error: "bad_ticket_id" }, { status: 400 });
  }

  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { action?: "delete" | "update"; status?: number; priority?: number }
    | null;
  const action = body?.action;

  if (action === "delete") {
    const ok = await deleteTicketById(ticketId, session.username);
    if (!ok) return apiJson({ error: "delete_failed" }, { status: 400 });
  } else if (action === "update") {
    const status = Number(body?.status);
    const priority = Number(body?.priority);
    if (!Number.isFinite(status) || status < 1 || status > 3) {
      return apiJson({ error: "bad_status" }, { status: 400 });
    }
    if (!Number.isFinite(priority) || priority < 1 || priority > 3) {
      return apiJson({ error: "bad_priority" }, { status: 400 });
    }
    const ok = await updateTicketPriorityAndStatus(ticketId, priority, status, 0, session.username);
    if (!ok) return apiJson({ error: "update_failed" }, { status: 400 });
  } else {
    return apiJson({ error: "bad_action" }, { status: 400 });
  }

  revalidateAdminDashboardCaches();
  revalidateTicketScopes();

  return apiJson({ ok: true });
}

