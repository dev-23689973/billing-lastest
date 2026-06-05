import { portalMessagePageFlashError, operatorCopy } from "@/lib/operatorUiCopy";
import { Suspense } from "react";
import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminMessagesScreenLazy } from "@/components/admin/AdminMessagesScreenLazy";
import {
  canOperatorSendPortalStaffMessages,
  canOperatorSendSubscriberMessages,
  emptyAdminStalkerMessageDashboardStats,
  getOperatorMessageAudiencePreviewCounts,
  getPortalOperatorStaffAudiencePreviewCounts,
  emptyPortalStaffMessageStatsByRole,
  listPortalStaffUsersForSelectScoped,
  listStalkerUsersForMessageSelectScoped,
} from "@/lib/data";
import { getCachedOperatorMessageStalkerShell } from "@/lib/messages/operatorStalkerShell.server";

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function ResellerMessagesPage({
  operatorUsername,
  displayName,
  searchParams: sp,
}: {
  operatorUsername: string;
  displayName: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = operatorUsername.trim();
  const who = displayName.trim() || u;
  const staffScope = { ownerType: "SRSLR" as const, ownerUsername: u };

  const canSendStaff = canOperatorSendPortalStaffMessages("SRSLR");
  const canSendSubscriber = await canOperatorSendSubscriberMessages("SRSLR", u);
  const isCompose = firstString(sp.tab)?.trim().toLowerCase() === "compose";

  const [stalkerUsers, audiencePreview, staffUsers, staffAudiencePreview, stalkerShell] = await Promise.all([
    isCompose
      ? listStalkerUsersForMessageSelectScoped({ ownerType: "SRSLR", ownerUsername: u }).catch(() => [])
      : Promise.resolve([]),
    getOperatorMessageAudiencePreviewCounts({ ownerType: "SRSLR", ownerUsername: u }).catch(() => ({
      all: 0,
      active: 0,
      expired: 0,
      expiring: 0,
      inactive: 0,
      managers: 0,
      resellers: 0,
    })),
    isCompose && canSendStaff
      ? listPortalStaffUsersForSelectScoped(staffScope).catch(() => [])
      : Promise.resolve([]),
    canSendStaff
      ? getPortalOperatorStaffAudiencePreviewCounts(staffScope).catch(() => ({
          downstream_all: 0,
          downstream_resellers: 0,
          downstream_dealers: 0,
        }))
      : Promise.resolve({ downstream_all: 0, downstream_resellers: 0, downstream_dealers: 0 }),
    getCachedOperatorMessageStalkerShell({ ownerType: "SRSLR", ownerUsername: u }).catch(() => ({
      stats: emptyAdminStalkerMessageDashboardStats(),
      recent: [] as import("@/lib/repos/billing").AdminRecentStalkerSendMessageRow[],
    })),
  ]);
  const stats = stalkerShell.stats;
  const recent = stalkerShell.recent;

  const subscriberAccounts = stalkerUsers.map((row) => ({ account: row.login }));

  const errCode = firstString(sp.error);
  const err = portalMessagePageFlashError(errCode);

  const okVal = firstString(sp.ok);
  const okCount = firstString(sp.n);
  const messageFlashes: FlashToastItem[] = [
    ...(okVal === "staff"
      ? [
          {
            type: "success" as const,
            message: "Portal staff message sent",
            description: okCount
              ? `${okCount} staff member(s) will see a popup on next login until dismissed.`
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

  const staffAudienceForAdmin = {
    all_staff: staffAudiencePreview.downstream_all,
    managers: 0,
    resellers: 0,
    dealers: staffAudiencePreview.downstream_dealers,
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-hidden sm:gap-6">
      
      <PageHeader title="Recent messages" breadcrumb="Home › Messages" showBack={false} />
      <Suspense
        fallback={
          <div className="flex min-h-0 w-full flex-1 flex-col gap-4" aria-busy="true">
            <div className="h-24 shrink-0 animate-pulse rounded-2xl bg-muted/25" />
            <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-muted/20" />
          </div>
        }
      >
        <AdminMessagesScreenLazy
          portal={{
            portalBase: "/reseller",
            ownerType: "SRSLR",
            canSendStaff,
            canSendSubscriber,
            operatorStaffAudiencePreview: staffAudiencePreview,
          }}
          staffUsers={staffUsers}
          staffAudiencePreview={staffAudienceForAdmin}
          subscriberAccounts={subscriberAccounts}
          audiencePreview={audiencePreview}
          roleCounts={{ admin: 0, manager: 0, reseller: 1, dealer: 0 }}
          stats={stats}
          staffStats={{ messagesSent: 0, recipientRows: 0, dismissed: 0, pendingDismiss: 0 }}
          staffMessageByRole={emptyPortalStaffMessageStatsByRole()}
          recent={recent}
          sentByLabel={who}
        />
      </Suspense>
    </div>
  );
}
