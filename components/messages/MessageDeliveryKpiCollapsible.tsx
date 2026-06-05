"use client";

import { useEffect, useId, useMemo, useState, type ComponentProps } from "react";
import { ChevronDown, Radar } from "lucide-react";

import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { INTEL_TIPS } from "@/components/dashboard/intelGuideTips";
import { cn } from "@/lib/cn";
import { MessageDeliveryKpiStrip } from "@/components/messages/MessageDeliveryKpiStrip";
import {
  kpiIntelChipsRowClass,
  kpiIntelInlineDividerClass,
  messageKpiCollapsibleBarClass,
  messageKpiIntelChipClass,
  messageKpiIntelChipLabelClass,
  messageKpiIntelChipValueClass,
} from "@/components/messages/messageKpiCollapsibleBarClass";

type StripProps = ComponentProps<typeof MessageDeliveryKpiStrip>;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n)));

function fmtCompact(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return fmt(v);
}

function IntelStat({ label, value }: { label: string; value: string }) {
  return (
    <span className={messageKpiIntelChipClass} title={`${label}: ${value}`}>
      <span className={messageKpiIntelChipLabelClass}>{label}</span>
      <span className={messageKpiIntelChipValueClass}>{value}</span>
    </span>
  );
}

/** Collapsible delivery KPI block with compact inline intel bar when collapsed. */
export function MessageDeliveryKpiCollapsible({
  mode = "admin",
  stalkerKpiLoading = false,
  ...props
}: StripProps & { mode?: "admin" | "stb-only"; stalkerKpiLoading?: boolean }) {
  const { stats, staffStats, staffAudience } = props;
  const stbOnly = mode === "stb-only";
  const [open, setOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const uid = useId();
  const panelId = `${uid}-message-kpi-panel`;

  const stbQueued =
    stats.pendingHigh + stats.pendingNormal + stats.pendingLow + stats.pendingOther;
  const stbTotal = stats.recipients30d;
  const portalReachable = staffAudience.all_staff;
  const portalPending = staffStats.pendingDismiss;
  const portalCampaigns = staffStats.messagesSent;

  const intelStats = useMemo(() => {
    const loading = stalkerKpiLoading ? "…" : null;
    const stb = {
      label: "STB",
      value: loading ?? (stbTotal > 0 ? `${fmtCompact(stbQueued)} · ${stats.deliveryPct ?? 0}%` : "—"),
    };
    const today = {
      label: "Today",
      value: loading ?? (stats.sendsToday > 0 ? fmt(stats.sendsToday) : "—"),
    };
    if (stbOnly) return [stb, today];
    return [
      { label: "Staff", value: loading ?? fmt(portalReachable) },
      {
        label: "Inbox",
        value: loading ?? (portalPending > 0 ? `${fmtCompact(portalPending)} pend` : `${fmt(portalCampaigns)} sent`),
      },
      stb,
      today,
    ];
  }, [
    stbOnly,
    portalReachable,
    portalCampaigns,
    portalPending,
    stbQueued,
    stbTotal,
    stats.deliveryPct,
    stats.sendsToday,
    stalkerKpiLoading,
  ]);

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
      <div className={messageKpiCollapsibleBarClass}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-600/25 bg-cyan-500/[0.06] py-0.5 pl-1 pr-1.5 outline-none transition-colors",
            "hover:border-cyan-600/40 hover:bg-cyan-500/[0.1] focus-visible:ring-2 focus-visible:ring-cyan-400/35",
            "dark:border-cyan-400/20 dark:bg-cyan-950/40",
          )}
          aria-expanded={open}
          aria-controls={panelId}
          title={open ? "Hide delivery overview" : "Show delivery overview"}
          aria-label={open ? "Hide delivery overview" : "Show delivery overview"}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-cyan-600 text-white">
            <Radar className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900 dark:text-cyan-200">
            {open ? "Hide" : "Details"}
          </span>
          <ChevronDown
            className={cn("h-3 w-3 text-cyan-700/80 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>

        {!open ? (
          <>
            <span className={kpiIntelInlineDividerClass} aria-hidden />
            <div className={kpiIntelChipsRowClass}>
              {intelStats.map((stat, i) => (
                <span key={stat.label} className="inline-flex min-w-0 items-center gap-1.5">
                  {i > 0 ? (
                    <span className="text-[10px] text-muted-foreground/35" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <IntelStat label={stat.label} value={stat.value} />
                </span>
              ))}
            </div>
          </>
        ) : null}

        <IntelGuideBadge size="sm" className="ml-auto shrink-0" tip={INTEL_TIPS.messageDeliveryOverview} />
      </div>

      <div
        id={panelId}
        role="region"
        aria-label="Message delivery overview"
        hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
          {contentReady ? (
            <div className="pt-2 sm:pt-2.5">
              <MessageDeliveryKpiStrip {...props} stbOnly={stbOnly} mobileCompact />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
