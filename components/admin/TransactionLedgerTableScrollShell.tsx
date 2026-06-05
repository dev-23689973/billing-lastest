"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureTransactionLedgerHiddenColumns } from "@/lib/ui/transactionLedgerComputeHiddenColumns";
import { transactionLedgerTableScrollShellClass } from "@/lib/ui/transactionLedgerResponsiveTable";
import { TransactionLedgerTableContextProvider } from "@/lib/ui/transactionLedgerTableContext";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
};

export function TransactionLedgerTableScrollShell({ columnIds, className, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measureTransactionLedgerHiddenColumns(scrollEl, columnIds);
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

  return (
    <TransactionLedgerTableContextProvider
      value={{ hasHiddenColumns: hiddenColumnIds.length > 0, hiddenColumnIds }}
    >
      <div
        ref={scrollRef}
        className={cn(transactionLedgerTableScrollShellClass, className)}
        data-ledger-has-hidden={hiddenColumnIds.length > 0 ? "" : undefined}
        data-ledger-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </TransactionLedgerTableContextProvider>
  );
}
