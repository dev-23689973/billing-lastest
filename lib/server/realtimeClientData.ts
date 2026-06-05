import type { RowDataPacket } from "mysql2/promise";
import { getAdminNotificationPrefs } from "@/lib/data";
import { getBillingPool } from "@/lib/db/pool";
import { resolveActivityBadge, resolveActivityNudge, type ActivityNudge, type ActivityRank } from "@/lib/promoActivityBadge";
import { getCreditBalance } from "@/lib/repos/creditBalance";
import { countActiveClientsForPromo2, getPromoBonusRules } from "@/lib/repos/billing";
import {
  countOpenTicketsForNotification,
  listRecentOpenTicketsForNotification,
  priorityLabel,
  statusLabel,
} from "@/lib/repos/tickets";
import type { SessionPayload } from "@/lib/session";

export type OpenTicketsClientSnapshot = {
  count: number;
  tickets: Array<{
    id: number;
    subject: string;
    statusLabel: string;
    priorityLabel: string;
    updatedAt: number;
  }>;
};

export type HeaderStatsActivityBadgeDto = {
  rank: ActivityRank;
  count: number;
  tierIndex: number;
  totalTiers: number;
  activeClients: number;
  promo2Pct: number;
  clientsToNextTier: number | null;
  nextRank: ActivityRank | null;
  nextLitCount: number | null;
};

export type HeaderStatsActivityNudgeDto = ActivityNudge;

export type HeaderStatsClientDto =
  | {
      role: string;
      isAdmin: boolean;
      online: number;
      active: number;
      credits: number | null;
      activityBadge: HeaderStatsActivityBadgeDto | null;
      activityNudge: HeaderStatsActivityNudgeDto | null;
    }
  | { error: string };

function roleLabel(type: string): string {
  switch (type) {
    case "ROOT":
      return "Admin";
    case "MNGR":
      return "Manager";
    case "SRSLR":
      return "Reseller";
    case "RSLR":
      return "Dealer";
    default:
      return type || "User";
  }
}

export async function loadOpenTicketsSnapshotForClient(session: SessionPayload): Promise<OpenTicketsClientSnapshot> {
  let count = 0;
  let tickets: OpenTicketsClientSnapshot["tickets"] = [];

  if (session.type === "ROOT") {
    const prefs = await getAdminNotificationPrefs().catch(() => ({ notifyNewTickets: true }));
    if (prefs.notifyNewTickets) {
      const [c, rows] = await Promise.all([
        countOpenTicketsForNotification({ type: session.type, username: session.username }),
        listRecentOpenTicketsForNotification({ type: session.type, username: session.username }, 8),
      ]);
      count = c;
      tickets = rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        statusLabel: statusLabel(r.status_id),
        priorityLabel: priorityLabel(r.priority_id),
        updatedAt: r.updated_at,
      }));
    }
  } else if (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR") {
    const [c, rows] = await Promise.all([
      countOpenTicketsForNotification({ type: session.type, username: session.username }),
      listRecentOpenTicketsForNotification({ type: session.type, username: session.username }, 8),
    ]);
    count = c;
    tickets = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      statusLabel: statusLabel(r.status_id),
      priorityLabel: priorityLabel(r.priority_id),
      updatedAt: r.updated_at,
    }));
  }

  return { count, tickets };
}

function isPortalStaffType(type: string): type is "MNGR" | "SRSLR" | "RSLR" {
  return type === "MNGR" || type === "SRSLR" || type === "RSLR";
}

export async function loadHeaderStatsForClient(session: SessionPayload): Promise<HeaderStatsClientDto> {
  const isAdmin = session.type === "ROOT";
  const credits = isAdmin ? null : await getCreditBalance(session.username);

  let activeSubscribers = 0;
  let activityBadge: HeaderStatsActivityBadgeDto | null = null;
  let activityNudge: HeaderStatsActivityNudgeDto | null = null;

  if (isAdmin) {
    const pool = getBillingPool();
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users WHERE status = 1");
    activeSubscribers = Number(rows[0]?.c ?? 0);
  } else if (isPortalStaffType(session.type)) {
    const [activeClients, rules] = await Promise.all([
      countActiveClientsForPromo2({ kind: session.type, username: session.username }),
      getPromoBonusRules(),
    ]);
    activeSubscribers = activeClients;
    const resolved = resolveActivityBadge(activeClients, rules.p2);
    if (resolved) {
      activityBadge = {
        rank: resolved.rank,
        count: resolved.count,
        tierIndex: resolved.tierIndex,
        totalTiers: resolved.totalTiers,
        activeClients: resolved.activeClients,
        promo2Pct: resolved.promo2Pct,
        clientsToNextTier: resolved.clientsToNextTier,
        nextRank: resolved.nextRank,
        nextLitCount: resolved.nextLitCount,
      };
    }
    activityNudge = resolveActivityNudge(activeClients, rules.p2);
  }

  return {
    role: roleLabel(session.type),
    isAdmin,
    online: activeSubscribers,
    active: activeSubscribers,
    credits,
    activityBadge,
    activityNudge,
  };
}
