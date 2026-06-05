"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Ticket } from "lucide-react";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { INTEL_TIPS } from "@/components/dashboard/intelGuideTips";
import {
  ticketsKpiBarTopRowClass,
  ticketsKpiCollapsibleBarClass,
  ticketsKpiIntelChipLabelClass,
  ticketsKpiIntelChipShellClass,
  ticketsKpiIntelChipSuffixClass,
  ticketsKpiIntelChipValueClass,
  ticketsKpiIntelChipsRowClass,
} from "@/components/messages/ticketsKpiCollapsibleBarClass";
import {
  ticketKpiIntelChipToneClass,
  type TicketKpiIntelChipTone,
} from "@/lib/ui/ticketBadges";
import { useTheme } from "@/contexts/ThemeContext";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { TicketStatusPipelineChart } from "@/components/portal/TicketStatusPipelineChart";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";
import { cn } from "@/lib/cn";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n)));

type TicketIntelChipProps = {
  label: string;
  count: string;
  suffix?: string;
  tone: TicketKpiIntelChipTone;
};

function TicketIntelChip({ label, count, suffix, tone }: TicketIntelChipProps) {
  const title = suffix ? `${label}: ${count} (${suffix})` : `${label}: ${count}`;
  return (
    <span className={cn(ticketsKpiIntelChipShellClass, ticketKpiIntelChipToneClass(tone))} title={title}>
      <span className={ticketsKpiIntelChipLabelClass}>{label}</span>
      <span className="inline-flex items-baseline gap-1">
        <span className={ticketsKpiIntelChipValueClass}>{count}</span>
        {suffix ? <span className={ticketsKpiIntelChipSuffixClass}>{suffix}</span> : null}
      </span>
    </span>
  );
}

export function PortalTicketsKpiCollapsible({
  overview,
  displayTotal,
  portalBase,
  activeStatusFilter,
  preservedQuery,
}: {
  overview: AdminTicketStatusOverview;
  displayTotal: number;
  portalBase: string;
  activeStatusFilter: string;
  preservedQuery: { q?: string; priority?: string; sort?: string };
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const uid = useId();
  const panelId = `${uid}-tickets-kpi-panel`;

  const ticketsKpiPanelClass = cn(
    "relative mt-1.5 overflow-x-hidden overflow-y-visible rounded-lg border border-border/60 bg-transparent p-2 sm:p-3",
    isLight
      ? "shadow-sm ring-1 ring-black/[0.04]"
      : "rounded-none border-amber-500/20 bg-[hsl(24_28%_6%/0.92)]",
  );

  const total = Math.max(0, overview.grandTotal);
  const openCount = overview.inProgress + overview.reopened;
  const openPct = total > 0 ? Math.round((openCount / total) * 100) : 0;
  const fixedPct = total > 0 ? Math.round((overview.fixed / total) * 100) : 0;

  const intelChips = useMemo(
    (): TicketIntelChipProps[] => [
      { label: "Queue", count: fmt(displayTotal), tone: "queue" },
      { label: "Open", count: fmt(openCount), suffix: `${openPct}%`, tone: "open" },
      { label: "Fixed", count: fmt(overview.fixed), suffix: `${fixedPct}%`, tone: "fixed" },
      { label: "Reopened", count: fmt(overview.reopened), tone: "reopened" },
    ],
    [displayTotal, fixedPct, openCount, openPct, overview.fixed, overview.reopened],
  );

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setContentReady(true));
    return () => {
      cancelAnimationFrame(id);
      setContentReady(false);
    };
  }, [open]);

  return (
    <div className="min-w-0">
      <div className={ticketsKpiCollapsibleBarClass}>
        <div className={ticketsKpiBarTopRowClass}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "group inline-flex shrink-0 items-center gap-1.5 rounded-lg border-0 bg-transparent py-0.5 pl-0.5 pr-1 outline-none ring-0 transition-colors",
              "hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-400/35 dark:hover:bg-amber-500/[0.1]",
            )}
            aria-expanded={open}
            aria-controls={panelId}
            title={open ? "Hide ticket queue charts" : "Show ticket queue charts"}
            aria-label={open ? "Hide ticket queue charts" : "Show ticket queue charts"}
          >
          <span
            className={cn(
              "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 text-white outline-none ring-0",
              "bg-gradient-to-br from-amber-600 to-orange-700 shadow-sm",
              "transition-[filter] duration-200 ease-out group-hover:brightness-[1.04]",
              "dark:from-amber-600 dark:via-orange-600 dark:to-rose-950 dark:text-amber-50",
              "dark:shadow-[0_1px_2px_rgba(0,0,0,0.45),0_0_12px_rgba(245,158,11,0.28)] dark:group-hover:brightness-[1.06]",
            )}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-transparent via-white/[0.06] to-white/[0.12] dark:block"
              aria-hidden
            />
            <Ticket className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </span>
          <span
            className={cn(
              "min-w-0 truncate text-left text-[12px] font-bold uppercase leading-none tracking-wide text-amber-800 sm:text-[14px]",
              "dark:text-amber-300 dark:drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]",
            )}
          >
            {open ? "Hide" : "Ticket queue"}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-amber-700 transition-transform duration-200 dark:text-amber-300/80",
              open && "rotate-180",
            )}
            aria-hidden
            />
          </button>

          <IntelGuideBadge size="sm" className="ml-auto shrink-0 sm:hidden" tip={INTEL_TIPS.ticketsQueueOverview} />
        </div>

        <div className={ticketsKpiIntelChipsRowClass} aria-label="Ticket queue summary">
          {intelChips.map((chip) => (
            <TicketIntelChip key={chip.tone} {...chip} />
          ))}
        </div>

        <IntelGuideBadge
          size="sm"
          className="ml-auto hidden shrink-0 sm:inline-flex"
          tip={INTEL_TIPS.ticketsQueueOverview}
        />
      </div>

      <div
        id={panelId}
        role="region"
        aria-label="Ticket queue lifecycle charts"
        hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {contentReady ? (
            <div className="pt-2.5">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800/90 dark:text-amber-500/75">
                Support queue · Ticket lifecycle
              </p>
              <div className={ticketsKpiPanelClass}>
                {!isLight ? <HudCornerOverlay tone="amber" /> : null}
                <div className="relative z-[1] w-full min-w-0">
                  <TicketStatusPipelineChart
                    overview={overview}
                    displayTotal={displayTotal}
                    portalBase={portalBase}
                    activeStatusFilter={activeStatusFilter}
                    preservedQuery={preservedQuery}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
