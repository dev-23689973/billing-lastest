import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  embeddedTableTdClass,
  embeddedTableTextClass,
  embeddedTableThClass,
} from "@/lib/ui/embeddedTableTypography";

/** Embedded admin list tables — same density as users page (`AdminSubscribersTable` compact). */
export const adminEmbeddedListTableClass = cn(
  "w-max min-w-full max-w-full table-auto border-collapse text-left tabular-nums",
  embeddedTableTextClass,
);

export const adminEmbeddedListRowClass =
  "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/15";

export function adminEmbeddedListTh(className?: string) {
  return dataTableStickyTh(embeddedTableThClass(className));
}

export const adminEmbeddedListTdClass = embeddedTableTdClass();
