import {
  ADMIN_SUBSCRIBERS_PORTAL,
  MANAGER_SUBSCRIBERS_PORTAL,
  RESELLER_SUBSCRIBERS_PORTAL,
  type SubscribersTablePortal,
} from "@/lib/subscribersPortalTable";

/** Map a `/subscribers` modal API path to the same portal config as `AdminSubscribersTable`. */
export function subscribersPortalFromApiBase(apiBaseUrl: string): SubscribersTablePortal {
  const base = apiBaseUrl.trim();
  if (base.startsWith("/api/manager")) return MANAGER_SUBSCRIBERS_PORTAL;
  if (base.startsWith("/api/reseller")) return RESELLER_SUBSCRIBERS_PORTAL;
  return ADMIN_SUBSCRIBERS_PORTAL;
}
