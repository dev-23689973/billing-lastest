"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measurePortalInboxHiddenColumns } from "@/lib/ui/portalInboxComputeHiddenColumns";
import { portalInboxEmbeddedTableScrollShellClass } from "@/lib/ui/portalInboxResponsiveTable";
import { PortalInboxTableContextProvider } from "@/lib/ui/portalInboxTableContext";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
};

export function PortalInboxTableScrollShell({ columnIds, className, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measurePortalInboxHiddenColumns(scrollEl, columnIds);
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

  const showExpandColumn = hiddenColumnIds.length > 0;

  return (
    <PortalInboxTableContextProvider
      value={{
        hasHiddenColumns: showExpandColumn,
        hiddenColumnIds,
      }}
    >
      <div
        ref={scrollRef}
        className={cn(portalInboxEmbeddedTableScrollShellClass, className)}
        data-portal-inbox-has-hidden={showExpandColumn ? "" : undefined}
        data-portal-inbox-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </PortalInboxTableContextProvider>
  );
}
