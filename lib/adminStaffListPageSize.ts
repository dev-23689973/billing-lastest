/** Allowed `ps` values for /admin/managers staff list (URL + UI). */
export const ADMIN_STAFF_LIST_PAGE_SIZES = [25, 50, 100] as const;
export type AdminStaffListPageSize = (typeof ADMIN_STAFF_LIST_PAGE_SIZES)[number];

const ALLOWED = new Set<number>(ADMIN_STAFF_LIST_PAGE_SIZES);

export function isAdminStaffListPageSize(n: number): n is AdminStaffListPageSize {
  return ALLOWED.has(n);
}

export function clampAdminStaffListPageSize(n: number, fallback: number = 25): AdminStaffListPageSize {
  const safeFallback: AdminStaffListPageSize = isAdminStaffListPageSize(fallback) ? fallback : 25;
  return isAdminStaffListPageSize(n) ? n : safeFallback;
}
