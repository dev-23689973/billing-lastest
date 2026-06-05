"use client";

import { useEffect, useState } from "react";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { loadStaffTransactionsModalAction } from "@/actions/modalData";
import { cachedDataLoad, dataCacheKey, DATA_CACHE_NS, getDataCache } from "@/lib/client/dataCache";
import { staffTransactionsApiBaseToScope } from "@/lib/modalScope";

/** Loads staff transactions when the overlay opens (avoids N× prefetch on list pages). */
export function useStaffTransactionsLazy(
  username: string,
  open: boolean,
  initialRows: AdminTransactionRow[] = [],
  transactionsApiBase: "/api/admin" | "/api/manager" | "/api/reseller" = "/api/admin",
) {
  const hasInitial = initialRows.length > 0;
  const [rows, setRows] = useState<AdminTransactionRow[]>(() => (hasInitial ? initialRows : []));
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(hasInitial);

  useEffect(() => {
    if (!open || loaded) return;
    if (hasInitial) {
      setRows(initialRows);
      setLoaded(true);
      return;
    }

    let alive = true;
    const scope = staffTransactionsApiBaseToScope(transactionsApiBase);
    const cacheKey = dataCacheKey(DATA_CACHE_NS.staffTransactions, scope, username);
    const cached = getDataCache<Awaited<ReturnType<typeof loadStaffTransactionsModalAction>>>(cacheKey);
    if (cached?.ok) {
      setRows(Array.isArray(cached.rows) ? cached.rows : []);
      setWalletBalance(typeof cached.walletBalance === "number" ? cached.walletBalance : null);
      setLoaded(true);
      return;
    }

    setLoading(true);
    void cachedDataLoad(cacheKey, () =>
      loadStaffTransactionsModalAction({
        scope,
        username,
      }),
    )
      .then((data) => {
        if (!alive) return;
        if (!data.ok) {
          setRows([]);
          setWalletBalance(null);
          setLoaded(true);
          return;
        }
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setWalletBalance(typeof data.walletBalance === "number" ? data.walletBalance : null);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, loaded, username, hasInitial, initialRows, transactionsApiBase]);

  return { rows, loading, walletBalance };
}
