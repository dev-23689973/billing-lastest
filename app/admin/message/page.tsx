import { Suspense } from "react";
import type { FlashToastItem } from "@/components/FlashToasts";
import { messagePageFlashError, operatorCopy } from "@/lib/operatorUiCopy";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminMessagesScreenLazy } from "@/components/admin/AdminMessagesScreenLazy";
import {
  getAdminMessageAudiencePreviewCounts,
  getAdminPortalStaffMessageDashboardStats,
  getAdminPortalStaffMessageStatsByRole,
  getPortalStaffAudiencePreviewCounts,
  emptyPortalStaffMessageStatsByRole,
  emptyAdminStalkerMessageDashboardStats,
  listBillingSubscriberAccountsForMessageSelect,
  listPortalStaffUsersForSelect,
  listRecentPortalStaffMessages,
} from "@/lib/data";
import type {
  AdminMessageAudiencePreviewCounts,
  AdminMessageRoleCounts,
  AdminRecentStalkerSendMessageRow,
} from "@/lib/repos/billing";
import type {
  BillingSubscriberMessageOption,
  PortalStaffAudiencePreviewCounts,
  PortalStaffUserOption,
} from "@/lib/repos/portalStaffMessages";
import { getSession } from "@/lib/session";
import { getCachedAdminMessageStalkerShell } from "@/lib/messages/adminStalkerShell.server";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const EMPTY_AUDIENCE: AdminMessageAudiencePreviewCounts = {
  all: 0,
  active: 0,
  expired: 0,
  expiring: 0,
  inactive: 0,
};

const EMPTY_STAFF_AUDIENCE: PortalStaffAudiencePreviewCounts = {
  all_staff: 0,
  managers: 0,
  resellers: 0,
  dealers: 0,
};

const EMPTY_ROLE_COUNTS: AdminMessageRoleCounts = { admin: 1, manager: 0, reseller: 0, dealer: 0 };

function tabFromSearchParams(sp: Record<string, string | string[] | undefined>): "compose" | "history" {
  const raw = sp.tab;
  const tab = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  return tab === "compose" ? "compose" : "history";
}

export default async function MessagePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const mainTab = tabFromSearchParams(sp);
  const isCompose = mainTab === "compose";
  const session = await getSession();
  const sentByLabel = session?.displayName?.trim() || session?.username || "admin";

  const [
    recentStaff,
    audiencePreview,
    staffAudiencePreview,
    staffStats,
    staffMessageByRole,
    staffUsers,
    subscriberAccounts,
    stalkerShell,
  ] = await Promise.all([
    listRecentPortalStaffMessages(100).catch(() => []),
    getAdminMessageAudiencePreviewCounts({ accurateMappedTotal: isCompose }).catch(() => EMPTY_AUDIENCE),
    getPortalStaffAudiencePreviewCounts().catch(() => EMPTY_STAFF_AUDIENCE),
    getAdminPortalStaffMessageDashboardStats().catch(() => ({
      messagesSent: 0,
      recipientRows: 0,
      dismissed: 0,
      pendingDismiss: 0,
    })),
    getAdminPortalStaffMessageStatsByRole().catch(() => emptyPortalStaffMessageStatsByRole()),
    isCompose ? listPortalStaffUsersForSelect().catch(() => [] as PortalStaffUserOption[]) : Promise.resolve([] as PortalStaffUserOption[]),
    isCompose
      ? listBillingSubscriberAccountsForMessageSelect().catch(() => [] as BillingSubscriberMessageOption[])
      : Promise.resolve([] as BillingSubscriberMessageOption[]),
    getCachedAdminMessageStalkerShell().catch(() => ({
      stats: emptyAdminStalkerMessageDashboardStats(),
      recent: [] as AdminRecentStalkerSendMessageRow[],
    })),
  ]);

  const roleCounts = EMPTY_ROLE_COUNTS;
  const stats = stalkerShell.stats;
  const recent = stalkerShell.recent;

  const errCode = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const err = messagePageFlashError(errCode);

  const okVal = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const staffN = Array.isArray(sp.n) ? sp.n[0] : sp.n;
  const messageFlashes: FlashToastItem[] = [
    ...(okVal === "staff"
      ? [
          {
            type: "success" as const,
            message: "Portal staff message sent",
            description: staffN
              ? `${staffN} staff member(s) will see a popup on next login until dismissed.`
              : "Recipients will see a popup on next login until dismissed.",
          },
        ]
      : []),
    ...(okVal === "stb" || okVal === "1"
      ? [
          {
            type: "success" as const,
            message: "STB message queued",
            description: operatorCopy.stbPollDelivery,
          },
        ]
      : []),
    ...(err ? [{ type: "error" as const, message: err }] : []),
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-hidden sm:gap-6">
      
      <PageHeader title={mainTab === "history" ? "Recent messages" : "Messages"} breadcrumb="Home › Messages" />
      <Suspense
        fallback={
          <div className="flex min-h-0 w-full flex-1 flex-col gap-4" aria-busy="true">
            <div className="h-24 shrink-0 animate-pulse rounded-2xl bg-muted/25" />
            <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-muted/20" />
          </div>
        }
      >
        <AdminMessagesScreenLazy
          staffUsers={staffUsers}
          staffAudiencePreview={staffAudiencePreview}
          subscriberAccounts={subscriberAccounts}
          audiencePreview={audiencePreview}
          roleCounts={roleCounts}
          stats={stats}
          staffStats={staffStats}
          staffMessageByRole={staffMessageByRole}
          recent={recent}
          recentStaff={recentStaff}
          sentByLabel={sentByLabel}
        />
      </Suspense>
    </div>
  );
}
