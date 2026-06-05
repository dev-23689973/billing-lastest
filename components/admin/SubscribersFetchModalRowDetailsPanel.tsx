"use client";

import { useMemo, useRef } from "react";
import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import {
  buildSubscribersFetchModalRowDetailItems,
  subscribersFetchModalExpandPanelColumnIds,
  type SubscribersFetchModalVisibleCols,
} from "@/components/admin/subscribersFetchModalBuildRowDetails";
import type { SubscribersHierarchyColumnMode } from "@/components/admin/subscribersFetchModalFormatters";
import type { SubscriberFetchModalRow } from "@/lib/dto/subscribers";
import { useSubscribersFetchModalTableContext } from "@/lib/ui/subscribersFetchModalTableContext";

type Props = {
  row: SubscriberFetchModalRow;
  visibleColumns: SubscribersFetchModalVisibleCols;
  hierarchyColumnAvailable: boolean;
  hierarchyColumnMode: SubscribersHierarchyColumnMode;
  hierarchyLabel?: string | null;
};

export function SubscribersFetchModalRowDetailsPanel({
  row,
  visibleColumns,
  hierarchyColumnAvailable,
  hierarchyColumnMode,
  hierarchyLabel,
}: Props) {
  const { hiddenColumnIds } = useSubscribersFetchModalTableContext();
  const latchedPanelIdsRef = useRef<string[]>([]);

  const panelColumnIds = useMemo(() => {
    const current = subscribersFetchModalExpandPanelColumnIds(
      visibleColumns,
      hierarchyColumnAvailable,
      hiddenColumnIds,
    );
    if (current.length > 0) {
      latchedPanelIdsRef.current = current;
      return current;
    }
    return latchedPanelIdsRef.current;
  }, [visibleColumns, hierarchyColumnAvailable, hiddenColumnIds, hierarchyLabel]);

  const items = buildSubscribersFetchModalRowDetailItems(
    row,
    panelColumnIds,
    hierarchyColumnMode,
    hierarchyLabel,
  );

  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">No additional fields to show for this row.</p>
    );
  }

  return <StaffHubHiddenDetailsPanel items={items} />;
}
