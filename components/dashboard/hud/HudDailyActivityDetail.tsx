"use client";

import { useEffect, useState } from "react";

import type { AdminDayActivityAccountRow } from "@/lib/dashboard/types";
import { formatHudDayMonthLabel } from "@/components/dashboard/hud/hudMonthKey";
import { cn } from "@/lib/cn";

type Tab = "new" | "expired";

export function HudDailyActivityDetail({
  date,
  onClose,
  newCount,
  expiredCount,
  newUsers,
  expiredUsers,
  loading,
  className,
}: {
  date: Date;
  onClose: () => void;
  newCount: number;
  expiredCount: number;
  newUsers: AdminDayActivityAccountRow[];
  expiredUsers: AdminDayActivityAccountRow[];
  /** Detail list still loading from API */
  loading?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("new");
  const titleLabel = formatHudDayMonthLabel(date);
  const isNew = tab === "new";
  const count = isNew ? newCount : expiredCount;
  const rows = isNew ? newUsers : expiredUsers;

  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  useEffect(() => {
    if (newCount > 0) setTab("new");
    else if (expiredCount > 0) setTab("expired");
    else setTab("new");
  }, [dayKey, newCount, expiredCount]);

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col overflow-hidden", className)}>
      <div className="pointer-events-none mb-0.5 flex justify-between px-0.5" aria-hidden>
        <span className="h-1 w-1 shrink-0 bg-primary/70 dark:bg-fuchsia-500/80 dark:shadow-[0_0_4px_rgba(232,121,249,0.35)]" />
        <span className="h-1 w-1 shrink-0 bg-primary/70 dark:bg-fuchsia-500/80 dark:shadow-[0_0_4px_rgba(232,121,249,0.35)]" />
      </div>

      <header className="flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-sm border border-primary/35 bg-slate-50 px-1.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary shadow-none transition hover:border-primary/50 hover:bg-white dark:border-cyan-500/35 dark:bg-slate-950/55 dark:text-cyan-200/95 dark:shadow-none dark:hover:border-cyan-500/45 dark:hover:bg-slate-950/75"
        >
          ← Return
        </button>
        <div className="min-w-0 text-right leading-none">
          <p className="font-mono text-base font-bold tracking-[0.08em] text-slate-900 sm:text-lg dark:text-slate-50">{titleLabel}</p>
          <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500">Daily activity</p>
        </div>
      </header>

      <div className="mt-1.5 grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-1.5">
        <button
          type="button"
          onClick={() => setTab("new")}
          className={cn(
            "rounded-sm border py-1 text-center font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition sm:text-[10px]",
            isNew
              ? "border-emerald-600/45 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/20 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-50 dark:ring-emerald-400/25"
              : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/55 dark:bg-slate-950/30 dark:text-slate-500 dark:hover:border-slate-600/50 dark:hover:text-slate-400",
          )}
        >
          New ({newCount})
        </button>
        <div className="flex flex-col items-center gap-1 py-0" aria-hidden>
          <span
            className={cn(
              "h-1 w-1 rounded-full transition",
              isNew ? "bg-emerald-500 dark:bg-emerald-400 dark:shadow-[0_0_4px_rgba(52,211,153,0.4)]" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
          <span
            className={cn(
              "h-1 w-1 rounded-full transition",
              !isNew ? "bg-fuchsia-500 dark:bg-fuchsia-400 dark:shadow-[0_0_4px_rgba(232,121,249,0.35)]" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => setTab("expired")}
          className={cn(
            "rounded-sm border py-1 text-center font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition sm:text-[10px]",
            !isNew
              ? "border-fuchsia-600/40 bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-500/15 dark:border-fuchsia-500/45 dark:bg-fuchsia-950/25 dark:text-fuchsia-100/95"
              : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/55 dark:bg-slate-950/30 dark:text-slate-500 dark:hover:border-slate-600/50 dark:hover:text-slate-400",
          )}
        >
          Expired ({expiredCount})
        </button>
      </div>

      <section className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 p-1.5 dark:border-slate-600/35 sm:p-1.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-0.5 dark:border-slate-700/40">
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px]">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                isNew ? "bg-emerald-600 dark:bg-emerald-400 dark:shadow-[0_0_4px_rgba(52,211,153,0.4)]" : "bg-fuchsia-600 dark:bg-fuchsia-400 dark:shadow-[0_0_4px_rgba(232,121,249,0.35)]",
              )}
            />
            <span className={cn(isNew ? "text-emerald-800 dark:text-emerald-300/95" : "text-fuchsia-800 dark:text-fuchsia-300/95")}>
              {isNew ? "New users" : "Expired users"}
            </span>
          </span>
          <span className="flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-semibold tabular-nums text-slate-800 dark:border-slate-600/50 dark:bg-slate-950/40 dark:text-slate-200">
            {count}
          </span>
        </div>

        <div className="thin-scrollbar scrollbar-surface-light mt-1.5 min-h-0 max-h-[min(46vh,15.5rem)] flex-1 overflow-y-auto overscroll-contain rounded-sm border border-dashed border-slate-200 px-1.5 py-1.5 pr-1 dark:scrollbar-surface-dark dark:border-slate-600/45 sm:max-h-none sm:px-2 sm:pr-1.5 [scrollbar-gutter:stable]">
          {loading ? (
            <div className="flex min-h-[4rem] items-center justify-center font-mono text-[10px] text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[4rem] items-center justify-center px-2 py-4">
              <p className="text-center font-mono text-[10px] leading-relaxed text-slate-500">No entries for this date.</p>
            </div>
          ) : (
            <ul className="space-y-1.5 pb-0.5">
              {rows.map((r) => (
                <li
                  key={`${tab}-${r.account}`}
                  className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm dark:border-slate-700/35 dark:bg-slate-950/25 dark:shadow-none"
                >
                  <div className="font-mono text-[11px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">{r.account}</div>
                  {r.full_name ? (
                    <div className="mt-0.5 truncate font-mono text-[9px] text-slate-500">{r.full_name}</div>
                  ) : null}
                  {r.username ? (
                    <div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-600">{r.username}</div>
                  ) : null}
                  <div className="mt-0.5 font-mono text-[8px] tabular-nums text-slate-500">
                    {isNew && r.created ? <span>Created {r.created}</span> : null}
                    {!isNew && r.expires ? <span>Expires {r.expires}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
