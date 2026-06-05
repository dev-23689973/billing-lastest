"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BILLING_STAFF_HUB_LIST_REFRESH_EVENT } from "@/lib/realtime/client-events";

/** Re-fetch server-rendered staff hub / dealer list rows after modal credit mutations. */
export function StaffHubListRefreshBridge() {
  const router = useRouter();

  useEffect(() => {
    const onRefresh = () => router.refresh();
    window.addEventListener(BILLING_STAFF_HUB_LIST_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(BILLING_STAFF_HUB_LIST_REFRESH_EVENT, onRefresh);
  }, [router]);

  return null;
}
