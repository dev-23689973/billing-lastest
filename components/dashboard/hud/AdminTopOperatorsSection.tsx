"use client";

import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { HudFeedCard, HudFeedTableShell } from "@/components/dashboard/hud/HudFeedCard";
import {
  hudDashTableEmpty,
  hudFeedCardBodyCell,
  hudFeedCardCellRight,
  hudFeedCardHeaderCell,
  hudFeedCardTablePad,
  hudFeedCardTableText,
  hudFeedTableBodyRow,
  hudFeedTableHeaderRow,
  hudTopOperatorsTableGrid,
} from "@/components/dashboard/hud/hudDashboardLayout";
import type { IntelTip } from "@/components/dashboard/IntelGuideBadge";
import {
  OPERATOR_ROLE_DOT_CLASS,
  type OperatorRole,
} from "@/components/dashboard/operatorRoleColors";
import { OperatorPresenceDot } from "@/components/realtime/OperatorPresenceDot";
import type { AdminTopOperatorRow, AdminTopOperatorsLeaderboards } from "@/lib/dashboard/types";
import { cn } from "@/lib/cn";

function formatRevenue(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

/** Cap rows at 5 even if the caller forgets to slice — UI promise: "Top 5". */
const MAX_VISIBLE_ROWS = 5;

function LeaderboardCard({
  title,
  subtitle,
  operatorColumnLabel,
  rows,
  role,
  tip,
}: {
  title: string;
  subtitle: string;
  operatorColumnLabel: string;
  rows: AdminTopOperatorRow[];
  role: OperatorRole;
  tip: IntelTip;
}) {
  return (
    <HudFeedCard title={title} subtitle={subtitle} accentDotClass={OPERATOR_ROLE_DOT_CLASS[role]} tip={tip}>
      <HudFeedTableShell>
        <div role="grid" className={cn(hudTopOperatorsTableGrid, hudFeedCardTablePad)}>
          <div role="row" className={hudFeedTableHeaderRow}>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              {operatorColumnLabel}
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right tabular-nums")}>
              Subs
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right tabular-nums")}>
              Revenue
            </span>
          </div>

          {rows.length === 0 ? (
            <p className={cn(hudDashTableEmpty, hudFeedCardTableText)}>No activity recorded.</p>
          ) : (
            rows.slice(0, MAX_VISIBLE_ROWS).map((row) => (
              <div key={row.username} role="row" className={hudFeedTableBodyRow}>
                <span role="cell" className={cn(hudFeedCardBodyCell, "!flex items-center gap-2")}>
                  <OperatorPresenceDot username={row.username} role={role} />
                  <span className="truncate" title={row.username}>
                    {row.username}
                  </span>
                </span>
                <span role="cell" className={hudFeedCardCellRight}>
                  {formatInt(row.subscribers)}
                </span>
                <span
                  role="cell"
                  className={cn(
                    hudFeedCardCellRight,
                    row.revenue > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-slate-500",
                  )}
                >
                  {formatRevenue(row.revenue)}
                </span>
              </div>
            ))
          )}
        </div>
      </HudFeedTableShell>
    </HudFeedCard>
  );
}

export function AdminTopOperatorsSection({
  data,
  className,
  hideManagerLeaderboard = false,
  topOperatorsMode = "admin",
  embedded = false,
}: {
  data: AdminTopOperatorsLeaderboards;
  className?: string;
  hideManagerLeaderboard?: boolean;
  topOperatorsMode?: "admin" | "manager" | "reseller" | "dealer";
  /** Single card only — omit section wrapper (reseller 2×2 grid). */
  embedded?: boolean;
}) {
  const { tips } = useDashboardIntel();
  const resellerOnly = topOperatorsMode === "reseller";
  const grid = (
    <div
      className={cn(
        "grid min-w-0 w-full",
        embedded || resellerOnly
          ? "grid-cols-1"
          : cn(
              "gap-4 md:grid-cols-2 lg:gap-5 xl:gap-6",
              hideManagerLeaderboard ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3",
            ),
        className,
      )}
    >
        <LeaderboardCard
          title="Top dealers"
          subtitle="By revenue and subscribers"
          operatorColumnLabel="Dealer"
          rows={data.dealers}
          role="dealer"
          tip={tips.topOperatorsDealer}
        />
        {resellerOnly ? null : (
          <LeaderboardCard
            title="Top resellers"
            subtitle="By revenue and subscribers"
            operatorColumnLabel="Reseller"
            rows={data.resellers}
            role="reseller"
            tip={tips.topOperatorsReseller}
          />
        )}
        {hideManagerLeaderboard || resellerOnly ? null : (
        <LeaderboardCard
          title="Top managers"
          subtitle="By revenue and subscribers"
          operatorColumnLabel="Manager"
          rows={data.managers}
          role="manager"
          tip={tips.topOperatorsManager}
        />
        )}
    </div>
  );

  if (embedded) return grid;

  return (
    <section
      className={cn("mb-2 w-full min-w-0 lg:mb-4", className)}
      aria-labelledby="admin-top-operators-title"
    >
      <h2 id="admin-top-operators-title" className="sr-only">
        Top earning operators by tier
      </h2>
      {grid}
    </section>
  );
}
