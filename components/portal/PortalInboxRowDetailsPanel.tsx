"use client";

import { StaffHubHiddenDetailsPanel } from "@/components/admin/StaffHubHiddenDetailsPanel";
import { buildPortalInboxRowDetailItems } from "@/components/portal/portalInboxBuildRowDetails";
import type { PortalInboxRow } from "@/components/portal/PortalStaffInboxTable";
import { PORTAL_INBOX_COLUMN_IDS } from "@/lib/ui/portalInboxComputeHiddenColumns";
import { usePortalInboxTableContext } from "@/lib/ui/portalInboxTableContext";

export function PortalInboxRowDetailsPanel({ row }: { row: PortalInboxRow }) {
  const { hiddenColumnIds } = usePortalInboxTableContext();
  const items = buildPortalInboxRowDetailItems(row, PORTAL_INBOX_COLUMN_IDS, hiddenColumnIds);
  return <StaffHubHiddenDetailsPanel items={items} />;
}
