import { unstable_cache } from "next/cache";
import {
  getAdminExpiringSoonCount,
  getAdminPackageDistribution,
  getAdminPeakMonthlyRevenueLastNMonths,
  getAdminPromoBonusCreditsTotal,
  getAdminRevenueThisMonth,
  getAdminSubscriberTrendSeries,
  getAdminWalletCreditsTotal,
  getDashboardStats,
  getUsersSummary,
} from "@/lib/data";
import { getAdminTicketStatusOverview } from "@/lib/repos/tickets";

const REVALIDATE_SECONDS = 60;

/** Ticket KPI strip on dashboard — changes infrequently vs full ticket list. */
export const getCachedAdminTicketStatusOverview = unstable_cache(
  async () => getAdminTicketStatusOverview(),
  ["dashboard-admin-ticket-overview"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-admin-ticket-overview"] },
);

/** Stalker tariff breakdown for ticket/message HUD panel (deferred with heavy charts). */
export const getCachedAdminPackageDistribution = unstable_cache(
  async () => getAdminPackageDistribution(),
  ["dashboard-admin-package-distribution"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-admin-package-distribution"] },
);

/** 24-month subscriber trend for period strip / growth ring. */
export const getCachedAdminSubscriberTrendSeries = unstable_cache(
  async () => getAdminSubscriberTrendSeries(24),
  ["dashboard-admin-subscriber-trend-24"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Gauge / quad counts — multiple COUNT subqueries in one round trip. */
export const getCachedAdminDashboardCounts = unstable_cache(
  async () => {
    const [stats, summary] = await Promise.all([getDashboardStats(), getUsersSummary()]);
    return { stats, summary };
  },
  ["dashboard-admin-stats"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-admin-stats"] },
);

/** Dual-ring wallet + revenue metrics. */
export const getCachedAdminWalletRevenue = unstable_cache(
  async () => {
    const [walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly] = await Promise.all([
      getAdminWalletCreditsTotal(),
      getAdminPromoBonusCreditsTotal(),
      getAdminRevenueThisMonth(),
      getAdminPeakMonthlyRevenueLastNMonths(12),
    ]);
    return { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly };
  },
  ["dashboard-admin-wallet-revenue"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-admin-wallet-revenue"] },
);

export const getCachedAdminExpiringSoonCount = unstable_cache(
  async () => getAdminExpiringSoonCount(7),
  ["dashboard-admin-expiring-soon-7"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-admin-stats"] },
);
