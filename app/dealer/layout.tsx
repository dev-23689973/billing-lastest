import { redirect } from "next/navigation";
import "../portal-tables.css";
import { getSession, homePathForUserType } from "@/lib/session";
import { AppMainSlot } from "@/components/layout/AppMainSlot";
import { AdminAppHeader } from "@/components/layout/AdminAppHeader";
import { AdminMobileNav } from "@/components/layout/AdminMobileNav";
import { mobileNavLayoutPadClass } from "@/components/layout/mobileNavTab";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { BillingAnnouncementGate } from "@/components/messages/BillingAnnouncementGate";
import { priorityLabel, statusLabel } from "@/lib/repos/tickets";
import { getPanelTitle } from "@/lib/panel-title";
import { EMPTY_BILLING_SHELL_EXTRAS, loadBillingShellExtras } from "@/lib/layout/loadBillingShellExtras";
import { getCachedLayoutTicketNotifications } from "@/lib/layout/cachedLayoutQueries";

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dealer");
  if (session.type !== "RSLR") {
    const home = homePathForUserType(session.type);
    redirect(home ?? "/login?error=forbidden");
  }

  let notificationCount = 0;
  let ticketPreview: { id: number; subject: string; statusLabel: string }[] = [];
  let panelTitle = "Billing";
  let shellExtras = EMPTY_BILLING_SHELL_EXTRAS;
  try {
    const [ticketNotify, title, extras] = await Promise.all([
      getCachedLayoutTicketNotifications(session),
      getPanelTitle(),
      loadBillingShellExtras(session),
    ]);
    const { openTicketCount: count, ticketRows: rows } = ticketNotify;
    notificationCount = count;
    panelTitle = title;
    shellExtras = extras;
    ticketPreview = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      statusLabel: statusLabel(r.status_id),
      priorityLabel: priorityLabel(r.priority_id),
      updatedAt: r.updated_at,
    }));
  } catch {
    notificationCount = 0;
    ticketPreview = [];
    panelTitle = await getPanelTitle().catch(() => "Billing");
  }

  return (
    <BillingAnnouncementGate session={session} shellExtras={shellExtras}>
    <div
      className={`flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-transparent ${mobileNavLayoutPadClass}`}
    >
      <AdminSidebar session={session} portalBase="/dealer" panelTitle={panelTitle} />
      <AdminMobileNav portalBase="/dealer" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <AdminAppHeader
          session={session}
          openTicketCount={notificationCount}
          portalBase="/dealer"
          notificationsHref="/dealer/tickets/dashboard"
          ticketPreview={ticketPreview}
        />
        <AppMainSlot>{children}</AppMainSlot>
      </div>
    </div>
    </BillingAnnouncementGate>
  );
}
