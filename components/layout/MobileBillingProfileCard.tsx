"use client";

import type { ReactNode } from "react";
import { Coins, Users } from "lucide-react";
import { BillingBrandTitle } from "@/components/theme/BillingBrandTitle";
import { LivingBillingLogo } from "@/components/theme/LivingBillingLogo";
import { PromoActivityRankBadge, adminActivityBadgeHoverLines } from "@/components/theme/PromoActivityRankBadge";
import {
  hudDashMutedCaption,
  hudDashShell,
  hudDashWalletLabel,
  hudDashWalletPanel,
  hudDashWalletValue,
  hudDashWalletValueAccent,
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
import { rsActivityRankMinH, rsIconSm, rsTextCaption, uiBadgeClass } from "@/lib/ui/responsiveScale";

function ProfileKpi({
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
        hudDashWalletPanel,
        "mobile-billing-profile-card__kpi min-w-0 transition-opacity duration-300",
        loading ? "opacity-70" : "opacity-100",
      )}
      title={failed ? hint : title ?? hint}
    >
      <p className={cn(hudDashWalletLabel, "m-0 truncate")}>{label}</p>
      <div className="mt-1.5 min-h-[1.75rem] flex items-center">{children}</div>
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
  const tierHint = isAdminSession
    ? "Top level · Unlimited access"
    : "Earn more active clients to unlock badges";

  return (
    <section
      className={cn(
        "mobile-billing-profile-card lg:hidden",
        hudDashShell,
        hudElevationSoft,
        "px-3 py-3.5 sm:px-4 sm:py-4",
        className,
      )}
      aria-label="Account overview"
    >
      <header className="mobile-billing-profile-card__brand flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-3.5">
          <LivingBillingLogo size="xl" className="mobile-billing-profile-card__logo shrink-0" />
          <BillingBrandTitle size="card" title={panelTitle} className="w-full text-center sm:w-auto">
            {panelTitle}
          </BillingBrandTitle>
        </div>
        <div
          className={cn(
            "mt-2 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1",
            "transition-opacity duration-300",
            ready ? "opacity-100" : "opacity-60",
          )}
          title={`Signed in as ${role} · ${session.username}`}
        >
          <span
            className={cn(
              uiBadgeClass,
              "mobile-billing-profile-card__role border-primary/20 bg-primary/10 text-primary dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-300",
            )}
          >
            {role}
          </span>
          <span className={cn(rsTextCaption, "min-w-0 truncate text-muted-foreground")}>{signedInLine}</span>
        </div>
      </header>

      {showActivityTier ? (
        <div className="mobile-billing-profile-card__tier mt-3.5 rounded-xl border border-border/50 px-3 py-3 sm:px-3.5 sm:py-3.5 dark:border-slate-700/40">
          <div className="flex flex-col items-center gap-2 text-center sm:gap-2.5">
            <div className="w-full">
              <p className={cn(hudDashWalletLabel, "m-0")}>Activity tier</p>
              <p className={cn(hudDashMutedCaption, "mt-1 normal-case tracking-normal")}>{tierHint}</p>
            </div>
            <div
              className={cn(
                "flex w-full justify-center py-0.5",
                "mobile-billing-profile-card__badges",
                rsActivityRankMinH,
              )}
              aria-hidden={loading}
            >
              {loading ? (
                <div className="h-9 w-48 max-w-full animate-pulse rounded-lg bg-slate-200/80 sm:h-10 dark:bg-slate-700/60" />
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
        </div>
      ) : null}

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:gap-2.5">
        <ProfileKpi
          label={activeMetric.label}
          hint={activeMetric.hint}
          loading={loading}
          failed={failed}
          title={ready ? activeTitle : undefined}
        >
          {loading ? (
            <span className="h-7 w-16 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/60" aria-hidden />
          ) : failed ? (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>Unavailable</span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <Users className={cn(rsIconSm, "text-cyan-600 dark:text-cyan-400")} strokeWidth={2.25} aria-hidden />
              <span className={cn(hudDashWalletValueAccent, "mt-0 truncate")}>{activeCount}</span>
            </span>
          )}
        </ProfileKpi>

        <ProfileKpi
          label={creditsMetric.label}
          hint={creditsMetric.hint}
          loading={loading}
          failed={failed}
          title={ready && creditsDisplay ? creditsDisplay.title : undefined}
        >
          {loading ? (
            <span className="h-7 w-14 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/60" aria-hidden />
          ) : failed ? (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>Unavailable</span>
          ) : creditsDisplay ? (
            <span className="flex min-w-0 items-center gap-1.5" aria-label={creditsDisplay.ariaLabel}>
              <Coins className={cn(rsIconSm, "text-violet-600 dark:text-violet-300")} strokeWidth={2.25} aria-hidden />
              <span className={cn(hudDashWalletValue, "mt-0 truncate text-violet-700 dark:text-violet-200")}>
                {creditsDisplay.value}
              </span>
            </span>
          ) : (
            <span className={cn(rsTextCaption, "text-muted-foreground")}>—</span>
          )}
        </ProfileKpi>
      </div>
    </section>
  );
}
