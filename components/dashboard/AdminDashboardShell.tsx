"use client";

import { useMemo } from "react";

import { AdminDualRingHud, type DualRingMetric } from "@/components/dashboard/AdminDualRingHud";
import { QuadStatusGauges } from "@/components/dashboard/QuadStatusGauges";
import {
  AdminAccountsLifecycleSection,
  AdminActivityOverviewChartSection,
  AdminCreditFlowAnalysisSection,
  AdminRecentActivityHudSection,
  AdminTicketMessageHudSection,
  AdminTopOperatorsSection,
} from "@/components/dashboard/hud";
import {
  ActivityOverviewProvider,
  AdminActivityCalendarPanel,
} from "@/components/dashboard/hud/ActivityOverviewContext";
import {
  DashboardPeriodProvider,
  useDashboardPeriod,
} from "@/components/dashboard/hud/DashboardPeriodContext";
import type { HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import {
  dashboardActivityOverviewCalendarRow,
  dashboardCalendarBesideActivityClass,
  dashboardCalendarTopRowClass,
  dashboardCreditFlowCalendarCell,
  dashboardCreditFlowChartCell,
  dashboardCreditFlowResponsiveLayout,
  dashboardCreditFlowSummaryCell,
  dashboardFeedsTwoColumnGrid,
  dashboardHudTopPulseGaugesLayout,
} from "@/components/dashboard/hud/hudDashboardLayout";
import type {
  AdminAccountLifecycleRow,
  AdminExpiringSubscriptionsBuckets,
  AdminMessageTrafficDayStack,
  AdminRecentStalkerSendMessageRow,
  AdminReportPackageRow,
  AdminTopOperatorsLeaderboards,
  AdminTransactionRow,
  DashboardDayCreditPoint,
  DashboardTrendPoint,
} from "@/lib/dashboard/types";
import type { AdminTicketRow, AdminTicketStatusOverview } from "@/lib/repos/tickets";
import { DashboardIntelProvider } from "@/components/dashboard/DashboardIntelContext";
import type { DashboardShellProps } from "@/lib/dashboard/loadDashboardShellProps";
import type { ComponentProps, ReactNode } from "react";

type GaugesProps = ComponentProps<typeof QuadStatusGauges>;

export function AdminDashboardShell({
  trendFull,
  dailyPointsFull,
  creditFlowFull,
  walletCreditsTotal,
  promoPoolCredits,
  ticketOverview,
  messageTrafficFull,
  packageDistribution,
  topOperators,
  recentUsers,
  expiredUsers,
  expiringBuckets,
  recentTransactions,
  recentTicketsFeed,
  recentMessagesFeed,
  leftMetrics,
  revenueMetric,
  stayingMetric,
  branchTotal,
  totalUsers,
  statusGaugesProps,
  hideManagerLeaderboard = false,
  topOperatorsMode = "admin",
  activityApiBase = "/api/admin",
  portalBase = "/admin",
  intelScope,
  devicesOnlineCount,
  heavyChartsSlot,
  activityChartSlot,
  compactCreditSummarySlot,
  compactCreditChartSlot,
  feedsSlot,
  mobileProfileSlot,
}: DashboardShellProps & {
  portalBase?: string;
  heavyChartsSlot?: ReactNode;
  activityChartSlot?: ReactNode;
  compactCreditSummarySlot?: ReactNode;
  compactCreditChartSlot?: ReactNode;
  feedsSlot?: ReactNode;
  mobileProfileSlot?: ReactNode;
}) {
  return (
    <DashboardIntelProvider scope={intelScope} devicesOnlineCount={devicesOnlineCount}>
      <DashboardPeriodProvider trendFull={trendFull} dailyPointsFull={dailyPointsFull} defaultPeriod="1y">
        <AdminDashboardShellInner
        creditFlowFull={creditFlowFull}
        walletCreditsTotal={walletCreditsTotal}
        promoPoolCredits={promoPoolCredits}
        ticketOverview={ticketOverview}
        messageTrafficFull={messageTrafficFull}
        packageDistribution={packageDistribution}
        heavyChartsSlot={heavyChartsSlot}
        activityChartSlot={activityChartSlot}
        compactCreditSummarySlot={compactCreditSummarySlot}
        compactCreditChartSlot={compactCreditChartSlot}
        feedsSlot={feedsSlot}
        topOperators={topOperators}
        recentUsers={recentUsers}
        expiredUsers={expiredUsers}
        expiringBuckets={expiringBuckets}
        recentTransactions={recentTransactions}
        recentTicketsFeed={recentTicketsFeed}
        recentMessagesFeed={recentMessagesFeed}
        leftMetrics={leftMetrics}
        revenueMetric={revenueMetric}
        stayingMetric={stayingMetric}
        branchTotal={branchTotal}
        totalUsers={totalUsers}
        statusGaugesProps={statusGaugesProps}
        hideManagerLeaderboard={hideManagerLeaderboard}
        topOperatorsMode={topOperatorsMode}
        activityApiBase={activityApiBase}
        portalBase={portalBase}
        mobileProfileSlot={mobileProfileSlot}
        />
      </DashboardPeriodProvider>
    </DashboardIntelProvider>
  );
}

function AdminDashboardShellInner({
  creditFlowFull,
  walletCreditsTotal,
  promoPoolCredits,
  ticketOverview,
  messageTrafficFull,
  packageDistribution,
  topOperators,
  recentUsers,
  expiredUsers,
  expiringBuckets,
  recentTransactions,
  recentTicketsFeed,
  recentMessagesFeed,
  leftMetrics,
  revenueMetric,
  stayingMetric,
  branchTotal,
  totalUsers,
  statusGaugesProps,
  hideManagerLeaderboard,
  topOperatorsMode,
  activityApiBase,
  portalBase,
  heavyChartsSlot,
  activityChartSlot,
  compactCreditSummarySlot,
  compactCreditChartSlot,
  feedsSlot,
  mobileProfileSlot,
}: {
  creditFlowFull: DashboardDayCreditPoint[];
  walletCreditsTotal: number;
  promoPoolCredits: number;
  ticketOverview: AdminTicketStatusOverview;
  messageTrafficFull: AdminMessageTrafficDayStack[];
  packageDistribution: AdminReportPackageRow[];
  heavyChartsSlot?: ReactNode;
  activityChartSlot?: ReactNode;
  compactCreditSummarySlot?: ReactNode;
  compactCreditChartSlot?: ReactNode;
  feedsSlot?: ReactNode;
  mobileProfileSlot?: ReactNode;
  topOperators: AdminTopOperatorsLeaderboards;
  recentUsers: AdminAccountLifecycleRow[];
  expiredUsers: AdminAccountLifecycleRow[];
  expiringBuckets: AdminExpiringSubscriptionsBuckets;
  recentTransactions: AdminTransactionRow[];
  recentTicketsFeed: AdminTicketRow[];
  recentMessagesFeed: AdminRecentStalkerSendMessageRow[];
  leftMetrics: DualRingMetric[];
  revenueMetric: DualRingMetric;
  stayingMetric: DualRingMetric;
  branchTotal: number;
  totalUsers: number;
  statusGaugesProps: GaugesProps;
  hideManagerLeaderboard: boolean;
  topOperatorsMode: "admin" | "manager" | "reseller" | "dealer";
  activityApiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  portalBase: string;
}) {
  const { growthLastNew, growthMaxNew, trendFull } = useDashboardPeriod();

  const dualRightMetrics = useMemo((): DualRingMetric[] => {
    const growthPct = growthMaxNew > 0 ? (growthLastNew / growthMaxNew) * 100 : 0;
    const growthMetric: DualRingMetric = {
      key: "grw",
      label: "GROWTH",
      value: growthLastNew,
      pct: growthPct,
      color: "#4ade80",
    };
    return [growthMetric, revenueMetric, stayingMetric];
  }, [growthLastNew, growthMaxNew, revenueMetric, stayingMetric]);

  const rightCenterValue = useMemo(() => Math.max(0, Math.round(totalUsers)), [totalUsers]);

  return (
    <ActivityOverviewProvider activityApiBase={activityApiBase}>
      <div className="dashboard-surface mx-auto w-full max-w-[min(100%,1920px)] pb-10">
        <div className="flex flex-col gap-6 px-0 lg:gap-8">
          {mobileProfileSlot ? <div className="min-w-0">{mobileProfileSlot}</div> : null}
          <div className={dashboardHudTopPulseGaugesLayout}>
            <div className="flex min-h-0 min-w-0 flex-col min-[1280px]:min-h-[280px]">
              <AdminDualRingHud
                className="h-full min-h-0 w-full flex-1"
                leftMetrics={leftMetrics}
                rightMetrics={dualRightMetrics}
                centerUnits={branchTotal}
                rightCenterValue={rightCenterValue}
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col min-[1280px]:min-h-[280px]">
              <QuadStatusGauges {...statusGaugesProps} className="mx-auto h-full min-h-0 w-full min-w-0 flex-1" />
            </div>
            <div className={dashboardCalendarTopRowClass}>
              <AdminActivityCalendarPanel className="h-full min-h-0 flex-1" />
            </div>
          </div>

          <section
            key="dashboard-heavy-charts"
            className="flex flex-col gap-6 lg:gap-8"
            aria-label="Dashboard analytics charts"
          >
            <div className={dashboardCreditFlowResponsiveLayout}>
              <div className={dashboardCreditFlowSummaryCell}>
                {compactCreditSummarySlot ?? (
                  <AdminCreditFlowAnalysisSection
                    creditFlowFull={creditFlowFull}
                    walletCreditsTotal={walletCreditsTotal}
                    promoPoolCredits={promoPoolCredits}
                    layout="summary"
                    className="mb-0 h-full"
                  />
                )}
              </div>
              <div className={dashboardCreditFlowCalendarCell}>
                <AdminActivityCalendarPanel className="h-full min-h-0 flex-1" />
              </div>
              <div className={dashboardCreditFlowChartCell}>
                {compactCreditChartSlot ?? (
                  <AdminCreditFlowAnalysisSection
                    creditFlowFull={creditFlowFull}
                    walletCreditsTotal={walletCreditsTotal}
                    promoPoolCredits={promoPoolCredits}
                    layout="chart"
                    className="mb-0 h-full px-0"
                  />
                )}
              </div>
            </div>

            <div className={dashboardActivityOverviewCalendarRow}>
              <div className="min-w-0">
                {activityChartSlot ?? (
                  <AdminActivityOverviewChartSection trend={trendFull} className="mb-0 px-0" embedded />
                )}
              </div>
              <div className={dashboardCalendarBesideActivityClass}>
                <AdminActivityCalendarPanel className="h-full min-h-0 flex-1" />
              </div>
            </div>
            {heavyChartsSlot ?? (
              <AdminTicketMessageHudSection
                ticketOverview={ticketOverview}
                messageTrafficFull={messageTrafficFull}
                packageDistribution={packageDistribution}
                className="px-0"
              />
            )}
        </section>

        {feedsSlot ? (
          <section
            key="dashboard-feeds"
            className="flex flex-col gap-6 lg:gap-8"
            aria-label="Dashboard feeds and recent activity"
          >
            {feedsSlot}
          </section>
        ) : (
          <>
            {topOperatorsMode === "reseller" ? (
              <section
                className="mb-2 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-4 lg:gap-5 xl:gap-6"
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
        )}
        </div>
      </div>
    </ActivityOverviewProvider>
  );
}
