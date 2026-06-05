import { apiJson } from "@/lib/dto/apiJson";
import { getCachedAdminMessageStalkerShell } from "@/lib/messages/adminStalkerShell.server";
import { getSession } from "@/lib/session";

/** Stalker DB KPI + recent STB rows for admin Messages (deferred client load). */
export async function GET() {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const shell = await getCachedAdminMessageStalkerShell();
  return apiJson(shell);
}
