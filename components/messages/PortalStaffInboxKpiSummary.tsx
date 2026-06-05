"use client";

import { Inbox } from "lucide-react";
import type { PortalStaffInboxStatus } from "@/lib/portalStaffInbox";
import { portalStaffInboxStatusLabel, portalStaffInboxStatusPill } from "@/lib/ui/portalStaffInboxStatus";
import { cn } from "@/lib/cn";
import { messageKpiCollapsibleBarClass } from "@/components/messages/messageKpiCollapsibleBarClass";

function InboxStatChip({ status, count }: { status: PortalStaffInboxStatus; count: number }) {
  return (
    <span className={cn(portalStaffInboxStatusPill(status), "tabular-nums")}>
      {portalStaffInboxStatusLabel[status]}: {count}
    </span>
  );
}

/** Portal staff (manager / reseller / dealer) — personal inbox counts, not admin broadcast KPIs. */
export function PortalStaffInboxKpiSummary({
  activeCount,
  dismissCount,
  readCount,
}: {
  activeCount: number;
  dismissCount: number;
  readCount: number;
}) {
  return (
    <div className={messageKpiCollapsibleBarClass}>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-cyan-800 dark:text-cyan-500/90">
        <Inbox className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">My inbox</span>
      </span>
      <span className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block dark:bg-cyan-400/20" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <InboxStatChip status="active" count={activeCount} />
        <InboxStatChip status="dismiss" count={dismissCount} />
        <InboxStatChip status="read" count={readCount} />
      </div>
      <p className="w-full text-[11px] leading-snug text-muted-foreground sm:ml-auto sm:w-auto sm:max-w-[20rem] sm:text-right">
        Active messages also appear in the header alerts bell.
      </p>
    </div>
  );
}
