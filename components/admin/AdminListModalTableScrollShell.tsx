"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { measureAdminListModalHiddenColumns } from "@/lib/ui/adminListModalComputeHiddenColumns";
import { AdminListModalTableContextProvider } from "@/lib/ui/adminListModalTableContext";
import { adminListModalTableScrollShellClass } from "@/lib/ui/adminListModalResponsiveTable";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
  /** Show expand chevron when column picker hid fields. */
  forceExpandColumn?: boolean;
};

/** Measures overflow and sets `data-list-modal-hidden` (same pattern as transactions modal). */
export function AdminListModalTableScrollShell({
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
      const hidden = measureAdminListModalHiddenColumns(scrollEl, columnIds);
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
    <AdminListModalTableContextProvider
      value={{
        hasHiddenColumns: showExpandColumn,
        hiddenColumnIds,
      }}
    >
      <div
        ref={scrollRef}
        className={cn(adminListModalTableScrollShellClass, className)}
        data-list-modal-has-hidden={showExpandColumn ? "" : undefined}
        data-list-modal-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </AdminListModalTableContextProvider>
  );
}
