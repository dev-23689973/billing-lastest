import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { embeddedTableTdClass, embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";
import {
  PORTAL_INBOX_COL_TRAIL_FILL_CLASS,
  portalInboxActionsColClass,
  portalInboxColTableClass,
} from "@/lib/ui/portalInboxResponsiveTable";

export function portalInboxTitleTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle", extra)),
    portalInboxColTableClass("title"),
  );
}

export function portalInboxMessageTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle", extra)),
    portalInboxColTableClass("message"),
  );
}

export function portalInboxLabelTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle whitespace-nowrap", extra)),
    portalInboxColTableClass(columnId),
  );
}

export function portalInboxStatusTd(extra?: string) {
  return cn(
    embeddedTableTdClass(cn("align-middle whitespace-nowrap", extra)),
    portalInboxColTableClass("status"),
  );
}

export function portalInboxTrailFillTd(columnId: string, extra?: string) {
  return cn(
    embeddedTableTdClass(cn("min-w-0 align-middle whitespace-nowrap", extra)),
    portalInboxColTableClass(columnId),
    PORTAL_INBOX_COL_TRAIL_FILL_CLASS,
  );
}

export function portalInboxHeaderCell(columnId: string, className?: string, trailFill?: boolean) {
  return dataTableStickyTh(
    cn(
      portalInboxColTableClass(columnId),
      trailFill && PORTAL_INBOX_COL_TRAIL_FILL_CLASS,
      embeddedTableThClass(className, "tight"),
    ),
  );
}

export function portalInboxActionsHeaderCell(className?: string) {
  return dataTableStickyTh(cn(portalInboxActionsColClass, embeddedTableThClass(className, "tight")));
}

export const PORTAL_INBOX_ACTIONS_TD = cn(
  embeddedTableTdClass("align-middle text-center", "tight"),
  portalInboxActionsColClass,
);
