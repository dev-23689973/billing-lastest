import { dispatchBillingHeaderStatsRefresh, dispatchStaffHubListRefresh } from "@/lib/realtime/client-events";
import { DATA_CACHE_NS, invalidateBillingDataCache, invalidateBillingDataCacheSilent } from "@/lib/client/dataCache";

const STAFF_CREATE_WITH_CREDITS_OK = new Set([
  "created_manager",
  "created_reseller",
  "created_dealer",
]);

/** True when redirect `ok` means Add staff succeeded (initial credits were posted). */
export function isStaffCreateWithCreditsSuccessOk(
  ok: string | null | undefined,
  pathname?: string,
): boolean {
  const v = String(ok ?? "").trim();
  if (!v) return false;
  if (STAFF_CREATE_WITH_CREDITS_OK.has(v)) return true;
  if (v !== "created" || !pathname) return false;
  return (
    pathname.startsWith("/admin/managers") ||
    pathname.startsWith("/manager/resellers") ||
    pathname.startsWith("/manager/dealers") ||
    pathname.startsWith("/reseller/dealers")
  );
}

/** After add/recover in the credits modal — editor balance + header stats only. */
export function invalidateAfterStaffCreditsMutation(): void {
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.staffEditor);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.headerStats);
  dispatchBillingHeaderStatsRefresh();
  dispatchStaffHubListRefresh();
}

/** After staff profile save in editor — mark caches stale without refetch storms. */
export function invalidateAfterStaffProfileMutation(): void {
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.staffEditor);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.staffBranches);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.hierarchyProfile);
  dispatchStaffHubListRefresh();
}

/** After staff hierarchy edits — branch lists, editor, transactions may be stale. */
export function invalidateAfterStaffMutation(): void {
  invalidateBillingDataCache(DATA_CACHE_NS.staffEditor);
  invalidateBillingDataCache(DATA_CACHE_NS.staffBranches);
  invalidateBillingDataCache(DATA_CACHE_NS.staffTransactions);
  invalidateBillingDataCache(DATA_CACHE_NS.hierarchyProfile);
  invalidateBillingDataCache(DATA_CACHE_NS.headerStats);
  dispatchBillingHeaderStatsRefresh();
}

/** After inline staff status toggle — keep invalidation minimal to avoid modal refetch storms. */
export function invalidateAfterStaffInlineStatusMutation(): void {
  // Inline toggle updates list UI optimistically, but the editor modal reads from cache.
  // Mark editor + branch/profile caches stale so opening the modal reflects the new status.
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.staffEditor);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.staffBranches);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.hierarchyProfile);
  dispatchStaffHubListRefresh();
}

/** After end-user inline edit or profile save. */
export function invalidateAfterEndUserMutation(account?: string): void {
  invalidateBillingDataCache(DATA_CACHE_NS.endUserDetails);
  invalidateBillingDataCache(DATA_CACHE_NS.endUserTransactions);
  invalidateBillingDataCache(DATA_CACHE_NS.subscribersFetch);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.headerStats);
  dispatchBillingHeaderStatsRefresh();
  if (account) {
    invalidateBillingDataCache(`${DATA_CACHE_NS.endUserDetails}${account}`);
    invalidateBillingDataCache(`${DATA_CACHE_NS.endUserTransactions}${account}`);
  }
}

/** After end-user detail modal refresh — mark stale without refetch storms or full page refresh. */
export function invalidateAfterEndUserDetailMutation(account?: string): void {
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.endUserDetails);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.endUserTransactions);
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.subscribersFetch);
  if (account) {
    invalidateBillingDataCacheSilent(`${DATA_CACHE_NS.endUserDetails}${account}`);
    invalidateBillingDataCacheSilent(`${DATA_CACHE_NS.endUserTransactions}${account}`);
  }
}

/** After inline end-user status toggle — avoid invalidating broad subscribers list caches. */
export function invalidateAfterEndUserStatusMutation(account?: string): void {
  invalidateAfterEndUserInlineFieldMutation(account);
}

/** After inline end-user field edit (name, mac, ip) — cell state is already updated locally. */
export function invalidateAfterEndUserInlineFieldMutation(account?: string): void {
  invalidateBillingDataCacheSilent(DATA_CACHE_NS.endUserDetails);
  if (account) {
    invalidateBillingDataCacheSilent(`${DATA_CACHE_NS.endUserDetails}${account}`);
  }
}

/** After ticket create/update/delete. */
export function invalidateAfterTicketMutation(): void {
  invalidateBillingDataCache(DATA_CACHE_NS.openTickets);
}

/** After billing hierarchy credit limits change in admin settings. */
export function invalidateAfterSettingsMutation(): void {
  invalidateBillingDataCache(DATA_CACHE_NS.staffEditor);
  invalidateBillingDataCache(DATA_CACHE_NS.hierarchyProfile);
}
