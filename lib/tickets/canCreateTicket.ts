import type { SessionPayload } from "@/lib/session";

/** Sync guard: ROOT never creates. Prefer `canCreateTicket` for full global + per-user checks. */
export function canSessionCreateTicket(session: Pick<SessionPayload, "type">): boolean {
  return session.type !== "ROOT";
}

/** Global + per-user `tickets_enable`; disabled users may still view their existing tickets. */
export async function canCreateTicket(session: Pick<SessionPayload, "type" | "username">): Promise<boolean> {
  const { resolveCanCreateTicket } = await import("@/lib/tickets/ticketCreatePolicy");
  return resolveCanCreateTicket(session);
}
