import {
  getAdminExpiringSubscriptionBuckets,
  getAdminTopOperatorsLeaderboards,
  listAdminRecentAccountsWithHierarchy,
  listAdminRecentlyExpiredAccountsWithHierarchy,
  listAdminRecentStalkerSendMessages,
  listAdminRecentTransactionsGlobal,
} from "@/lib/data";
import type {
  AdminAccountLifecycleRow,
  AdminExpiringSubscriptionsBuckets,
  AdminRecentStalkerSendMessageRow,
  AdminTopOperatorsLeaderboards,
  AdminTransactionRow,
} from "@/lib/data";
import {
  getDealerExpiringSubscriptionBuckets,
  getResellerExpiringSubscriptionBuckets,
  getResellerTopOperatorsLeaderboards,
  getManagerExpiringSubscriptionBuckets,
  getManagerTopOperatorsLeaderboards,
  listDealerRecentAccountsWithHierarchy,
  listDealerRecentlyExpiredAccountsWithHierarchy,
  listDealerRecentTransactions,
  listManagerRecentAccountsWithHierarchy,
  listManagerRecentlyExpiredAccountsWithHierarchy,
  listManagerRecentTransactions,
  listOperatorRecentStalkerSendMessages,
  listResellerRecentAccountsWithHierarchy,
  listResellerRecentlyExpiredAccountsWithHierarchy,
  listResellerRecentTransactions,
} from "@/lib/repos/managerDashboard";
import { listRecentTicketsForAdmin, listRecentTicketsForPortalUser, type AdminTicketRow } from "@/lib/repos/tickets";
import type { DashboardHeavyChartsInput } from "@/lib/dashboard/loadDashboardHeavyCharts";
import { timeDashboardLoad } from "@/lib/dashboard/devTiming";
import type { DashboardShellFeedsData } from "@/lib/dashboard/dashboardShellFeedsDefaults";

const emptyBuckets = (): AdminExpiringSubscriptionsBuckets => ({
  totalWithin30Days: 0,
  totalAtRiskUsd: 0,
  rows: [],
});

const emptyLeaderboards = (): AdminTopOperatorsLeaderboards => ({
  dealers: [],
  resellers: [],
  managers: [],
});

/** Leaderboards, lifecycle tables, and recent activity feeds (deferred after dashboard shell paints). */
export async function loadDashboardShellFeeds(input: DashboardHeavyChartsInput): Promise<DashboardShellFeedsData> {
  return timeDashboardLoad(`feeds:${input.scope}`, async () => {
    if (input.scope === "admin") {
      const [
        topOperators,
        recentUsers,
        expiredUsers,
        expiringBuckets,
        recentTransactions,
        recentMessagesFeed,
        recentTicketsFeed,
      ] = await Promise.all([
        getAdminTopOperatorsLeaderboards({ limit: 5 }).catch(() => emptyLeaderboards()),
        listAdminRecentAccountsWithHierarchy(5).catch(() => [] as AdminAccountLifecycleRow[]),
        listAdminRecentlyExpiredAccountsWithHierarchy(5).catch(() => [] as AdminAccountLifecycleRow[]),
        getAdminExpiringSubscriptionBuckets().catch(() => emptyBuckets()),
        listAdminRecentTransactionsGlobal(5).catch(() => [] as AdminTransactionRow[]),
        listAdminRecentStalkerSendMessages(5).catch(() => [] as AdminRecentStalkerSendMessageRow[]),
        listRecentTicketsForAdmin(5).catch(() => [] as AdminTicketRow[]),
      ]);
      return {
        topOperators,
        recentUsers,
        expiredUsers,
        expiringBuckets,
        recentTransactions,
        recentTicketsFeed,
        recentMessagesFeed,
      };
    }

    if (input.scope === "dealer") {
      const u = input.dealerUsername.trim();
      const [recentUsers, expiredUsers, expiringBuckets, recentTransactions, recentMessagesFeed, recentTicketsFeed] =
        await Promise.all([
          listDealerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
          listDealerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
          getDealerExpiringSubscriptionBuckets(u).catch(() => emptyBuckets()),
          listDealerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
          listOperatorRecentStalkerSendMessages({ ownerType: "RSLR", ownerUsername: u }, 5).catch(
            () => [] as AdminRecentStalkerSendMessageRow[],
          ),
          listRecentTicketsForPortalUser(u, "RSLR", 5).catch(() => [] as AdminTicketRow[]),
        ]);
      return {
        topOperators: emptyLeaderboards(),
        recentUsers,
        expiredUsers,
        expiringBuckets,
        recentTransactions,
        recentTicketsFeed,
        recentMessagesFeed,
      };
    }

    if (input.scope === "reseller") {
      const u = input.resellerUsername.trim();
      const [
        topOperators,
        recentUsers,
        expiredUsers,
        expiringBuckets,
        recentTransactions,
        recentMessagesFeed,
      ] = await Promise.all([
        getResellerTopOperatorsLeaderboards(u, 5).catch(() => emptyLeaderboards()),
        listResellerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
        listResellerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
        getResellerExpiringSubscriptionBuckets(u).catch(() => emptyBuckets()),
        listResellerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
        listOperatorRecentStalkerSendMessages({ ownerType: "SRSLR", ownerUsername: u }, 5).catch(
          () => [] as AdminRecentStalkerSendMessageRow[],
        ),
      ]);
      return {
        topOperators,
        recentUsers,
        expiredUsers,
        expiringBuckets,
        recentTransactions,
        recentTicketsFeed: [],
        recentMessagesFeed,
      };
    }

    const u = input.managerUsername.trim();
    const [
      topOperators,
      recentUsers,
      expiredUsers,
      expiringBuckets,
      recentTransactions,
      recentMessagesFeed,
      recentTicketsFeed,
    ] = await Promise.all([
      getManagerTopOperatorsLeaderboards(u, 5).catch(() => emptyLeaderboards()),
      listManagerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      listManagerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      getManagerExpiringSubscriptionBuckets(u).catch(() => emptyBuckets()),
      listManagerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
      listOperatorRecentStalkerSendMessages({ ownerType: "MNGR", ownerUsername: u }, 5).catch(
        () => [] as AdminRecentStalkerSendMessageRow[],
      ),
      listRecentTicketsForPortalUser(u, "MNGR", 5).catch(() => [] as AdminTicketRow[]),
    ]);
    return {
      topOperators,
      recentUsers,
      expiredUsers,
      expiringBuckets,
      recentTransactions,
      recentTicketsFeed,
      recentMessagesFeed,
    };
  });
}
