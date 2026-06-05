"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { AdminListModalExpandableRow } from "@/components/admin/AdminListModalExpandableRow";
import { AdminListModalRowDetailsPanel } from "@/components/admin/AdminListModalRowDetailsPanel";
import { AdminListModalTableScrollShell } from "@/components/admin/AdminListModalTableScrollShell";
import {
  ADMIN_LIST_MODAL_COL_ORDER,
  ADMIN_LIST_MODAL_TO_STAFF_COL,
  type AdminListModalBranchRow,
  type AdminListModalColKey,
} from "@/components/admin/adminListModalBuildRowDetails";
import { StaffRealtimeStateCell } from "@/components/admin/StaffRealtimeStateCell";
import { StaffTypeBadge, staffStatusBadgeClassName } from "@/components/admin/HierarchyTableBadges";
import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { embeddedTableTdClass, embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";
import {
  ADMIN_LIST_MODAL_RESPONSIVE_TABLE_CLASS,
  adminListModalActionsColClass,
  adminListModalColTableClass,
} from "@/lib/ui/adminListModalResponsiveTable";
import { useAdminListModalTableContext } from "@/lib/ui/adminListModalTableContext";
import {
  ADMIN_LIST_MODAL_COMPACT_SCROLL_CLASS,
  adminListModalPillClass,
} from "@/lib/ui/adminListModalTable";

export type { AdminListModalBranchRow };

type VisibleCols = Record<AdminListModalColKey, boolean>;

const COLUMN_LABELS: Record<string, string> = {
  name: "Name",
  username: "Username",
  credits: "Credits",
  dealerCount: "Dealers",
  parentReseller: "Parent",
  status: "Status",
  state: "State",
  type: "Type",
  activeUsers: "Active",
  expiredUsers: "Expired",
  totalUsers: "Total",
};

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

const th = (extra?: string) =>
  dataTableStickyTh(cn("text-center", embeddedTableThClass(extra, "tight")));

const tdClass = cn("text-center font-normal", embeddedTableTdClass(undefined, "tight"));

type Props = {
  pageRows: AdminListModalBranchRow[];
  visibleCols: VisibleCols;
  showBranchColumn: boolean;
  branchLabel: string;
  sortHeader: (modalKey: AdminListModalColKey, label?: string) => ReactNode;
};

export function AdminListModalResponsiveTable(props: Props) {
  const visibleColumnDefs = useMemo(() => {
    return ADMIN_LIST_MODAL_COL_ORDER.filter((key) => {
      if (key === "branchCount" && !props.showBranchColumn) return false;
      return props.visibleCols[key];
    }).map((key) => ({
      modalKey: key,
      staffId: ADMIN_LIST_MODAL_TO_STAFF_COL[key],
    }));
  }, [props.visibleCols, props.showBranchColumn]);

  const tableColumnIds = useMemo(() => visibleColumnDefs.map((d) => d.staffId), [visibleColumnDefs]);

  const tableScrollClass = cn(
    ADMIN_LIST_MODAL_COMPACT_SCROLL_CLASS,
    "rounded-xl border border-border/40 bg-gradient-to-b from-background/18 to-muted/8 shadow-inner backdrop-blur-sm dark:from-background/12 dark:to-muted/6",
    "max-h-[min(62vh,calc(100dvh-14rem))]",
  );

  return (
    <AdminListModalTableScrollShell columnIds={tableColumnIds} className={tableScrollClass}>
      <AdminListModalTableInner {...props} visibleColumnDefs={visibleColumnDefs} tableColumnIds={tableColumnIds} />
    </AdminListModalTableScrollShell>
  );
}

function AdminListModalTableInner({
  pageRows,
  visibleCols,
  showBranchColumn,
  branchLabel,
  sortHeader,
  visibleColumnDefs,
  tableColumnIds,
}: Props & {
  visibleColumnDefs: { modalKey: AdminListModalColKey; staffId: string }[];
  tableColumnIds: string[];
}) {
  const { hasHiddenColumns } = useAdminListModalTableContext();
  const colSpan = Math.max(1, tableColumnIds.length + (hasHiddenColumns ? 1 : 0));

  const columnLabels = useMemo(
    () => ({
      ...COLUMN_LABELS,
      dealerCount: branchLabel,
    }),
    [branchLabel],
  );

  return (
    <table className={ADMIN_LIST_MODAL_RESPONSIVE_TABLE_CLASS}>
      <thead>
        <tr>
          {visibleColumnDefs.map(({ modalKey, staffId }) => (
            <th key={staffId} className={th(adminListModalColTableClass(staffId))}>
              {sortHeader(modalKey, modalKey === "branchCount" ? branchLabel : undefined)}
            </th>
          ))}
          {hasHiddenColumns ? (
            <th className={dataTableStickyTh(cn(adminListModalActionsColClass, embeddedTableThClass(undefined, "tight"), "py-1 text-center"))}>
              <span className="sr-only">Row details</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {pageRows.map((r) => (
          <AdminListModalExpandableRow
            key={`${r.type}:${r.username}`}
            colSpan={colSpan}
            expandPersistId={`list-modal:${r.type}:${r.username}`}
            rowClassName="border-b border-border/35 transition-[background-color] duration-150 ease-out odd:bg-background/[0.06] hover:bg-muted/30"
            details={
              <AdminListModalRowDetailsPanel
                row={r}
                columnLabels={columnLabels}
                visibleCols={visibleCols}
                showBranchColumn={showBranchColumn}
              />
            }
          >
            {visibleColumnDefs.map(({ modalKey, staffId }) => {
              switch (modalKey) {
                case "name":
                  return (
                    <td
                      key={staffId}
                      className={cn(tdClass, adminListModalColTableClass(staffId))}
                      title={r.name || undefined}
                    >
                      <span className="block max-w-[8rem] truncate">{r.name || "—"}</span>
                    </td>
                  );
                case "username":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "font-mono text-xs text-muted-foreground")}>
                      <span className="block min-w-0 max-w-full truncate" title={r.username}>
                        {r.username}
                      </span>
                    </td>
                  );
                case "credits":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "tabular-nums text-muted-foreground")}>
                      {formatInt(r.credits)}
                    </td>
                  );
                case "branchCount":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "tabular-nums text-muted-foreground")}>
                      {r.branchCount > 0 ? r.branchCount : "—"}
                    </td>
                  );
                case "parent":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "font-mono text-xs text-muted-foreground")}>
                      {r.parent || "—"}
                    </td>
                  );
                case "status":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId))}>
                      <span
                        className={cn(
                          adminListModalPillClass,
                          staffStatusBadgeClassName(r.status === "Active"),
                        )}
                      >
                        {r.status === "Active" ? "On" : "Off"}
                      </span>
                    </td>
                  );
                case "state":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId))}>
                      <StaffRealtimeStateCell
                        username={r.username}
                        dbCurrentLogin={r.stateCurrentLogin}
                        dbLastLogin={r.stateLastLogin}
                        compact
                      />
                    </td>
                  );
                case "type":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId))}>
                      <StaffTypeBadge rowType={r.type} className={adminListModalPillClass} />
                    </td>
                  );
                case "activeUsers":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "tabular-nums text-emerald-600 dark:text-emerald-300")}>
                      {formatInt(r.activeUsers)}
                    </td>
                  );
                case "expiredUsers":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "tabular-nums text-amber-600 dark:text-amber-300")}>
                      {formatInt(r.expiredUsers)}
                    </td>
                  );
                case "totalUsers":
                  return (
                    <td key={staffId} className={cn(tdClass, adminListModalColTableClass(staffId), "tabular-nums text-muted-foreground")}>
                      {formatInt(r.totalUsers)}
                    </td>
                  );
                default:
                  return null;
              }
            })}
          </AdminListModalExpandableRow>
        ))}
        {pageRows.length === 0 ? (
          <tr>
            <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={colSpan}>
              No rows match current filters.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
