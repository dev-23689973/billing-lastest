import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  STAFF_HUB_RESPONSIVE_TABLE_CLASS,
  staffHubActionsColClass,
  staffHubColTableClass,
  staffHubHeaderLabelClass,
} from "@/lib/ui/staffHubResponsiveTable";

/** Fixed layout — columns shrink/truncate; responsive hide via container queries on scroll shell. */
export const STAFF_HUB_TABLE_CLASS = STAFF_HUB_RESPONSIVE_TABLE_CLASS;

/** Typography/padding come from `staff-hub-responsive-table.css` (not embedded list scale). */
export const STAFF_HUB_TD = "whitespace-nowrap align-middle text-foreground";

export const STAFF_HUB_TD_NARROW = STAFF_HUB_TD;

export function staffHubTh(className?: string) {
  return dataTableStickyTh(cn("whitespace-nowrap align-middle", className));
}

const STAFF_HUB_NO_CLIP_COLS = new Set(["status", "state"]);

export function staffHubContainerCellClass(columnId: string): string | undefined {
  if (columnId === "status") return "staff-hub-status-cell";
  return undefined;
}

export function staffHubHeaderCell(columnId: string, className?: string) {
  return staffHubTh(
    cn(
      staffHubColTableClass(columnId),
      staffHubHeaderLabelClass(columnId),
      STAFF_HUB_NO_CLIP_COLS.has(columnId)
        ? cn("overflow-visible", staffHubContainerCellClass(columnId))
        : undefined,
      className,
    ),
  );
}

export function staffHubDataCell(columnId: string, className?: string) {
  return cn(
    STAFF_HUB_TD,
    staffHubColTableClass(columnId),
    STAFF_HUB_NO_CLIP_COLS.has(columnId)
      ? cn("relative overflow-visible", staffHubContainerCellClass(columnId))
      : undefined,
    className,
  );
}

export function staffHubActionsHeaderCell(className?: string) {
  return staffHubTh(cn(staffHubActionsColClass, className));
}

export const STAFF_TABLE_MOBILE_TH_LABEL: Partial<Record<string, string>> = {
  username: "User",
  credits: "Cr",
  dealerCount: "R/D",
  status: "St",
  state: "State",
  type: "T",
  totalUsers: "Tot",
};
