"use client";

import dynamic from "next/dynamic";
import type { AdminStalkerMessageDashboardStats } from "@/lib/repos/billing";
import type {
  AdminPortalStaffMessageDashboardStats,
  PortalStaffAudiencePreviewCounts,
  PortalStaffRoleMessageStatus,
} from "@/lib/repos/portalStaffMessages";
import { cn } from "@/lib/cn";
import { useTheme } from "@/contexts/ThemeContext";
import { DeferClientMount } from "@/components/performance/DeferClientMount";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";

const PortalStaffMessageStatusArcs = dynamic(
  () =>
    import("@/components/messages/PortalStaffMessageStatusArcs").then((m) => m.PortalStaffMessageStatusArcs),
  { ssr: false, loading: () => <div className="min-h-[7rem] w-full" aria-hidden /> },
);

const StalkerMessageStatusArcs = dynamic(
  () => import("@/components/messages/StalkerMessageStatusArcs").then((m) => m.StalkerMessageStatusArcs),
  { ssr: false, loading: () => <div className="min-h-[7rem] w-full" aria-hidden /> },
);

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-muted-foreground/90";

export function MessageDeliveryKpiStrip({
  stats,
  staffStats,
  staffAudience,
  staffMessageByRole,
  subscriberReach,
  stbOnly = false,
  mobileCompact = false,
}: {
  stats: AdminStalkerMessageDashboardStats;
  staffStats: AdminPortalStaffMessageDashboardStats;
  staffAudience: PortalStaffAudiencePreviewCounts;
  staffMessageByRole: PortalStaffRoleMessageStatus[];
  subscriberReach: number;
  stbOnly?: boolean;
  mobileCompact?: boolean;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const kpiHudPanelClass = cn(
    "relative min-w-0 overflow-y-visible rounded-lg border border-border/60 bg-transparent",
    mobileCompact ? "mt-1 p-1.5 sm:mt-1.5 sm:p-2 md:p-3" : "mt-1.5 p-2 sm:p-3",
    isLight
      ? "shadow-sm ring-1 ring-black/[0.04]"
      : "rounded-none border-cyan-600/22 bg-[hsl(222_47%_6%/0.92)] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]",
  );

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1",
        mobileCompact ? "gap-2 sm:gap-3 xl:grid-cols-2 xl:gap-4" : "gap-3 xl:grid-cols-2 xl:gap-4",
      )}
    >
      {!stbOnly ? (
        <div className="min-w-0 w-full">
          <p className={sectionLabelClass}>
            <span className="sm:hidden">Portal staff</span>
            <span className="hidden sm:inline">Portal staff (login popup)</span>
          </p>
          <div className={kpiHudPanelClass}>
            {!isLight ? <HudCornerOverlay tone="default" /> : null}
            <div className="relative z-[1] w-full min-w-0">
              <DeferClientMount fallback={<div className="min-h-[7rem] w-full" aria-hidden />}>
                <PortalStaffMessageStatusArcs
                  staffStats={staffStats}
                  staffAudience={staffAudience}
                  staffMessageByRole={staffMessageByRole}
                  className="w-full"
                  mobileCompact={mobileCompact}
                />
              </DeferClientMount>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 w-full">
        <p className={sectionLabelClass}>
          <span className="sm:hidden">STB subscribers</span>
          <span className="hidden sm:inline">STB subscribers (device messages)</span>
        </p>
        <div className={kpiHudPanelClass}>
          {!isLight ? <HudCornerOverlay tone="default" /> : null}
          <div className="relative z-[1] w-full min-w-0">
            <DeferClientMount fallback={<div className="min-h-[7rem] w-full" aria-hidden />}>
              <StalkerMessageStatusArcs
                stats={stats}
                subscriberReach={subscriberReach}
                className="w-full"
                mobileCompact={mobileCompact}
              />
            </DeferClientMount>
          </div>
        </div>
      </div>
    </div>
  );
}
