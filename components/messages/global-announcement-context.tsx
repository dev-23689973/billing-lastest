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
import { createPortal } from "react-dom";
import type { PortalStaffPendingMessage } from "@/lib/portalStaffInbox";
import {
  announcementContentHash,
  announcementDismissStorageKey,
  announcementSessionDismissStorageKey,
  isAnnouncementEmpty,
} from "@/lib/global-announcement-utils";
import { GlobalAnnouncementModal } from "@/components/messages/GlobalAnnouncementModal";
import { PortalStaffMessagesProvider } from "@/components/messages/portal-staff-messages-context";
import type { RealtimePublicConfig } from "@/lib/realtime/config";
import type { SessionPayload } from "@/lib/session";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { RealtimeTicketSync } from "@/components/realtime/RealtimeTicketSync";

type GlobalAnnouncementContextValue = {
  hasAnnouncement: boolean;
  openAnnouncement: () => void;
};

const GlobalAnnouncementContext = createContext<GlobalAnnouncementContextValue | null>(null);

export function useGlobalAnnouncement(): GlobalAnnouncementContextValue {
  const ctx = useContext(GlobalAnnouncementContext);
  if (!ctx) {
    return { hasAnnouncement: false, openAnnouncement: () => {} };
  }
  return ctx;
}

function isPortalStaffRecipient(type: string): boolean {
  return type === "MNGR" || type === "SRSLR" || type === "RSLR";
}

export function BillingShellModals({
  children,
  session,
  pusherPublic = null,
  pusherServerOk = false,
  branchPeerUsernames = null,
  announcementHtml,
  announcementSlides,
  announcementFlash = null,
  staffMessages,
  dismissStaffMessages = [],
  readStaffMessages = [],
}: {
  children: ReactNode;
  session: SessionPayload;
  pusherPublic?: RealtimePublicConfig | null;
  pusherServerOk?: boolean;
  branchPeerUsernames?: string[] | null;
  announcementHtml: string;
  announcementSlides: string[];
  announcementFlash?: import("@/lib/announcement-flash").AnnouncementFlashHeading | null;
  staffMessages: PortalStaffPendingMessage[];
  dismissStaffMessages?: PortalStaffPendingMessage[];
  readStaffMessages?: PortalStaffPendingMessage[];
}) {
  const username = session.username;
  const html = announcementHtml.trim();
  const slides = announcementSlides;
  const flash = announcementFlash;
  const hasAnnouncement = !isAnnouncementEmpty(html, slides, flash);
  const contentHash = useMemo(() => announcementContentHash(html, slides, flash), [html, slides, flash]);
  const dismissKey = useMemo(
    () => announcementDismissStorageKey(username, contentHash),
    [username, contentHash],
  );
  const sessionDismissKey = useMemo(
    () => announcementSessionDismissStorageKey(username, contentHash),
    [username, contentHash],
  );

  const [mounted, setMounted] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [dontShowUntilNew, setDontShowUntilNew] = useState(false);
  const portalStaff = isPortalStaffRecipient(session.type);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted || !hasAnnouncement) return;
    try {
      const dismissedUntilNew = localStorage.getItem(dismissKey) === "1";
      const dismissedThisSession = sessionStorage.getItem(sessionDismissKey) === "1";
      if (dismissedUntilNew || dismissedThisSession) return;
    } catch {
      /* private mode / blocked storage */
    }
    const timer = window.setTimeout(() => setAnnouncementOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [mounted, hasAnnouncement, dismissKey, sessionDismissKey]);

  const markAnnouncementSeenThisSession = useCallback(() => {
    try {
      sessionStorage.setItem(sessionDismissKey, "1");
    } catch {
      /* private mode / blocked storage */
    }
  }, [sessionDismissKey]);

  const openAnnouncement = useCallback(() => {
    if (!hasAnnouncement) return;
    setDontShowUntilNew(false);
    setAnnouncementOpen(true);
  }, [hasAnnouncement]);

  function closeAnnouncement() {
    markAnnouncementSeenThisSession();
    if (dontShowUntilNew) {
      try {
        localStorage.setItem(dismissKey, "1");
      } catch {
        /* ignore */
      }
    }
    setAnnouncementOpen(false);
    setDontShowUntilNew(false);
  }

  const contextValue = useMemo(
    () => ({ hasAnnouncement, openAnnouncement }),
    [hasAnnouncement, openAnnouncement],
  );

  const announcementOverlay =
    mounted && typeof document !== "undefined" && announcementOpen && hasAnnouncement
      ? createPortal(
          <GlobalAnnouncementModal
            html={html}
            slides={slides}
            flash={flash}
            dontShowUntilNew={dontShowUntilNew}
            onDontShowUntilNewChange={setDontShowUntilNew}
            onClose={closeAnnouncement}
          />,
          document.body,
        )
      : null;

  return (
    <RealtimeProvider
      session={session}
      pusherPublic={pusherPublic}
      pusherServerOk={pusherServerOk}
      branchPeerUsernames={branchPeerUsernames}
    >
      <PortalStaffMessagesProvider
        initialMessages={staffMessages}
        initialDismissMessages={dismissStaffMessages}
        initialReadMessages={readStaffMessages}
        enabled={portalStaff}
      >
        <RealtimeTicketSync viewerUsername={session.username} />
        <GlobalAnnouncementContext.Provider value={contextValue}>
          {children}
          {announcementOverlay}
        </GlobalAnnouncementContext.Provider>
      </PortalStaffMessagesProvider>
    </RealtimeProvider>
  );
}
