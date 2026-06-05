"use client";

import { SubscribersPageHiddenDetailsPanel } from "@/components/admin/SubscribersPageHiddenDetailsPanel";
import {
  buildSubscribersPageRowDetailItems,
  subscribersPageExpandPanelColumnIds,
  type SubscribersPageColumnKey,
} from "@/components/admin/subscribersPageBuildRowDetails";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { useSubscribersPageTableContext } from "@/lib/ui/subscribersPageTableContext";

type Props = {
  row: SubscriberListClientRow;
  visibleColumns: ReadonlySet<SubscribersPageColumnKey>;
  showUserIdColumn: boolean;
};

export function SubscribersPageRowDetailsPanel({ row, visibleColumns, showUserIdColumn }: Props) {
  const { hiddenColumnIds } = useSubscribersPageTableContext();
  const panelColumnIds = subscribersPageExpandPanelColumnIds(
    visibleColumns,
    showUserIdColumn,
    hiddenColumnIds,
  );
  const items = buildSubscribersPageRowDetailItems(row, panelColumnIds, showUserIdColumn);
  return <SubscribersPageHiddenDetailsPanel items={items} />;
}
