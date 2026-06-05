"use client";

import type { ReactNode } from "react";
import type { StaffHubDetailItem } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  DeviceCell,
  HierarchyCell,
  StatusBadge,
  expiryState,
  formatExpiryShort,
  type SubscribersHierarchyColumnMode,
} from "@/components/admin/subscribersFetchModalFormatters";
import type { SubscriberFetchModalRow } from "@/lib/dto/subscribers";
import { SUBSCRIBERS_FETCH_MODAL_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/subscribersFetchModalResponsiveTable";
import type { SubscribersFetchModalColumnKey } from "@/lib/ui/subscribersFetchModalResponsiveTable";
import { cn } from "@/lib/cn";

export type SubscribersFetchModalVisibleCols = Record<SubscribersFetchModalColumnKey, boolean>;

export const SUBSCRIBERS_FETCH_MODAL_COLUMN_LABELS: Record<SubscribersFetchModalColumnKey, string> = {
  account: "Account",
  user: "User",
  hierarchy: "Dealer / Reseller",
  package: "Package",
  mac: "MAC",
  ip: "IP",
  autoRenew: "Auto renew",
  status: "Status",
  expires: "Expires",
  device: "Device",
};

export function subscribersFetchModalExpandPanelColumnIds(
  visibleColumns: SubscribersFetchModalVisibleCols,
  hierarchyColumnAvailable: boolean,
  responsiveHiddenIds: readonly string[],
): string[] {
  const responsiveHidden = new Set(responsiveHiddenIds);
  const ids: string[] = [];

  if (!visibleColumns.account) {
    ids.push("account");
  }

  const keys: SubscribersFetchModalColumnKey[] = [
    "user",
    "hierarchy",
    "package",
    "mac",
    "ip",
    "autoRenew",
    "status",
    "expires",
    "device",
  ];

  for (const key of keys) {
    if (key === "hierarchy" && !hierarchyColumnAvailable) continue;
    if (key === "account") continue;
    if (!SUBSCRIBERS_FETCH_MODAL_RESPONSIVE_HIDE_COLUMN_IDS.has(key)) continue;
    const pickerOff = !visibleColumns[key];
    const responsiveOff = responsiveHidden.has(key);
    if (pickerOff || responsiveOff) ids.push(key);
  }

  return ids;
}

export function subscribersFetchModalHasExpandPanel(
  visibleColumns: SubscribersFetchModalVisibleCols,
  hierarchyColumnAvailable: boolean,
  responsiveHiddenIds: readonly string[],
): boolean {
  return (
    subscribersFetchModalExpandPanelColumnIds(visibleColumns, hierarchyColumnAvailable, responsiveHiddenIds)
      .length > 0
  );
}

function renderDetailValue(
  col: string,
  row: SubscriberFetchModalRow,
  hierarchyColumnMode: SubscribersHierarchyColumnMode,
): ReactNode {
  switch (col) {
    case "account":
      return <span className="font-mono tabular-nums">{row.account}</span>;
    case "user":
      return row.full_name || "—";
    case "hierarchy":
      return <HierarchyCell row={row} mode={hierarchyColumnMode} />;
    case "package":
      return (
        <span className="block min-w-0 max-w-full text-foreground" title={row.packageName || undefined}>
          {row.packageName || "—"}
        </span>
      );
    case "mac":
      return <span className="font-mono text-muted-foreground">{row.mac || "—"}</span>;
    case "ip":
      return <span className="font-mono text-muted-foreground">{row.ip || "—"}</span>;
    case "autoRenew":
      return row.autoRenew == null ? "—" : row.autoRenew ? "Yes" : "No";
    case "status":
      return <StatusBadge r={row} />;
    case "expires": {
      const state = expiryState(row.expires);
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-x-1 gap-y-0.5 tabular-nums text-muted-foreground">
          <span>{formatExpiryShort(row.expires)}</span>
          {state ? (
            <span
              className={cn(
                "text-[9px] font-semibold uppercase sm:text-[10px]",
                state === "Live"
                  ? "text-emerald-600 dark:text-emerald-300"
                  : state === "Expiring"
                    ? "text-amber-600 dark:text-amber-300"
                    : "text-rose-600 dark:text-rose-300",
              )}
            >
              {state === "Expiring" ? "Soon" : state === "Live" ? "OK" : "End"}
            </span>
          ) : null}
        </span>
      );
    }
    case "device":
      return <DeviceCell r={row} />;
    default:
      return "—";
  }
}

export function buildSubscribersFetchModalRowDetailItems(
  row: SubscriberFetchModalRow,
  panelColumnIds: readonly string[],
  hierarchyColumnMode: SubscribersHierarchyColumnMode,
  hierarchyLabel?: string | null,
): StaffHubDetailItem[] {
  return panelColumnIds.map((col) => ({
    columnId: col,
    label:
      col === "hierarchy" && hierarchyLabel
        ? hierarchyLabel
        : SUBSCRIBERS_FETCH_MODAL_COLUMN_LABELS[col as SubscribersFetchModalColumnKey] ?? col,
    value: renderDetailValue(col, row, hierarchyColumnMode),
  }));
}

export function visibleSubscriberTableColumnIds(
  visibleColumns: SubscribersFetchModalVisibleCols,
  hierarchyColumnAvailable: boolean,
): string[] {
  const keys: SubscribersFetchModalColumnKey[] = [
    "account",
    "user",
    "hierarchy",
    "package",
    "mac",
    "ip",
    "autoRenew",
    "status",
    "expires",
    "device",
  ];
  return keys.filter((key) => {
    if (key === "hierarchy" && !hierarchyColumnAvailable) return false;
    return visibleColumns[key];
  });
}
