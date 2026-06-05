"use client";

import { memo, useMemo, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";
import { DataTableSelectionCheckbox } from "@/components/ui/DataTableSelectionCheckbox";

export type MessageRecipientPickItem = {
  id: string;
  label: string;
  meta?: string;
};

const GRID_COLS = 3;
const ROW_ESTIMATE_PX = 36;
const VIRTUALIZE_MIN_ITEMS = 36;

const pickGridClass =
  "grid grid-cols-2 gap-1 p-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3";

const pickItemClass =
  "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 transition-colors duration-150 hover:border-cyan-400/15 hover:bg-cyan-500/[0.05]";

const pickItemCheckedClass =
  "border-cyan-400/25 bg-cyan-500/[0.1] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)] dark:bg-cyan-500/[0.08]";

const RecipientPickItem = memo(function RecipientPickItem({
  item,
  checked,
  onToggle,
}: {
  item: MessageRecipientPickItem;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={cn(pickItemClass, checked && pickItemCheckedClass)}
      title={item.meta ? `${item.label} · ${item.meta}` : item.label}
      onClick={() => onToggle(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <DataTableSelectionCheckbox
          checked={checked}
          onChange={() => onToggle(item.id)}
          aria-label={item.meta ? `${item.label}, ${item.meta}` : item.label}
        />
      </div>
      <span className="min-w-0 flex-1 truncate font-mono text-xs leading-tight text-foreground">
        {item.label}
      </span>
      {item.meta ? (
        <span className="max-w-[4.5rem] shrink-0 truncate text-[10px] font-medium text-muted-foreground">
          {item.meta}
        </span>
      ) : null}
    </div>
  );
});

function chunkItems(items: MessageRecipientPickItem[], cols: number) {
  const rows: MessageRecipientPickItem[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }
  return rows;
}

function VirtualRecipientPickGrid({
  scrollRef,
  items,
  selected,
  onToggle,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  items: MessageRecipientPickItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const rows = useMemo(() => chunkItems(items, GRID_COLS), [items]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div className="relative w-full p-1.5" style={{ height: totalHeight }}>
      {virtualItems.map((virtualRow) => {
        const rowItems = rows[virtualRow.index] ?? [];
        return (
          <div
            key={virtualRow.key}
            className={cn(pickGridClass, "absolute left-0 top-0 w-full p-0")}
            style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
          >
            {rowItems.map((item) => (
              <RecipientPickItem
                key={item.id}
                item={item}
                checked={selected.has(item.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function MessageRecipientPickList({
  items,
  selected,
  onToggle,
  scrollRef,
  emptyMessage = "No matches for this filter.",
  className,
}: {
  items: MessageRecipientPickItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  emptyMessage?: string;
  className?: string;
}) {
  if (!items.length) {
    return <p className="px-2 py-5 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  if (items.length >= VIRTUALIZE_MIN_ITEMS && scrollRef) {
    return (
      <VirtualRecipientPickGrid scrollRef={scrollRef} items={items} selected={selected} onToggle={onToggle} />
    );
  }

  return (
    <ul className={cn(pickGridClass, className)} role="listbox" aria-multiselectable>
      {items.map((item) => (
        <li key={item.id} role="option" aria-selected={selected.has(item.id)} className="min-w-0">
          <RecipientPickItem item={item} checked={selected.has(item.id)} onToggle={onToggle} />
        </li>
      ))}
    </ul>
  );
}
