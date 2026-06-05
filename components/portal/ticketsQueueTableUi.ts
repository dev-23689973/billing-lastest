import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { embeddedTableTdClass, embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";
import {
  TICKETS_QUEUE_COL_TRAIL_FILL_CLASS,
  ticketsQueueActionsColClass,
  ticketsQueueColTableClass,
} from "@/lib/ui/ticketsQueueResponsiveTable";

export const TICKETS_QUEUE_TD = cn(embeddedTableTdClass("align-middle"), "text-foreground");

export function ticketsQueueHeaderCell(columnId: string, className?: string, trailFill?: boolean) {
  return dataTableStickyTh(
    cn(
      ticketsQueueColTableClass(columnId),
      trailFill && TICKETS_QUEUE_COL_TRAIL_FILL_CLASS,
      embeddedTableThClass(className, "tight"),
    ),
  );
}

export function ticketsQueueDataCell(columnId: string, className?: string, trailFill?: boolean) {
  return cn(
    TICKETS_QUEUE_TD,
    ticketsQueueColTableClass(columnId),
    trailFill && TICKETS_QUEUE_COL_TRAIL_FILL_CLASS,
    className,
  );
}

export function ticketsQueueActionsHeaderCell(className?: string) {
  return dataTableStickyTh(cn(ticketsQueueActionsColClass, embeddedTableThClass(className, "tight")));
}
