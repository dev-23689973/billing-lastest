"use client";

import { useMemo } from "react";

import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { useLivingCount } from "@/components/dashboard/useLivingCount";
import { useOptionalDashboardPeriod } from "@/components/dashboard/hud/DashboardPeriodContext";
import { HudCommunicationRelayPanel } from "@/components/dashboard/hud/HudCommunicationRelayPanel";
import { HudMessageTrafficBars } from "@/components/dashboard/hud/HudMessageTrafficBars";
import { HudPackageDistributionPanel } from "@/components/dashboard/hud/HudPackageDistributionPanel";
import { HudTicketLifecycleRings } from "@/components/dashboard/hud/HudTicketLifecycleRings";
import { useHudWideLayout } from "@/components/dashboard/hud/useHudWideLayout";
import { hudMutedOuterShell, dashboardRelayPackageGrid, dashboardTicketMessageTrafficGrid } from "@/components/dashboard/hud/hudDashboardLayout";
import { buildMessageTrafficSeriesForPeriod } from "@/lib/dashboardPeriodSlice";
import type { AdminMessageTrafficDayStack } from "@/lib/repos/billing";
import type { AdminReportPackageRow } from "@/lib/dashboard/types";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";
import { cn } from "@/lib/cn";

const hudGlassDeckPill = cn("border-0 bg-transparent hud-glass-deck-border");

export function AdminTicketMessageHudSection({
  ticketOverview,
  messageTrafficFull,
  packageDistribution,
  className,
}: {
  ticketOverview: AdminTicketStatusOverview;
  /** Full daily series from the server (e.g. last 366 days); sliced by header period like credit flow. */
  messageTrafficFull: AdminMessageTrafficDayStack[];
  /** Top tariff plans by user count (server-prefetched). */
  packageDistribution: AdminReportPackageRow[];
  className?: string;
}) {
  const { tips } = useDashboardIntel();
  const hudWide = useHudWideLayout();
  const livingGrandTotal = useLivingCount(Math.max(0, ticketOverview.grandTotal));
  const periodCtx = useOptionalDashboardPeriod();

  const messageTrafficForPeriod = useMemo(() => {
    if (!periodCtx) return messageTrafficFull.slice(-8);
    return buildMessageTrafficSeriesForPeriod(messageTrafficFull, periodCtx.period);
  }, [messageTrafficFull, periodCtx]);

  const trafficSubtitle = useMemo(() => {
    if (!periodCtx) return "Priority mix and delivery by day";
    switch (periodCtx.period) {
      case "1w":
        return "Priority mix and delivery by day";
      case "1m":
        return "Priority mix and delivery by week";
      case "3m":
        return "Priority mix and delivery by 2 weeks";
      case "6m":
        return "Priority mix and delivery by month";
      case "1y":
        return "Priority mix and delivery by 2 months";
      default:
        return "Priority mix and delivery";
    }
  }, [periodCtx]);

  return (
    <section
      className={cn("mb-2 w-full min-w-0 lg:mb-4", className)}
      aria-labelledby="admin-ticket-message-hud-title"
    >
      <h2 id="admin-ticket-message-hud-title" className="sr-only">
        Ticket management and message traffic
      </h2>
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className={dashboardTicketMessageTrafficGrid}>
          {/* Ticket management — rings grid fills card width (no shrink-wrap dead space). */}
        <div className={cn(hudMutedOuterShell, "flex min-w-0 flex-col min-[1280px]:h-full")}>
          <div className="relative z-[1] flex h-full min-h-0 w-full flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-3 sm:px-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="animate-session-label-shine font-mono text-sm font-bold uppercase tracking-[0.14em] text-slate-900 sm:text-base dark:text-slate-50">
                  Ticket management
                </h3>
                <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500/90">
                  Lifecycle distribution
                </p>
              </div>
              <div className="flex shrink-0 items-end justify-end gap-1.5 sm:gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-200/95",
                    "border border-slate-200/90 bg-white/90 shadow-sm dark:border-0 dark:shadow-none dark:backdrop-blur-[2px]",
                    hudGlassDeckPill,
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600 dark:bg-cyan-400"
                    aria-hidden
                  />
                  Total:{" "}
                  <span className="tabular-nums text-cyan-900 dark:animate-living-quad-hub-readout dark:text-cyan-50">
                    {livingGrandTotal.toLocaleString()}
                  </span>
                </span>
                  <IntelGuideBadge size="sm" tip={tips.ticketLifecycle} />
              </div>
            </div>
            <div className="flex min-h-[11rem] w-full flex-1 items-center py-1 sm:min-h-[12.5rem] sm:py-2">
              <HudTicketLifecycleRings overview={ticketOverview} />
            </div>
          </div>
        </div>

        {/* Message traffic — fixed plot height when stacked; grows with ticket panel from 1280px */}
        <div className={cn(hudMutedOuterShell, "flex min-h-0 min-w-0 flex-col min-[1280px]:h-full")}>
          <div className="relative z-[1] flex min-h-0 flex-col gap-1.5 p-2 sm:p-2.5 sm:px-3 min-[1280px]:h-full">
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-mono text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-slate-50">Message traffic</h3>
                <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary dark:text-cyan-500/75">
                  {trafficSubtitle}
                </p>
              </div>
              <IntelGuideBadge size="sm" className="shrink-0" tip={tips.messageTraffic} />
            </div>
            <div className="flex w-full min-h-0 flex-col min-[1280px]:flex-1">
              <HudMessageTrafficBars
                days={messageTrafficForPeriod}
                fillHeight={hudWide}
                className={cn("w-full min-h-0", hudWide && "h-full flex-1")}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={dashboardRelayPackageGrid}>
        <HudCommunicationRelayPanel days={messageTrafficForPeriod} className="min-w-0 w-full" />
        <HudPackageDistributionPanel rows={packageDistribution} className="min-w-0 w-full" />
      </div>
    </div>
    </section>
  );
}
