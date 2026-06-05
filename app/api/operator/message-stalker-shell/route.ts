import { apiJson } from "@/lib/dto/apiJson";
import { getCachedOperatorMessageStalkerShell } from "@/lib/messages/operatorStalkerShell.server";
import { getSession } from "@/lib/session";

/** Stalker DB KPI + recent STB rows for operator Messages (deferred client load). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const username = session.username.trim();
  if (!username) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const ownerType = session.type;
  if (ownerType !== "MNGR" && ownerType !== "SRSLR" && ownerType !== "RSLR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const shell = await getCachedOperatorMessageStalkerShell({ ownerType, ownerUsername: username });
  return apiJson(shell);
}
