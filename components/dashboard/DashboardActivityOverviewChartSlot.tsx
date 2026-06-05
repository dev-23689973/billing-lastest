import { DashboardActivityOverviewChartSections } from "@/components/dashboard/DashboardActivityOverviewChartSections";
import {
  loadDashboardHeavyCharts,
  type DashboardHeavyChartsData,
  type DashboardHeavyChartsInput,
} from "@/lib/dashboard/loadDashboardHeavyCharts";

export async function DashboardActivityOverviewChartSlot({
  input,
  heavyDataPromise,
}: {
  input: DashboardHeavyChartsInput;
  heavyDataPromise?: Promise<[DashboardHeavyChartsData, unknown]>;
}) {
  const [charts] = heavyDataPromise
    ? await heavyDataPromise
    : [await loadDashboardHeavyCharts(input)];

  return <DashboardActivityOverviewChartSections charts={charts} />;
}
