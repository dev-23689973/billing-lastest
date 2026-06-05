import { getGlobalAnnouncement } from "@/lib/global-announcement.server";
import {
  listDismissPortalStaffMessagesForUser,
  listPendingPortalStaffMessagesForUser,
  listReadPortalStaffMessagesForUser,
} from "@/lib/data";
import { getRealtimePublicConfig, isRealtimeServerConfigured } from "@/lib/realtime/config";
import type { SessionPayload } from "@/lib/session";
import { listStaffBranchPeerUsernames } from "@/lib/staffBranchPeers.server";
import type { PortalStaffPendingMessage } from "@/lib/portalStaffInbox";

async function loadPortalStaffInboxList(
  label: string,
  loader: () => Promise<PortalStaffPendingMessage[]>,
): Promise<PortalStaffPendingMessage[]> {
  try {
    return await loader();
  } catch (err) {
    console.error(`[loadBillingShellExtras] ${label} failed:`, err);
    return [];
  }
}

import type { AnnouncementFlashHeading } from "@/lib/announcement-flash";

export type BillingShellExtras = {
  announcementHtml: string;
  announcementSlides: string[];
  announcementFlash: AnnouncementFlashHeading | null;
  staffMessages: PortalStaffPendingMessage[];
  dismissStaffMessages: PortalStaffPendingMessage[];
  readStaffMessages: PortalStaffPendingMessage[];
  branchPeerUsernames: string[] | null;
  pusherPublic: ReturnType<typeof getRealtimePublicConfig>;
  pusherServerOk: boolean;
};

export const EMPTY_BILLING_SHELL_EXTRAS: BillingShellExtras = {
  announcementHtml: "",
  announcementSlides: [],
  announcementFlash: null,
  staffMessages: [],
  dismissStaffMessages: [],
  readStaffMessages: [],
  branchPeerUsernames: null,
  pusherPublic: null,
  pusherServerOk: false,
};

/** One parallel batch for announcement + inbox (used by portal layouts). */
export async function loadBillingShellExtras(session: SessionPayload): Promise<BillingShellExtras> {
  const isPortalStaff = session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR";
  const username = session.username.trim();

  const [
    announcement,
    staffMessages,
    dismissStaffMessages,
    readStaffMessages,
    branchPeerUsernames,
  ] = await Promise.all([
    getGlobalAnnouncement().catch(() => ({ html: "", slides: [] as string[], flash: null })),
    isPortalStaff && username
      ? loadPortalStaffInboxList("active messages", () => listPendingPortalStaffMessagesForUser(username, 50))
      : Promise.resolve([]),
    isPortalStaff && username
      ? loadPortalStaffInboxList("dismiss messages", () => listDismissPortalStaffMessagesForUser(username, 50))
      : Promise.resolve([]),
    isPortalStaff && username
      ? loadPortalStaffInboxList("read messages", () => listReadPortalStaffMessagesForUser(username, 50))
      : Promise.resolve([]),
    listStaffBranchPeerUsernames({ type: session.type, username: session.username }).catch(() =>
      session.type === "ROOT" ? null : [],
    ),
  ]);

  return {
    announcementHtml: announcement.html,
    announcementSlides: announcement.slides,
    announcementFlash: announcement.flash ?? null,
    staffMessages,
    dismissStaffMessages,
    readStaffMessages,
    branchPeerUsernames,
    pusherPublic: getRealtimePublicConfig(),
    pusherServerOk: isRealtimeServerConfigured(),
  };
}
