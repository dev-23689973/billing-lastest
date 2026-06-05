import { unstable_cache } from "next/cache";
import {
  ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT,
  getOperatorStalkerMessageDashboardStats,
  listOperatorRecentStalkerSendMessages,
} from "@/lib/repos/billing";

type OperatorOwner = {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
};

/** Cached Stalker KPI + recent history for operator Messages (60s). */
export function getCachedOperatorMessageStalkerShell(input: OperatorOwner) {
  const ownerType = input.ownerType;
  const ownerUsername = input.ownerUsername.trim();
  return unstable_cache(
    async () => {
      const scope = { ownerType, ownerUsername };
      const [stats, recent] = await Promise.all([
        getOperatorStalkerMessageDashboardStats(scope),
        listOperatorRecentStalkerSendMessages(scope, ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT),
      ]);
      return { stats, recent };
    },
    [`operator-message-stalker-shell-v1-${ownerType}-${ownerUsername}`],
    {
      revalidate: 60,
      tags: [`operator-message-stalker-shell-${ownerType}-${ownerUsername}`],
    },
  )();
}
