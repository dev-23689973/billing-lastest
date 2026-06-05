import { DASHBOARD_HUD_HISTORY_DAYS } from "@/lib/chart-history-days";

export function dashboardChartDateRange(): { fromDaily: Date; toDaily: Date } {
  const fromDaily = new Date();
  fromDaily.setHours(0, 0, 0, 0);
  fromDaily.setDate(fromDaily.getDate() - (DASHBOARD_HUD_HISTORY_DAYS - 1));
  const toDaily = new Date();
  return { fromDaily, toDaily };
}
