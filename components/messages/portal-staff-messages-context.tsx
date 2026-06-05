"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PortalStaffPendingMessage } from "@/lib/portalStaffInbox";
import {
  dismissPortalStaffMessageAction,
  loadPortalStaffInboxAction,
  markPortalStaffMessageReadAction,
} from "@/actions/clientData";
import { BILLING_REALTIME_MESSAGE_EVENT } from "@/lib/realtime/client-events";

type PortalStaffMessagesContextValue = {
  /** Active (alerts bell). */
  messages: PortalStaffPendingMessage[];
  dismissMessages: PortalStaffPendingMessage[];
  readMessages: PortalStaffPendingMessage[];
  count: number;
  refresh: () => Promise<void>;
  /** Active → dismiss. */
  dismiss: (recipientId: number) => Promise<boolean>;
  /** Dismiss → read (locked). */
  markRead: (recipientId: number) => Promise<boolean>;
};

const PortalStaffMessagesContext = createContext<PortalStaffMessagesContextValue | null>(null);

export function usePortalStaffMessages(): PortalStaffMessagesContextValue {
  const ctx = useContext(PortalStaffMessagesContext);
  if (!ctx) {
    return {
      messages: [],
      dismissMessages: [],
      readMessages: [],
      count: 0,
      refresh: async () => {},
      dismiss: async () => false,
      markRead: async () => false,
    };
  }
  return ctx;
}

function nowSqlDatetime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function applyInboxLists(
  j: {
    messages?: PortalStaffPendingMessage[];
    dismiss?: PortalStaffPendingMessage[];
    read?: PortalStaffPendingMessage[];
  },
  setMessages: (v: PortalStaffPendingMessage[]) => void,
  setDismissMessages: (v: PortalStaffPendingMessage[]) => void,
  setReadMessages: (v: PortalStaffPendingMessage[]) => void,
) {
  setMessages(Array.isArray(j.messages) ? j.messages : []);
  setDismissMessages(Array.isArray(j.dismiss) ? j.dismiss : []);
  setReadMessages(Array.isArray(j.read) ? j.read : []);
}

async function postInboxAction(path: "dismiss" | "mark-read", recipientId: number): Promise<boolean> {
  try {
    const j =
      path === "dismiss"
        ? await dismissPortalStaffMessageAction(recipientId)
        : await markPortalStaffMessageReadAction(recipientId);
    return Boolean(j.ok);
  } catch {
    return false;
  }
}

export function PortalStaffMessagesProvider({
  initialMessages,
  initialDismissMessages = [],
  initialReadMessages = [],
  enabled,
  children,
}: {
  initialMessages: PortalStaffPendingMessage[];
  initialDismissMessages?: PortalStaffPendingMessage[];
  initialReadMessages?: PortalStaffPendingMessage[];
  enabled: boolean;
  children: ReactNode;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [dismissMessages, setDismissMessages] = useState(initialDismissMessages);
  const [readMessages, setReadMessages] = useState(initialReadMessages);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const j = await loadPortalStaffInboxAction();
      if (!j.ok) return;
      applyInboxLists(j, setMessages, setDismissMessages, setReadMessages);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const dismiss = useCallback(
    async (recipientId: number) => {
      const ok = await postInboxAction("dismiss", recipientId);
      if (!ok) {
        await refresh();
        return false;
      }
      setMessages((prev) => {
        const row = prev.find((m) => m.recipientId === recipientId);
        if (row) {
          const next: PortalStaffPendingMessage = {
            ...row,
            dismissedAt: nowSqlDatetime(),
            inboxStatus: "dismiss",
          };
          setDismissMessages((d) => [next, ...d.filter((m) => m.recipientId !== recipientId)]);
        }
        return prev.filter((m) => m.recipientId !== recipientId);
      });
      void refresh();
      return true;
    },
    [refresh],
  );

  const markRead = useCallback(
    async (recipientId: number) => {
      const ok = await postInboxAction("mark-read", recipientId);
      if (!ok) {
        await refresh();
        return false;
      }
      const now = nowSqlDatetime();
      const toRead = (row: PortalStaffPendingMessage): PortalStaffPendingMessage => ({
        ...row,
        dismissedAt: undefined,
        readAt: now,
        inboxStatus: "read",
      });
      setMessages((prev) => {
        const row = prev.find((m) => m.recipientId === recipientId);
        if (row) {
          setReadMessages((r) => [toRead(row), ...r.filter((m) => m.recipientId !== recipientId)]);
          return prev.filter((m) => m.recipientId !== recipientId);
        }
        return prev;
      });
      setDismissMessages((prev) => {
        const row = prev.find((m) => m.recipientId === recipientId);
        if (row) {
          setReadMessages((r) => [toRead(row), ...r.filter((m) => m.recipientId !== recipientId)]);
          return prev.filter((m) => m.recipientId !== recipientId);
        }
        return prev;
      });
      void refresh();
      return true;
    },
    [refresh],
  );

  useEffect(() => {
    if (!enabled) return;

    function onRealtimeMessage(e: Event) {
      const detail = (e as CustomEvent<{ event?: string }>).detail;
      if (
        detail?.event === "staff_message.created" ||
        detail?.event === "staff_message.dismissed" ||
        detail?.event === "staff_message.read"
      ) {
        void refresh();
      }
    }

    function onFocus() {
      void refresh();
    }

    window.addEventListener(BILLING_REALTIME_MESSAGE_EVENT, onRealtimeMessage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refresh();
    });

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);

    return () => {
      window.removeEventListener(BILLING_REALTIME_MESSAGE_EVENT, onRealtimeMessage);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(poll);
    };
  }, [enabled, refresh]);

  const value = useMemo(
    () => ({
      messages,
      dismissMessages,
      readMessages,
      count: messages.length,
      refresh,
      dismiss,
      markRead,
    }),
    [messages, dismissMessages, readMessages, refresh, dismiss, markRead],
  );

  return (
    <PortalStaffMessagesContext.Provider value={value}>{children}</PortalStaffMessagesContext.Provider>
  );
}
