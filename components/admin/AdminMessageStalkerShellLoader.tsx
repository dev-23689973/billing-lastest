"use client";

import { useEffect, useState } from "react";
import { loadMessageStalkerShellAction } from "@/actions/clientData";
import {
  emptyAdminStalkerMessageDashboardStats,
  type AdminRecentStalkerSendMessageRow,
  type AdminStalkerMessageDashboardStats,
} from "@/lib/messages/adminStalkerMessageTypes";

export type AdminMessageStalkerShell = {
  stats: AdminStalkerMessageDashboardStats;
  recent: AdminRecentStalkerSendMessageRow[];
  loading: boolean;
};

export function useAdminMessageStalkerShell(
  initialStats: AdminStalkerMessageDashboardStats,
  initialRecent: AdminRecentStalkerSendMessageRow[],
  enabled: boolean,
  variant: "admin" | "operator" = "admin",
): AdminMessageStalkerShell {
  const [stats, setStats] = useState(initialStats);
  const [recent, setRecent] = useState(initialRecent);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);
    loadMessageStalkerShellAction(variant)
      .then((data) => {
        if (!data.ok) throw new Error("stalker_shell_failed");
        if (!cancelled) {
          setStats(data.stats);
          setRecent(data.recent);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStats(emptyAdminStalkerMessageDashboardStats());
          setRecent([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, variant]);

  return { stats, recent, loading };
}
