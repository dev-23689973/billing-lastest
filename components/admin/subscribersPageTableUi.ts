import { cn } from "@/lib/cn";
import type { SubscribersUserColumnKey } from "@/lib/subscribers/subscribersTableModel";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  SUBSCRIBERS_PAGE_COL_FILL_CLASS,
  SUBSCRIBERS_PAGE_RESPONSIVE_TABLE_CLASS,
  subscribersPageActionsColClass,
  subscribersPageColTableClass,
} from "@/lib/ui/subscribersPageResponsiveTable";

/** User ID stays start-aligned; name/username/MAC/parents and metric columns are centered. */
export function subscribersPageCellAlign(col: SubscribersUserColumnKey): string {
  if (col === "account") return "text-left";
  return "text-center";
}

/** Sortable `<th>` link — full width so label + icon sit in the cell center (or start for User ID). */
export function subscribersPageSortHeaderLinkClass(col: SubscribersUserColumnKey): string {
  return col === "account"
    ? "inline-flex w-full min-w-0 items-center justify-start gap-1"
    : "inline-flex w-full min-w-0 items-center justify-center gap-1";
}

/** Non-sort column header label (Parents, State, …). */
export function subscribersPageHeaderLabelWrapClass(col: SubscribersUserColumnKey): string {
  return col === "account"
    ? "inline-flex w-full min-w-0 items-center justify-start"
    : "inline-flex w-full min-w-0 items-center justify-center";
}

export const SUBSCRIBERS_PAGE_TABLE_CLASS = SUBSCRIBERS_PAGE_RESPONSIVE_TABLE_CLASS;

export const SUBSCRIBERS_PAGE_TD = "whitespace-nowrap align-middle text-foreground";

export function subscribersPageTh(className?: string) {
  return dataTableStickyTh(cn("whitespace-nowrap align-middle", className));
}

export function subscribersPageHeaderCell(columnId: string, className?: string, fill?: boolean) {
  return subscribersPageTh(
    cn(
      subscribersPageColTableClass(columnId),
      fill && SUBSCRIBERS_PAGE_COL_FILL_CLASS,
      className,
    ),
  );
}

export function subscribersPageDataCell(columnId: string, className?: string, fill?: boolean) {
  return cn(
    SUBSCRIBERS_PAGE_TD,
    subscribersPageColTableClass(columnId),
    fill && SUBSCRIBERS_PAGE_COL_FILL_CLASS,
    className,
  );
}

export function subscribersPageActionsHeaderCell(className?: string) {
  return subscribersPageTh(cn(subscribersPageActionsColClass, className));
}
