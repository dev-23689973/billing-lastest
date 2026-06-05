"use client";

import {
  AdminAccountsLifecycleSection,
  AdminRecentActivityHudSection,
  AdminTopOperatorsSection,
} from "@/components/dashboard/hud";
import { dashboardFeedsTwoColumnGrid } from "@/components/dashboard/hud/hudDashboardLayout";
import type { DashboardShellFeedsData } from "@/lib/dashboard/dashboardShellFeedsDefaults";

export function DashboardShellFeedsSections({
  feeds,
  hideManagerLeaderboard,
  topOperatorsMode,
}: {
  feeds: DashboardShellFeedsData;
  hideManagerLeaderboard: boolean;
  topOperatorsMode: "admin" | "manager" | "reseller" | "dealer";
}) {
  const {
    topOperators,
    recentUsers,
    expiredUsers,
    expiringBuckets,
    recentTransactions,
    recentTicketsFeed,
    recentMessagesFeed,
  } = feeds;

  return (
    <>
      {topOperatorsMode === "reseller" ? (
        <section
          className="mb-2 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch lg:mb-4 lg:gap-5 xl:gap-6"
          aria-label="Dealers and subscriber lifecycle"
        >
          <div className="min-w-0">
            <AdminTopOperatorsSection
              data={topOperators}
              hideManagerLeaderboard={hideManagerLeaderboard}
              topOperatorsMode={topOperatorsMode}
              embedded
            />
          </div>
          <div className="min-w-0">
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="recent"
            />
          </div>
          <div className="min-w-0">
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="expired"
            />
          </div>
          <div className="min-w-0">
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="expiring"
            />
          </div>
        </section>
      ) : (
        <>
          {topOperatorsMode !== "dealer" ? (
            <AdminTopOperatorsSection
              data={topOperators}
              className="px-0"
              hideManagerLeaderboard={hideManagerLeaderboard}
              topOperatorsMode={topOperatorsMode}
            />
          ) : null}

          <section
            className={dashboardFeedsTwoColumnGrid}
            aria-label="Accounts lifecycle and recent activity"
          >
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="expiring"
            />
            <AdminRecentActivityHudSection
              recentTransactions={recentTransactions}
              recentTickets={recentTicketsFeed}
              recentMessages={recentMessagesFeed}
              panel="transactions"
            />
            <AdminRecentActivityHudSection
              recentTransactions={recentTransactions}
              recentTickets={recentTicketsFeed}
              recentMessages={recentMessagesFeed}
              panel="tickets"
            />
            <AdminRecentActivityHudSection
              recentTransactions={recentTransactions}
              recentTickets={recentTicketsFeed}
              recentMessages={recentMessagesFeed}
              panel="messages"
            />
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="recent"
            />
            <AdminAccountsLifecycleSection
              recentUsers={recentUsers}
              expiredUsers={expiredUsers}
              expiringBuckets={expiringBuckets}
              panel="expired"
            />
          </section>
        </>
      )}
    </>
  );
}
