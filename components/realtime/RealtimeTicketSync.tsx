"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BILLING_REALTIME_TICKET_EVENT } from "@/lib/realtime/client-events";
import {
  isSelfTicketRealtimeEvent,
  type TicketRealtimeDetail,
} from "@/lib/realtime/ticket-events";

/** Refreshes RSC data when tickets change (lists, layout). Skips events you triggered yourself. */
export function RealtimeTicketSync({ viewerUsername = "" }: { viewerUsername?: string }) {
  const router = useRouter();

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let lastRefreshMs = 0;

    function onTicket(e: Event) {
      const detail = (e as CustomEvent<TicketRealtimeDetail>).detail;
      if (viewerUsername && isSelfTicketRealtimeEvent(detail, viewerUsername)) {
        return;
      }
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        const now = Date.now();
        // Cap refresh frequency so event bursts do not trigger many back-to-back API calls.
        if (now - lastRefreshMs < 3000) return;
        lastRefreshMs = now;
        router.refresh();
      }, 600);
    }

    window.addEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
    };
  }, [router, viewerUsername]);

  return null;
}
