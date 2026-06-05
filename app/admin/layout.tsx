import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "../portal-tables.css";
import { ADMIN_LOGIN_NEXT_HEADER } from "@/lib/billingCookies";
import { getSession, homePathForUserType } from "@/lib/session";

/** Session + DB reads in this tree must not be statically cached (avoids RSC / cookie edge cases on Vercel). */
export const dynamic = "force-dynamic";
import { AppMainSlot } from "@/components/layout/AppMainSlot";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminMobileNav } from "@/components/layout/AdminMobileNav";
import { mobileNavLayoutPadClass } from "@/components/layout/mobileNavTab";
import { AdminAppHeader } from "@/components/layout/AdminAppHeader";
import { priorityLabel, statusLabel } from "@/lib/repos/tickets";
import { getPanelTitle } from "@/lib/panel-title";
import { BillingAnnouncementGate } from "@/components/messages/BillingAnnouncementGate";
import { loadBillingShellExtras } from "@/lib/layout/loadBillingShellExtras";
import {
  getCachedAdminNotificationPrefs,
  getCachedLayoutTicketNotifications,
} from "@/lib/layout/cachedLayoutQueries";
import { timeServerLoad } from "@/lib/server/devTiming";

function safeAdminLoginNext(raw: string | null): string | null {
  const next = raw?.trim() ?? "";
  if (!next.startsWith("/admin") || next.startsWith("//") || next.includes("..")) return null;
  return next;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    const next = safeAdminLoginNext((await headers()).get(ADMIN_LOGIN_NEXT_HEADER));
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  if (session.type !== "ROOT") {
    const home = homePathForUserType(session.type);
    redirect(home ?? "/login?error=forbidden");
  }

  const [notifyPrefs, panelTitle, ticketNotify, shellExtras] = await Promise.all([
    timeServerLoad("admin-layout:notification-prefs", () => getCachedAdminNotificationPrefs()),
    timeServerLoad("admin-layout:panel-title", () => getPanelTitle()),
    timeServerLoad("admin-layout:tickets", () => getCachedLayoutTicketNotifications(session)),
    timeServerLoad("admin-layout:shell-extras", () => loadBillingShellExtras(session)),
  ]);
  const { ticketRows, openTicketCount } = ticketNotify;
  const openTicketCountResolved = notifyPrefs.notifyNewTickets ? openTicketCount : 0;

  const ticketPreview = ticketRows.map((r) => ({
    id: r.id,
    subject: r.subject,
    statusLabel: statusLabel(r.status_id),
    priorityLabel: priorityLabel(r.priority_id),
    updatedAt: r.updated_at,
  }));

  return (
    <BillingAnnouncementGate session={session} shellExtras={shellExtras}>
      <div
        className={`flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-transparent ${mobileNavLayoutPadClass}`}
      >
        <AdminSidebar session={session} panelTitle={panelTitle} />
        <AdminMobileNav />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-60">
          <AdminAppHeader
            session={session}
            openTicketCount={openTicketCountResolved}
            ticketNotificationsEnabled={notifyPrefs.notifyNewTickets}
            ticketPreview={ticketPreview}
          />
          <AppMainSlot>{children}</AppMainSlot>
        </div>
      </div>
    </BillingAnnouncementGate>
  );
}
