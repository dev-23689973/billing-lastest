import type { ReactNode } from "react";
import { BillingShellModals } from "@/components/messages/global-announcement-context";
import type { BillingShellExtras } from "@/lib/layout/loadBillingShellExtras";
import type { SessionPayload } from "@/lib/session";

/** Wraps authenticated shell: staff messages (alerts bell) + optional global news. Data is loaded in layout (parallel). */
export function BillingAnnouncementGate({
  children,
  session,
  shellExtras,
}: {
  children: ReactNode;
  session: SessionPayload;
  shellExtras: BillingShellExtras;
}) {
  return (
    <BillingShellModals
      session={session}
      pusherPublic={shellExtras.pusherPublic}
      pusherServerOk={shellExtras.pusherServerOk}
      branchPeerUsernames={shellExtras.branchPeerUsernames}
      announcementHtml={shellExtras.announcementHtml}
      announcementSlides={shellExtras.announcementSlides}
      announcementFlash={shellExtras.announcementFlash}
      staffMessages={shellExtras.staffMessages}
      dismissStaffMessages={shellExtras.dismissStaffMessages}
      readStaffMessages={shellExtras.readStaffMessages}
    >
      {children}
    </BillingShellModals>
  );
}
