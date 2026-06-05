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
  emptyPortalStaffMessageStatsByRole,
  getOperatorMessageAudiencePreviewCounts,
  listStalkerUsersForMessageSelectScoped,
} from "@/lib/data";
import { getCachedOperatorMessageStalkerShell } from "@/lib/messages/operatorStalkerShell.server";

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function DealerMessagesPage({
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

  const canSendStaff = canOperatorSendPortalStaffMessages("RSLR");
  const canSendSubscriber = await canOperatorSendSubscriberMessages("RSLR", u);
  const isCompose = firstString(sp.tab)?.trim().toLowerCase() === "compose";

  const [stalkerUsers, audiencePreview, stalkerShell] = await Promise.all([
    isCompose
      ? listStalkerUsersForMessageSelectScoped({ ownerType: "RSLR", ownerUsername: u }).catch(() => [])
      : Promise.resolve([]),
    getOperatorMessageAudiencePreviewCounts({ ownerType: "RSLR", ownerUsername: u }).catch(() => ({
      all: 0,
      active: 0,
      expired: 0,
      expiring: 0,
      inactive: 0,
      managers: 0,
      resellers: 0,
    })),
    getCachedOperatorMessageStalkerShell({ ownerType: "RSLR", ownerUsername: u }).catch(() => ({
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
  const messageFlashes: FlashToastItem[] = [
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
            portalBase: "/dealer",
            ownerType: "RSLR",
            canSendStaff,
            canSendSubscriber,
            operatorStaffAudiencePreview: {
              downstream_all: 0,
              downstream_resellers: 0,
              downstream_dealers: 0,
            },
          }}
          staffUsers={[]}
          staffAudiencePreview={{
            all_staff: 0,
            managers: 0,
            resellers: 0,
            dealers: 0,
          }}
          subscriberAccounts={subscriberAccounts}
          audiencePreview={audiencePreview}
          roleCounts={{ admin: 0, manager: 0, reseller: 0, dealer: 1 }}
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
