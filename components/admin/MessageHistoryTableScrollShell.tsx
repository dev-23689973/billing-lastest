"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureMessageHistoryHiddenColumns } from "@/lib/ui/messageHistoryComputeHiddenColumns";
import { messageHistoryTableScrollShellClass } from "@/lib/ui/messageHistoryResponsiveTable";
import { MessageHistoryTableContextProvider } from "@/lib/ui/messageHistoryTableContext";

export type MessageHistoryTableLayout = "staff" | "stb";

type Props = {
  columnIds: readonly string[];
  hideOrder: readonly string[];
  pinnedColumnIds: ReadonlySet<string>;
  layout: MessageHistoryTableLayout;
  className?: string;
  children: ReactNode;
};

export function MessageHistoryTableScrollShell({
  columnIds,
  hideOrder,
  pinnedColumnIds,
  layout,
  className,
  children,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measureMessageHistoryHiddenColumns(scrollEl, columnIds, hideOrder, pinnedColumnIds);
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
  }, [columnIds, hideOrder, pinnedColumnIds]);

  return (
    <MessageHistoryTableContextProvider
      value={{ hasHiddenColumns: hiddenColumnIds.length > 0, hiddenColumnIds }}
    >
      <div
        ref={scrollRef}
        className={cn(messageHistoryTableScrollShellClass, className)}
        data-message-history-layout={layout}
        data-message-history-has-hidden={hiddenColumnIds.length > 0 ? "" : undefined}
        data-message-history-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </MessageHistoryTableContextProvider>
  );
}
