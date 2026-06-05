import { revalidateTag } from "next/cache";

/** Bust cached wallet + promo pool figures after credit add/recover. */
export function revalidateWalletDashboardCaches() {
  revalidateTag("dashboard-admin-wallet-revenue", "max");
  revalidateTag("portal-wallet-revenue", "max");
}

/** Bust short-lived dashboard aggregates after ticket mutations. */
export function revalidateAdminDashboardCaches() {
  revalidateTag("dashboard-admin-ticket-overview", "max");
  revalidateTag("dashboard-admin-stats", "max");
  revalidateWalletDashboardCaches();
  revalidateTag("dashboard-admin-package-distribution", "max");
  revalidateTag("portal-ticket-overview", "max");
  revalidateTag("portal-dashboard-shell", "max");
}
