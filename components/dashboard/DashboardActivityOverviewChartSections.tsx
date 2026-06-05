"use client";

import { useMemo } from "react";

import { AdminActivityOverviewChartSection } from "@/components/dashboard/hud";
import { useDashboardPeriod } from "@/components/dashboard/hud/DashboardPeriodContext";
import { DashboardDailyPointsHydrator } from "@/components/dashboard/DashboardDailyPointsHydrator";
import { buildActivityChartPoints, buildHudDailyPointsFromActivityMap } from "@/lib/dashboardPeriodSlice";
import type { DashboardHeavyChartsData } from "@/lib/dashboard/loadDashboardHeavyCharts";

export function DashboardActivityOverviewChartSections({ charts }: { charts: DashboardHeavyChartsData }) {
  const { trendFull, period } = useDashboardPeriod();
  const dailyPointsFull = useMemo(
    () => buildHudDailyPointsFromActivityMap(charts.activityByDay, charts.fromDaily, charts.toDaily),
    [charts.activityByDay, charts.fromDaily, charts.toDaily],
  );
  const activityChartPoints = useMemo(
    () => buildActivityChartPoints(trendFull, dailyPointsFull, period),
    [trendFull, dailyPointsFull, period],
  );

  return (
    <>
      <DashboardDailyPointsHydrator dailyPointsFull={dailyPointsFull} />
      <AdminActivityOverviewChartSection
        trend={trendFull}
        activityChartPoints={activityChartPoints}
        className="mb-0 px-0"
        embedded
      />
    </>
  );
}
