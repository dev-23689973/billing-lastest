import { unstable_cache } from "next/cache";
import { getScopedExpiringSoonCount, getUsersSummaryScoped } from "@/lib/data";
import {
  getDealerPeakMonthlyRevenueLastNMonths,
  getDealerPromoBonusCreditsTotal,
  getDealerRevenueThisMonth,
  getDealerWalletCreditsTotal,
  getManagerPeakMonthlyRevenueLastNMonths,
  getManagerPromoBonusCreditsTotal,
  getManagerRevenueThisMonth,
  getManagerWalletCreditsTotal,
  getOperatorDashboardStats,
  getOperatorSubscriberTrendSeries,
  getResellerPeakMonthlyRevenueLastNMonths,
  getResellerPromoBonusCreditsTotal,
  getResellerRevenueThisMonth,
  getResellerWalletCreditsTotal,
} from "@/lib/repos/managerDashboard";
import { getTicketStatusOverviewForPortalUser, type PortalTicketRole } from "@/lib/repos/tickets";

const REVALIDATE_SECONDS = 60;

export type PortalOwnerType = "MNGR" | "SRSLR" | "RSLR";

function portalRole(ownerType: PortalOwnerType): PortalTicketRole {
  return ownerType;
}

export function getCachedPortalTicketOverview(username: string, role: PortalTicketRole) {
  const u = username.trim();
  return unstable_cache(
    async () => getTicketStatusOverviewForPortalUser(u, role),
    ["portal-ticket-overview", role, u],
    { revalidate: REVALIDATE_SECONDS, tags: ["portal-ticket-overview", `portal-ticket-overview-${role}-${u}`] },
  )();
}

export function getCachedPortalDashboardShell(username: string, ownerType: PortalOwnerType) {
  const u = username.trim();
  const role = portalRole(ownerType);
  return unstable_cache(
    async () => {
      const [opStats, summary, ticketOverview, expiringSoon] = await Promise.all([
        getOperatorDashboardStats({ ownerType, ownerUsername: u }),
        getUsersSummaryScoped({ ownerType, ownerUsername: u }),
        getTicketStatusOverviewForPortalUser(u, role),
        getScopedExpiringSoonCount({ ownerType, ownerUsername: u, withinDays: 7 }),
      ]);
      return { opStats, summary, ticketOverview, expiringSoon };
    },
    ["portal-shell", ownerType, u],
    { revalidate: REVALIDATE_SECONDS, tags: ["portal-dashboard-shell", `portal-shell-${ownerType}-${u}`] },
  )();
}

export function getCachedPortalWalletRevenue(username: string, ownerType: PortalOwnerType) {
  const u = username.trim();
  return unstable_cache(
    async () => {
      if (ownerType === "MNGR") {
        const [walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly] = await Promise.all([
          getManagerWalletCreditsTotal(u),
          getManagerPromoBonusCreditsTotal(u),
          getManagerRevenueThisMonth(u),
          getManagerPeakMonthlyRevenueLastNMonths(u, 12),
        ]);
        return { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly };
      }
      if (ownerType === "SRSLR") {
        const [walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly] = await Promise.all([
          getResellerWalletCreditsTotal(u),
          getResellerPromoBonusCreditsTotal(u),
          getResellerRevenueThisMonth(u),
          getResellerPeakMonthlyRevenueLastNMonths(u, 12),
        ]);
        return { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly };
      }
      const [walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly] = await Promise.all([
        getDealerWalletCreditsTotal(u),
        getDealerPromoBonusCreditsTotal(u),
        getDealerRevenueThisMonth(u),
        getDealerPeakMonthlyRevenueLastNMonths(u, 12),
      ]);
      return { walletCredits, promoPoolCredits, revenueMonth, revenuePeakMonthly };
    },
    ["portal-wallet-revenue", ownerType, u],
    { revalidate: REVALIDATE_SECONDS, tags: ["portal-wallet-revenue", `portal-wallet-${ownerType}-${u}`] },
  )();
}

export function getCachedPortalSubscriberTrend(username: string, ownerType: PortalOwnerType) {
  const u = username.trim();
  return unstable_cache(
    async () => getOperatorSubscriberTrendSeries({ ownerType, ownerUsername: u, monthCount: 24 }),
    ["portal-subscriber-trend-24", ownerType, u],
    { revalidate: REVALIDATE_SECONDS, tags: ["portal-subscriber-trend", `portal-trend-${ownerType}-${u}`] },
  )();
}
