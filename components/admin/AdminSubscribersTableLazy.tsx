"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminSubscribersTable } from "@/components/admin/AdminSubscribersTable";

function SubscribersTableRowSkeleton() {
  return (
    <div className="flex items-center gap-2 border-b border-border/25 px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted/40" />
      <div className="h-4 w-14 shrink-0 animate-pulse rounded bg-muted/35" />
      <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-muted/30" />
      <div className="hidden h-4 w-20 animate-pulse rounded bg-muted/35 sm:block" />
      <div className="hidden h-4 w-24 animate-pulse rounded bg-muted/30 md:block" />
      <div className="hidden h-8 w-[7.5rem] animate-pulse rounded-lg bg-muted/25 lg:block" />
    </div>
  );
}

function SubscribersTableFallback({ embedded }: { embedded?: boolean }) {
  if (!embedded) {
    return (
      <div
        className="flex min-h-[14rem] w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 text-sm text-muted-foreground"
        aria-busy
        aria-label="Loading subscribers table"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading subscribers…
      </div>
    );
  }

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      aria-busy
      aria-label="Loading subscribers table"
    >
      <div className="shrink-0 space-y-2 border-b border-border/40 px-2 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-[5.5rem] animate-pulse rounded-md bg-muted/35" />
          <div className="h-8 min-w-[7rem] flex-1 animate-pulse rounded-md bg-muted/30 sm:max-w-xs" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted/35" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted/30" />
        </div>
      </div>
      <div className="shrink-0 border-b border-border/30 bg-muted/10 px-2 py-2 sm:px-3">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-12 animate-pulse rounded bg-muted/35 sm:w-16" />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <SubscribersTableRowSkeleton key={i} />
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border/30 bg-muted/5 py-2.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Loading subscribers…
      </div>
    </div>
  );
}

type Props = ComponentProps<typeof AdminSubscribersTable>;

/** Code-split subscribers grid — defers heavy table + modal chunks until after shell paint. */
export function AdminSubscribersTableLazy(props: Props) {
  const { embedded } = props;
  const Table = useMemo(
    () =>
      dynamic(
        () => import("@/components/admin/AdminSubscribersTable").then((m) => m.AdminSubscribersTable),
        {
          ssr: false,
          loading: () => <SubscribersTableFallback embedded={embedded} />,
        },
      ),
    [embedded],
  );

  return (
    <div
      className={cn(
        "min-w-0 w-full",
        embedded && "flex min-h-0 flex-1 flex-col overflow-hidden",
      )}
    >
      <Table {...props} />
    </div>
  );
}
