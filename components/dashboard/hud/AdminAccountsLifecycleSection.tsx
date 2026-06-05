"use client";

import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { HudFeedCard, HudFeedTableShell } from "@/components/dashboard/hud/HudFeedCard";
import {
  dashboardFeedsTwoColumnGrid,
  hudDashTableEmpty,
  hudFeedCardBodyCell,
  hudFeedCardCellRight,
  hudFeedCardHeaderCell,
  hudFeedCardPillCell,
  hudFeedCardPeriodCell,
  hudFeedCardPillHeaderCell,
  hudFeedCardTablePad,
  hudFeedCellLine,
  hudFeedExpiredColExpires,
  hudFeedExpiredColHierarchy,
  hudFeedExpiringColAtRisk,
  hudFeedExpiringColCount,
  hudFeedExpiringColRisk,
  hudFeedExpiringColShare,
  hudFeedExpiringMobileMeta,
  hudFeedExpiringRiskInline,
  hudFeedExpiringScrollShell,
  hudFeedGridExpiredUsers,
  hudFeedGridExpiring,
  hudFeedGridRecentUsers,
  hudFeedRecentColCreated,
  hudFeedRecentColExpires,
  hudFeedRecentColHierarchy,
  hudFeedRecentColState,
  hudFeedRecentMobileMeta,
  hudFeedTableBodyRow,
  hudFeedTableHeaderRow,
  hudFeedTablePill,
  hudFeedTableScrollShell,
} from "@/components/dashboard/hud/hudDashboardLayout";
import type {
  AdminAccountLifecycleRow,
  AdminExpiringBucketRow,
  AdminExpiringSubscriptionsBuckets,
} from "@/lib/dashboard/types";
import type { IntelTip } from "@/components/dashboard/IntelGuideBadge";
import { cn } from "@/lib/cn";

function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}

function formatMonthDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCreatedLine(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  const day = 86_400_000;
  return Math.round((d.getTime() - Date.now()) / day);
}

type LifecycleState =
  | { kind: "active"; label: string; pillClass: string; subline: string }
  | { kind: "expiring"; label: string; pillClass: string; subline: string }
  | { kind: "expired"; label: string; pillClass: string; subline: string }
  | { kind: "inactive"; label: string; pillClass: string; subline: string };

const ACCOUNT_OFF = 1;

function classifyAccount(row: AdminAccountLifecycleRow): LifecycleState {
  const remaining = daysFromNow(row.expires);
  if (row.status === ACCOUNT_OFF) {
    return {
      kind: "inactive",
      label: "Inactive",
      pillClass: "bg-slate-500/15 text-slate-700 ring-slate-500/35 dark:text-slate-300 dark:ring-slate-500/25",
      subline: "Disabled",
    };
  }
  if (remaining === null) {
    return {
      kind: "active",
      label: "Active",
      pillClass: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/35 dark:text-emerald-300 dark:ring-emerald-500/25",
      subline: "No expiry",
    };
  }
  if (remaining < 0) {
    return {
      kind: "expired",
      label: "Expired",
      pillClass: "bg-rose-500/15 text-rose-800 ring-rose-500/35 dark:text-rose-300 dark:ring-rose-500/25",
      subline: `Ended ${Math.abs(remaining)}d ago`,
    };
  }
  if (remaining <= 7) {
    return {
      kind: "expiring",
      label: "Soon",
      pillClass: "bg-amber-500/15 text-amber-800 ring-amber-500/35 dark:text-amber-200 dark:ring-amber-500/30",
      subline: `${remaining}d left`,
    };
  }
  return {
    kind: "active",
    label: "Active",
    pillClass: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/35 dark:text-emerald-300 dark:ring-emerald-500/25",
    subline: `${remaining}d left`,
  };
}

const PERIOD_LABEL_SHORT: Record<AdminExpiringBucketRow["key"], string> = {
  "24h": "24 hours",
  "3d": "3 days",
  "7d": "7 days",
  "15d": "15 days",
  "30d": "30 days",
};

function riskPill(key: AdminExpiringBucketRow["key"]): { label: string; className: string } {
  switch (key) {
    case "24h":
    case "3d":
      return {
        label: "Critical",
        className: "bg-rose-500/15 text-rose-800 ring-rose-500/35 dark:text-rose-300 dark:ring-rose-500/30",
      };
    case "7d":
      return {
        label: "High",
        className: "bg-amber-500/15 text-amber-800 ring-amber-500/35 dark:text-amber-200 dark:ring-amber-500/30",
      };
    case "15d":
    case "30d":
      return {
        label: "Medium",
        className: "bg-sky-500/15 text-sky-800 ring-sky-500/35 dark:text-sky-200 dark:ring-sky-500/25",
      };
  }
}

const LIFECYCLE_USER_ROWS = 5;

function UsersTableCard({
  title,
  subtitle,
  accentDotClass,
  rows,
  variant,
  emptyLabel,
  tip,
}: {
  title: string;
  subtitle: string;
  accentDotClass: string;
  rows: AdminAccountLifecycleRow[];
  variant: "recent" | "expired";
  emptyLabel: string;
  tip: IntelTip;
}) {
  const gridClass = variant === "recent" ? hudFeedGridRecentUsers : hudFeedGridExpiredUsers;
  const visible = rows.slice(0, LIFECYCLE_USER_ROWS);

  return (
    <HudFeedCard title={title} subtitle={subtitle} accentDotClass={accentDotClass} tip={tip}>
      <div className={hudFeedTableScrollShell}>
        <HudFeedTableShell className="rounded-none bg-transparent dark:bg-transparent">
          <div role="grid" className={cn(gridClass, hudFeedCardTablePad)}>
            <div role="row" className={hudFeedTableHeaderRow}>
              <span role="columnheader" className={hudFeedCardHeaderCell}>
                User
              </span>
              <span
                role="columnheader"
                className={cn(
                  hudFeedCardHeaderCell,
                  variant === "recent" ? hudFeedRecentColHierarchy : hudFeedExpiredColHierarchy,
                )}
              >
                Hierarchy
              </span>
              {variant === "recent" ? (
                <span role="columnheader" className={cn(hudFeedCardHeaderCell, hudFeedRecentColCreated)}>
                  Created
                </span>
              ) : null}
              <span
                role="columnheader"
                className={cn(
                  hudFeedCardHeaderCell,
                  variant === "expired" ? cn("text-right", hudFeedExpiredColExpires) : hudFeedRecentColExpires,
                )}
              >
                Expires
              </span>
              {variant === "recent" ? (
                <span role="columnheader" className={cn(hudFeedCardPillHeaderCell, hudFeedRecentColState)}>
                  State
                </span>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <p className={hudDashTableEmpty}>{emptyLabel}</p>
            ) : (
              visible.map((row) => {
                const state = classifyAccount(row);
                const accountDisplay = row.account || "—";
                const fullNameDisplay =
                  row.full_name && row.full_name.trim().length > 0 ? row.full_name.trim() : null;
                const owner = row.ownerUsername || "—";
                const parent = row.ownerParentUsername?.trim() || null;

                return (
                  <div key={row.account} role="row" className={hudFeedTableBodyRow}>
                    <span role="cell" className={hudFeedCardBodyCell} title={accountDisplay}>
                      <span className="block truncate">{hudFeedCellLine(accountDisplay, fullNameDisplay)}</span>
                      {variant === "recent" ? (
                        <span className={hudFeedRecentMobileMeta} title={`${formatMonthDay(row.expires)} · ${state.label}`}>
                          {hudFeedCellLine(formatMonthDay(row.expires), state.label)}
                        </span>
                      ) : null}
                    </span>

                    <span
                      role="cell"
                      className={cn(
                        hudFeedCardBodyCell,
                        variant === "recent" ? hudFeedRecentColHierarchy : hudFeedExpiredColHierarchy,
                      )}
                      title={owner}
                    >
                      {hudFeedCellLine(owner, parent)}
                    </span>

                    {variant === "recent" ? (
                      <span
                        role="cell"
                        className={cn(hudFeedCardBodyCell, hudFeedRecentColCreated)}
                        title={row.created ?? ""}
                      >
                        {formatCreatedLine(row.created)}
                      </span>
                    ) : null}

                    <span
                      role="cell"
                      className={cn(
                        hudFeedCardBodyCell,
                        variant === "expired" ? cn(hudFeedCardCellRight, hudFeedExpiredColExpires) : hudFeedRecentColExpires,
                      )}
                      title={row.expires ?? ""}
                    >
                      {hudFeedCellLine(formatMonthDay(row.expires), state.subline)}
                    </span>

                    {variant === "recent" ? (
                      <span role="cell" className={cn(hudFeedCardPillCell, hudFeedRecentColState)}>
                        <span className={cn(hudFeedTablePill, state.pillClass)} title={state.label}>
                          {state.label}
                        </span>
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </HudFeedTableShell>
      </div>
    </HudFeedCard>
  );
}

function ExpiringSubscriptionsCard({ data }: { data: AdminExpiringSubscriptionsBuckets }) {
  const { tips } = useDashboardIntel();

  return (
    <HudFeedCard
      title="Expiring subscriptions"
      subtitle="Expiring in next 30 days"
      accentDotClass="bg-amber-400"
      tip={tips.expiringSubscriptions}
    >
      <div className={hudFeedExpiringScrollShell}>
        <HudFeedTableShell className="rounded-none bg-transparent dark:bg-transparent">
          <div role="grid" className={cn(hudFeedGridExpiring, hudFeedCardTablePad)}>
            <div role="row" className={hudFeedTableHeaderRow}>
              <span role="columnheader" className={hudFeedCardHeaderCell}>
                Period
              </span>
              <span
                role="columnheader"
                className={cn(hudFeedCardHeaderCell, "text-right tabular-nums", hudFeedExpiringColCount)}
              >
                Count
              </span>
              <span
                role="columnheader"
                className={cn(hudFeedCardHeaderCell, "text-right tabular-nums", hudFeedExpiringColShare)}
              >
                Share
              </span>
              <span
                role="columnheader"
                className={cn(
                  hudFeedCardHeaderCell,
                  "text-right tabular-nums",
                  hudFeedExpiringColAtRisk,
                )}
                title="At risk ($)"
              >
                At risk
              </span>
              <span role="columnheader" className={cn(hudFeedCardPillHeaderCell, hudFeedExpiringColRisk)}>
                Risk
              </span>
            </div>

            {data.totalWithin30Days === 0 ? (
              <p className={hudDashTableEmpty}>No subscriptions expiring in the next 30 days.</p>
            ) : (
              data.rows.map((row) => {
                const risk = riskPill(row.key);
                const share = data.totalWithin30Days > 0 ? (row.count / data.totalWithin30Days) * 100 : 0;
                const compactMeta = hudFeedCellLine(
                  `${formatInt(row.count)} · ${share.toFixed(1)}%`,
                  `${formatMoney(row.atRiskUsd)} · ${risk.label}`,
                );

                return (
                  <div key={row.key} role="row" className={hudFeedTableBodyRow}>
                    <span role="cell" className={hudFeedCardPeriodCell} title={row.label}>
                      <span className="flex min-w-0 items-baseline gap-1 truncate whitespace-nowrap">
                        <span className="shrink-0 @[28rem]/expiring:hidden">{PERIOD_LABEL_SHORT[row.key]}</span>
                        <span className="hidden shrink-0 @[28rem]/expiring:inline">{row.label}</span>
                        <span className={hudFeedExpiringRiskInline}>· {risk.label}</span>
                      </span>
                      <span className={hudFeedExpiringMobileMeta} title={compactMeta}>
                        {compactMeta}
                      </span>
                    </span>
                    <span role="cell" className={cn(hudFeedCardCellRight, hudFeedExpiringColCount)}>
                      {formatInt(row.count)}
                    </span>
                    <span role="cell" className={cn(hudFeedCardCellRight, hudFeedExpiringColShare)}>
                      {share.toFixed(1)}%
                    </span>
                    <span
                      role="cell"
                      className={cn(
                        hudFeedCardCellRight,
                        hudFeedExpiringColAtRisk,
                        row.atRiskUsd > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500",
                      )}
                    >
                      {formatMoney(row.atRiskUsd)}
                    </span>
                    <span role="cell" className={cn(hudFeedCardPillCell, hudFeedExpiringColRisk)}>
                      <span className={cn(hudFeedTablePill, risk.className)}>{risk.label}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </HudFeedTableShell>
      </div>
    </HudFeedCard>
  );
}

export type AdminAccountsLifecyclePanel = "all" | "recent" | "expired" | "expiring";

export function AdminAccountsLifecycleSection({
  recentUsers,
  expiredUsers,
  expiringBuckets,
  className,
  panel = "all",
}: {
  recentUsers: AdminAccountLifecycleRow[];
  expiredUsers: AdminAccountLifecycleRow[];
  expiringBuckets: AdminExpiringSubscriptionsBuckets;
  className?: string;
  panel?: AdminAccountsLifecyclePanel;
}) {
  const { tips } = useDashboardIntel();

  const recentCard = (
    <UsersTableCard
      title="Recent users"
      subtitle="Top 5 by created"
      accentDotClass="bg-cyan-400"
      rows={recentUsers}
      variant="recent"
      emptyLabel="No subscribers yet."
      tip={tips.recentUsers}
    />
  );
  const expiredCard = (
    <UsersTableCard
      title="Expired users"
      subtitle="Most recently expired"
      accentDotClass="bg-rose-400"
      rows={expiredUsers}
      variant="expired"
      emptyLabel="No expired users."
      tip={tips.expiredUsers}
    />
  );
  const expiringCard = <ExpiringSubscriptionsCard data={expiringBuckets} />;

  if (panel === "recent") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{recentCard}</div>;
  }
  if (panel === "expired") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{expiredCard}</div>;
  }
  if (panel === "expiring") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{expiringCard}</div>;
  }

  return (
    <section
      className={cn("mb-2 w-full min-w-0 lg:mb-4", className)}
      aria-labelledby="admin-accounts-lifecycle-title"
    >
      <h2 id="admin-accounts-lifecycle-title" className="sr-only">
        Accounts lifecycle: recent accounts, expired accounts, and expiring subscription buckets
      </h2>
      <div className={dashboardFeedsTwoColumnGrid}>
        {recentCard}
        {expiredCard}
        {expiringCard}
      </div>
    </section>
  );
}
