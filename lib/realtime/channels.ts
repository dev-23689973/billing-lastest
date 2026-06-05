/** Pusher private channel: per-user staff messages + personal signals. */
export function userPrivateChannel(username: string): string {
  return `private-user-${sanitizeChannelPart(username)}`;
}

/** Admin ticket feed (ROOT only). */
export const TICKETS_ADMIN_CHANNEL = "private-tickets-admin";

/** Portal ticket feed (manager / reseller / dealer). */
export const TICKETS_PORTAL_CHANNEL = "private-tickets-portal";

/** Panel presence (who has the billing UI open). */
export const PRESENCE_CHANNEL = "presence-billing";

function sanitizeChannelPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_@.-]/g, "_")
    .slice(0, 128);
}

export function canSubscribeChannel(channel: string, user: { username: string; type: string }): boolean {
  const u = user.username.trim();
  if (!u) return false;
  if (channel === userPrivateChannel(u)) return true;
  if (channel === PRESENCE_CHANNEL) return true;
  if (channel === TICKETS_ADMIN_CHANNEL) return user.type === "ROOT";
  if (channel === TICKETS_PORTAL_CHANNEL) return user.type === "MNGR" || user.type === "SRSLR" || user.type === "RSLR";
  return false;
}
