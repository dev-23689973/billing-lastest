import Link from "next/link";
import { ChevronDown, ChevronsUpDown, Settings2 } from "lucide-react";
import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { AdminAddStaffModal } from "@/components/admin/AdminAddStaffModal";
import { AdminDealerRowActions } from "@/components/admin/AdminDealerRowActions";
import { AdminStaffEditModalTrigger } from "@/components/admin/AdminStaffEditModalTrigger";
import { StaffHubListRefreshBridge } from "@/components/admin/StaffHubListRefreshBridge";
import { AdminUsersListModalTrigger } from "@/components/admin/AdminUsersListModalTrigger";
import { InlineEditableStaffCell } from "@/components/admin/InlineEditableStaffCell";
import { StaffHubStatusCell } from "@/components/admin/staffHubResponsiveCells";
import { ManagersColumnSettings } from "@/components/admin/ManagersColumnSettings";
import { ManagersFiltersBar } from "@/components/admin/ManagersFiltersBar";
import { StaffHubKpiCollapsible } from "@/components/admin/StaffHubKpiCollapsible";
import { StaffRealtimeStateCell } from "@/components/admin/StaffRealtimeStateCell";
import {
  adminStaffCreateSuccessFlashItems,
  adminStaffListFlashItems,
  adminStaffPasswordResetFlashItems,
} from "@/lib/adminInlineFlashToasts";
import { staffCreateCreditFlashItems } from "@/lib/urlFlashToasts";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";
import { parseStaffListColsFromSearchParam } from "@/lib/adminStaffListColumns";
import { clampAdminStaffListPageSize, isAdminStaffListPageSize } from "@/lib/adminStaffListPageSize";
import { getResellerDealerCounts, listDealersPagedForReseller } from "@/lib/repos/staffListPaged";
import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { managersToolbarPrimaryButtonClass } from "@/components/admin/managers-toolbar-icon-button";

const LIST_PATH = "/reseller/dealers";
const DEFAULT_PAGE_SIZE = 25;

type SortKey = "name" | "username" | "credits" | "status" | "state" | "activeUsers" | "expiredUsers" | "totalUsers";
type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = [
  "name",
  "username",
  "credits",
  "status",
  "state",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
];

const COLUMN_IDS = [
  "name",
  "username",
  "credits",
  "status",
  "state",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
] as const;

type ColumnId = (typeof COLUMN_IDS)[number];

const COLUMN_LABELS: Record<ColumnId, string> = {
  name: "Name",
  username: "Username",
  credits: "Credits",
  status: "Status",
  state: "State",
  activeUsers: "Active",
  expiredUsers: "Expired",
  totalUsers: "Total",
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function dealersListPath(sp: {
  q?: string;
  p?: number;
  ps?: number;
  status?: string;
  sort?: SortKey;
  dir?: SortDir;
  cols?: string;
}) {
  const params = new URLSearchParams();
  const q = sp.q?.trim();
  if (q) params.set("q", q);
  if (sp.ps && isAdminStaffListPageSize(sp.ps)) params.set("ps", String(sp.ps));
  if (sp.status && ["active", "inactive"].includes(sp.status)) params.set("status", sp.status);
  if (sp.sort) params.set("sort", sp.sort);
  if (sp.dir) params.set("dir", sp.dir);
  if (sp.cols) params.set("cols", sp.cols);
  if (sp.p && sp.p > 1) params.set("p", String(sp.p));
  const query = params.toString();
  return query ? `${LIST_PATH}?${query}` : LIST_PATH;
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function hasPositiveCount(value: number | string | null | undefined) {
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return Number.parseInt(value, 10) > 0;
  return false;
}

function mapDealerSort(sort: SortKey): string {
  switch (sort) {
    case "name":
      return "name";
    case "username":
      return "username";
    case "status":
      return "status";
    case "activeUsers":
      return "activeUsers";
    case "expiredUsers":
    case "totalUsers":
      return "totalUsers";
    default:
      return "username";
  }
}

function dealerListFlashes(sp: Record<string, string | string[] | undefined>): FlashToastItem[] {
  const ok = firstString(sp.ok);
  const err = firstString(sp.error);
  const items: FlashToastItem[] = [
    ...staffCreateCreditFlashItems({
      error: err,
      bal: firstString(sp.bal),
      req: firstString(sp.req),
    }),
  ];
  if (ok === "created") {
    items.push({
      type: "success",
      message: "Dealer created",
      description: "They can sign in with the username and password you set.",
    });
  }
  if (ok === "deleted") {
    items.push({ type: "success", message: "Dealer deleted" });
  }
  if (err === "forbidden") {
    items.push({ type: "error", message: "You do not have access to that action." });
  }
  if (err === "missing") {
    items.push({ type: "error", message: "Required fields were missing." });
  }
  if (err === "delete") {
    items.push({ type: "error", message: "This dealer could not be deleted (user accounts may still be assigned)." });
  }
  if (err === "username") {
    items.push({ type: "error", message: "Username is invalid. Use 3–50 letters or numbers only." });
  }
  if (err === "password") {
    items.push({ type: "error", message: "Password must be between 3 and 50 characters." });
  }
  if (err === "password_mismatch") {
    items.push({ type: "error", message: "Password and confirm password must match." });
  }
  if (err === "taken") {
    items.push({ type: "error", message: "That username is already taken." });
  }
  if (err === "db") {
    items.push({ type: "error", message: "Could not create the account. Try again or check server logs." });
  }
  return items;
}

export async function ResellerDealersPage({
  resellerUsername,
  searchParams: sp,
}: {
  resellerUsername: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qRaw = (firstString(sp.q) ?? "").trim();
  const statusRaw = (firstString(sp.status) ?? "").trim().toLowerCase();
  const statusFilter = statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "";
  const sortRaw = (firstString(sp.sort) ?? "").trim();
  const dirRaw = (firstString(sp.dir) ?? "").trim().toLowerCase();
  const sortBy: SortKey = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "username";
  const sortDir: SortDir = dirRaw === "desc" ? "desc" : "asc";
  const page = Math.max(
    1,
    Number.parseInt(firstString(sp.p) ?? firstString(sp.page) ?? "1", 10) || 1,
  );
  const pageSizeRaw = Number.parseInt(firstString(sp.ps) ?? firstString(sp.pageSize) ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = clampAdminStaffListPageSize(pageSizeRaw, DEFAULT_PAGE_SIZE);
  const visibleColumns = parseStaffListColsFromSearchParam(sp.cols, COLUMN_IDS);
  const colsQuery = visibleColumns.size === COLUMN_IDS.length ? undefined : Array.from(visibleColumns).join(",");

  const [dealerCounts, paged] = await Promise.all([
    getResellerDealerCounts(resellerUsername),
    listDealersPagedForReseller({
      resellerUsername,
      search: qRaw || undefined,
      status: statusFilter || undefined,
      page,
      pageSize,
      sort: mapDealerSort(sortBy),
      dir: sortDir,
    }),
  ]);

  const { rows, total } = paged;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const redirectPath = dealersListPath({
    q: qRaw || undefined,
    p: currentPage,
    ps: pageSize,
    status: statusFilter || undefined,
    sort: sortBy,
    dir: sortDir,
    cols: colsQuery,
  });

  const listQuery = {
    q: qRaw || undefined,
    p: currentPage,
    ps: pageSize,
    status: statusFilter || undefined,
    sort: sortBy,
    dir: sortDir,
    cols: colsQuery,
  };

  const dealerTotal = dealerCounts.dealers.total;
  const dealerActive = dealerCounts.dealers.active;
  const dealerInactive = Math.max(0, dealerTotal - dealerActive);

  const filterHrefs = {
    all: dealersListPath({ q: qRaw || undefined, ps: pageSize, sort: sortBy, dir: sortDir, cols: colsQuery }),
    manager: dealersListPath({ q: qRaw || undefined, ps: pageSize, sort: sortBy, dir: sortDir, cols: colsQuery }),
    reseller: dealersListPath({ q: qRaw || undefined, ps: pageSize, sort: sortBy, dir: sortDir, cols: colsQuery }),
    dealer: dealersListPath({ q: qRaw || undefined, ps: pageSize, sort: sortBy, dir: sortDir, cols: colsQuery }),
  };

  const listFlashes = [
    ...dealerListFlashes(sp),
    ...adminStaffCreateSuccessFlashItems(sp),
    ...adminStaffPasswordResetFlashItems(sp),
    ...adminStaffListFlashItems(sp, "dealer"),
  ].filter((item, idx, arr) => arr.findIndex((x) => x.type === item.type && x.message === item.message) === idx);

  const td = "px-3 py-1 align-middle text-sm text-foreground";
  const sortableHeader = (key: SortKey, label: string, thClassName?: string) => (
    <th className={dataTableStickyTh(thClassName)}>
      <Link
        href={dealersListPath({
          q: qRaw || undefined,
          ps: pageSize,
          status: statusFilter || undefined,
          sort: key,
          dir: sortBy === key && sortDir === "asc" ? "desc" : "asc",
          cols: colsQuery,
        })}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          thClassName?.includes("text-right") ? "justify-end" : "",
          thClassName?.includes("text-center") ? "justify-center" : "",
        )}
      >
        {label}
        {sortBy === key ? (
          <ChevronDown className={cn("h-3.5 w-3.5", sortDir === "asc" ? "rotate-180" : "")} aria-hidden />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        )}
      </Link>
    </th>
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <StaffHubListRefreshBridge />
      

      <div className="shrink-0 px-3 pt-3 sm:px-5 sm:pt-4">
      <StaffHubKpiCollapsible
        totalStaff={dealerTotal}
        managerTotal={0}
        resellerTotal={0}
        dealerTotal={dealerTotal}
        managerActive={0}
        managerInactive={0}
        resellerActive={0}
        resellerInactive={0}
        dealerActive={dealerActive}
        dealerInactive={dealerInactive}
        filterHrefs={filterHrefs}
        activeType="dealer"
        hideManagers
        hideResellers
      />
      </div>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 px-2 py-1.5 sm:px-2">
          <ManagersFiltersBar
            listPath={LIST_PATH}
            allowedTypes={[]}
            q={qRaw}
            status={statusFilter}
            ps={pageSize}
            sort={sortBy}
            dir={sortDir}
            toolbarActions={
              <>
                <AdminAddStaffModal
                  portal="reseller"
                  triggerLabel="Add dealer"
                  triggerClassName={managersToolbarPrimaryButtonClass}
                />
                <ManagersColumnSettings
                  selectedColumns={Array.from(visibleColumns)}
                  labels={COLUMN_LABELS}
                  currentQuery={listQuery}
                />
              </>
            }
          />
        </div>

        <div className="app-data-table-scroll thin-scrollbar w-full max-w-full min-h-0 min-w-0 flex-1 overflow-auto [--app-data-table-max-h:100%]">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr>
                {visibleColumns.has("name") ? sortableHeader("name", COLUMN_LABELS.name, "py-1.5 text-center") : null}
                {visibleColumns.has("username") ? sortableHeader("username", COLUMN_LABELS.username, "py-1.5 text-center") : null}
                {visibleColumns.has("credits") ? sortableHeader("credits", COLUMN_LABELS.credits, "py-1.5 text-center") : null}
                {visibleColumns.has("status") ? sortableHeader("status", COLUMN_LABELS.status, "py-1.5 text-center") : null}
                {visibleColumns.has("state") ? sortableHeader("state", COLUMN_LABELS.state, "py-1.5 text-center") : null}
                {visibleColumns.has("activeUsers") ? sortableHeader("activeUsers", COLUMN_LABELS.activeUsers, "py-1.5 text-center") : null}
                {visibleColumns.has("expiredUsers") ? sortableHeader("expiredUsers", COLUMN_LABELS.expiredUsers, "py-1.5 text-center") : null}
                {visibleColumns.has("totalUsers") ? sortableHeader("totalUsers", COLUMN_LABELS.totalUsers, "py-1.5 text-center") : null}
                <th className={dataTableStickyTh("py-1.5 text-center")}>
                  <span className="inline-flex items-center justify-center" aria-hidden>
                    <Settings2 className="h-4 w-4" />
                  </span>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.size + 1} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {qRaw ? "No dealers match your search" : "No dealers under your account yet"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {qRaw
                        ? "Clear the search box or try another keyword."
                        : "Use Add dealer to create the first account."}
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr
                  key={r.username}
                  className="border-b border-border/70 transition-colors last:border-0 odd:bg-background/80 even:bg-muted/[0.16] hover:bg-muted/30 dark:border-border/40 dark:odd:bg-transparent dark:even:bg-transparent dark:hover:bg-muted/15"
                >
                  {visibleColumns.has("name") ? (
                    <td className={`${td} text-center font-semibold`}>
                      <InlineEditableStaffCell
                        rowType="DEALER"
                        username={r.username}
                        field="name"
                        value={r.name || ""}
                        inlineApiPath="/api/reseller/staff-inline"
                      />
                    </td>
                  ) : null}
                  {visibleColumns.has("username") ? (
                    <td className={cn(td, "text-center")}>
                      <AdminStaffEditModalTrigger
                        rowType="DEALER"
                        username={r.username}
                        editorApiBase="/api/reseller"
                        label={<span className="text-sm font-medium text-foreground hover:text-primary">{r.username}</span>}
                        className="inline cursor-pointer bg-transparent p-0 text-left"
                      />
                    </td>
                  ) : null}
                  {visibleColumns.has("credits") ? (
                    <td className={cn(td, "text-center tabular-nums text-muted-foreground")}>{formatInt(r.credits)}</td>
                  ) : null}
                  {visibleColumns.has("status") ? (
                    <td className={`${td} text-center`}>
                      <StaffHubStatusCell
                        rowType="DEALER"
                        username={r.username}
                        value={r.status}
                        inlineApiPath="/api/reseller/staff-inline"
                      />
                    </td>
                  ) : null}
                  {visibleColumns.has("state") ? (
                    <td className={cn(td, "text-center text-muted-foreground")}>
                      <StaffRealtimeStateCell
                        username={r.username}
                        dbCurrentLogin={r.currentLoginTime}
                        dbLastLogin={r.lastLoginTime}
                      />
                    </td>
                  ) : null}
                  {visibleColumns.has("activeUsers") ? (
                    <td className={cn(td, "text-center tabular-nums font-medium text-emerald-700 dark:text-emerald-300")}>
                      {hasPositiveCount(r.activeUserCount) ? (
                        <AdminUsersListModalTrigger
                          rowType="DEALER"
                          username={r.username}
                          displayName={r.name || r.username}
                          status="active"
                          subscribersPortal="reseller"
                          className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                          label={formatInt(r.activeUserCount)}
                        />
                      ) : (
                        <span className="text-muted-foreground">{formatInt(r.activeUserCount)}</span>
                      )}
                    </td>
                  ) : null}
                  {visibleColumns.has("expiredUsers") ? (
                    <td className={cn(td, "text-center tabular-nums font-medium text-orange-700 dark:text-orange-300")}>
                      {hasPositiveCount(r.expiredUserCount) ? (
                        <AdminUsersListModalTrigger
                          rowType="DEALER"
                          username={r.username}
                          displayName={r.name || r.username}
                          status="expired"
                          subscribersPortal="reseller"
                          className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                          label={formatInt(r.expiredUserCount)}
                        />
                      ) : (
                        <span className="text-muted-foreground">{formatInt(r.expiredUserCount)}</span>
                      )}
                    </td>
                  ) : null}
                  {visibleColumns.has("totalUsers") ? (
                    <td className={cn(td, "text-center tabular-nums font-medium text-muted-foreground")}>
                      {hasPositiveCount(r.userCount) ? (
                        <AdminUsersListModalTrigger
                          rowType="DEALER"
                          username={r.username}
                          displayName={r.name || r.username}
                          status=""
                          subscribersPortal="reseller"
                          className="inline rounded-none border-0 bg-transparent p-0 font-medium text-foreground no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                          label={formatInt(r.userCount)}
                        />
                      ) : (
                        <span>{formatInt(r.userCount)}</span>
                      )}
                    </td>
                  ) : null}
                  <td className={`${td} text-center`}>
                    <AdminDealerRowActions
                      username={r.username}
                      displayName={r.name || r.username}
                      canDelete={r.canDelete}
                      redirectPath={redirectPath}
                      status={r.status}
                      managerLogin=""
                      resellerLogin={resellerUsername}
                      credits={r.credits}
                      activeUsers={r.activeUserCount}
                      expiredUsers={r.expiredUserCount}
                      totalUsers={r.userCount}
                      stateCurrentLogin={r.currentLoginTime}
                      stateLastLogin={r.lastLoginTime}
                      stateLastLoginIp={r.lastLoginIp}
                      stateCurrentLoginIp={r.currentLoginIp}
                      initialCreditsModal={firstString(sp.credit_user) === r.username ? firstString(sp.credit_modal) : undefined}
                      staffPortal="reseller"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1 text-xs sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-1.5">
          <nav
            className="flex shrink-0 flex-wrap items-center justify-center gap-1 sm:flex-nowrap sm:justify-start"
            aria-label="Dealers list pages"
          >
            <Link
              href={dealersListPath({ ...listQuery, p: currentPage - 1 })}
              aria-disabled={currentPage <= 1}
              aria-label="Previous page"
              prefetch={false}
              className={cn(
                managersStaffPageBtnBaseClass,
                "font-medium",
                currentPage <= 1
                  ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                  : "border-border/70 hover:bg-muted/50",
              )}
            >
              Prev
            </Link>
            {buildManagersStaffPaginationItems(totalPages, currentPage).map((item, i) =>
              item === "ellipsis" ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <Link
                  key={item}
                  href={dealersListPath({ ...listQuery, p: item })}
                  prefetch={false}
                  aria-current={item === currentPage ? "page" : undefined}
                  className={cn(
                    managersStaffPageBtnBaseClass,
                    item === currentPage
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                      : "border-border/70 hover:bg-muted/50",
                  )}
                >
                  {item}
                </Link>
              ),
            )}
            <Link
              href={dealersListPath({ ...listQuery, p: currentPage + 1 })}
              aria-disabled={currentPage >= totalPages}
              aria-label="Next page"
              prefetch={false}
              className={cn(
                managersStaffPageBtnBaseClass,
                "font-medium",
                currentPage >= totalPages
                  ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                  : "border-border/70 hover:bg-muted/50",
              )}
            >
              Next
            </Link>
          </nav>
          <p className="shrink-0 text-center text-muted-foreground sm:text-right">
            {total === 0
              ? "No dealers"
              : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total}`}
          </p>
        </div>
      </div>
    </div>
  );
}
