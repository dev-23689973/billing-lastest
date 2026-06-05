"use client";

import type { MessageKpiBeltRow } from "@/lib/messages/messageKpiBeltTypes";
import { cn } from "@/lib/cn";

/** Dense label/value list for mobile KPI panels — no charts or expand rows. */
export function MessageKpiCompactList({
  rows,
  className,
}: {
  rows: MessageKpiBeltRow[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2 gap-y-1", className)}>
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt
            className={cn(
              "truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
              row.muted && "opacity-55",
            )}
          >
            {row.label}
          </dt>
          <dd
            className={cn(
              "truncate text-right text-[11px] font-semibold tabular-nums text-foreground",
              row.muted && "opacity-55",
            )}
            title={row.headline}
          >
            {row.headline}
          </dd>
        </div>
      ))}
    </dl>
  );
}
