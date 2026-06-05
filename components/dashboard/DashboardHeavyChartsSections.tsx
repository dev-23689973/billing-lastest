"use client";

import { AdminTicketMessageHudSection } from "@/components/dashboard/hud";
import type { DashboardHeavyChartsData } from "@/lib/dashboard/loadDashboardHeavyCharts";
import type { AdminReportPackageRow } from "@/lib/dashboard/types";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";

export function DashboardHeavyChartsSections({
  charts,
  ticketOverview,
  packageDistribution,
}: {
  charts: DashboardHeavyChartsData;
  walletCreditsTotal: number;
  promoPoolCredits: number;
  ticketOverview: AdminTicketStatusOverview;
  packageDistribution: AdminReportPackageRow[];
}) {
  return (
    <AdminTicketMessageHudSection
      ticketOverview={ticketOverview}
      messageTrafficFull={charts.messageTrafficFull}
      packageDistribution={packageDistribution}
      className="px-0"
    />
  );
}
