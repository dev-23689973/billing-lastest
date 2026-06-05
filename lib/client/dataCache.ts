/** In-memory DTO cache — avoids repeat server actions / DB reads for the same key. */

const store = new Map<string, unknown>();

export function dataCacheKey(...parts: Array<string | number | boolean | null | undefined>): string {
  return parts.map((p) => String(p ?? "")).join(":");
}

export function getDataCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setDataCache<T>(key: string, value: T): void {
  store.set(key, value);
}

export function hasDataCache(key: string): boolean {
  return store.has(key);
}

export function deleteDataCache(key: string): void {
  store.delete(key);
}

/** Remove keys where `key.startsWith(prefix)` (prefix should end with `:` for namespaces). */
export function invalidateDataCachePrefix(prefix: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function clearDataCache(): void {
  store.clear();
}

/**
 * Return cached value or run `fetcher`, store result, and return it.
 * Skips the server round-trip when the key is already populated.
 */
export async function cachedDataLoad<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = getDataCache<T>(key);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  setDataCache(key, value);
  return value;
}

/** Cache namespaces — use with `invalidateDataCachePrefix`. */
export const DATA_CACHE_NS = {
  staffBranches: "staff-branches:",
  staffEditor: "staff-editor:",
  endUserDetails: "end-user-details:",
  endUserTransactions: "end-user-tx:",
  hierarchyProfile: "hierarchy:",
  subscribersFetch: "subscribers-fetch:",
  staffTransactions: "staff-tx:",
  headerStats: "header-stats:",
  openTickets: "open-tickets:",
} as const;

export const BILLING_DATA_CACHE_INVALIDATE = "billing:data-cache:invalidate";

/** Drop cached keys without notifying listeners (use when the caller reloads immediately). */
export function invalidateBillingDataCacheSilent(prefix?: string): void {
  invalidateDataCachePrefix(prefix ?? "");
}

export function invalidateBillingDataCache(prefix?: string): void {
  invalidateBillingDataCacheSilent(prefix);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(BILLING_DATA_CACHE_INVALIDATE, { detail: { prefix: prefix ?? "" } }),
    );
  }
}
