import type { DualRingMetric } from "@/components/dashboard/AdminDualRingHud";
import type { ComponentProps } from "react";
import { OPERATOR_ROLE_COLORS } from "@/components/dashboard/operatorRoleColors";
import type { QuadStatusGauges } from "@/components/dashboard/QuadStatusGauges";
import { buildHudDailyPointsFromActivityMap } from "@/lib/dashboardPeriodSlice";
import { DASHBOARD_HUD_HISTORY_DAYS } from "@/lib/chart-history-days";
import {
  DEFAULT_ADMIN_NOTIFICATION_PREFS,
  getAdminCreditFlowByDay,
  getAdminDevicesOnlineCount,
  getAdminExpiringSubscriptionBuckets,
  getAdminMessageTrafficDayStacks,
  getAdminNotificationPrefs,
  getAdminSubscriberActivityByDayRange,
  getAdminTopOperatorsLeaderboards,
  listAdminRecentAccountsWithHierarchy,
  listAdminRecentlyExpiredAccountsWithHierarchy,
  listAdminRecentStalkerSendMessages,
  listAdminRecentTransactionsGlobal,
} from "@/lib/data";
import {
  getManagerCreditFlowByDay,
  getManagerDevicesOnlineCount,
  getManagerExpiringSubscriptionBuckets,
  getManagerMessageTrafficDayStacks,
  getManagerPeakMonthlyRevenueLastNMonths,
  getManagerPromoBonusCreditsTotal,
  getManagerRevenueThisMonth,
  getManagerSubscriberActivityByDayRange,
  getManagerTopOperatorsLeaderboards,
  getOperatorSubscriberTrendSeries,
  listManagerRecentAccountsWithHierarchy,
  listManagerRecentlyExpiredAccountsWithHierarchy,
  listManagerRecentTransactions,
  listOperatorRecentStalkerSendMessages,
  getResellerCreditFlowByDay,
  getResellerDevicesOnlineCount,
  getResellerExpiringSubscriptionBuckets,
  getResellerMessageTrafficDayStacks,
  getResellerPeakMonthlyRevenueLastNMonths,
  getResellerPromoBonusCreditsTotal,
  getResellerRevenueThisMonth,
  getResellerSubscriberActivityByDayRange,
  getResellerTopOperatorsLeaderboards,
  getResellerWalletCreditsTotal,
  listResellerRecentAccountsWithHierarchy,
  listResellerRecentlyExpiredAccountsWithHierarchy,
  listResellerRecentTransactions,
  getDealerCreditFlowByDay,
  getDealerDevicesOnlineCount,
  getDealerExpiringSubscriptionBuckets,
  getDealerMessageTrafficDayStacks,
  getDealerPeakMonthlyRevenueLastNMonths,
  getDealerPromoBonusCreditsTotal,
  getDealerRevenueThisMonth,
  getDealerSubscriberActivityByDayRange,
  listDealerRecentAccountsWithHierarchy,
  listDealerRecentlyExpiredAccountsWithHierarchy,
  listDealerRecentTransactions,
} from "@/lib/repos/managerDashboard";
import type { AdminReportPackageRow } from "@/lib/data";
import type {
  AdminAccountLifecycleRow,
  AdminExpiringSubscriptionsBuckets,
  AdminRecentStalkerSendMessageRow,
  AdminTopOperatorsLeaderboards,
  AdminTransactionRow,
  DashboardDayCreditPoint,
  DashboardTrendPoint,
} from "@/lib/repos/billing";
import {
  listRecentTicketsForAdmin,
  listRecentTicketsForPortalUser,
} from "@/lib/repos/tickets";
import type { AdminTicketRow, AdminTicketStatusOverview } from "@/lib/repos/tickets";
import type { HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import type { DashboardIntelScope } from "@/lib/dashboard/intelGuideTipsScope";
import { EMPTY_DASHBOARD_SHELL_FEEDS } from "@/lib/dashboard/dashboardShellFeedsDefaults";
import { timeDashboardLoad } from "@/lib/dashboard/devTiming";
import { loadDashboardPackageDistribution } from "@/lib/dashboard/loadDashboardHeavyCharts";
import {
  getCachedPortalDashboardShell,
  getCachedPortalSubscriberTrend,
  getCachedPortalWalletRevenue,
} from "@/lib/dashboard/cachedPortalDashboardQueries";
import {
  getCachedAdminDashboardCounts,
  getCachedAdminExpiringSoonCount,
  getCachedAdminSubscriberTrendSeries,
  getCachedAdminTicketStatusOverview,
  getCachedAdminWalletRevenue,
} from "@/lib/dashboard/cachedDashboardQueries";

type GaugesProps = ComponentProps<typeof QuadStatusGauges>;

export type DashboardShellProps = {
  trendFull: DashboardTrendPoint[];
  dailyPointsFull: HudDualSeriesPoint[];
  creditFlowFull: DashboardDayCreditPoint[];
  walletCreditsTotal: number;
  promoPoolCredits: number;
  ticketOverview: AdminTicketStatusOverview;
  messageTrafficFull: import("@/lib/repos/billing").AdminMessageTrafficDayStack[];
  packageDistribution: AdminReportPackageRow[];
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
  hideManagerLeaderboard?: boolean;
  topOperatorsMode?: "admin" | "manager" | "reseller" | "dealer";
  activityApiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  intelScope: DashboardIntelScope;
  devicesOnlineCount: number | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

type DashboardShellLoadInput =
  | { scope: "admin" }
  | { scope: "manager"; managerUsername: string }
  | { scope: "reseller"; resellerUsername: string }
  | { scope: "dealer"; dealerUsername: string };

export async function loadDashboardShellProps(
  input: DashboardShellLoadInput & { deferHeavyCharts?: boolean; deferFeeds?: boolean },
): Promise<DashboardShellProps> {
  return timeDashboardLoad(`shell:${input.scope}`, () => loadDashboardShellPropsInner(input));
}

async function loadDashboardShellPropsInner(
  input: DashboardShellLoadInput & { deferHeavyCharts?: boolean; deferFeeds?: boolean },
): Promise<DashboardShellProps> {
  const deferHeavy = input.deferHeavyCharts === true;
  const deferFeeds = input.deferFeeds === true;
  const emptyFeeds = EMPTY_DASHBOARD_SHELL_FEEDS;
  const fromDaily = new Date();
  fromDaily.setHours(0, 0, 0, 0);
  fromDaily.setDate(fromDaily.getDate() - (DASHBOARD_HUD_HISTORY_DAYS - 1));
  const toDaily = new Date();

  if (input.scope === "admin") {
    const notifyPrefs = await getAdminNotificationPrefs().catch(() => DEFAULT_ADMIN_NOTIFICATION_PREFS);

    const [
      dashboardCounts,
      activityByDay,
      ticketStatusOverview,
      expiringSoonForStatus,
      walletRevenue,
      trendFull,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      topOperators,
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      recentTickets,
    ] = await Promise.all([
      getCachedAdminDashboardCounts().catch(() => ({
        stats: {
          totalUsers: 0,
          activeUsers: 0,
          expiredUsers: 0,
          totalManagers: 0,
          totalResellers: 0,
          totalDealers: 0,
        },
        summary: { all: 0, active: 0, expired: 0, inactive: 0 },
      })),
      deferHeavy
        ? Promise.resolve({} as Record<string, { newCount: number; expiredCount: number }>)
        : getAdminSubscriberActivityByDayRange(fromDaily, toDaily).catch(() => ({})),
      getCachedAdminTicketStatusOverview().catch(() => ({
        grandTotal: 0,
        inProgress: 0,
        fixed: 0,
        reopened: 0,
        other: 0,
      })),
      getCachedAdminExpiringSoonCount().catch(() => 0),
      getCachedAdminWalletRevenue().catch(() => ({
        walletCredits: 0,
        promoPoolCredits: 0,
        revenueMonth: 0,
        revenuePeakMonthly: 0,
      })),
      getCachedAdminSubscriberTrendSeries().catch(() => []),
      deferHeavy
        ? Promise.resolve([] as DashboardDayCreditPoint[])
        : getAdminCreditFlowByDay(DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as import("@/lib/repos/billing").AdminMessageTrafficDayStack[])
        : getAdminMessageTrafficDayStacks(DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as AdminReportPackageRow[])
        : loadDashboardPackageDistribution({ scope: "admin" }).catch(() => [] as AdminReportPackageRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.topOperators)
        : getAdminTopOperatorsLeaderboards({ limit: 5 }).catch(() => emptyFeeds.topOperators),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentUsers)
        : listAdminRecentAccountsWithHierarchy(5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiredUsers)
        : listAdminRecentlyExpiredAccountsWithHierarchy(5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiringBuckets)
        : getAdminExpiringSubscriptionBuckets().catch(() => emptyFeeds.expiringBuckets),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentTransactions)
        : listAdminRecentTransactionsGlobal(5).catch(() => [] as AdminTransactionRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentMessagesFeed)
        : listAdminRecentStalkerSendMessages(5).catch(() => [] as AdminRecentStalkerSendMessageRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentTicketsFeed)
        : listRecentTicketsForAdmin(5).catch(() => [] as AdminTicketRow[]),
    ]);

    let devicesOnlineCount: number | null = null;
    if (notifyPrefs.notifyDeviceOffline) {
      devicesOnlineCount = await getAdminDevicesOnlineCount().catch(() => null);
    }

    const { stats: s, summary } = dashboardCounts;
    const { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly } = walletRevenue;

    return buildShellProps({
      stats: {
        totalUsers: s.totalUsers,
        managers: s.totalManagers,
        resellers: s.totalResellers,
        dealers: s.totalDealers,
      },
      summary,
      expiringSoonForStatus,
      activityByDay,
      fromDaily,
      toDaily,
      ticketStatusOverview,
      walletCredits,
      promoPoolCredits,
      revenueMonth,
      revenuePeakMonthly,
      trendFull,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      topOperators,
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      recentTickets,
      hideManagerLeaderboard: false,
      topOperatorsMode: "admin",
      activityApiBase: "/api/admin",
      intelScope: "admin",
      devicesOnlineCount,
    });
  }

  if (input.scope === "dealer") {
    const u = input.dealerUsername.trim();
    const [
      portalShell,
      walletRevenue,
      trendFull,
      activityByDay,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      recentTickets,
      devicesOnlineCount,
    ] = await Promise.all([
      getCachedPortalDashboardShell(u, "RSLR").catch(() => ({
        opStats: {
          balance: 0,
          totalAccounts: 0,
          activeAccounts: 0,
          expiredAccounts: 0,
          inactiveAccounts: 0,
          resellerCount: null,
          dealerCount: null,
        },
        summary: { all: 0, active: 0, expired: 0, inactive: 0 },
        ticketOverview: { grandTotal: 0, inProgress: 0, fixed: 0, reopened: 0, other: 0 },
        expiringSoon: 0,
      })),
      getCachedPortalWalletRevenue(u, "RSLR").catch(() => ({
        walletCredits: 0,
        promoPoolCredits: 0,
        revenueMonth: 0,
        revenuePeakMonthly: 0,
      })),
      getCachedPortalSubscriberTrend(u, "RSLR").catch(() => []),
      deferHeavy
        ? Promise.resolve({} as Record<string, { newCount: number; expiredCount: number }>)
        : getDealerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
      deferHeavy
        ? Promise.resolve([] as DashboardDayCreditPoint[])
        : getDealerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as import("@/lib/repos/billing").AdminMessageTrafficDayStack[])
        : getDealerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as AdminReportPackageRow[])
        : loadDashboardPackageDistribution({ scope: "dealer", dealerUsername: u }).catch(
            () => [] as AdminReportPackageRow[],
          ),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentUsers)
        : listDealerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiredUsers)
        : listDealerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiringBuckets)
        : getDealerExpiringSubscriptionBuckets(u).catch(() => emptyFeeds.expiringBuckets),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentTransactions)
        : listDealerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentMessagesFeed)
        : listOperatorRecentStalkerSendMessages({ ownerType: "RSLR", ownerUsername: u }, 5).catch(
            () => [] as AdminRecentStalkerSendMessageRow[],
          ),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentTicketsFeed)
        : listRecentTicketsForPortalUser(u, "RSLR", 5).catch(() => [] as AdminTicketRow[]),
      getDealerDevicesOnlineCount(u).catch(() => null),
    ]);

    const { opStats, summary, ticketOverview: ticketStatusOverview, expiringSoon: expiringSoonForStatus } = portalShell;
    const { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly } = walletRevenue;

    return buildShellProps({
      stats: {
        totalUsers: opStats.totalAccounts,
        managers: 0,
        resellers: 0,
        dealers: 0,
      },
      summary,
      expiringSoonForStatus,
      activityByDay,
      fromDaily,
      toDaily,
      ticketStatusOverview,
      walletCredits,
      promoPoolCredits,
      revenueMonth,
      revenuePeakMonthly,
      trendFull,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      topOperators: { dealers: [], resellers: [], managers: [] },
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      recentTickets,
      hideManagerLeaderboard: true,
      topOperatorsMode: "dealer",
      activityApiBase: "/api/dealer",
      intelScope: "dealer",
      devicesOnlineCount,
    });
  }

  if (input.scope === "reseller") {
    const u = input.resellerUsername.trim();
    const [
      portalShell,
      walletRevenue,
      trendFull,
      activityByDay,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      topOperators,
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      devicesOnlineCount,
    ] = await Promise.all([
      getCachedPortalDashboardShell(u, "SRSLR").catch(() => ({
        opStats: {
          balance: 0,
          totalAccounts: 0,
          activeAccounts: 0,
          expiredAccounts: 0,
          inactiveAccounts: 0,
          resellerCount: null,
          dealerCount: 0,
        },
        summary: { all: 0, active: 0, expired: 0, inactive: 0 },
        ticketOverview: { grandTotal: 0, inProgress: 0, fixed: 0, reopened: 0, other: 0 },
        expiringSoon: 0,
      })),
      getCachedPortalWalletRevenue(u, "SRSLR").catch(() => ({
        walletCredits: 0,
        promoPoolCredits: 0,
        revenueMonth: 0,
        revenuePeakMonthly: 0,
      })),
      getCachedPortalSubscriberTrend(u, "SRSLR").catch(() => []),
      deferHeavy
        ? Promise.resolve({} as Record<string, { newCount: number; expiredCount: number }>)
        : getResellerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
      deferHeavy
        ? Promise.resolve([] as DashboardDayCreditPoint[])
        : getResellerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as import("@/lib/repos/billing").AdminMessageTrafficDayStack[])
        : getResellerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      deferHeavy
        ? Promise.resolve([] as AdminReportPackageRow[])
        : loadDashboardPackageDistribution({ scope: "reseller", resellerUsername: u }).catch(
            () => [] as AdminReportPackageRow[],
          ),
      deferFeeds
        ? Promise.resolve(emptyFeeds.topOperators)
        : getResellerTopOperatorsLeaderboards(u, 5).catch(() => emptyFeeds.topOperators),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentUsers)
        : listResellerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiredUsers)
        : listResellerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.expiringBuckets)
        : getResellerExpiringSubscriptionBuckets(u).catch(() => emptyFeeds.expiringBuckets),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentTransactions)
        : listResellerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
      deferFeeds
        ? Promise.resolve(emptyFeeds.recentMessagesFeed)
        : listOperatorRecentStalkerSendMessages({ ownerType: "SRSLR", ownerUsername: u }, 5).catch(
            () => [] as AdminRecentStalkerSendMessageRow[],
          ),
      getResellerDevicesOnlineCount(u).catch(() => null),
    ]);

    const { opStats, summary, expiringSoon: expiringSoonForStatus } = portalShell;
    const { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly } = walletRevenue;

    return buildShellProps({
      stats: {
        totalUsers: opStats.totalAccounts,
        managers: 0,
        resellers: 0,
        dealers: opStats.dealerCount ?? 0,
      },
      summary,
      expiringSoonForStatus,
      activityByDay,
      fromDaily,
      toDaily,
      ticketStatusOverview: {
        grandTotal: 0,
        inProgress: 0,
        fixed: 0,
        reopened: 0,
        other: 0,
      },
      walletCredits,
      promoPoolCredits,
      revenueMonth,
      revenuePeakMonthly,
      trendFull,
      creditFlowFull,
      messageTrafficFull,
      packageDistribution,
      topOperators,
      recentUsersLifecycle,
      expiredUsersLifecycle,
      expiringBuckets,
      recentTransactionsFeed,
      recentMessagesFeed,
      recentTickets: [],
      hideManagerLeaderboard: true,
      topOperatorsMode: "reseller",
      activityApiBase: "/api/reseller",
      intelScope: "reseller",
      devicesOnlineCount,
    });
  }

  const u = input.managerUsername.trim();
  const [
    portalShell,
    walletRevenue,
    trendFull,
    activityByDay,
    creditFlowFull,
    messageTrafficFull,
    packageDistribution,
    topOperators,
    recentUsersLifecycle,
    expiredUsersLifecycle,
    expiringBuckets,
    recentTransactionsFeed,
    recentMessagesFeed,
    recentTickets,
    devicesOnlineCount,
  ] = await Promise.all([
    getCachedPortalDashboardShell(u, "MNGR").catch(() => ({
      opStats: {
        balance: 0,
        totalAccounts: 0,
        activeAccounts: 0,
        expiredAccounts: 0,
        inactiveAccounts: 0,
        resellerCount: 0,
        dealerCount: 0,
      },
      summary: { all: 0, active: 0, expired: 0, inactive: 0 },
      ticketOverview: { grandTotal: 0, inProgress: 0, fixed: 0, reopened: 0, other: 0 },
      expiringSoon: 0,
    })),
    getCachedPortalWalletRevenue(u, "MNGR").catch(() => ({
      walletCredits: 0,
      promoPoolCredits: 0,
      revenueMonth: 0,
      revenuePeakMonthly: 0,
    })),
    getCachedPortalSubscriberTrend(u, "MNGR").catch(() => []),
    deferHeavy
      ? Promise.resolve({} as Record<string, { newCount: number; expiredCount: number }>)
      : getManagerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
    deferHeavy
      ? Promise.resolve([] as DashboardDayCreditPoint[])
      : getManagerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    deferHeavy
      ? Promise.resolve([] as import("@/lib/repos/billing").AdminMessageTrafficDayStack[])
      : getManagerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    deferHeavy
      ? Promise.resolve([] as AdminReportPackageRow[])
      : loadDashboardPackageDistribution({ scope: "manager", managerUsername: u }).catch(
          () => [] as AdminReportPackageRow[],
        ),
    deferFeeds
      ? Promise.resolve(emptyFeeds.topOperators)
      : getManagerTopOperatorsLeaderboards(u, 5).catch(() => emptyFeeds.topOperators),
    deferFeeds
      ? Promise.resolve(emptyFeeds.recentUsers)
      : listManagerRecentAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
    deferFeeds
      ? Promise.resolve(emptyFeeds.expiredUsers)
      : listManagerRecentlyExpiredAccountsWithHierarchy(u, 5).catch(() => [] as AdminAccountLifecycleRow[]),
    deferFeeds
      ? Promise.resolve(emptyFeeds.expiringBuckets)
      : getManagerExpiringSubscriptionBuckets(u).catch(() => emptyFeeds.expiringBuckets),
    deferFeeds
      ? Promise.resolve(emptyFeeds.recentTransactions)
      : listManagerRecentTransactions(u, 5).catch(() => [] as AdminTransactionRow[]),
    deferFeeds
      ? Promise.resolve(emptyFeeds.recentMessagesFeed)
      : listOperatorRecentStalkerSendMessages({ ownerType: "MNGR", ownerUsername: u }, 5).catch(
          () => [] as AdminRecentStalkerSendMessageRow[],
        ),
    deferFeeds
      ? Promise.resolve(emptyFeeds.recentTicketsFeed)
      : listRecentTicketsForPortalUser(u, "MNGR", 5).catch(() => [] as AdminTicketRow[]),
    getManagerDevicesOnlineCount(u).catch(() => null),
  ]);

  const { opStats, summary, ticketOverview: ticketStatusOverview, expiringSoon: expiringSoonForStatus } = portalShell;
  const { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly } = walletRevenue;

  return buildShellProps({
    stats: {
      totalUsers: opStats.totalAccounts,
      managers: 0,
      resellers: opStats.resellerCount ?? 0,
      dealers: opStats.dealerCount ?? 0,
    },
    summary,
    expiringSoonForStatus,
    activityByDay,
    fromDaily,
    toDaily,
    ticketStatusOverview,
    walletCredits,
    promoPoolCredits,
    revenueMonth,
    revenuePeakMonthly,
    trendFull,
    creditFlowFull,
    messageTrafficFull,
    packageDistribution,
    topOperators,
    recentUsersLifecycle,
    expiredUsersLifecycle,
    expiringBuckets,
    recentTransactionsFeed,
    recentMessagesFeed,
    recentTickets,
    hideManagerLeaderboard: true,
    topOperatorsMode: "manager",
    activityApiBase: "/api/manager",
    intelScope: "manager",
    devicesOnlineCount,
  });
}

function buildShellProps(input: {
  stats: { totalUsers: number; managers: number; resellers: number; dealers: number };
  summary: { active: number; inactive: number; expired: number };
  expiringSoonForStatus: number;
  activityByDay: Record<string, { newCount: number; expiredCount: number }>;
  fromDaily: Date;
  toDaily: Date;
  ticketStatusOverview: AdminTicketStatusOverview;
  walletCredits: number;
  promoPoolCredits: number;
  revenueMonth: number;
  revenuePeakMonthly: number;
  trendFull: DashboardTrendPoint[];
  creditFlowFull: DashboardDayCreditPoint[];
  messageTrafficFull: DashboardShellProps["messageTrafficFull"];
  packageDistribution: AdminReportPackageRow[];
  topOperators: AdminTopOperatorsLeaderboards;
  recentUsersLifecycle: AdminAccountLifecycleRow[];
  expiredUsersLifecycle: AdminAccountLifecycleRow[];
  expiringBuckets: AdminExpiringSubscriptionsBuckets;
  recentTransactionsFeed: AdminTransactionRow[];
  recentMessagesFeed: AdminRecentStalkerSendMessageRow[];
  recentTickets: AdminTicketRow[];
  hideManagerLeaderboard: boolean;
  topOperatorsMode: "admin" | "manager" | "reseller" | "dealer";
  activityApiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  intelScope: DashboardIntelScope;
  devicesOnlineCount: number | null;
}): DashboardShellProps {
  const dailyPointsFull =
    Object.keys(input.activityByDay).length > 0
      ? buildHudDailyPointsFromActivityMap(input.activityByDay, input.fromDaily, input.toDaily)
      : [];
  const activeNonExpiring = Math.max(0, input.summary.active - input.expiringSoonForStatus);

  const { managers, resellers, dealers, totalUsers } = input.stats;
  const branchTotal =
    input.topOperatorsMode === "dealer" || input.topOperatorsMode === "reseller"
      ? Math.max(0, totalUsers)
      : input.topOperatorsMode === "manager" || input.hideManagerLeaderboard
        ? Math.max(0, resellers + dealers)
        : Math.max(0, managers + resellers + dealers);
  const branchPct = (n: number) => (branchTotal > 0 ? (Math.max(0, n) / branchTotal) * 100 : 0);

  const stayingVal = activeNonExpiring;
  const stayingPct = totalUsers > 0 ? (stayingVal / totalUsers) * 100 : 0;
  const revenueVal = Math.round(input.revenueMonth * 100) / 100;
  const peakRev = Math.max(0, input.revenuePeakMonthly);
  const revenuePct =
    revenueVal > 0 && peakRev > 0 ? Math.min(100, (revenueVal / peakRev) * 100) : revenueVal > 0 ? 100 : 0;

  const leftMetrics: DualRingMetric[] =
    input.topOperatorsMode === "dealer"
      ? [
          {
            key: "usr",
            label: "USERS",
            value: totalUsers,
            pct: totalUsers > 0 ? 100 : 0,
            color: "#38bdf8",
          },
        ]
      : input.topOperatorsMode === "reseller"
      ? [
          {
            key: "dlr",
            label: "DEALERS",
            value: dealers,
            pct: branchPct(dealers),
            color: OPERATOR_ROLE_COLORS.dealer,
          },
          {
            key: "usr",
            label: "USERS",
            value: totalUsers,
            pct: totalUsers > 0 ? 100 : 0,
            color: "#38bdf8",
          },
        ]
      : input.hideManagerLeaderboard
    ? [
        {
          key: "rsl",
          label: "RESELLERS",
          value: resellers,
          pct: branchPct(resellers),
          color: OPERATOR_ROLE_COLORS.reseller,
        },
        {
          key: "dlr",
          label: "DEALERS",
          value: dealers,
          pct: branchPct(dealers),
          color: OPERATOR_ROLE_COLORS.dealer,
        },
        {
          key: "usr",
          label: "USERS",
          value: totalUsers,
          pct: totalUsers > 0 ? 100 : 0,
          color: "#38bdf8",
        },
      ]
    : [
        {
          key: "mgr",
          label: "MANAGERS",
          value: managers,
          pct: branchPct(managers),
          color: OPERATOR_ROLE_COLORS.manager,
        },
        {
          key: "rsl",
          label: "RESELLERS",
          value: resellers,
          pct: branchPct(resellers),
          color: OPERATOR_ROLE_COLORS.reseller,
        },
        {
          key: "dlr",
          label: "DEALERS",
          value: dealers,
          pct: branchPct(dealers),
          color: OPERATOR_ROLE_COLORS.dealer,
        },
      ];

  const revenueMetric: DualRingMetric = {
    key: "rev",
    label: "REVENUE",
    value: revenueVal,
    pct: revenuePct,
    color: "#60a5fa",
    legendDisplay: formatMoney(revenueVal),
  };
  const stayingMetric: DualRingMetric = {
    key: "sty",
    label: "STAYING",
    value: stayingVal,
    pct: stayingPct,
    color: "#fb923c",
  };

  const statusGaugesProps: GaugesProps = {
    totalUsers,
    activeUsers: activeNonExpiring,
    inactiveUsers: input.summary.inactive,
    expiredUsers: input.summary.expired,
    expiringSoonUsers: input.expiringSoonForStatus,
  };

  return {
    trendFull: input.trendFull,
    dailyPointsFull,
    creditFlowFull: input.creditFlowFull,
    walletCreditsTotal: input.walletCredits,
    promoPoolCredits: input.promoPoolCredits,
    ticketOverview: input.ticketStatusOverview,
    messageTrafficFull: input.messageTrafficFull,
    packageDistribution: input.packageDistribution,
    topOperators: input.topOperators,
    recentUsers: input.recentUsersLifecycle,
    expiredUsers: input.expiredUsersLifecycle,
    expiringBuckets: input.expiringBuckets,
    recentTransactions: input.recentTransactionsFeed,
    recentTicketsFeed: input.recentTickets,
    recentMessagesFeed: input.recentMessagesFeed,
    leftMetrics,
    revenueMetric,
    stayingMetric,
    branchTotal,
    totalUsers,
    statusGaugesProps,
    hideManagerLeaderboard: input.hideManagerLeaderboard,
    topOperatorsMode: input.topOperatorsMode,
    activityApiBase: input.activityApiBase,
    intelScope: input.intelScope,
    devicesOnlineCount: input.devicesOnlineCount,
  };
}
