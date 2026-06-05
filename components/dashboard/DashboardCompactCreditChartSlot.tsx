import { AdminCreditFlowAnalysisSection } from "@/components/dashboard/hud";
import type { DashboardHeavyChartsData, DashboardHeavyChartsInput } from "@/lib/dashboard/loadDashboardHeavyCharts";
import { loadDashboardHeavyCharts } from "@/lib/dashboard/loadDashboardHeavyCharts";

export async function DashboardCompactCreditChartSlot({
  input,
  heavyDataPromise,
  walletCreditsTotal,
  promoPoolCredits,
}: {
  input: DashboardHeavyChartsInput;
  heavyDataPromise?: Promise<[DashboardHeavyChartsData, unknown]>;
  walletCreditsTotal: number;
  promoPoolCredits: number;
}) {
  const [charts] = heavyDataPromise
    ? await heavyDataPromise
    : [await loadDashboardHeavyCharts(input)];

  return (
    <AdminCreditFlowAnalysisSection
      creditFlowFull={charts.creditFlowFull}
      walletCreditsTotal={walletCreditsTotal}
      promoPoolCredits={promoPoolCredits}
      layout="chart"
      className="mb-0 h-full px-0"
    />
  );
}
