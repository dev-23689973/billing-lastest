"use client";

import { IntelGuideBadge, type IntelTip } from "@/components/dashboard/IntelGuideBadge";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import {
  hudDashEyebrowTight,
  hudDashTitleCaps,
  hudFeedCardBody,
  hudFeedCardHeader,
  hudFeedTableInnerShell,
  hudMutedOuterShell,
} from "@/components/dashboard/hud/hudDashboardLayout";

export function HudFeedCard({
  title,
  subtitle,
  accentDotClass,
  tip,
  headerRight,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  accentDotClass: string;
  tip: IntelTip;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(hudMutedOuterShell, "flex h-full min-h-0 min-w-0 flex-col", className)}>
      <div className={cn("relative z-[1]", hudFeedCardBody)}>
        <div className={hudFeedCardHeader}>
          <div className="min-w-0">
            <h3 className={cn(hudDashTitleCaps, "flex items-center gap-1.5 text-sm leading-tight sm:text-base")}>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accentDotClass)} aria-hidden />
              {title}
            </h3>
            <p className={hudDashEyebrowTight}>{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <IntelGuideBadge size="sm" className="shrink-0" tip={tip} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HudFeedTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(hudFeedTableInnerShell, "w-full min-w-0 flex-1", className)}>{children}</div>;
}
