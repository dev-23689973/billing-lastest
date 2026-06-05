import { unstable_cache } from "next/cache";
import { DEFAULT_ADMIN_NOTIFICATION_PREFS, getAdminNotificationPrefs } from "@/lib/data";
import {
  countOpenTicketsForNotification,
  listRecentOpenTicketsForNotification,
} from "@/lib/repos/tickets";
import type { SessionPayload } from "@/lib/session";

const LAYOUT_REVALIDATE_SECONDS = 30;

type TicketScope = Pick<SessionPayload, "type" | "username">;

/** Header bell preview + count — safe to cache briefly per staff user. */
export function getCachedLayoutTicketNotifications(scope: TicketScope) {
  const keyUser = scope.username.trim() || "_";
  return unstable_cache(
    async () => {
      const [ticketRows, openTicketCount] = await Promise.all([
        listRecentOpenTicketsForNotification(
          { type: scope.type, username: scope.username },
          8,
        ).catch(() => []),
        countOpenTicketsForNotification({
          type: scope.type,
          username: scope.username,
        }).catch(() => 0),
      ]);
      return { ticketRows, openTicketCount };
    },
    ["layout-ticket-notifications", scope.type, keyUser],
    { revalidate: LAYOUT_REVALIDATE_SECONDS },
  )();
}

export const getCachedAdminNotificationPrefs = unstable_cache(
  async () => getAdminNotificationPrefs().catch(() => DEFAULT_ADMIN_NOTIFICATION_PREFS),
  ["admin-notification-prefs"],
  { revalidate: 60 },
);
