import { DASHBOARD_HUD_HISTORY_DAYS } from "@/lib/chart-history-days";
import type { AdminReportPackageRow } from "@/lib/data";
import {
  getAdminCreditFlowByDay,
  getAdminMessageTrafficDayStacks,
  getAdminSubscriberActivityByDayRange,
} from "@/lib/data";
import { getCachedAdminPackageDistribution } from "@/lib/dashboard/cachedDashboardQueries";
import type { AdminMessageTrafficDayStack, DashboardDayCreditPoint } from "@/lib/repos/billing";
import {
  getDealerCreditFlowByDay,
  getDealerMessageTrafficDayStacks,
  getDealerPackageDistribution,
  getDealerSubscriberActivityByDayRange,
  getManagerCreditFlowByDay,
  getManagerMessageTrafficDayStacks,
  getManagerPackageDistribution,
  getManagerSubscriberActivityByDayRange,
  getResellerCreditFlowByDay,
  getResellerMessageTrafficDayStacks,
  getResellerPackageDistribution,
  getResellerSubscriberActivityByDayRange,
} from "@/lib/repos/managerDashboard";
import { dashboardChartDateRange } from "@/lib/dashboard/dashboardChartDateRange";
import { timeDashboardLoad } from "@/lib/dashboard/devTiming";

export type DashboardHeavyChartsInput =
  | { scope: "admin" }
  | { scope: "manager"; managerUsername: string }
  | { scope: "reseller"; resellerUsername: string }
  | { scope: "dealer"; dealerUsername: string };

export type DashboardHeavyChartsData = {
  activityByDay: Record<string, { newCount: number; expiredCount: number }>;
  creditFlowFull: DashboardDayCreditPoint[];
  messageTrafficFull: AdminMessageTrafficDayStack[];
  fromDaily: Date;
  toDaily: Date;
};

/** 90-day activity map + credit-flow + message-traffic (deferred after dashboard shell paints). */
export async function loadDashboardHeavyCharts(
  input: DashboardHeavyChartsInput,
): Promise<DashboardHeavyChartsData> {
  return timeDashboardLoad(`charts:${input.scope}`, async () => {
  const { fromDaily, toDaily } = dashboardChartDateRange();

  if (input.scope === "admin") {
    const [activityByDay, creditFlowFull, messageTrafficFull] = await Promise.all([
      getAdminSubscriberActivityByDayRange(fromDaily, toDaily).catch(() => ({})),
      getAdminCreditFlowByDay(DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      getAdminMessageTrafficDayStacks(DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    ]);
    return { activityByDay, creditFlowFull, messageTrafficFull, fromDaily, toDaily };
  }

  if (input.scope === "dealer") {
    const u = input.dealerUsername.trim();
    const [activityByDay, creditFlowFull, messageTrafficFull] = await Promise.all([
      getDealerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
      getDealerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      getDealerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    ]);
    return { activityByDay, creditFlowFull, messageTrafficFull, fromDaily, toDaily };
  }

  if (input.scope === "reseller") {
    const u = input.resellerUsername.trim();
    const [activityByDay, creditFlowFull, messageTrafficFull] = await Promise.all([
      getResellerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
      getResellerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
      getResellerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    ]);
    return { activityByDay, creditFlowFull, messageTrafficFull, fromDaily, toDaily };
  }

  const u = input.managerUsername.trim();
  const [activityByDay, creditFlowFull, messageTrafficFull] = await Promise.all([
    getManagerSubscriberActivityByDayRange(u, fromDaily, toDaily).catch(() => ({})),
    getManagerCreditFlowByDay(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
    getManagerMessageTrafficDayStacks(u, DASHBOARD_HUD_HISTORY_DAYS).catch(() => []),
  ]);
  return { activityByDay, creditFlowFull, messageTrafficFull, fromDaily, toDaily };
  });
}

/** Package/tariff HUD panel — loaded with deferred heavy charts, not on shell first paint. */
export async function loadDashboardPackageDistribution(
  input: DashboardHeavyChartsInput,
): Promise<AdminReportPackageRow[]> {
  if (input.scope === "admin") {
    return getCachedAdminPackageDistribution().catch(() => []);
  }
  if (input.scope === "dealer") {
    const u = input.dealerUsername.trim();
    return getDealerPackageDistribution(u).catch(() => []);
  }
  if (input.scope === "reseller") {
    const u = input.resellerUsername.trim();
    return getResellerPackageDistribution(u).catch(() => []);
  }
  const u = input.managerUsername.trim();
  return getManagerPackageDistribution(u).catch(() => []);
}
