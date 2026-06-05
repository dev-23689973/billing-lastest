/**
 * Dashboard HUD DTO types for client components.
 * Do not import `@/lib/data` from `"use client"` modules (server/data barrel).
 */
export type {
  AdminAccountLifecycleRow,
  AdminDayActivityAccountRow,
  AdminDayActivityCounts,
  AdminExpiringBucketRow,
  AdminExpiringSubscriptionsBuckets,
  AdminMessageTrafficDayStack,
  AdminRecentStalkerSendMessageRow,
  AdminTopOperatorRow,
  AdminTopOperatorsLeaderboards,
  AdminTransactionRow,
  DashboardDayCreditPoint,
  DashboardTrendPoint,
} from "@/lib/repos/billing";

export type { AdminReportPackageRow } from "@/lib/repos/packageDistribution";
