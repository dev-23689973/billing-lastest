"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import {
  useSubscribersPageScrollElement,
  useSubscribersPageScrollReady,
} from "@/lib/ui/subscribersPageScrollContext";
import { SubscribersPageVirtualRowExpandProvider } from "@/lib/ui/subscribersPageVirtualRowExpandContext";

/** Virtualize only at higher page sizes — below this, render all rows (simpler expand rows). */
export const SUBSCRIBERS_PAGE_VIRTUALIZE_MIN_ROWS = 32;

const ROW_ESTIMATE_PX = 52;
/** Main row + inline details panel when columns are hidden on narrow viewports. */
const ROW_EXPANDED_ESTIMATE_PX = 172;

type Props = {
  rowCount: number;
  colSpan: number;
  children: (item: { index: number }) => ReactNode;
};

/**
 * Windowed tbody rows for the users list scroll shell.
 * Uses spacer `<tr>` padding so sticky `<thead>` layout stays valid.
 */
export function SubscribersPageVirtualizedTbody({ rowCount, colSpan, children }: Props) {
  const scrollEl = useSubscribersPageScrollElement();
  const scrollReady = useSubscribersPageScrollReady();
  const useVirtual = scrollReady && Boolean(scrollEl) && rowCount >= SUBSCRIBERS_PAGE_VIRTUALIZE_MIN_ROWS;

  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set());

  const notifyExpanded = useCallback((index: number, open: boolean) => {
    setExpandedRows((prev) => {
      const alreadyOpen = prev.has(index);
      if (alreadyOpen === open) return prev;
      const next = new Set(prev);
      if (open) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollEl,
    estimateSize: (index) => (expandedRows.has(index) ? ROW_EXPANDED_ESTIMATE_PX : ROW_ESTIMATE_PX),
    overscan: 14,
    enabled: useVirtual,
  });

  useEffect(() => {
    if (!useVirtual) return;
    virtualizer.measure();
  }, [expandedRows, useVirtual, virtualizer]);

  const renderRow = (index: number, key: string | number) => (
    <SubscribersPageVirtualRowExpandProvider key={key} rowIndex={index} notifyExpanded={notifyExpanded}>
      {children({ index })}
    </SubscribersPageVirtualRowExpandProvider>
  );

  if (!useVirtual) {
    return <>{Array.from({ length: rowCount }, (_, index) => renderRow(index, index))}</>;
  }

  const items = virtualizer.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0);

  return (
    <>
      {padTop > 0 ? (
        <tr aria-hidden className="subscribers-page-virtual-pad">
          <td colSpan={colSpan} style={{ height: padTop, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      ) : null}
      {items.map((vi) => renderRow(vi.index, String(vi.key)))}
      {padBottom > 0 ? (
        <tr aria-hidden className="subscribers-page-virtual-pad">
          <td colSpan={colSpan} style={{ height: padBottom, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      ) : null}
    </>
  );
}
