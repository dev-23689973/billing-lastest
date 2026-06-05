"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureSubscribersFetchModalHiddenColumns } from "@/lib/ui/subscribersFetchModalComputeHiddenColumns";
import { SubscribersFetchModalTableContextProvider } from "@/lib/ui/subscribersFetchModalTableContext";
import { subscribersFetchModalTableScrollShellClass } from "@/lib/ui/subscribersFetchModalResponsiveTable";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
  /** Show expand chevron when column picker hid fields. */
  forceExpandColumn?: boolean;
};

export function SubscribersFetchModalTableScrollShell({
  columnIds,
  className,
  children,
  forceExpandColumn = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measureSubscribersFetchModalHiddenColumns(scrollEl, columnIds);
      const prev = hiddenRef.current;
      if (prev.length !== hidden.length || prev.some((id, i) => id !== hidden[i])) {
        hiddenRef.current = hidden;
        setHiddenColumnIds(hidden);
      }
      if (scrollEl.scrollLeft !== 0) {
        scrollEl.scrollLeft = 0;
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
    <SubscribersFetchModalTableContextProvider
      value={{
        hasHiddenColumns: showExpandColumn,
        hiddenColumnIds,
      }}
    >
      <div
        ref={scrollRef}
        className={cn(subscribersFetchModalTableScrollShellClass, className)}
        data-subscribers-modal-has-hidden={showExpandColumn ? "" : undefined}
        data-subscribers-modal-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </SubscribersFetchModalTableContextProvider>
  );
}
