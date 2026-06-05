"use client";

import { useCallback, useEffect, useState } from "react";
import { loadOpenTicketsSnapshotAction } from "@/actions/clientData";
import { BILLING_REALTIME_TICKET_EVENT } from "@/lib/realtime/client-events";
import { BILLING_TICKET_ALERT_DISMISS_CHANGED } from "@/lib/realtime/ticket-alert-events";
import {
  isSelfTicketRealtimeEvent,
  type TicketRealtimeDetail,
} from "@/lib/realtime/ticket-events";

/** Server-provided count; refreshes on Pusher ticket events, focus, and periodic poll. */
export function useLiveOpenTicketCount(
  initial: number,
  enabled = true,
  viewerUsername = "",
): number {
  const [count, setCount] = useState(enabled ? initial : 0);

  useEffect(() => {
    setCount(enabled ? initial : 0);
  }, [initial, enabled]);

  const pull = useCallback(async () => {
    if (!enabled) return;
    try {
      const j = await loadOpenTicketsSnapshotAction();
      if (!j.ok) return;
      if (typeof j.count === "number") setCount(j.count);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;

    function schedulePull() {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void pull(), 350);
    }

    function onTicket(e: Event) {
      const detail = (e as CustomEvent<TicketRealtimeDetail>).detail;
      if (viewerUsername && isSelfTicketRealtimeEvent(detail, viewerUsername)) {
        return;
      }

      const event = detail?.event;
      const statusId = detail?.data?.statusId;

      if (event === "ticket.created" && statusId !== 2) {
        setCount((c) => c + 1);
      } else if (event === "ticket.deleted" || (event === "ticket.updated" && statusId === 2)) {
        setCount((c) => Math.max(0, c - 1));
      }

      schedulePull();
    }

    void pull();

    window.addEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
    window.addEventListener(BILLING_TICKET_ALERT_DISMISS_CHANGED, schedulePull);
    window.addEventListener("focus", schedulePull);
    const onVisibility = () => {
      if (document.visibilityState === "visible") schedulePull();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void pull();
    }, 30_000);

    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
      window.removeEventListener(BILLING_TICKET_ALERT_DISMISS_CHANGED, schedulePull);
      window.removeEventListener("focus", schedulePull);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
    };
  }, [enabled, pull, viewerUsername]);

  return enabled ? count : 0;
}
