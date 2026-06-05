"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureSubscribersPageHiddenColumns } from "@/lib/ui/subscribersPageComputeHiddenColumns";
import { subscribersPageEmbeddedTableScrollShellClass } from "@/lib/ui/subscribersPageResponsiveTable";
import { SubscribersPageTableContextProvider } from "@/lib/ui/subscribersPageTableContext";
import { SubscribersPageScrollRefProvider } from "@/lib/ui/subscribersPageScrollContext";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
  /** Rare override — expand chevron is driven by responsive overflow measure, not column picker. */
  forceExpandColumn?: boolean;
};

export function SubscribersPageTableScrollShell({
  columnIds,
  className,
  children,
  forceExpandColumn = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollReady, setScrollReady] = useState(false);

  useLayoutEffect(() => {
    if (scrollRef.current) setScrollReady(true);
  }, []);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measureSubscribersPageHiddenColumns(scrollEl, columnIds);
      const prev = hiddenRef.current;
      if (prev.length !== hidden.length || prev.some((id, i) => id !== hidden[i])) {
        hiddenRef.current = hidden;
        setHiddenColumnIds(hidden);
      }
    };

    const schedule = () => {
      if (measureRaf.current != null) cancelAnimationFrame(measureRaf.current);
      measureRaf.current = requestAnimationFrame(() => {
        measureRaf.current = null;
        run();
      });
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(scrollEl);

    return () => {
      ro.disconnect();
      if (measureRaf.current != null) cancelAnimationFrame(measureRaf.current);
    };
  }, [columnIds]);

  const showExpandColumn = hiddenColumnIds.length > 0 || forceExpandColumn;

  return (
    <SubscribersPageTableContextProvider
      value={{
        hasHiddenColumns: showExpandColumn,
        hiddenColumnIds,
      }}
    >
      <SubscribersPageScrollRefProvider scrollRef={scrollRef} scrollReady={scrollReady}>
        <div
          ref={scrollRef}
          className={cn(subscribersPageEmbeddedTableScrollShellClass, className)}
          data-subscribers-page-has-hidden={showExpandColumn ? "" : undefined}
          data-subscribers-page-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
        >
          {children}
        </div>
      </SubscribersPageScrollRefProvider>
    </SubscribersPageTableContextProvider>
  );
}
