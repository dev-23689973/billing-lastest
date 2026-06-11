"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Coins } from "lucide-react";
import { useBillingHeaderStats } from "@/lib/client/useBillingHeaderStats";
import { resolveBillingCreditsDisplay } from "@/lib/layout/billingCreditsDisplay";
import { cn } from "@/lib/cn";
import { BillingBrandTitle } from "@/components/theme/BillingBrandTitle";
import { LivingBillingLogo } from "@/components/theme/LivingBillingLogo";
import { PromoActivityRankBadge, adminActivityBadgeHoverLines } from "@/components/theme/PromoActivityRankBadge";
import { activityBadgeAriaLabel, activityBadgeHoverText, activityBadgeTitle } from "@/lib/promoActivityBadge";
import { getAdminNavShellItems, isAdminNavActive, type AdminNavShellItem } from "@/lib/admin-nav-shell";
import type { PortalBase } from "@/lib/portal-nav";
import { getPortalNavItems, isPortalNavActive } from "@/lib/portal-nav";
import type { SessionPayload } from "@/lib/session";
import { LivingSessionWatch } from "@/components/layout/LivingSessionWatch";

export function AdminSidebar({
  session,
  portalBase,
  panelTitle,
}: {
  session: SessionPayload;
  portalBase?: PortalBase;
  panelTitle: string;
}) {
  const pathname = usePathname() ?? "";
  const logoHref = portalBase ?? "/admin/dashboard";
  const portalItems = portalBase ? getPortalNavItems(portalBase) : null;
  const adminItems = portalBase ? null : getAdminNavShellItems();
  const stats = useBillingHeaderStats(session);
  const creditsDisplay = useMemo(() => resolveBillingCreditsDisplay(stats), [stats]);

  const showLoginId =
    session.displayName?.trim() &&
    session.displayName.trim().toLowerCase() !== session.username.trim().toLowerCase();

  const isAdminSession = stats && !("error" in stats) && stats.isAdmin;

  const activityBadge =
    portalBase && stats && !("error" in stats) && !stats.isAdmin ? stats.activityBadge : null;

  const adminHover = adminActivityBadgeHoverLines();

  const rankBadge =
    isAdminSession ? (
      <PromoActivityRankBadge
        variant="admin"
        rank={null}
        className="sidebar-brand-activity-badge mt-1"
        title="Admin · Top level · Unlimited"
        ariaLabel="Admin crest — top level, unlimited access"
        hoverStatusLine={adminHover.statusLine}
        hoverRemainLine={adminHover.remainLine}
      />
    ) : portalBase && stats && !("error" in stats) && !stats.isAdmin ? (
      <PromoActivityRankBadge
        rank={activityBadge?.rank ?? null}
        litCount={activityBadge?.count}
        className="sidebar-brand-activity-badge mt-1"
        title={activityBadge ? activityBadgeTitle(activityBadge) : undefined}
        ariaLabel={
          activityBadge
            ? activityBadgeAriaLabel(activityBadge)
            : "Activity badges — earn more active clients to unlock"
        }
        hoverStatusLine={activityBadge ? activityBadgeHoverText(activityBadge).statusLine : undefined}
        hoverRemainLine={activityBadge ? activityBadgeHoverText(activityBadge).remainLine : undefined}
      />
    ) : null;

  const creditsBlock = creditsDisplay ? (
    <div className="sidebar-brand-credits">
      <div className="sidebar-brand-divider" aria-hidden />
      <div className="living-sidebar-hud flex justify-start">
        <div className="living-sidebar-hud__row justify-start">
          <span
            className="living-sidebar-hud__pill living-sidebar-hud__pill--credits living-sidebar-hud__pill--lg sidebar-brand-credits__pill"
            title={creditsDisplay.title}
            aria-label={creditsDisplay.ariaLabel}
          >
            <span className="living-sidebar-hud__pillIcon" aria-hidden>
              <Coins className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="living-sidebar-hud__pillValue tabular-nums">{creditsDisplay.value}</span>
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-border/40 bg-transparent backdrop-blur-none lg:flex dark:border-0">
      <div className="px-4 pb-2 pt-5 sm:px-5 sm:pt-6">
        <Link href={logoHref} className="sidebar-brand-block group">
          <div className="sidebar-brand-block__head flex flex-col">
            <div className="sidebar-brand-block__brandRow flex items-start gap-2">
              <div className="sidebar-brand-block__logoCol">
                <LivingBillingLogo size="lg" className="sidebar-brand-block__mark shrink-0" />
              </div>
              <div className="sidebar-brand-block__copy min-w-0 flex-1 overflow-visible">
                <BillingBrandTitle size="sidebar" title={panelTitle}>
                  {panelTitle}
                </BillingBrandTitle>
                {creditsBlock}
              </div>
            </div>
            <div className="sidebar-brand-session flex w-full flex-col items-center justify-center text-center">
              <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                <p className="sidebar-brand-session__label shrink-0">User ◆</p>
                {showLoginId ? (
                  <p className="sidebar-brand-session__id min-w-0 truncate" title="Account username">
                    {session.username}
                  </p>
                ) : (
                  <p
                    className="sidebar-brand-session__user sidebar-brand-session__user--solo min-w-0 truncate"
                    title={session.username}
                  >
                    {session.username}
                  </p>
                )}
              </div>
              {rankBadge ? (
                <div className="mt-1 flex w-full justify-center">{rankBadge}</div>
              ) : null}
            </div>
          </div>
        </Link>
      </div>

      <nav className="thin-scrollbar flex-1 overflow-y-auto overscroll-contain pl-1 pt-4 pb-4 [scrollbar-gutter:stable]" aria-label="Main navigation">
        <div className="space-y-1">
          {portalItems
            ? portalItems.map((item) => {
                const Icon = item.icon;
                const active = isPortalNavActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm mb-2 uppercase transition-colors",
                      active
                        ? "sidebar-active-glow bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "sidebar-active-icon" : "")} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            : (adminItems as AdminNavShellItem[]).map((item) => {
                const Icon = item.icon;
                const active = isAdminNavActive(pathname, item);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm mb-2 uppercase transition-colors",
                      active
                        ? "sidebar-active-glow bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "sidebar-active-icon" : "")} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
        </div>
      </nav>

      <div className="p-4 pt-5">
        <LivingSessionWatch viewerName={session.displayName ?? undefined} />
      </div>
    </aside>
  );
}
