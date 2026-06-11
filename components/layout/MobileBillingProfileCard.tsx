"use client";

import type { ReactNode } from "react";
import { Coins } from "lucide-react";
import { BillingBrandTitle } from "@/components/theme/BillingBrandTitle";
import { PromoActivityRankBadge, adminActivityBadgeHoverLines } from "@/components/theme/PromoActivityRankBadge";
import {
  hudDashEyebrow,
  hudDashMutedCaption,
  hudDashShell,
  hudElevationSoft,
} from "@/components/dashboard/hud/hudDashboardLayout";
import { useBillingHeaderStats } from "@/lib/client/useBillingHeaderStats";
import { cn } from "@/lib/cn";
import {
  formatBillingActiveCount,
  resolveBillingCreditsDisplay,
} from "@/lib/layout/billingCreditsDisplay";
import {
  mobileProfileActiveMetric,
  mobileProfileCreditsMetric,
  sessionRoleLabel,
} from "@/lib/layout/mobileProfileLabels";
import type { PortalBase } from "@/lib/portal-nav";
import {
  activityBadgeAriaLabel,
  activityBadgeHoverText,
  activityBadgeTitle,
} from "@/lib/promoActivityBadge";
import type { SessionPayload } from "@/lib/session";
import { rsTextCaption, rsTextKicker } from "@/lib/ui/responsiveScale";

function ProfileMetricRow({
  label,
  hint,
  loading,
  failed,
  title,
  children,
}: {
  label: string;
  hint: string;
  loading: boolean;
  failed: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mobile-billing-profile-card__metric rounded-lg border border-border/50 bg-slate-50/50 px-3 py-2.5",
        "dark:border-slate-700/40 dark:bg-slate-950/35",
        "transition-opacity duration-300 ease-out",
        loading ? "opacity-70" : "opacity-100",
      )}
      title={failed ? undefined : title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn(rsTextKicker, "sidebar-brand-session__label m-0")}>{label}</p>
          <p className={cn(hudDashMutedCaption, "mt-0.5 normal-case tracking-normal")}>{hint}</p>
        </div>
        <div className="flex shrink-0 items-center justify-end self-center">{children}</div>
      </div>
    </div>
  );
}

export function MobileBillingProfileCard({
  session,
  panelTitle,
  portalBase,
  className,
}: {
  session: SessionPayload;
  panelTitle: string;
  portalBase?: PortalBase;
  className?: string;
}) {
  const stats = useBillingHeaderStats(session);
  const creditsDisplay = resolveBillingCreditsDisplay(stats);
  const activeCount = formatBillingActiveCount(stats);
  const loading = stats === null;
  const failed = stats !== null && "error" in stats;
  const ready = !loading && !failed;

  const isAdminSession = stats && !("error" in stats) && stats.isAdmin;
  const activityBadge =
    portalBase && stats && !("error" in stats) && !stats.isAdmin ? stats.activityBadge : null;
  const adminHover = adminActivityBadgeHoverLines();

  const activeMetric = mobileProfileActiveMetric(Boolean(isAdminSession));
  const creditsMetric = mobileProfileCreditsMetric(Boolean(isAdminSession));
  const role = sessionRoleLabel(session.type);
  const displayName = session.displayName?.trim();
  const signedInLine =
    displayName && displayName.toLowerCase() !== session.username.trim().toLowerCase()
      ? `${displayName} · @${session.username}`
      : `@${session.username}`;

  const activeTitle = isAdminSession
    ? `Active subscribers: ${activeCount}`
    : `Active clients: ${activeCount}`;

  const showActivityTier = isAdminSession || Boolean(portalBase);

  return (
    <section
      className={cn(
        "mobile-billing-profile-card lg:hidden",
        hudDashShell,
        hudElevationSoft,
        "px-3 py-3 sm:px-4 sm:py-4",
        className,
      )}
      aria-label="Account overview"
    >
      <header className="flex flex-col gap-1 text-center">
        <p className={cn(hudDashEyebrow, "m-0")}>Account overview</p>
        <BillingBrandTitle size="card" title={panelTitle} className="w-full text-center">
          {panelTitle}
        </BillingBrandTitle>
        <p
          className={cn(
            rsTextCaption,
            "mx-auto mt-0.5 max-w-full truncate text-muted-foreground transition-opacity duration-300",
            ready ? "opacity-100" : "opacity-60",
          )}
          title={`Signed in as ${role} · ${session.username}`}
        >
          <span className="font-medium text-foreground/80">{role}</span>
          <span className="mx-1 text-border" aria-hidden>
            ·
          </span>
          <span>{signedInLine}</span>
        </p>
      </header>

      {showActivityTier ? (
        <div
          className={cn(
            "mt-3 flex flex-col items-center gap-1.5 border-t border-border/40 pt-3",
            "dark:border-slate-700/35",
          )}
        >
          <div className="w-full text-center">
            <p className={cn(rsTextKicker, "sidebar-brand-session__label m-0")}>Activity tier</p>
            <p className={cn(hudDashMutedCaption, "mt-0.5 normal-case tracking-normal")}>
              {isAdminSession
                ? "Top level · Unlimited access"
                : "Earn more active clients to unlock badges"}
            </p>
          </div>
          <div className="flex min-h-[1.75rem] w-full justify-center" aria-hidden={loading}>
            {loading ? (
              <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-700/60" />
            ) : isAdminSession ? (
              <PromoActivityRankBadge
                variant="admin"
                rank={null}
                className="sidebar-brand-activity-badge"
                title="Admin · Top level · Unlimited"
                ariaLabel="Admin crest — top level, unlimited access"
                hoverStatusLine={adminHover.statusLine}
                hoverRemainLine={adminHover.remainLine}
              />
            ) : portalBase && stats && !("error" in stats) ? (
              <PromoActivityRankBadge
                rank={activityBadge?.rank ?? null}
                litCount={activityBadge?.count}
                className="sidebar-brand-activity-badge"
                title={activityBadge ? activityBadgeTitle(activityBadge) : undefined}
                ariaLabel={
                  activityBadge
                    ? activityBadgeAriaLabel(activityBadge)
                    : "Activity badges — earn more active clients to unlock"
                }
                hoverStatusLine={
                  activityBadge ? activityBadgeHoverText(activityBadge).statusLine : undefined
                }
                hoverRemainLine={
                  activityBadge ? activityBadgeHoverText(activityBadge).remainLine : undefined
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className={cn(rsTextKicker, "sidebar-brand-session__label m-0 px-0.5")}>At a glance</p>

        <ProfileMetricRow
          label={activeMetric.label}
          hint={activeMetric.hint}
          loading={loading}
          failed={failed}
          title={ready ? activeTitle : undefined}
        >
          {loading ? (
            <span className="h-6 w-16 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/60" aria-hidden />
          ) : failed ? (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>Unavailable</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-[0.625rem] font-semibold text-cyan-600 dark:text-cyan-400" aria-hidden>
                ◈
              </span>
              <span className="sidebar-brand-session__id tabular-nums">{activeCount}</span>
            </span>
          )}
        </ProfileMetricRow>

        <ProfileMetricRow
          label={creditsMetric.label}
          hint={creditsMetric.hint}
          loading={loading}
          failed={failed}
          title={ready && creditsDisplay ? creditsDisplay.title : undefined}
        >
          {loading ? (
            <span className="h-6 w-14 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/60" aria-hidden />
          ) : failed ? (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>Unavailable</span>
          ) : creditsDisplay ? (
            <span
              className="living-sidebar-hud__pill living-sidebar-hud__pill--credits sidebar-brand-credits__pill inline-flex items-center gap-1.5 border-0 bg-transparent p-0 shadow-none"
              aria-label={creditsDisplay.ariaLabel}
            >
              <span className="living-sidebar-hud__pillIcon" aria-hidden>
                <Coins className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <span className="living-sidebar-hud__pillValue tabular-nums">{creditsDisplay.value}</span>
            </span>
          ) : (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>—</span>
          )}
        </ProfileMetricRow>
      </div>
    </section>
  );
}
