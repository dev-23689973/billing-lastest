"use client";

import { useLayoutEffect } from "react";
import type { HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import { useDashboardPeriod } from "@/components/dashboard/hud/DashboardPeriodContext";

/** Merges deferred HUD activity points into the dashboard period context (growth + activity chart). */
export function DashboardDailyPointsHydrator({ dailyPointsFull }: { dailyPointsFull: HudDualSeriesPoint[] }) {
  const { hydrateDailyPoints } = useDashboardPeriod();

  useLayoutEffect(() => {
    hydrateDailyPoints(dailyPointsFull);
  }, [dailyPointsFull, hydrateDailyPoints]);

  return null;
}
