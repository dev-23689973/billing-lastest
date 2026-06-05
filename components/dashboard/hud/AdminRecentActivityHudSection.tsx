"use client";

import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { HudFeedCard, HudFeedTableShell } from "@/components/dashboard/hud/HudFeedCard";
import {
  dashboardFeedsTwoColumnGrid,
  hudDashTableEmpty,
  hudFeedCardBodyCell,
  hudFeedCardCellCenter,
  hudFeedCardCellRight,
  hudFeedCardHeaderCell,
  hudFeedCardTablePad,
  hudFeedCellLine,
  hudFeedGridMessages,
  hudFeedGridTickets,
  hudFeedGridTransactions,
  hudFeedTableBodyRow,
  hudFeedTableHeaderRow,
} from "@/components/dashboard/hud/hudDashboardLayout";
import type { AdminRecentStalkerSendMessageRow, AdminTransactionRow } from "@/lib/dashboard/types";
import type { AdminTicketRow } from "@/lib/repos/tickets";
import { cn } from "@/lib/cn";
import { stalkerMessagePriorityDotClass } from "@/lib/ui/stalkerMessagePriority";

const FEED_ROWS = 5;

function formatMoneyAbs(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

function parseAmountUsd(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function transactionTypeLabel(r: AdminTransactionRow): string {
  const t = r.type.toUpperCase();
  if (t === "DBIT") return "Wallet debit";
  if (t === "BONUS") return "Promo credit";
  if (t === "CRDT") {
    const acct = (r.account ?? "").trim();
    return acct.length > 0 ? "Subscription grant" : "Wallet credit";
  }
  return t || "Transaction";
}

function transactionAmountDisplay(r: AdminTransactionRow): string {
  const usd = parseAmountUsd(r.amount);
  if (usd != null && usd !== 0) return formatMoneyAbs(usd);
  if (r.periods !== 0) return `${Math.abs(r.periods)} cr`;
  return "—";
}

function transactionPromoDisplay(r: AdminTransactionRow): string {
  if (r.type.toUpperCase() === "DBIT") return "—";
  if (r.free_month != null && Number.isFinite(r.free_month) && r.free_month !== 0) {
    return `${r.free_month} mo`;
  }
  return "—";
}

function formatWhenCompact(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function priorityDotClass(priorityId: number): string {
  if (priorityId === 1) return "bg-rose-500 dark:bg-rose-400";
  if (priorityId === 3) return "bg-amber-500 dark:bg-amber-400";
  return "bg-sky-500 dark:bg-sky-400";
}

function statusDotClass(statusId: number): string {
  if (statusId === 2) return "bg-emerald-600 dark:bg-emerald-400";
  if (statusId === 3) return "bg-amber-500 dark:bg-amber-400";
  if (statusId === 1) return "bg-sky-500 dark:bg-sky-400";
  return "bg-slate-500 dark:bg-slate-400";
}

function ticketStatusLabel(statusId: number): string {
  if (statusId === 2) return "Fixed";
  return "Open";
}

function formatTicketUpdatedLine(ts: number, categoryTitle: string): string {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return categoryTitle || "—";
  const when = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  return hudFeedCellLine(categoryTitle || "—", when);
}

export type AdminRecentActivityPanel = "all" | "transactions" | "tickets" | "messages";

export function AdminRecentActivityHudSection({
  recentTransactions,
  recentTickets,
  recentMessages,
  className,
  panel = "all",
}: {
  recentTransactions: AdminTransactionRow[];
  recentTickets: AdminTicketRow[];
  recentMessages: AdminRecentStalkerSendMessageRow[];
  className?: string;
  panel?: AdminRecentActivityPanel;
}) {
  const { tips } = useDashboardIntel();
  const txns = recentTransactions.slice(0, FEED_ROWS);
  const tickets = recentTickets.slice(0, FEED_ROWS);
  const messages = recentMessages.slice(0, FEED_ROWS);

  const transactionsCard = (
    <HudFeedCard
      title="Recent transactions"
      subtitle="Live financial activity log"
      accentDotClass="bg-rose-500"
      tip={tips.recentTransactions}
    >
      <HudFeedTableShell>
        <div role="grid" className={cn(hudFeedGridTransactions, hudFeedCardTablePad)}>
          <div role="row" className={hudFeedTableHeaderRow}>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              Type
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right tabular-nums")}>
              Amount
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right tabular-nums")}>
              Promo
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right tabular-nums")}>
              When
            </span>
          </div>
          {txns.length === 0 ? (
            <p className={hudDashTableEmpty}>No transactions yet.</p>
          ) : (
            txns.map((r) => (
              <div key={r.transaction} role="row" className={hudFeedTableBodyRow}>
                <span role="cell" className={hudFeedCardBodyCell} title={transactionTypeLabel(r)}>
                  {transactionTypeLabel(r)}
                </span>
                <span
                  role="cell"
                  className={cn(hudFeedCardCellRight, "text-emerald-700 dark:text-emerald-300")}
                  title={transactionAmountDisplay(r)}
                >
                  {transactionAmountDisplay(r)}
                </span>
                <span role="cell" className={hudFeedCardCellRight} title={transactionPromoDisplay(r)}>
                  {transactionPromoDisplay(r)}
                </span>
                <span role="cell" className={hudFeedCardCellRight} title={r.timestamp ?? ""}>
                  {formatWhenCompact(r.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </HudFeedTableShell>
    </HudFeedCard>
  );

  const ticketsCard = (
    <HudFeedCard
      title="Recent tickets"
      subtitle="Latest updates"
      accentDotClass="bg-orange-400"
      tip={tips.recentTickets}
      headerRight={null}
    >
      <HudFeedTableShell>
        <div role="grid" className={cn(hudFeedGridTickets, hudFeedCardTablePad)}>
          <div role="row" className={hudFeedTableHeaderRow}>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              Ticket
            </span>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              Updated
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-center")}>
              P/S
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right")}>
              Status
            </span>
          </div>
          {tickets.length === 0 ? (
            <p className={hudDashTableEmpty}>No tickets yet.</p>
          ) : (
            tickets.map((t) => (
              <div key={t.id} role="row" className={hudFeedTableBodyRow}>
                <span role="cell" className={hudFeedCardBodyCell} title={t.subject || "—"}>
                  {t.subject || "—"}
                </span>
                <span role="cell" className={hudFeedCardBodyCell} title={formatTicketUpdatedLine(t.updated_at, t.categoryTitle)}>
                  {formatTicketUpdatedLine(t.updated_at, t.categoryTitle)}
                </span>
                <span role="cell" className={hudFeedCardCellCenter} aria-label="Priority and status">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDotClass(t.priority_id))} title="Priority" />
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClass(t.status_id))} title="Status" />
                  </span>
                </span>
                <span role="cell" className={cn(hudFeedCardCellRight, "font-medium")} title={ticketStatusLabel(t.status_id)}>
                  {ticketStatusLabel(t.status_id)}
                </span>
              </div>
            ))
          )}
        </div>
      </HudFeedTableShell>
    </HudFeedCard>
  );

  const messagesCard = (
    <HudFeedCard
      title="Recent messages"
      subtitle="Recent device messages"
      accentDotClass="bg-violet-400"
      tip={tips.recentMessages}
    >
      <HudFeedTableShell>
        <div role="grid" className={cn(hudFeedGridMessages, hudFeedCardTablePad)}>
          <div role="row" className={hudFeedTableHeaderRow}>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              Recipient
            </span>
            <span role="columnheader" className={hudFeedCardHeaderCell}>
              Message
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-center")}>
              Priority
            </span>
            <span role="columnheader" className={cn(hudFeedCardHeaderCell, "text-right")}>
              Time
            </span>
          </div>
          {messages.length === 0 ? (
            <p className={hudDashTableEmpty}>
              No messages yet. Contact your administrator if you expect message history here.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={`${m.uid}-${m.addtime ?? ""}-${i}`} role="row" className={hudFeedTableBodyRow}>
                <span role="cell" className={hudFeedCardBodyCell} title={m.login ?? "—"}>
                  {m.login ?? "—"}
                </span>
                <span role="cell" className={hudFeedCardBodyCell} title={m.msg ?? ""}>
                  {m.msg ?? "—"}
                </span>
                <span role="cell" className={hudFeedCardCellCenter}>
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", stalkerMessagePriorityDotClass(m.priority))}
                    title={`Priority ${m.priority ?? "—"}`}
                  />
                </span>
                <span role="cell" className={hudFeedCardCellRight} title={m.addtime ?? ""}>
                  {formatWhenCompact(m.addtime)}
                </span>
              </div>
            ))
          )}
        </div>
      </HudFeedTableShell>
    </HudFeedCard>
  );

  if (panel === "transactions") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{transactionsCard}</div>;
  }
  if (panel === "tickets") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{ticketsCard}</div>;
  }
  if (panel === "messages") {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{messagesCard}</div>;
  }

  return (
    <section
      className={cn("mb-2 w-full min-w-0 lg:mb-4", className)}
      aria-labelledby="admin-recent-activity-title"
    >
      <h2 id="admin-recent-activity-title" className="sr-only">
        Recent transactions, tickets, and device messages
      </h2>

      <div className={dashboardFeedsTwoColumnGrid}>
        {transactionsCard}
        {ticketsCard}
        {messagesCard}
      </div>
    </section>
  );
}
