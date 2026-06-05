"use client";

import { useMemo } from "react";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { normalizeStaffUsername } from "@/lib/adminStaffPresence";
import { cn } from "@/lib/cn";

function memberLabel(m: { username: string; name: string }) {
  const name = m.name.trim();
  return name && name !== m.username ? `${name} (${m.username})` : m.username;
}

/** Compact panel online count — badge shows everyone online (including you); tooltip lists branch staff for portal users. */
export function OnlinePresenceStrip({ className }: { className?: string }) {
  const { enabled, onlineMembers, onlinePeers, branchPeerUsernames } = useRealtime();
  if (!enabled) return null;

  const tooltipMembers = useMemo(() => {
    if (branchPeerUsernames === null) {
      return onlinePeers;
    }
    if (branchPeerUsernames.size === 0) return [];
    return onlineMembers.filter((m) => branchPeerUsernames.has(normalizeStaffUsername(m.username)));
  }, [branchPeerUsernames, onlineMembers, onlinePeers]);

  const n = onlineMembers.length;
  const title =
    tooltipMembers.length > 0
      ? tooltipMembers.map(memberLabel).join(", ")
      : branchPeerUsernames === null
        ? onlinePeers.map(memberLabel).join(", ") || "No one else online"
        : "No branch staff online";

  return (
    <p
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
      title={title}
    >
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153/0.8)]" />
      {n === 0 ? "Panel" : n === 1 ? "1 online" : `${n} online`}
    </p>
  );
}
