"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Bell, LifeBuoy, MessageSquare, X } from "lucide-react";
import { TicketConversationModal } from "@/components/tickets/TicketConversationModal";
import { dismissTicketAlertAction, loadHeaderStatsAction, loadOpenTicketsSnapshotAction } from "@/actions/clientData";
import { usePortalStaffMessages } from "@/components/messages/portal-staff-messages-context";
import { PortalStaffMessageDetailModal } from "@/components/messages/PortalStaffMessageDetailModal";
import {
  dismissActivityNudge,
  isActivityNudgeDismissed,
} from "@/lib/client/activityNudgeDismiss";
import {
  cachedDataLoad,
  DATA_CACHE_NS,
  invalidateBillingDataCacheSilent,
  BILLING_DATA_CACHE_INVALIDATE,
} from "@/lib/client/dataCache";
import type { HeaderStatsActivityNudgeDto } from "@/lib/server/realtimeClientData";
import {
  activityNudgeMeta,
  activityNudgeTitle,
} from "@/lib/promoActivityBadge";
import { BILLING_REALTIME_TICKET_EVENT, BILLING_HEADER_STATS_EVENT } from "@/lib/realtime/client-events";
import {
  BILLING_TICKET_ALERT_DISMISS_CHANGED,
  dispatchTicketAlertDismissChanged,
} from "@/lib/realtime/ticket-alert-events";
import { hudBrightDropdownShellClass } from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";
import {
  derivePortalStaffInboxStatus,
  type PortalStaffInboxStatus,
  type PortalStaffPendingMessage,
} from "@/lib/portalStaffInbox";
import { portalStaffMessageHeadline } from "@/lib/portalStaffMessageDisplay";

const iconBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,box-shadow] duration-200 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-cyan-400/35 focus-visible:ring-offset-0";

async function postDismissTicketAlert(ticketId: number): Promise<boolean> {
  try {
    const j = await dismissTicketAlertAction(ticketId);
    return j.ok === true;
  } catch {
    return false;
  }
}

export type HeaderTicketPreviewItem = {
  id: number;
  subject: string;
  statusLabel: string;
  priorityLabel?: string;
  updatedAt?: number;
};

type AlertsTab = "messages" | "tickets";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRelativeTime(unix?: number): string {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TabButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: typeof MessageSquare;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-2 text-xs font-medium transition-all duration-200 ease-out",
        active
          ? "bg-cyan-500/14 text-foreground shadow-[inset_0_0_14px_rgba(34,211,238,0.1)] ring-1 ring-cyan-400/40"
          : "text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <span>{label}</span>
      {count > 0 ? (
        <span
          className={cn(
            "min-w-[1.125rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none",
            active ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function AlertListItem({
  title,
  meta,
  badge,
  onOpen,
  onDismiss,
  dismissLabel,
  showDismiss = true,
}: {
  title: string;
  meta?: string;
  badge?: string;
  onOpen: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  showDismiss?: boolean;
}) {
  return (
    <li className="group flex items-stretch gap-0.5 border-b border-cyan-600/12 last:border-b-0 dark:border-cyan-400/10">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "min-w-0 flex-1 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-cyan-500/12 dark:hover:bg-cyan-400/10",
          !showDismiss && "pr-3",
        )}
      >
        <p className="line-clamp-1 text-sm font-medium text-foreground">{title}</p>
        {meta ? <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{meta}</p> : null}
        {badge ? (
          <span className="mt-1.5 inline-block rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </button>
      {showDismiss && onDismiss ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex w-9 shrink-0 items-center justify-center text-muted-foreground opacity-60 transition-[opacity,background-color,color] duration-150 ease-out hover:bg-cyan-500/10 hover:text-foreground hover:opacity-100 dark:hover:bg-cyan-400/10"
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}



function AlertsPanel({
  staffMessagesHref,
  messagesHref,
  notificationsHref,
  ticketPreview,
  openTicketCount,
  menuOpen,
  onCloseMenu,
  onSelectMessage,
  onSelectTicket,
  activityNudge,
  onDismissActivityNudge,
}: {
  staffMessagesHref: string | null;
  messagesHref: string;
  notificationsHref: string;
  ticketPreview: HeaderTicketPreviewItem[];
  openTicketCount: number;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onSelectMessage: (message: PortalStaffPendingMessage) => void;
  onSelectTicket: (ticketId: number) => void;
  activityNudge: HeaderStatsActivityNudgeDto | null;
  onDismissActivityNudge: () => void;
}) {
  const { messages, dismiss, refresh: refreshStaffMessages } = usePortalStaffMessages();
  const showMessages = staffMessagesHref != null;
  const [tab, setTab] = useState<AlertsTab>("tickets");
  const [liveTicketPreview, setLiveTicketPreview] = useState<HeaderTicketPreviewItem[]>(ticketPreview);
  const [liveOpenCount, setLiveOpenCount] = useState(openTicketCount);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const refreshTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const j = await loadOpenTicketsSnapshotAction();
      if (!j.ok) return;
      if (typeof j.count === "number") setLiveOpenCount(Math.max(0, j.count));
      if (Array.isArray(j.tickets)) setLiveTicketPreview(j.tickets);
    } catch {
      /* ignore */
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  const dismissTicket = useCallback(
    async (ticketId: number) => {
      const ok = await postDismissTicketAlert(ticketId);
      if (ok) {
        dispatchTicketAlertDismissChanged();
        await refreshTickets();
      }
    },
    [refreshTickets],
  );

  const dismissMessage = useCallback(
    async (recipientId: number) => {
      await dismiss(recipientId);
    },
    [dismiss],
  );

  useEffect(() => {
    setLiveTicketPreview(ticketPreview);
  }, [ticketPreview]);

  useEffect(() => {
    setLiveOpenCount(openTicketCount);
  }, [openTicketCount]);

  useEffect(() => {
    if (!menuOpen) return;
    void refreshTickets();
    void refreshStaffMessages();
  }, [menuOpen, refreshTickets, refreshStaffMessages]);

  useEffect(() => {
    if (openTicketCount > 0) void refreshTickets();
  }, [openTicketCount, refreshTickets]);

  useEffect(() => {
    function onTicket() {
      void refreshTickets();
    }
    function onDismissChanged() {
      void refreshTickets();
    }
    window.addEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
    window.addEventListener(BILLING_TICKET_ALERT_DISMISS_CHANGED, onDismissChanged);
    return () => {
      window.removeEventListener(BILLING_REALTIME_TICKET_EVENT, onTicket);
      window.removeEventListener(BILLING_TICKET_ALERT_DISMISS_CHANGED, onDismissChanged);
    };
  }, [refreshTickets]);

  const ticketCount = Math.max(0, liveOpenCount);
  const visibleMessageCount = messages.length + (activityNudge ? 1 : 0);

  useEffect(() => {
    if (!menuOpen || !showMessages) return;
    if (activityNudge || messages.length > 0) {
      setTab("messages");
    } else if (ticketCount > 0) {
      setTab("tickets");
    }
  }, [menuOpen, showMessages, activityNudge, messages.length, ticketCount]);

  useEffect(() => {
    if (!showMessages && tab === "messages") setTab("tickets");
  }, [showMessages, tab]);

  const footerHref = tab === "messages" && showMessages ? messagesHref : notificationsHref;
  const footerLabel = tab === "messages" && showMessages ? "Messages page" : "All tickets";

  return (
    <>
      <div className="border-b border-cyan-600/15 px-3.5 py-2.5 dark:border-cyan-400/10">
        <p className="text-sm font-semibold tracking-tight text-foreground">Alerts</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {showMessages ? "Stay on top of messages and tickets" : "Open support tickets"}
        </p>
      </div>

      {showMessages ? (
        <div
          role="tablist"
          aria-label="Alert categories"
          className="flex gap-1 border-b border-cyan-600/12 bg-black/[0.04] p-1.5 dark:border-cyan-400/10 dark:bg-white/[0.03]"
        >
          <TabButton
            active={tab === "messages"}
            onClick={() => setTab("messages")}
            label="Messages"
            count={visibleMessageCount}
            icon={MessageSquare}
          />
          <TabButton
            active={tab === "tickets"}
            onClick={() => setTab("tickets")}
            label="Tickets"
            count={ticketCount}
            icon={LifeBuoy}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-cyan-600/12 bg-black/[0.04] px-3.5 py-2 dark:border-cyan-400/10 dark:bg-white/[0.03]">
          <LifeBuoy className="h-3.5 w-3.5 shrink-0 text-cyan-500/80" aria-hidden />
          <span className="text-xs font-medium text-foreground">Tickets</span>
          {ticketCount > 0 ? (
            <span className="ml-auto min-w-[1.125rem] rounded-full bg-destructive px-1.5 py-px text-center text-[10px] font-bold tabular-nums leading-none text-destructive-foreground">
              {ticketCount > 99 ? "99+" : ticketCount}
            </span>
          ) : null}
        </div>
      )}

      <ul className="thin-scrollbar scrollbar-surface-light dark:scrollbar-surface-dark max-h-[min(42vh,280px)] overflow-y-auto overscroll-contain py-0.5 [scrollbar-gutter:stable]">
        {tab === "messages" && showMessages ? (
          <>
            {activityNudge ? (
              <AlertListItem
                key={`activity-nudge-${activityNudge.dismissKey}`}
                title={activityNudgeTitle(activityNudge)}
                meta={activityNudgeMeta(activityNudge)}
                badge="Promo"
                onOpen={onCloseMenu}
                onDismiss={onDismissActivityNudge}
                dismissLabel="Dismiss promo reminder"
              />
            ) : null}
            {messages.length === 0 && !activityNudge ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">No active portal messages.</li>
            ) : (
              messages.map((m) => (
                <AlertListItem
                  key={m.recipientId}
                  title={portalStaffMessageHeadline(m)}
                  meta={m.sentBy ? `From ${m.sentBy}` : "Administration"}
                  onOpen={() => onSelectMessage(m)}
                  onDismiss={() => void dismissMessage(m.recipientId)}
                  dismissLabel="Dismiss message"
                />
              ))
            )}
          </>
        ) : ticketsLoading && liveTicketPreview.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">Loading tickets…</li>
        ) : liveTicketPreview.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">No open tickets.</li>
        ) : (
          liveTicketPreview.map((t) => (
            <AlertListItem
              key={t.id}
              title={t.subject || `Ticket #${t.id}`}
              meta={[t.priorityLabel, formatRelativeTime(t.updatedAt)].filter(Boolean).join(" · ")}
              badge={t.statusLabel}
              onOpen={() => onSelectTicket(t.id)}
              onDismiss={() => void dismissTicket(t.id)}
              dismissLabel="Dismiss ticket alert"
            />
          ))
        )}
      </ul>

      <div className="border-t border-cyan-600/15 bg-black/[0.03] px-2 py-1.5 dark:border-cyan-400/10 dark:bg-white/[0.02]">
        <Link
          href={footerHref}
          onClick={onCloseMenu}
          className="inline-flex w-full items-center justify-center gap-0.5 rounded-sm py-1.5 text-xs font-medium text-cyan-600 underline-offset-2 transition-[color,background-color] duration-150 ease-out hover:bg-cyan-500/10 hover:text-cyan-500 hover:underline dark:text-cyan-400 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300"
        >
          {footerLabel}
          <ArrowRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </Link>
      </div>

    </>
  );
}

const ALERTS_PANEL_WIDTH = 352;
const ALERTS_PANEL_GUTTER = 6;

function AlertsBellMenuPortal({
  open,
  anchorRef,
  panelRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState({ top: -9999, left: 0, width: ALERTS_PANEL_WIDTH, ready: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(ALERTS_PANEL_WIDTH, Math.max(280, window.innerWidth - margin * 2));
    let left = r.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
    setBox({ top: r.bottom + ALERTS_PANEL_GUTTER, left, width, ready: true });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setBox((prev) => ({ ...prev, ready: false }));
      return;
    }
    reposition();
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose, anchorRef, panelRef]);

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className="z-[200] origin-top-right transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        visibility: box.ready ? "visible" : "hidden",
      }}
    >
      <div className={cn(hudBrightDropdownShellClass, "relative")}>
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Alerts hub: staff messages (portal) and tickets. Announcements use the separate News button. */
export function HeaderQuickActions({
  addHref,
  notificationsHref,
  openTicketCount = 0,
  ticketPreview = [],
  staffMessagesHref = null,
  viewerUsername = "",
  className,
}: {
  addHref: string;
  notificationsHref: string;
  openTicketCount?: number;
  ticketPreview?: HeaderTicketPreviewItem[];
  staffMessagesHref?: string | null;
  viewerUsername?: string;
  className?: string;
}) {
  const { count: staffMessageCount } = usePortalStaffMessages();
  const staffN = Math.max(0, staffMessageCount);
  const ticketN = Math.max(0, Math.floor(openTicketCount));
  const portalStaffAlerts = staffMessagesHref != null && viewerUsername.trim().length > 0;
  const [activityNudgeRaw, setActivityNudgeRaw] = useState<HeaderStatsActivityNudgeDto | null>(null);
  const [dismissedNudgeKey, setDismissedNudgeKey] = useState<string | null>(null);

  useEffect(() => {
    if (!portalStaffAlerts) {
      setActivityNudgeRaw(null);
      return;
    }

    let alive = true;

    async function load(fresh = false) {
      try {
        if (fresh) invalidateBillingDataCacheSilent(DATA_CACHE_NS.headerStats);
        const j = await cachedDataLoad(DATA_CACHE_NS.headerStats, () => loadHeaderStatsAction());
        if (!alive || !j || "error" in j) {
          if (alive) setActivityNudgeRaw(null);
          return;
        }
        setActivityNudgeRaw(j.activityNudge ?? null);
      } catch {
        if (alive) setActivityNudgeRaw(null);
      }
    }

    void load();

    const onRefresh = () => {
      void load(true);
    };
    const onCacheInvalidate = (event: Event) => {
      const prefix = (event as CustomEvent<{ prefix?: string }>).detail?.prefix ?? "";
      if (prefix && !prefix.startsWith(DATA_CACHE_NS.headerStats)) return;
      void load(true);
    };
    window.addEventListener(BILLING_HEADER_STATS_EVENT, onRefresh);
    window.addEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);

    return () => {
      alive = false;
      window.removeEventListener(BILLING_HEADER_STATS_EVENT, onRefresh);
      window.removeEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);
    };
  }, [portalStaffAlerts]);

  const activityNudge =
    activityNudgeRaw &&
    dismissedNudgeKey !== activityNudgeRaw.dismissKey &&
    !isActivityNudgeDismissed(viewerUsername, activityNudgeRaw.dismissKey)
      ? activityNudgeRaw
      : null;

  const nudgeN = activityNudge ? 1 : 0;
  const n = staffN + ticketN + nudgeN;
  const label =
    n === 0
      ? "Alerts"
      : nudgeN > 0 && staffN === 0 && ticketN === 0
        ? "Alerts: promo tier reminder"
        : staffN > 0 && ticketN > 0
        ? `Alerts: ${staffN} portal message${staffN === 1 ? "" : "s"}, ${ticketN} ticket${ticketN === 1 ? "" : "s"}${nudgeN ? ", promo reminder" : ""}`
        : staffN > 0
          ? `Alerts: ${staffN} active portal message${staffN === 1 ? "" : "s"}${nudgeN ? ", promo reminder" : ""}`
          : ticketN > 0
            ? `Alerts: ${ticketN} open ticket${ticketN === 1 ? "" : "s"}${nudgeN ? ", promo reminder" : ""}`
            : `Alerts: promo tier reminder`;
  const bellAnchorRef = useRef<HTMLButtonElement>(null);
  const bellPanelRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<PortalStaffPendingMessage | null>(null);
  const alertInboxStatus: PortalStaffInboxStatus | null = alertMessage
    ? derivePortalStaffInboxStatus({
        dismissedAt: alertMessage.dismissedAt,
        readAt: alertMessage.readAt,
      })
    : null;
  const [alertTicketId, setAlertTicketId] = useState<number | null>(null);
  const messagesHref = staffMessagesHref ?? notificationsHref;

  function closeBellMenu() {
    setMenuOpen(false);
  }

  function openAlertMessage(message: PortalStaffPendingMessage) {
    setAlertMessage(message);
    closeBellMenu();
  }

  function openAlertTicket(ticketId: number) {
    setAlertTicketId(ticketId);
    closeBellMenu();
  }

  function dismissActivityNudgeAlert() {
    if (!activityNudgeRaw) return;
    dismissActivityNudge(viewerUsername, activityNudgeRaw.dismissKey);
    setDismissedNudgeKey(activityNudgeRaw.dismissKey);
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      <button
        ref={bellAnchorRef}
        type="button"
        className={cn(
          iconBtn,
          "relative cursor-pointer",
          menuOpen && "bg-cyan-500/10 text-foreground ring-1 ring-cyan-400/35",
        )}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {n > 0 ? (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums leading-none text-destructive-foreground shadow-sm">
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </button>
      <AlertsBellMenuPortal
        open={menuOpen}
        anchorRef={bellAnchorRef}
        panelRef={bellPanelRef}
        onClose={closeBellMenu}
      >
        <AlertsPanel
          staffMessagesHref={staffMessagesHref}
          messagesHref={messagesHref}
          notificationsHref={notificationsHref}
          ticketPreview={ticketPreview}
          openTicketCount={openTicketCount}
          menuOpen={menuOpen}
          onCloseMenu={closeBellMenu}
          onSelectMessage={openAlertMessage}
          onSelectTicket={openAlertTicket}
          activityNudge={activityNudge}
          onDismissActivityNudge={dismissActivityNudgeAlert}
        />
      </AlertsBellMenuPortal>
      {alertMessage && alertInboxStatus ? (
        <PortalStaffMessageDetailModal
          message={alertMessage}
          inboxStatus={alertInboxStatus}
          onClose={() => setAlertMessage(null)}
          onDismissed={() => setAlertMessage(null)}
        />
      ) : null}
      {alertTicketId != null ? (
        <TicketConversationModal
          ticketId={alertTicketId}
          isAdminPortal={notificationsHref.startsWith("/admin")}
          dismissHeaderTicketAlert
          onClose={() => setAlertTicketId(null)}
        />
      ) : null}
    </div>
  );
}
