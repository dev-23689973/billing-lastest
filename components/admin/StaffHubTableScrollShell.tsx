"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { StaffHubListRefreshBridge } from "@/components/admin/StaffHubListRefreshBridge";
import { measureStaffHubHiddenColumns } from "@/lib/ui/staffHubComputeHiddenColumns";
import { StaffHubTableContextProvider } from "@/lib/ui/staffHubTableContext";
import { staffHubEmbeddedTableScrollShellClass } from "@/lib/ui/staffHubResponsiveTable";

type Props = {
  columnIds: readonly string[];
  className?: string;
  children: ReactNode;
  /** Show expand chevron when column picker hid fields (list modal). */
  forceExpandColumn?: boolean;
};

/** Measures overflow and sets `data-staff-hidden` so columns hide only when the table does not fit. */
export function StaffHubTableScrollShell({ columnIds, className, children, forceExpandColumn = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<readonly string[]>([]);
  const hiddenRef = useRef<readonly string[]>([]);
  const measureRaf = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const run = () => {
      const hidden = measureStaffHubHiddenColumns(scrollEl, columnIds);
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
    <StaffHubTableContextProvider
      value={{
        hasHiddenColumns: showExpandColumn,
        hiddenColumnIds,
      }}
    >
      <StaffHubListRefreshBridge />
      <div
        ref={scrollRef}
        className={cn(staffHubEmbeddedTableScrollShellClass, className)}
        data-staff-has-hidden={showExpandColumn ? "" : undefined}
        data-staff-hidden={hiddenColumnIds.length > 0 ? hiddenColumnIds.join(" ") : undefined}
      >
        {children}
      </div>
    </StaffHubTableContextProvider>
  );
}
