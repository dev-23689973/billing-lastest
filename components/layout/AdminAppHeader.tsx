"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hudBrightDropdownShellClass } from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import type { PortalBase } from "@/lib/portal-nav";
import type { SessionPayload } from "@/lib/session";
import { GlobalAnnouncementNewsButton } from "@/components/messages/GlobalAnnouncementNewsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderQuickActions, type HeaderTicketPreviewItem } from "@/components/layout/HeaderQuickActions";
import {
  ADMIN_HUD_PERIOD_EVENT,
  ADMIN_HUD_PERIOD_KEY,
  HudPeriodStrip,
  parseHudPeriodId,
  type HudPeriodId,
} from "@/components/dashboard/hud";
import { logoutAction } from "@/actions/auth";
import { useLiveOpenTicketCount } from "@/components/realtime/useLiveOpenTicketCount";
import { OnlinePresenceStrip } from "@/components/realtime/OnlinePresenceStrip";
import { MyProfileModal } from "@/components/account/MyProfileModal";

export function AdminAppHeader({
  session,
  openTicketCount = 0,
  ticketNotificationsEnabled = true,
  portalBase,
  notificationsHref: notificationsHrefProp,
  notificationLabel = "Open tickets",
  ticketPreview,
}: {
  session: SessionPayload;
  openTicketCount?: number;
  /** When false (admin setting), ticket badge stays hidden. */
  ticketNotificationsEnabled?: boolean;
  portalBase?: PortalBase;
  /** When `portalBase` is set, target for the bell (e.g. tickets or messages). */
  notificationsHref?: string;
  notificationLabel?: string;
  /** When set, bell opens a ticket preview popover (admin / manager / dealer). */
  ticketPreview?: HeaderTicketPreviewItem[];
}) {
  const pathname = usePathname();
  const liveOpenTickets = useLiveOpenTicketCount(
    openTicketCount,
    ticketNotificationsEnabled,
    session.username,
  );
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const showPeriodStrip =
    pathname === "/admin/dashboard" ||
    pathname === "/manager" ||
    pathname === "/reseller" ||
    pathname === "/dealer";
  const [period, setPeriod] = useState<HudPeriodId>("1y");
  const [clientHydrated, setClientHydrated] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    setClientHydrated(true);
  }, []);

  useEffect(() => {
    if (!clientHydrated) return;
    const stored = parseHudPeriodId(sessionStorage.getItem(ADMIN_HUD_PERIOD_KEY));
    if (stored) setPeriod(stored);
  }, [clientHydrated]);

  useEffect(() => {
    const handler = (e: Event) => {
      const raw = (e as CustomEvent<string>).detail;
      const parsed = parseHudPeriodId(raw);
      if (parsed) setPeriod(parsed);
    };
    window.addEventListener(ADMIN_HUD_PERIOD_EVENT, handler as EventListener);
    return () => window.removeEventListener(ADMIN_HUD_PERIOD_EVENT, handler as EventListener);
  }, []);

  function setHudPeriod(next: HudPeriodId) {
    setPeriod(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_HUD_PERIOD_KEY, next);
      window.dispatchEvent(new CustomEvent(ADMIN_HUD_PERIOD_EVENT, { detail: next }));
    }
  }

  function closeProfileMenu() {
    const el = profileMenuRef.current;
    if (el) el.open = false;
  }

  useEffect(() => {
    const closeOnOutside = (e: PointerEvent) => {
      const el = profileMenuRef.current;
      if (!el?.open) return;
      const t = e.target;
      if (t instanceof Node && el.contains(t)) return;
      el.open = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const el = profileMenuRef.current;
      if (e.key === "Escape" && el?.open) el.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  const addHref = portalBase ? `${portalBase}/users/new` : "/admin/users/new";
  const bellHref =
    notificationsHrefProp ??
    (portalBase ? `${portalBase}/tickets/dashboard` : "/admin/tickets/dashboard");
  const staffMessagesHref = portalBase ? `${portalBase}/message` : null;
  const showStaffMessages =
    staffMessagesHref != null &&
    (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR");
  const profileMenuItemClass = cn(
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-foreground",
    "transition-[color,background-color] duration-200 ease-out",
    "hover:bg-cyan-500/12 dark:hover:bg-cyan-400/10",
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-transparent shadow-none">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-3 sm:min-h-11 sm:gap-2 sm:px-4 sm:py-2 lg:px-5 lg:py-3">
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            showPeriodStrip ? "flex-1" : "shrink-0",
          )}
        >
          <div id="admin-users-kpi-slot" className="relative z-[35] flex shrink-0 items-center" />
          {showPeriodStrip ? (
            <div className="flex min-w-0 flex-1 items-center">
              <HudPeriodStrip value={period} onValueChange={setHudPeriod} className="w-full min-w-0 sm:w-auto" />
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5 sm:gap-1.5">
        <OnlinePresenceStrip className="hidden sm:block" />
        <HeaderQuickActions
          addHref={addHref}
          notificationsHref={bellHref}
          openTicketCount={liveOpenTickets}
          ticketPreview={ticketPreview ?? []}
          staffMessagesHref={showStaffMessages ? staffMessagesHref : null}
          viewerUsername={session.username}
        />
        <GlobalAnnouncementNewsButton />
        <ThemeToggle className="!h-8 !w-8 [&_svg]:!h-4 [&_svg]:!w-4" />
        <details ref={profileMenuRef} className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-0.5 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 [&::-webkit-details-marker]:hidden">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-medium text-cyan-700 ring-1 ring-cyan-500/25 dark:text-cyan-200"
              aria-hidden
            >
              {session.displayName?.charAt(0) ?? "A"}
            </span>
          </summary>
          <div
            className={cn(
              hudBrightDropdownShellClass,
              "absolute right-0 z-50 mt-1.5 min-w-[11.5rem] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.28)]",
            )}
          >
            <HudCornerOverlay tone="bright" />
            <div className="relative z-[1]">
              <p className="border-b border-cyan-600/15 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground dark:border-cyan-400/12">
                {session.displayName}
              </p>
              <nav className="py-1" aria-label="Account menu">
                <button
                  type="button"
                  className={profileMenuItemClass}
                  onClick={() => {
                    closeProfileMenu();
                    setProfileModalOpen(true);
                  }}
                >
                  <User className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                  My profile
                </button>
                {portalBase ? null : (
                  <Link
                    className={profileMenuItemClass}
                    href="/admin/settings"
                    onClick={closeProfileMenu}
                  >
                    <Settings className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                    Settings
                  </Link>
                )}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className={profileMenuItemClass}
                    onClick={closeProfileMenu}
                  >
                    <LogOut className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                    Logout
                  </button>
                </form>
              </nav>
            </div>
          </div>
        </details>
        </div>
      </div>
      <MyProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </header>
  );
}
