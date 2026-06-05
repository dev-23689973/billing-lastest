/** Shared config for `AdminSubscribersTable` on admin vs manager (and future portals). */
export type SubscribersTablePortal = {
  apiBase: "/api/admin" | "/api/manager" | "/api/reseller" | "/api/dealer";
  usersPath: string;
  portalBase: "/admin" | "/manager" | "/reseller" | "/dealer";
  /** When false, User ID column is hidden (non-admin portals). */
  showUserIdColumn?: boolean;
  /** Hierarchy popover roles allowed (manager: reseller + dealer only). */
  hierarchyRoles?: Array<"manager" | "reseller" | "dealer">;
};

export const ADMIN_SUBSCRIBERS_PORTAL: SubscribersTablePortal = {
  apiBase: "/api/admin",
  usersPath: "/admin/users",
  portalBase: "/admin",
  showUserIdColumn: true,
  hierarchyRoles: ["manager", "reseller", "dealer"],
};

export const MANAGER_SUBSCRIBERS_PORTAL: SubscribersTablePortal = {
  apiBase: "/api/manager",
  usersPath: "/manager/users",
  portalBase: "/manager",
  showUserIdColumn: false,
  hierarchyRoles: ["reseller", "dealer"],
};

export const RESELLER_SUBSCRIBERS_PORTAL: SubscribersTablePortal = {
  apiBase: "/api/reseller",
  usersPath: "/reseller/users",
  portalBase: "/reseller",
  showUserIdColumn: false,
  hierarchyRoles: ["dealer"],
};

export const DEALER_SUBSCRIBERS_PORTAL: SubscribersTablePortal = {
  apiBase: "/api/dealer",
  usersPath: "/dealer/users",
  portalBase: "/dealer",
  showUserIdColumn: false,
  hierarchyRoles: [],
};
