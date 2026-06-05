"use client";

import { memo, useMemo } from "react";

import type { DashboardTrendPoint } from "@/lib/dashboard/types";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { HudDualSeriesAreaChart, type HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import { hudMonthKey } from "@/components/dashboard/hud/hudMonthKey";
import { hudDashEyebrow, hudDashShell, hudDashTitle } from "@/components/dashboard/hud/hudDashboardLayout";
import { useOptionalDashboardPeriod } from "@/components/dashboard/hud/DashboardPeriodContext";
import {
  ActivityOverviewProvider,
  AdminActivityCalendarPanel,
} from "@/components/dashboard/hud/ActivityOverviewContext";
import { cn } from "@/lib/cn";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function trendWindow(trend: DashboardTrendPoint[], endMonth: Date, count: number) {
  const end = hudMonthKey(endMonth);
  const asc = [...trend].sort((a, b) => a.key.localeCompare(b.key));
  const upto = asc.filter((t) => t.key <= end);
  return upto.slice(-count);
}

const activityOverviewSeriesA = {
  name: "New users",
  stroke: "#22d3ee",
  fillHi: "#22d3ee",
  fillLo: "#0891b2",
} as const;

const activityOverviewSeriesB = {
  name: "Expired users",
  stroke: "#e879f9",
  fillHi: "#e879f9",
  fillLo: "#a21caf",
} as const;

const AdminActivityOverviewChartColumn = memo(function AdminActivityOverviewChartColumn({
  points,
  periodKey,
}: {
  points: HudDualSeriesPoint[];
  periodKey: string;
}) {
  const { tips } = useDashboardIntel();
  return (
    <div className={cn(hudDashShell, "min-w-0 w-full overflow-visible px-3 py-2.5 sm:px-4 sm:py-3 lg:px-4 lg:py-3.5")}>
      <div className="relative z-[1] flex min-h-0 flex-col overflow-visible">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="admin-activity-overview-title" className={hudDashTitle}>
              User Activity Overview
            </h2>
            <p className={hudDashEyebrow}>New accounts vs expirations</p>
          </div>
          <IntelGuideBadge size="sm" className="shrink-0" tip={tips.userActivityOverview} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-200/95">
            <span className="h-2 w-2 rounded-full bg-primary dark:bg-cyan-400 dark:shadow-[0_0_6px_rgba(34,211,238,0.35)]" />
            New users
          </span>
          <span className="inline-flex items-center gap-1.5 text-fuchsia-800 dark:text-fuchsia-200/95">
            <span className="h-2 w-2 rounded-full bg-fuchsia-500 dark:bg-fuchsia-400 dark:shadow-[0_0_6px_rgba(232,121,249,0.35)]" />
            Expired users
          </span>
        </div>
        <div className="-ml-3 mt-1.5 min-h-0 w-[calc(100%+1.25rem)] overflow-visible pr-1 sm:-ml-4 sm:w-[calc(100%+1.5rem)]">
          <HudDualSeriesAreaChart
            chartKey={`activity-overview-${periodKey}`}
            points={points}
            yLabel="Number of users"
            xLabel="Activity period"
            seriesA={activityOverviewSeriesA}
            seriesB={activityOverviewSeriesB}
            heightClass="h-[260px] min-h-[260px] sm:h-[300px] sm:min-h-[300px] lg:h-[332px] lg:min-h-[332px]"
            emptyLabel="No activity in this window."
          />
        </div>
      </div>
    </div>
  );
});

/** Full-width activity chart (calendar lives in the top HUD row). */
export function AdminActivityOverviewChartSection({
  trend,
  activityChartPoints: activityChartPointsProp,
  className,
  windowMonths = 6,
  embedded = false,
}: {
  trend: DashboardTrendPoint[];
  activityChartPoints?: HudDualSeriesPoint[];
  className?: string;
  windowMonths?: number;
  /** When true, omit outer `<section>` (e.g. legacy calendar+chart grid). */
  embedded?: boolean;
}) {
  const periodCtx = useOptionalDashboardPeriod();

  const chartPoints: HudDualSeriesPoint[] = useMemo(() => {
    if (activityChartPointsProp) return activityChartPointsProp;
    if (periodCtx) return periodCtx.activityChartPoints;
    const slice = trendWindow(trend, startOfMonth(new Date()), windowMonths);
    return slice.map((t) => ({
      id: t.key,
      x: t.label,
      a: t.newAccounts,
      b: t.expired,
    }));
  }, [activityChartPointsProp, periodCtx, trend, windowMonths]);

  const periodKey = periodCtx?.period ?? "fallback";

  const chart = <AdminActivityOverviewChartColumn points={chartPoints} periodKey={periodKey} />;
  if (embedded) {
    return <div className={cn("min-w-0 w-full", className)}>{chart}</div>;
  }
  return (
    <section className={cn("mb-6 w-full min-w-0 lg:mb-8", className)} aria-labelledby="admin-activity-overview-title">
      {chart}
    </section>
  );
}

/** Legacy combined layout (calendar + chart side by side). Prefer split layout in `AdminDashboardShell`. */
export function AdminActivityOverviewSection({
  trend,
  activityChartPoints,
  className,
  windowMonths = 6,
  activityApiBase = "/api/admin",
}: {
  trend: DashboardTrendPoint[];
  activityChartPoints?: HudDualSeriesPoint[];
  className?: string;
  windowMonths?: number;
  activityApiBase?: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
}) {
  return (
    <ActivityOverviewProvider activityApiBase={activityApiBase}>
      <section className={cn("mb-6 w-full min-w-0 lg:mb-8", className)} aria-labelledby="admin-activity-overview-title">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:gap-8">
          <AdminActivityCalendarPanel />
          <AdminActivityOverviewChartSection
            trend={trend}
            activityChartPoints={activityChartPoints}
            windowMonths={windowMonths}
            className="mb-0"
            embedded
          />
        </div>
      </section>
    </ActivityOverviewProvider>
  );
}
