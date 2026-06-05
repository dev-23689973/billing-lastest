import { DashboardHeavyChartsSections } from "@/components/dashboard/DashboardHeavyChartsSections";
import {
  loadDashboardHeavyCharts,
  loadDashboardPackageDistribution,
  type DashboardHeavyChartsData,
  type DashboardHeavyChartsInput,
} from "@/lib/dashboard/loadDashboardHeavyCharts";
import type { AdminReportPackageRow } from "@/lib/dashboard/types";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";

export async function DashboardHeavyChartsSlot({
  input,
  heavyDataPromise,
  walletCreditsTotal,
  promoPoolCredits,
  ticketOverview,
}: {
  input: DashboardHeavyChartsInput;
  heavyDataPromise?: Promise<[DashboardHeavyChartsData, AdminReportPackageRow[]]>;
  walletCreditsTotal: number;
  promoPoolCredits: number;
  ticketOverview: AdminTicketStatusOverview;
}) {
  const [charts, packageDistribution] = heavyDataPromise
    ? await heavyDataPromise
    : await Promise.all([
        loadDashboardHeavyCharts(input),
        loadDashboardPackageDistribution(input),
      ]);

  return (
    <DashboardHeavyChartsSections
      charts={charts}
      walletCreditsTotal={walletCreditsTotal}
      promoPoolCredits={promoPoolCredits}
      ticketOverview={ticketOverview}
      packageDistribution={packageDistribution}
    />
  );
}
