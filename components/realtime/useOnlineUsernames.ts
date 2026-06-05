"use client";

import { useMemo } from "react";
import { normalizeStaffUsername } from "@/lib/adminStaffPresence";
import { useRealtime } from "@/components/realtime/RealtimeProvider";

/** Usernames currently connected to the billing panel (presence channel). */
export function useOnlineUsernameSet(): Set<string> {
  const { onlineMembers } = useRealtime();
  return useMemo(() => {
    const set = new Set<string>();
    for (const m of onlineMembers) {
      const key = normalizeStaffUsername(m.username);
      if (key) set.add(key);
    }
    return set;
  }, [onlineMembers]);
}
