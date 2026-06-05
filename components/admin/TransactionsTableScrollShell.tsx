"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureTransactionsHiddenColumns } from "@/lib/ui/transactionsComputeHiddenColumns";
import { transactionsTableScrollShellClass } from "@/lib/ui/transactionsResponsiveTable";
import { TransactionsTableContextProvider } from "@/lib/ui/transactionsTableContext";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
  /** Modal: fill width, fixed narrow metrics + flexible remarks. */
  layout?: "auto" | "fluid";
};

export function TransactionsTableScrollShell({ columnIds, className, children, layout = "auto" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    if (layout === "fluid") {
      hiddenRef.current = [];
      setHiddenColumnIds([]);
      scrollEl.removeAttribute("data-txn-hidden");
      scrollEl.removeAttribute("data-txn-has-hidden");
      return;
    }

    const run = () => {
      const hidden = measureTransactionsHiddenColumns(scrollEl, columnIds);
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
  }, [columnIds, layout]);

  return (
    <TransactionsTableContextProvider
      value={{ hasHiddenColumns: hiddenColumnIds.length > 0, hiddenColumnIds }}
    >
      <div
        ref={scrollRef}
        className={cn(transactionsTableScrollShellClass, className)}
        data-txn-layout={layout === "fluid" ? "fluid" : undefined}
        data-txn-has-hidden={hiddenColumnIds.length > 0 ? "" : undefined}
        data-txn-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </TransactionsTableContextProvider>
  );
}
