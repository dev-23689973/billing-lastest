"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { SubscriberParentsCell } from "@/components/admin/SubscriberParentsCell";
import {
  SubscriberAccountUsernameCell,
  SubscriberStalkerUserIdCell,
} from "@/components/admin/SubscriberTableIdentityCells";
import { SubscriberStateCell } from "@/components/admin/SubscriberStateCell";
import { SubscribersPageExpandableRow } from "@/components/admin/SubscribersPageExpandableRow";
import { SubscribersPageRowDetailsPanel } from "@/components/admin/SubscribersPageRowDetailsPanel";
import { SubscribersPageTableScrollShell } from "@/components/admin/SubscribersPageTableScrollShell";
import {
  subscribersPageTableColumnIds,
  type SubscribersPageColumnKey,
} from "@/components/admin/subscribersPageBuildRowDetails";
import {
  SubscriberExpiryTableCell,
  subscriptionPill,
} from "@/components/admin/subscribersPageFormatters";
import { SubscriberAutoRenewCell } from "@/components/subscribers/SubscriberAutoRenewCell";
import {
  subscribersPageActionsHeaderCell,
  subscribersPageCellAlign,
  subscribersPageDataCell,
  subscribersPageHeaderCell,
  subscribersPageHeaderLabelWrapClass,
  subscribersPageSortHeaderLinkClass,
  SUBSCRIBERS_PAGE_TABLE_CLASS,
} from "@/components/admin/subscribersPageTableUi";
import { cn } from "@/lib/cn";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import {
  formatSubscriberCreated,
  SUBSCRIBERS_USER_COLUMN_LABELS,
  SUBSCRIBERS_USER_COLUMN_SHORT_LABELS,
  type SubscribersUserColumnKey,
} from "@/lib/subscribers/subscribersTableModel";
import type { SubscribersTablePortal } from "@/lib/subscribersPortalTable";
import { useSubscribersPageTableContext } from "@/lib/ui/subscribersPageTableContext";
import { embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";
import {
  SUBSCRIBERS_FETCH_MODAL_TABLE_SCROLL_CLASS,
  subscribersFetchModalStatusBadgeClass,
  subscribersFetchModalStatusPillClass,
} from "@/lib/ui/subscribersFetchModalTable";

type SortKey = SubscribersUserColumnKey;

type Props = {
  rows: SubscriberListClientRow[];
  visibleColumns: ReadonlySet<SubscribersUserColumnKey>;
  subscribersPortal: SubscribersTablePortal;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
};

const SORTABLE: ReadonlySet<SortKey> = new Set([
  "account",
  "name",
  "username",
  "mac",
  "status",
  "created",
  "expiry",
]);

export function SubscribersFetchModalResponsiveTable(props: Props) {
  const showUserIdColumn = props.subscribersPortal.showUserIdColumn ?? props.subscribersPortal.apiBase === "/api/admin";
  const tableColumnIds = useMemo(
    () =>
      subscribersPageTableColumnIds(
        props.visibleColumns as ReadonlySet<SubscribersPageColumnKey>,
        showUserIdColumn,
      ),
    [props.visibleColumns, showUserIdColumn],
  );

  const tableScrollClass = cn(
    SUBSCRIBERS_FETCH_MODAL_TABLE_SCROLL_CLASS,
    "rounded-xl border border-border/40 bg-gradient-to-b from-background/18 to-muted/8 shadow-inner backdrop-blur-sm dark:from-background/12 dark:to-muted/6",
    "max-h-[min(62vh,calc(100dvh-14rem))]",
  );

  return (
    <SubscribersPageTableScrollShell columnIds={tableColumnIds} className={tableScrollClass}>
      <SubscribersFetchModalTable {...props} tableColumnIds={tableColumnIds} showUserIdColumn={showUserIdColumn} />
    </SubscribersPageTableScrollShell>
  );
}

function SubscribersFetchModalTable({
  rows,
  visibleColumns,
  subscribersPortal,
  sortKey,
  sortDir,
  onSort,
  tableColumnIds,
  showUserIdColumn,
}: Props & { tableColumnIds: SubscribersPageColumnKey[]; showUserIdColumn: boolean }) {
  const { hasHiddenColumns } = useSubscribersPageTableContext();
  const hierarchyRoles = useMemo(
    () => new Set(subscribersPortal.hierarchyRoles ?? []),
    [subscribersPortal.hierarchyRoles],
  );
  const usersListPath = subscribersPortal.usersPath;

  const hasColumn = (key: SubscribersUserColumnKey) => visibleColumns.has(key);
  const colSpan = Math.max(1, tableColumnIds.length + (hasHiddenColumns ? 1 : 0));

  const sortableHeader = (key: SortKey) => {
    const label = SUBSCRIBERS_USER_COLUMN_LABELS[key];
    const short = SUBSCRIBERS_USER_COLUMN_SHORT_LABELS[key];
    const sortable = SORTABLE.has(key);

    return (
      <th key={key} className={subscribersPageHeaderCell(key, subscribersPageCellAlign(key))}>
        {sortable ? (
          <button
            type="button"
            onClick={() => onSort(key)}
            className={cn(subscribersPageSortHeaderLinkClass(key), "hover:text-foreground")}
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
            {sortKey === key ? (
              <ChevronDown className={cn("h-3 w-3 shrink-0", sortDir === "asc" ? "rotate-180" : "")} aria-hidden />
            ) : (
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            )}
          </button>
        ) : (
          <span className={subscribersPageHeaderLabelWrapClass(key)}>
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        )}
      </th>
    );
  };

  const dataTd = (columnId: SubscribersUserColumnKey, extra?: string) =>
    subscribersPageDataCell(columnId, cn(subscribersPageCellAlign(columnId), extra));

  return (
      <table className={SUBSCRIBERS_PAGE_TABLE_CLASS}>
        <thead>
          <tr>
            {showUserIdColumn && hasColumn("account") ? sortableHeader("account") : null}
            {hasColumn("name") ? sortableHeader("name") : null}
            {hasColumn("username") ? sortableHeader("username") : null}
            {hasColumn("mac") ? sortableHeader("mac") : null}
            {hasColumn("domain") ? sortableHeader("domain") : null}
            {hasColumn("parents") ? sortableHeader("parents") : null}
            {hasColumn("status") ? sortableHeader("status") : null}
            {hasColumn("state") ? sortableHeader("state") : null}
            {hasColumn("created") ? sortableHeader("created") : null}
            {hasColumn("expiry") ? sortableHeader("expiry") : null}
            {hasColumn("autoRenew") ? sortableHeader("autoRenew") : null}
            {hasHiddenColumns ? (
              <th className={subscribersPageActionsHeaderCell(cn(embeddedTableThClass(undefined, "tight"), "text-center"))}>
                <span className="sr-only">Row details</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-muted-foreground">
                No users found.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const sub = subscriptionPill(r);
              return (
                <SubscribersPageExpandableRow
                  key={r.account}
                  colSpan={colSpan}
                  expandPersistId={`subscribers-modal:${r.account}`}
                  actions={null}
                  details={
                    <SubscribersPageRowDetailsPanel
                      row={r}
                      visibleColumns={visibleColumns as ReadonlySet<SubscribersPageColumnKey>}
                      showUserIdColumn={showUserIdColumn}
                    />
                  }
                >
                  {showUserIdColumn && hasColumn("account") ? (
                    <td className={dataTd("account")}>
                      <SubscriberStalkerUserIdCell row={r} className="text-xs" />
                    </td>
                  ) : null}
                  {hasColumn("name") ? (
                    <td className={dataTd("name", "font-medium text-foreground")} title={r.full_name || undefined}>
                      <span className="mx-auto block min-w-0 max-w-full truncate text-center">
                        {r.full_name?.trim() || "—"}
                      </span>
                    </td>
                  ) : null}
                  {hasColumn("username") ? (
                    <td className={dataTd("username")}>
                      <SubscriberAccountUsernameCell row={r} linkClassName="whitespace-nowrap" />
                    </td>
                  ) : null}
                  {hasColumn("mac") ? (
                    <td className={dataTd("mac", "font-mono text-xs text-muted-foreground")}>
                      <span className="mx-auto block min-w-0 max-w-full truncate text-center">{r.mac || "—"}</span>
                    </td>
                  ) : null}
                  {hasColumn("domain") ? (
                    <td className={dataTd("domain", "text-xs text-muted-foreground")} title={r.domain || undefined}>
                      <span className="mx-auto block min-w-0 max-w-full truncate text-center">{r.domain?.trim() || "—"}</span>
                    </td>
                  ) : null}
                  {hasColumn("parents") ? (
                    <td className={dataTd("parents", "text-xs text-muted-foreground")}>
                      <div className="flex w-full justify-center">
                        <SubscriberParentsCell
                          row={r}
                          usersListPath={usersListPath}
                          hierarchyRoles={hierarchyRoles}
                          truncate
                          readonly
                        />
                      </div>
                    </td>
                  ) : null}
                  {hasColumn("status") ? (
                    <td className={dataTd("status", "text-center")}>
                      <span
                        className={cn(
                          subscribersFetchModalStatusPillClass,
                          subscribersFetchModalStatusBadgeClass(sub.label === "Active"),
                        )}
                      >
                        {sub.label}
                      </span>
                    </td>
                  ) : null}
                  {hasColumn("state") ? (
                    <td className={dataTd("state", "text-center")}>
                      <SubscriberStateCell online={r.receiverOnline} nowPlaying={r.nowPlaying} compact dense />
                    </td>
                  ) : null}
                  {hasColumn("created") ? (
                    <td className={dataTd("created", "text-center tabular-nums text-muted-foreground")}>
                      {formatSubscriberCreated(r.created)}
                    </td>
                  ) : null}
                  {hasColumn("expiry") ? (
                    <td
                      className={dataTd("expiry", "text-center")}
                      title={r.expires ? String(r.expires) : undefined}
                    >
                      <SubscriberExpiryTableCell expires={r.expires} compact />
                    </td>
                  ) : null}
                  {hasColumn("autoRenew") ? (
                    <td className={dataTd("autoRenew", "align-middle text-center")}>
                      <div className="flex justify-center">
                        <SubscriberAutoRenewCell
                          account={r.account}
                          expires={r.expires}
                          autoRenew={r.autoRenew}
                          autoRenewCyclesRemaining={r.autoRenewCyclesRemaining}
                        />
                      </div>
                    </td>
                  ) : null}
                </SubscribersPageExpandableRow>
              );
            })
          )}
        </tbody>
      </table>
  );
}
