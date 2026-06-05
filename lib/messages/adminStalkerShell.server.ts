import { unstable_cache } from "next/cache";
import {
  ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT,
  getAdminStalkerMessageDashboardStats,
  listAdminRecentStalkerSendMessages,
} from "@/lib/repos/billing";

const STALKER_SHELL_CACHE_TAG = "admin-message-stalker-shell";

/** Cached Stalker KPI + recent history for admin Messages (60s). */
export const getCachedAdminMessageStalkerShell = unstable_cache(
  async () => {
    const [stats, recent] = await Promise.all([
      getAdminStalkerMessageDashboardStats(),
      listAdminRecentStalkerSendMessages(ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT),
    ]);
    return { stats, recent };
  },
  ["admin-message-stalker-shell-v1"],
  { revalidate: 60, tags: [STALKER_SHELL_CACHE_TAG] },
);
