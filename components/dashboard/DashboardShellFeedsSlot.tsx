import { DashboardShellFeedsSections } from "@/components/dashboard/DashboardShellFeedsSections";
import type { DashboardShellFeedsData } from "@/lib/dashboard/dashboardShellFeedsDefaults";
import { loadDashboardShellFeeds } from "@/lib/dashboard/loadDashboardShellFeeds";
import type { DashboardHeavyChartsInput } from "@/lib/dashboard/loadDashboardHeavyCharts";

export async function DashboardShellFeedsSlot({
  input,
  feedsPromise,
  hideManagerLeaderboard,
  topOperatorsMode,
}: {
  input: DashboardHeavyChartsInput;
  feedsPromise?: Promise<DashboardShellFeedsData>;
  hideManagerLeaderboard: boolean;
  topOperatorsMode: "admin" | "manager" | "reseller" | "dealer";
}) {
  const feeds = feedsPromise ? await feedsPromise : await loadDashboardShellFeeds(input);

  return (
    <DashboardShellFeedsSections
      feeds={feeds}
      hideManagerLeaderboard={hideManagerLeaderboard}
      topOperatorsMode={topOperatorsMode}
    />
  );
}
