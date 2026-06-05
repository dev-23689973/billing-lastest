import type {
  AdminAccountLifecycleRow,
  AdminExpiringSubscriptionsBuckets,
  AdminRecentStalkerSendMessageRow,
  AdminTopOperatorsLeaderboards,
  AdminTransactionRow,
} from "@/lib/data";
import type { AdminTicketRow } from "@/lib/repos/tickets";

export type DashboardShellFeedsData = {
  topOperators: AdminTopOperatorsLeaderboards;
  recentUsers: AdminAccountLifecycleRow[];
  expiredUsers: AdminAccountLifecycleRow[];
  expiringBuckets: AdminExpiringSubscriptionsBuckets;
  recentTransactions: AdminTransactionRow[];
  recentTicketsFeed: AdminTicketRow[];
  recentMessagesFeed: AdminRecentStalkerSendMessageRow[];
};

export const EMPTY_DASHBOARD_SHELL_FEEDS: DashboardShellFeedsData = {
  topOperators: { dealers: [], resellers: [], managers: [] },
  recentUsers: [],
  expiredUsers: [],
  expiringBuckets: { totalWithin30Days: 0, totalAtRiskUsd: 0, rows: [] },
  recentTransactions: [],
  recentTicketsFeed: [],
  recentMessagesFeed: [],
};
