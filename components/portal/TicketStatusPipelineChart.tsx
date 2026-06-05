"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLivingCount, useLivingSmooth } from "@/components/dashboard/useLivingCount";
import { useTheme } from "@/contexts/ThemeContext";
import type { AdminTicketStatusOverview } from "@/lib/repos/tickets";
import { cn } from "@/lib/cn";
import { rsTextCaption, rsTextKicker } from "@/lib/ui/responsiveScale";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n)));

type SegmentDef = {
  statusFilter: string;
  label: string;
  short: string;
  count: number;
  gradient: string;
  glowRgb: string;
  dotClass: string;
  textClass: string;
  ringActiveClass: string;
};

const beltSurfaceDarkClass =
  "bg-gradient-to-r text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.1)_inset,0_-6px_14px_-6px_rgba(0,0,0,0.4)_inset]";

const beltSurfaceLightClass = "bg-gradient-to-r text-white shadow-sm";

function BeltGloss() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,255,255,0.5) 0%, transparent 40%, transparent 55%, rgba(0,0,0,0.15) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/35 via-white/12 to-white/28"
        aria-hidden
      />
    </>
  );
}

function TicketPipelineBeltSegment({
  seg,
  flexGrow,
  active,
  href,
  title,
  sheenDelay,
  isLight,
}: {
  seg: SegmentDef;
  flexGrow: number;
  active: boolean;
  href: string;
  title: string;
  sheenDelay: number;
  isLight: boolean;
}) {
  if (flexGrow <= 0.004) return null;

  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "group/seg relative isolate min-h-[1.25rem] min-w-[0.4rem] flex-1 overflow-hidden rounded-[7px]",
        isLight
          ? "transition-[flex-grow,box-shadow] duration-200 ease-out hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-amber-500/40"
          : "transition-[flex-grow,filter,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:z-10 hover:brightness-[1.08] hover:saturate-110 focus-visible:ring-2 focus-visible:ring-amber-300/50",
        active && (isLight ? "z-10 ring-2 ring-amber-600/35" : "z-10 brightness-110 ring-2 ring-white/25 saturate-110"),
        isLight ? beltSurfaceLightClass : beltSurfaceDarkClass,
        seg.gradient,
      )}
      style={{
        flexGrow,
        flexBasis: 0,
        boxShadow: isLight
          ? active
            ? "0 0 0 1px rgba(245,158,11,0.25)"
            : undefined
          : active
            ? `0 0 0 1px rgba(255,255,255,0.12), 0 0 20px ${seg.glowRgb}`
            : `0 0 12px -2px ${seg.glowRgb}`,
      }}
    >
      {!isLight ? <BeltGloss /> : null}
      {!isLight ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <div
            className="users-belt-sheen-motion absolute -inset-y-4 left-0 h-[calc(100%+2rem)] w-[38%] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70"
            style={{ animationDelay: `${sheenDelay}s` }}
          />
        </div>
      ) : null}
    </Link>
  );
}

function buildFilterHref(
  portalBase: string,
  preserved: { q?: string; priority?: string; sort?: string },
  status?: string,
) {
  const sp = new URLSearchParams();
  if (preserved.q) sp.set("q", preserved.q);
  if (preserved.priority) sp.set("priority", preserved.priority);
  if (preserved.sort) sp.set("sort", preserved.sort);
  if (status) sp.set("status", status);
  const qs = sp.toString();
  return `${portalBase}/tickets/dashboard${qs ? `?${qs}` : ""}`;
}

export function TicketStatusPipelineChart({
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
  const total = Math.max(0, overview.grandTotal);
  const inv = total > 0 ? 1 / total : 0;
  const widthDuration = isLight ? 0 : 1100;

  const segments: SegmentDef[] = useMemo(
    () => [
      {
        statusFilter: "1",
        label: "In progress",
        short: "Open",
        count: overview.inProgress,
        gradient: "from-cyan-600 via-cyan-400 to-cyan-500",
        glowRgb: "rgba(34,211,238,0.42)",
        dotClass: "bg-cyan-600 shadow-none dark:bg-cyan-400 dark:shadow-[0_0_6px_rgba(34,211,238,0.65)]",
        textClass: "text-cyan-800 dark:text-cyan-200",
        ringActiveClass: "ring-cyan-500/40 dark:ring-cyan-400/50",
      },
      {
        statusFilter: "3",
        label: "Re-opened",
        short: "Reopened",
        count: overview.reopened,
        gradient: "from-amber-600 via-amber-400 to-orange-500",
        glowRgb: "rgba(251,191,36,0.38)",
        dotClass: "bg-amber-500 shadow-none dark:bg-amber-400 dark:shadow-[0_0_6px_rgba(251,191,36,0.55)]",
        textClass: "text-amber-900 dark:text-amber-200",
        ringActiveClass: "ring-amber-500/40 dark:ring-amber-400/50",
      },
      {
        statusFilter: "2",
        label: "Fixed",
        short: "Fixed",
        count: overview.fixed,
        gradient: "from-emerald-700 via-emerald-400 to-teal-500",
        glowRgb: "rgba(52,211,153,0.38)",
        dotClass: "bg-emerald-600 shadow-none dark:bg-emerald-400 dark:shadow-[0_0_6px_rgba(52,211,153,0.55)]",
        textClass: "text-emerald-800 dark:text-emerald-200",
        ringActiveClass: "ring-emerald-500/40 dark:ring-emerald-400/50",
      },
    ],
    [overview.fixed, overview.inProgress, overview.reopened],
  );

  const otherSegment: SegmentDef | null =
    overview.other > 0
      ? {
          statusFilter: "other",
          label: "Other status",
          short: "Other",
          count: overview.other,
          gradient: "from-slate-600 via-slate-400 to-slate-500",
          glowRgb: "rgba(148,163,184,0.32)",
          dotClass: "bg-slate-500 shadow-none dark:bg-slate-400 dark:shadow-[0_0_5px_rgba(148,163,184,0.45)]",
          textClass: "text-slate-700 dark:text-slate-300",
          ringActiveClass: "ring-slate-400/40 dark:ring-slate-400/45",
        }
      : null;

  const allSegments = otherSegment ? [...segments, otherSegment] : segments;

  const wProgress = useLivingSmooth(overview.inProgress * inv, widthDuration);
  const wReopened = useLivingSmooth(overview.reopened * inv, widthDuration);
  const wFixed = useLivingSmooth(overview.fixed * inv, widthDuration);
  const wOther = useLivingSmooth(overview.other * inv, widthDuration);
  const widths = [wProgress, wReopened, wFixed, ...(otherSegment ? [wOther] : [])];

  const livingTotal = useLivingCount(displayTotal, isLight ? 0 : 1100);
  const openRate = total > 0 ? Math.round(((overview.inProgress + overview.reopened) / total) * 100) : 0;

  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
      <Link
        href={buildFilterHref(portalBase, preservedQuery)}
        className={cn(
          "group flex min-w-[9.5rem] shrink-0 flex-col justify-center rounded-lg border px-4 py-3 transition-[border-color,box-shadow] duration-200",
          isLight
            ? "border-amber-200 bg-amber-50 shadow-sm hover:border-amber-300 hover:bg-amber-100/80"
            : "border-amber-500/20 bg-gradient-to-br from-amber-950/80 via-slate-950/90 to-slate-950/95 shadow-[inset_0_1px_0_rgba(251,191,36,0.08),0_0_28px_rgba(245,158,11,0.06)] hover:border-amber-400/35 hover:shadow-[0_0_32px_rgba(245,158,11,0.12)]",
          activeStatusFilter === "" && (isLight ? "ring-2 ring-amber-500/35" : "ring-2 ring-amber-400/40"),
        )}
      >
        <span
          className={cn(
            "font-mono text-[9px] font-bold uppercase tracking-[0.22em]",
            isLight ? "text-amber-800/90" : "text-amber-500/85",
          )}
        >
          Support queue
        </span>
        <span
          className={cn(
            "mt-1 font-mono text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-[2.75rem]",
            isLight ? "text-amber-950" : "text-amber-50",
          )}
        >
          {fmt(livingTotal)}
        </span>
        <span className={cn("mt-1.5 text-[11px] leading-snug", isLight ? "text-slate-600" : "text-slate-400")}>
          {openRate}% still open · click to show all
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              "font-mono text-[10px] font-semibold uppercase tracking-[0.18em]",
              isLight ? "text-amber-800/90" : "text-amber-500/80",
            )}
          >
            Ticket lifecycle pipeline
          </p>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
            All tickets
          </span>
        </div>

        <div
          className={cn(
            "relative w-full rounded-[10px] border p-1.5",
            isLight
              ? "border-slate-200 bg-slate-100"
              : "border-amber-500/15 bg-slate-950/70 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[2px]",
          )}
          role="img"
          aria-label={`Ticket status mix: ${allSegments.map((s) => `${s.label} ${pct(s.count)}`).join(", ")}`}
        >
          {total === 0 ? (
            <span className="flex h-5 items-center justify-center text-[10px] text-muted-foreground">No tickets in queue</span>
          ) : (
            <div className="flex min-h-5 w-full items-stretch gap-1 sm:gap-1.5">
              {allSegments.map((seg, i) => (
                <TicketPipelineBeltSegment
                  key={seg.statusFilter}
                  seg={seg}
                  flexGrow={widths[i] ?? 0}
                  active={activeStatusFilter === seg.statusFilter}
                  href={buildFilterHref(portalBase, preservedQuery, seg.statusFilter)}
                  title={`${seg.label}: ${fmt(seg.count)} (${pct(seg.count)})`}
                  sheenDelay={i * 1.2}
                  isLight={isLight}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-nowrap items-stretch gap-1.5 sm:gap-2">
          {allSegments.map((seg) => {
            const active = activeStatusFilter === seg.statusFilter;
            return (
              <Link
                key={seg.statusFilter}
                href={buildFilterHref(portalBase, preservedQuery, seg.statusFilter)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-200 sm:gap-2.5 sm:px-3 sm:py-2.5",
                  isLight
                    ? "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50"
                    : "border-amber-500/10 bg-slate-950/55 hover:border-amber-400/25 hover:bg-slate-900/70",
                  active &&
                    (isLight
                      ? cn("border-amber-300 bg-amber-50", seg.ringActiveClass, "ring-2")
                      : cn("border-amber-400/30 bg-amber-950/30", seg.ringActiveClass, "ring-2")),
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5", seg.dotClass)} aria-hidden />
                  <span className={cn("truncate font-mono", rsTextKicker, seg.textClass)}>
                    {seg.short}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-xl font-bold tabular-nums leading-none sm:text-2xl",
                    isLight ? "text-slate-900" : "text-slate-50",
                  )}
                >
                  {fmt(seg.count)}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 truncate font-mono tabular-nums",
                    rsTextCaption,
                    isLight ? "text-slate-600" : "text-slate-400",
                  )}
                >
                  {pct(seg.count)} of queue
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
