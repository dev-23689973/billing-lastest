"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RenewPreviewRow = {
  label: ReactNode;
  value: ReactNode;
  /** Emphasize label + value (e.g. after available / total). */
  highlight?: boolean;
};

export function renewPreviewFmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function renewPreviewFmtDate(d: Date | null | undefined, loading?: boolean) {
  if (loading) return "Loading…";
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RenewAccountPreviewPanel({
  title = "Renew preview",
  rows,
  footer,
  loading,
}: {
  title?: string;
  rows: RenewPreviewRow[];
  footer?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border px-3 py-2.5 text-xs",
        "border-cyan-300/90 bg-white shadow-[0_1px_3px_rgb(15_23_42/0.08)]",
        "dark:border-cyan-400/25 dark:bg-cyan-500/5 dark:shadow-none",
      )}
    >
      <p className="font-semibold text-cyan-800 dark:text-cyan-200/95">{title}</p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 text-slate-600 dark:text-muted-foreground">
        {rows.map((row, i) => (
          <Fragment key={i}>
            <dt
              className={cn(
                "min-w-0 justify-self-start text-left leading-snug",
                row.highlight && "font-semibold text-slate-900 dark:text-foreground",
              )}
            >
              {row.label}
            </dt>
            <dd
              className={cn(
                "justify-self-end text-right font-mono tabular-nums leading-snug text-slate-900 dark:text-foreground",
                row.highlight && "font-semibold text-cyan-700 dark:text-cyan-200",
                loading && "text-muted-foreground",
              )}
            >
              {loading ? "…" : row.value}
            </dd>
          </Fragment>
        ))}
      </dl>
      {footer ? (
        <p className="border-t border-cyan-200/90 pt-2 text-[11px] leading-snug text-slate-600 dark:border-cyan-400/20 dark:text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </div>
  );
}
