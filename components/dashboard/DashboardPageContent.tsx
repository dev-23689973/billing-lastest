import { Suspense } from "react";
import { AdminDashboardShell } from "@/components/dashboard/AdminDashboardShell";
import { MobileBillingProfileCard } from "@/components/layout/MobileBillingProfileCard";
import { getPanelTitle } from "@/lib/panel-title";
import { getSession } from "@/lib/session";
import type { PortalBase } from "@/lib/portal-nav";
import {
  DashboardCompactCreditChartFallback,
  DashboardCompactCreditSummaryFallback,
} from "@/components/dashboard/DashboardCompactCreditFallback";
import { DashboardCompactCreditChartSlot } from "@/components/dashboard/DashboardCompactCreditChartSlot";
import { DashboardCompactCreditSummarySlot } from "@/components/dashboard/DashboardCompactCreditSummarySlot";
import { DashboardHeavyChartsFallback } from "@/components/dashboard/DashboardHeavyChartsFallback";
import { DashboardHeavyChartsSlot } from "@/components/dashboard/DashboardHeavyChartsSlot";
import { DashboardActivityOverviewChartFallback } from "@/components/dashboard/DashboardActivityOverviewChartFallback";
import { DashboardActivityOverviewChartSlot } from "@/components/dashboard/DashboardActivityOverviewChartSlot";
import { DashboardShellFeedsFallback } from "@/components/dashboard/DashboardShellFeedsFallback";
import { DashboardShellFeedsSlot } from "@/components/dashboard/DashboardShellFeedsSlot";
import { loadDashboardShellProps } from "@/lib/dashboard/loadDashboardShellProps";
import { loadDashboardShellFeeds } from "@/lib/dashboard/loadDashboardShellFeeds";
import {
  loadDashboardHeavyCharts,
  loadDashboardPackageDistribution,
  type DashboardHeavyChartsInput,
} from "@/lib/dashboard/loadDashboardHeavyCharts";

function dashboardPortalBase(portalBase: string): PortalBase | undefined {
  if (portalBase === "/manager" || portalBase === "/reseller" || portalBase === "/dealer") {
    return portalBase;
  }
  return undefined;
}

export async function DashboardPageContent(
  input: DashboardHeavyChartsInput & { portalBase: string },
) {
  const [session, panelTitle] = await Promise.all([getSession(), getPanelTitle()]);

  // Start deferred sections immediately so they load in parallel with the shell (not after it paints).
  const heavyDataPromise = Promise.all([
    loadDashboardHeavyCharts(input),
    loadDashboardPackageDistribution(input),
  ]);
  const feedsPromise = loadDashboardShellFeeds(input);

  const props = await loadDashboardShellProps({
    ...input,
    deferHeavyCharts: true,
    deferFeeds: true,
  });

  const compactCreditSummarySlot = (
    <Suspense key="dashboard-compact-credit-summary" fallback={<DashboardCompactCreditSummaryFallback />}>
      <DashboardCompactCreditSummarySlot
        input={input}
        heavyDataPromise={heavyDataPromise}
        walletCreditsTotal={props.walletCreditsTotal}
        promoPoolCredits={props.promoPoolCredits}
      />
    </Suspense>
  );

  const compactCreditChartSlot = (
    <Suspense key="dashboard-compact-credit-chart" fallback={<DashboardCompactCreditChartFallback />}>
      <DashboardCompactCreditChartSlot
        input={input}
        heavyDataPromise={heavyDataPromise}
        walletCreditsTotal={props.walletCreditsTotal}
        promoPoolCredits={props.promoPoolCredits}
      />
    </Suspense>
  );

  const heavyChartsSlot = (
    <Suspense key="dashboard-heavy-charts" fallback={<DashboardHeavyChartsFallback />}>
      <DashboardHeavyChartsSlot
        input={input}
        heavyDataPromise={heavyDataPromise}
        walletCreditsTotal={props.walletCreditsTotal}
        promoPoolCredits={props.promoPoolCredits}
        ticketOverview={props.ticketOverview}
      />
    </Suspense>
  );

  const activityChartSlot = (
    <Suspense key="dashboard-activity-chart" fallback={<DashboardActivityOverviewChartFallback />}>
      <DashboardActivityOverviewChartSlot input={input} heavyDataPromise={heavyDataPromise} />
    </Suspense>
  );

  const feedsSlot = (
    <Suspense key="dashboard-feeds" fallback={<DashboardShellFeedsFallback />}>
      <DashboardShellFeedsSlot
        input={input}
        feedsPromise={feedsPromise}
        hideManagerLeaderboard={props.hideManagerLeaderboard ?? false}
        topOperatorsMode={props.topOperatorsMode ?? "admin"}
      />
    </Suspense>
  );

  const mobileProfileSlot =
    session != null ? (
      <MobileBillingProfileCard
        session={session}
        panelTitle={panelTitle}
        portalBase={dashboardPortalBase(input.portalBase)}
      />
    ) : null;

  return (
    <AdminDashboardShell
      {...props}
      portalBase={input.portalBase}
      mobileProfileSlot={mobileProfileSlot}
      compactCreditSummarySlot={compactCreditSummarySlot}
      compactCreditChartSlot={compactCreditChartSlot}
      heavyChartsSlot={heavyChartsSlot}
      activityChartSlot={activityChartSlot}
      feedsSlot={feedsSlot}
    />
  );
}
