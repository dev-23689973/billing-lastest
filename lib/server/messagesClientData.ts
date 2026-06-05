import type { PortalStaffPendingMessage } from "@/lib/portalStaffInbox";
import { stripClientPayload } from "@/lib/dto/redact";
import {
  dismissPortalStaffMessageRecipient,
  listDismissPortalStaffMessagesForUser,
  listPendingPortalStaffMessagesForUser,
  listReadPortalStaffMessagesForUser,
  markPortalStaffMessageReadRecipient,
} from "@/lib/repos/portalStaffMessages";
import type { SessionPayload } from "@/lib/session";

export type PortalStaffInboxClientSnapshot = {
  messages: PortalStaffPendingMessage[];
  dismiss: PortalStaffPendingMessage[];
  read: PortalStaffPendingMessage[];
};

export async function loadPortalStaffInboxForClient(session: SessionPayload): Promise<PortalStaffInboxClientSnapshot> {
  const username = session.username;
  const load = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[portal-staff-inbox] ${label} failed:`, err);
      return [] as T;
    }
  };
  const [messages, dismiss, read] = await Promise.all([
    load("active", () => listPendingPortalStaffMessagesForUser(username, 50)),
    load("dismiss", () => listDismissPortalStaffMessagesForUser(username, 50)),
    load("read", () => listReadPortalStaffMessagesForUser(username, 50)),
  ]);
  return stripClientPayload({ messages, dismiss, read });
}

export async function dismissPortalStaffMessageForClient(recipientId: number, session: SessionPayload) {
  if (!(session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR")) {
    return { ok: false as const, error: "unauthorized" };
  }
  const id = Math.floor(Number(recipientId));
  if (!id) return { ok: false as const, error: "invalid_recipient" };
  const ok = await dismissPortalStaffMessageRecipient(id, session.username);
  return { ok };
}

export async function markPortalStaffMessageReadForClient(recipientId: number, session: SessionPayload) {
  if (!(session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR")) {
    return { ok: false as const, error: "unauthorized" };
  }
  const id = Math.floor(Number(recipientId));
  if (!id) return { ok: false as const, error: "invalid_recipient" };
  const ok = await markPortalStaffMessageReadRecipient(id, session.username);
  return { ok };
}
