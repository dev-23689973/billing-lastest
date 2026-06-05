import { getCachedAdminMessageStalkerShell } from "@/lib/messages/adminStalkerShell.server";
import { getCachedOperatorMessageStalkerShell } from "@/lib/messages/operatorStalkerShell.server";
import type { SessionPayload } from "@/lib/session";

type Fail = { ok: false; error: string; status: number };

function fail(error: string, status: number): Fail {
  return { ok: false, error, status };
}

export async function loadMessageStalkerShellForClient(
  session: SessionPayload,
  variant: "admin" | "operator",
) {
  if (variant === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
    const shell = await getCachedAdminMessageStalkerShell();
    return { ok: true as const, ...shell };
  }

  const username = session.username.trim();
  if (!username) return fail("forbidden", 403);
  const ownerType = session.type;
  if (ownerType !== "MNGR" && ownerType !== "SRSLR" && ownerType !== "RSLR") {
    return fail("forbidden", 403);
  }

  const shell = await getCachedOperatorMessageStalkerShell({ ownerType, ownerUsername: username });
  return { ok: true as const, ...shell };
}
