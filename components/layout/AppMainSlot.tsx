"use client";

import { usePathname } from "next/navigation";
import { AppMain } from "@/components/layout/app-main";

/** Tickets dashboard routes use a non-scrolling, edge-to-edge main column. */
export function isTicketsDashboardPath(pathname: string) {
  return /\/tickets\/dashboard\/?$/.test(pathname);
}

/** Admin settings — full-width main column with internal scroll (no max-width card). */
export function isSettingsPath(pathname: string) {
  return /\/settings\/?$/.test(pathname);
}

/** Bonus rules editor — same viewport-filling shell as settings (footer must stay visible). */
export function isBonusRulesPath(pathname: string) {
  return pathname === "/admin/bonus-rules" || pathname === "/admin/bonus-rules/";
}

/** Tickets dashboard / settings / embedded staff+user lists: fill viewport; table scroll stays inside. */
export function isEmbeddedListMainPath(pathname: string) {
  return (
    /^\/admin\/(users|managers|resellers|dealers)\/?$/.test(pathname) ||
    /^\/manager\/(users|resellers|dealers)\/?$/.test(pathname) ||
    /^\/reseller\/(users|dealers)\/?$/.test(pathname) ||
    /^\/dealer\/users\/?$/.test(pathname)
  );
}

export function isEdgeToEdgeMainPath(pathname: string) {
  return (
    isTicketsDashboardPath(pathname) ||
    isSettingsPath(pathname) ||
    isBonusRulesPath(pathname) ||
    isEmbeddedListMainPath(pathname)
  );
}

export function AppMainSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const edgeToEdge = isEdgeToEdgeMainPath(pathname);

  return (
    <AppMain edgeToEdge={edgeToEdge} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
    </AppMain>
  );
}
