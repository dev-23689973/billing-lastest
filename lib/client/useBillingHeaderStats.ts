"use client";

import { useEffect, useState } from "react";
import { loadHeaderStatsAction } from "@/actions/clientData";
import type { HeaderStatsClientDto } from "@/lib/server/realtimeClientData";
import {
  cachedDataLoad,
  dataCacheKey,
  DATA_CACHE_NS,
  invalidateBillingDataCacheSilent,
  BILLING_DATA_CACHE_INVALIDATE,
} from "@/lib/client/dataCache";
import type { SessionPayload } from "@/lib/session";
import { BILLING_HEADER_STATS_EVENT } from "@/lib/realtime/client-events";

export type BillingHeaderStats = HeaderStatsClientDto;

export function useBillingHeaderStats(session: SessionPayload) {
  const [stats, setStats] = useState<BillingHeaderStats | null>(null);

  useEffect(() => {
    let alive = true;

    async function load(fresh = false) {
      try {
        const scopedKey = dataCacheKey(DATA_CACHE_NS.headerStats, session.type, session.username);
        if (fresh) invalidateBillingDataCacheSilent(scopedKey);
        const j = await cachedDataLoad(scopedKey, () => loadHeaderStatsAction());
        if (alive) setStats(j);
      } catch {
        if (alive) setStats({ error: "failed" });
      }
    }

    setStats(null);
    void load();

    const onRefresh = () => {
      void load(true);
    };
    window.addEventListener(BILLING_HEADER_STATS_EVENT, onRefresh);
    const onCacheInvalidate = (event: Event) => {
      const prefix = (event as CustomEvent<{ prefix?: string }>).detail?.prefix ?? "";
      const scopedKey = dataCacheKey(DATA_CACHE_NS.headerStats, session.type, session.username);
      if (prefix && !prefix.startsWith(scopedKey) && !prefix.startsWith(DATA_CACHE_NS.headerStats)) return;
      void load(true);
    };
    window.addEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);

    return () => {
      alive = false;
      window.removeEventListener(BILLING_HEADER_STATS_EVENT, onRefresh);
      window.removeEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);
    };
  }, [session.type, session.username]);

  return stats;
}
