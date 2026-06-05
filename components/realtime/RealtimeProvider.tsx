"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Pusher from "pusher-js";
import type { Channel, PresenceChannel } from "pusher-js";
import type { SessionPayload } from "@/lib/session";
import { isRealtimeClientConfigured, type RealtimePublicConfig } from "@/lib/realtime/config";
import {
  PRESENCE_CHANNEL,
  TICKETS_ADMIN_CHANNEL,
  TICKETS_PORTAL_CHANNEL,
  userPrivateChannel,
} from "@/lib/realtime/channels";
import {
  dispatchBillingRealtimeMessage,
  dispatchBillingRealtimePresence,
  dispatchBillingRealtimeTicket,
} from "@/lib/realtime/client-events";
import type { RealtimeEventName } from "@/lib/realtime/types";
import { normalizeBranchPeerSet } from "@/lib/staffBranchPeers";

export type OnlineMember = {
  id: string;
  username: string;
  name: string;
  type: string;
};

function normalizePresenceUsername(username: string): string {
  return username.trim().toLowerCase();
}

function presenceMembersSignature(members: OnlineMember[]): string {
  if (members.length === 0) return "";
  return members
    .map((m) => `${m.id}:${normalizePresenceUsername(m.username)}`)
    .sort()
    .join("|");
}

type RealtimeContextValue = {
  enabled: boolean;
  /** Presence channel subscribed and member list synced at least once. */
  presenceReady: boolean;
  /** Auth/subscribe failed or server secrets missing. */
  presenceError: string | null;
  onlineMembers: OnlineMember[];
  /** Presence members excluding the current session user. */
  onlinePeers: OnlineMember[];
  /**
   * Staff in the viewer's branch (lowercase usernames, excludes self).
   * `null` for ROOT — tooltip lists everyone online.
   */
  branchPeerUsernames: Set<string> | null;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  enabled: false,
  presenceReady: false,
  presenceError: null,
  onlineMembers: [],
  onlinePeers: [],
  branchPeerUsernames: null,
});

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

function parsePresenceMembers(channel: PresenceChannel): OnlineMember[] {
  const state = channel.members;
  const members: OnlineMember[] = [];
  state.each((member: { id: string; info?: Record<string, unknown> }) => {
    const info = member.info ?? {};
    members.push({
      id: member.id,
      username: String(info.username ?? member.id),
      name: String(info.name ?? info.username ?? member.id),
      type: String(info.type ?? ""),
    });
  });
  return members;
}

export function RealtimeProvider({
  session,
  pusherPublic = null,
  pusherServerOk = false,
  branchPeerUsernames = null,
  children,
}: {
  session: SessionPayload;
  pusherPublic?: RealtimePublicConfig | null;
  pusherServerOk?: boolean;
  /** From server — peers in the viewer's staff branch (excludes self). `null` = admin, no filter. */
  branchPeerUsernames?: string[] | null;
  children: ReactNode;
}) {
  const key =
    pusherPublic?.key?.trim() ||
    process.env.NEXT_PUBLIC_PUSHER_KEY?.trim() ||
    "";
  const cluster =
    pusherPublic?.cluster?.trim() ||
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() ||
    "";
  const enabled = isRealtimeClientConfigured(
    key && cluster ? { key, cluster } : null,
  );
  const serverConfigured = pusherServerOk;

  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [presenceReady, setPresenceReady] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelsRef = useRef<Channel[]>([]);

  const bindChannel = useCallback((channel: Channel) => {
    const events: RealtimeEventName[] = [
      "ticket.created",
      "ticket.updated",
      "ticket.comment",
      "ticket.deleted",
      "staff_message.created",
      "staff_message.dismissed",
      "staff_message.read",
    ];
    for (const event of events) {
      channel.bind(event, (data: unknown) => {
        if (event.startsWith("ticket.")) {
          dispatchBillingRealtimeTicket({ event, data });
          return;
        }
        dispatchBillingRealtimeMessage({ event, data });
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled || !key || !cluster) {
      setPresenceError(
        enabled
          ? null
          : "Pusher is not configured (set PUSHER_KEY + PUSHER_CLUSTER or NEXT_PUBLIC_PUSHER_*).",
      );
      return;
    }
    if (!serverConfigured) {
      setPresenceError("Pusher server credentials missing (PUSHER_APP_ID, PUSHER_SECRET, etc.).");
      return;
    }

    if (process.env.NEXT_PUBLIC_PUSHER_DEBUG === "1") {
      Pusher.logToConsole = true;
    }

    setPresenceError(null);

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        endpoint: "/api/realtime/auth",
        transport: "ajax",
      },
    });
    pusherRef.current = pusher;
    const subs: Channel[] = [];

    const userCh = pusher.subscribe(userPrivateChannel(session.username));
    bindChannel(userCh);
    subs.push(userCh);

    if (session.type === "ROOT") {
      const t = pusher.subscribe(TICKETS_ADMIN_CHANNEL);
      bindChannel(t);
      subs.push(t);
    } else if (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR") {
      const t = pusher.subscribe(TICKETS_PORTAL_CHANNEL);
      bindChannel(t);
      subs.push(t);
    }

    const presence = pusher.subscribe(PRESENCE_CHANNEL) as PresenceChannel;
    subs.push(presence);

    const syncPresence = () => {
      const next = parsePresenceMembers(presence);
      setOnlineMembers((prev) =>
        presenceMembersSignature(prev) === presenceMembersSignature(next) ? prev : next,
      );
      setPresenceReady(true);
      setPresenceError(null);
    };
    presence.bind("pusher:subscription_succeeded", syncPresence);
    presence.bind("pusher:subscription_error", (status: { type?: string; error?: string; status?: number }) => {
      setPresenceReady(false);
      setPresenceError(
        status?.error ||
          (status?.status ? `Presence auth failed (${status.status})` : "Presence channel unavailable"),
      );
    });
    presence.bind("pusher:member_added", () => {
      syncPresence();
      dispatchBillingRealtimePresence({ type: "member_added" });
    });
    presence.bind("pusher:member_removed", () => {
      syncPresence();
      dispatchBillingRealtimePresence({ type: "member_removed" });
    });

    channelsRef.current = subs;

    return () => {
      for (const ch of channelsRef.current) {
        try {
          pusher.unsubscribe(ch.name);
        } catch {
          /* ignore */
        }
      }
      channelsRef.current = [];
      pusher.disconnect();
      pusherRef.current = null;
      setOnlineMembers([]);
      setPresenceReady(false);
      setPresenceError(null);
    };
  }, [bindChannel, cluster, enabled, key, pusherServerOk, session.type, session.username]);

  const onlinePeers = useMemo(() => {
    const self = normalizePresenceUsername(session.username);
    if (!self) return onlineMembers;
    return onlineMembers.filter(
      (m) => normalizePresenceUsername(m.username) !== self,
    );
  }, [onlineMembers, session.username]);

  const branchPeerSet = useMemo(
    () => normalizeBranchPeerSet(branchPeerUsernames),
    [branchPeerUsernames],
  );

  const value = useMemo(
    () => ({
      enabled,
      presenceReady,
      presenceError,
      onlineMembers,
      onlinePeers,
      branchPeerUsernames: branchPeerSet,
    }),
    [branchPeerSet, enabled, onlineMembers, onlinePeers, presenceError, presenceReady],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
