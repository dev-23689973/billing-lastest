"use client";

import type { ReactNode } from "react";
import { SubscriberStateCell } from "@/components/admin/SubscriberStateCell";
import { SubscriberParentsCell } from "@/components/admin/SubscriberParentsCell";
import { SubscriberAutoRenewCell } from "@/components/subscribers/SubscriberAutoRenewCell";
import { SubscriberSubscriptionStatusCard } from "@/components/subscribers/SubscriberSubscriptionStatusCard";
import type { SubscribersPageDetailItem } from "@/components/admin/SubscribersPageHiddenDetailsPanel";
import {
  subscriptionPill,
} from "@/components/admin/subscribersPageFormatters";
import { cn } from "@/lib/cn";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import {
  formatSubscriberCreated,
  subscriberBillingOwner,
  SUBSCRIBERS_USER_COLUMN_LABELS,
  SUBSCRIBERS_USER_COLUMN_ORDER,
  type SubscribersUserColumnKey,
} from "@/lib/subscribers/subscribersTableModel";
import { SUBSCRIBERS_PAGE_RESPONSIVE_HIDE_COLUMN_IDS } from "@/lib/ui/subscribersPageResponsiveTable";

export type SubscribersPageColumnKey = SubscribersUserColumnKey;

export type SubscribersPageAutoRenewHandlers = {
  onConfigure: () => void;
  onDisable: (account: string) => Promise<{ ok: boolean; message?: string }>;
};

export const SUBSCRIBERS_PAGE_COLUMN_LABELS = SUBSCRIBERS_USER_COLUMN_LABELS;

export const SUBSCRIBERS_PAGE_COL_ORDER = SUBSCRIBERS_USER_COLUMN_ORDER;

export function subscribersPageTableColumnIds(
  visibleColumns: ReadonlySet<SubscribersPageColumnKey>,
  showUserIdColumn: boolean,
): SubscribersPageColumnKey[] {
  return SUBSCRIBERS_PAGE_COL_ORDER.filter((key) => {
    if (key === "account" && !showUserIdColumn) return false;
    return visibleColumns.has(key);
  });
}

export function subscribersPageExpandPanelColumnIds(
  visibleColumns: ReadonlySet<SubscribersPageColumnKey>,
  showUserIdColumn: boolean,
  responsiveHiddenIds: readonly string[],
): SubscribersPageColumnKey[] {
  const responsiveHidden = new Set(responsiveHiddenIds);
  const ids: SubscribersPageColumnKey[] = [];

  for (const key of SUBSCRIBERS_PAGE_COL_ORDER) {
    if (key === "account" && !showUserIdColumn) continue;
    const pickerOff = !visibleColumns.has(key);
    const responsiveOff =
      SUBSCRIBERS_PAGE_RESPONSIVE_HIDE_COLUMN_IDS.has(key) && responsiveHidden.has(key);
    if (pickerOff || responsiveOff) ids.push(key);
  }

  return ids;
}

export function subscribersPageHasExpandPanel(
  visibleColumns: ReadonlySet<SubscribersPageColumnKey>,
  showUserIdColumn: boolean,
  responsiveHiddenIds: readonly string[],
): boolean {
  return subscribersPageExpandPanelColumnIds(visibleColumns, showUserIdColumn, responsiveHiddenIds).length > 0;
}

function renderDetailValue(
  col: SubscribersPageColumnKey,
  row: SubscriberListClientRow,
  showUserIdColumn: boolean,
  autoRenewHandlers?: SubscribersPageAutoRenewHandlers,
): ReactNode {
  switch (col) {
    case "account": {
      if (showUserIdColumn) {
        const id = row.stalkerUserId;
        return id != null && Number.isFinite(id) && id > 0 ? (
          <span className="font-mono tabular-nums">{id}</span>
        ) : (
          "—"
        );
      }
      return <span className="font-mono tabular-nums">{row.account}</span>;
    }
    case "name":
      return row.full_name?.trim() || "—";
    case "username":
      return (
        <span className="font-sans font-semibold tabular-nums text-primary">
          {row.account?.trim() || "—"}
        </span>
      );
    case "mac":
      return <span className="font-mono text-muted-foreground">{row.mac || "—"}</span>;
    case "domain":
      return <span className="text-muted-foreground">{row.domain?.trim() || "—"}</span>;
    case "parents":
      return subscriberBillingOwner(row)?.login ?? "—";
    case "autoRenew":
      return (
        <SubscriberAutoRenewCell
          account={row.account}
          expires={row.expires}
          autoRenew={row.autoRenew}
          autoRenewCyclesRemaining={row.autoRenewCyclesRemaining}
          onConfigure={autoRenewHandlers?.onConfigure}
          onDisable={autoRenewHandlers?.onDisable}
        />
      );
    case "status": {
      const sub = subscriptionPill(row);
      return (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight", sub.className)}>
          {sub.label}
        </span>
      );
    }
    case "expiry":
      return <SubscriberSubscriptionStatusCard expires={row.expires} compact />;
    case "created":
      return <span className="tabular-nums text-muted-foreground">{formatSubscriberCreated(row.created)}</span>;
    case "state":
      return <SubscriberStateCell online={row.receiverOnline} nowPlaying={row.nowPlaying} compact />;
    default:
      return "—";
  }
}

export function buildSubscribersPageRowDetailItems(
  row: SubscriberListClientRow,
  panelColumnIds: readonly SubscribersPageColumnKey[],
  showUserIdColumn = false,
  autoRenewHandlers?: SubscribersPageAutoRenewHandlers,
): SubscribersPageDetailItem[] {
  return panelColumnIds.map((col) => ({
    columnId: col,
    label: SUBSCRIBERS_PAGE_COLUMN_LABELS[col],
    value: renderDetailValue(col, row, showUserIdColumn, autoRenewHandlers),
  }));
}
