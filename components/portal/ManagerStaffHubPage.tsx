import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, CornerUpLeft, Settings2 } from "lucide-react";
import { AdminAddStaffModal } from "@/components/admin/AdminAddStaffModal";
import type { FlashToastItem } from "@/components/FlashToasts";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { ManagersFiltersBar } from "@/components/admin/ManagersFiltersBar";
import { ManagersColumnSettings } from "@/components/admin/ManagersColumnSettings";
import { managersToolbarIconButtonClass, managersToolbarPrimaryButtonClass } from "@/components/admin/managers-toolbar-icon-button";
import { AdminListModalTrigger } from "@/components/admin/AdminListModalTrigger";
import { AdminStaffEditModalTrigger } from "@/components/admin/AdminStaffEditModalTrigger";
import { AdminUsersListModalTrigger } from "@/components/admin/AdminUsersListModalTrigger";
import { InlineEditableStaffCell } from "@/components/admin/InlineEditableStaffCell";
import { StaffHubKpiCollapsible } from "@/components/admin/StaffHubKpiCollapsible";
import { StaffListTableFooterBar } from "@/components/admin/StaffListTableFooterBar";
import { StaffListMobileColsBootstrap } from "@/components/admin/StaffListMobileColsBootstrap";
import { StaffHubStateCell, StaffHubStatusCell, StaffHubTypeCell } from "@/components/admin/staffHubResponsiveCells";
import { StaffHubExpandableRow } from "@/components/admin/StaffHubExpandableRow";
import { StaffHubRowDetailsPanel } from "@/components/admin/StaffHubRowDetailsPanel";
import { portalStaffHubRowForDetails } from "@/components/admin/staffHubBuildRowDetails";
import {
  STAFF_HUB_TABLE_CLASS,
  STAFF_TABLE_MOBILE_TH_LABEL,
  staffHubActionsHeaderCell,
  staffHubDataCell,
  staffHubHeaderCell,
} from "@/components/admin/staffHubTableUi";
import { StaffHubTableScrollShell } from "@/components/admin/StaffHubTableScrollShell";
import { AdminResellerRowActions } from "@/components/admin/AdminResellerRowActions";
import { AdminDealerRowActions } from "@/components/admin/AdminDealerRowActions";
import { adminStaffCreateSuccessFlashItems, adminStaffPasswordResetFlashItems } from "@/lib/adminInlineFlashToasts";
import { formatHierarchySelectLabel } from "@/lib/formatHierarchySelectLabel";
import { getCreditBalance } from "@/lib/repos/billing";
import type { ManagerPortalDealerRow, ManagerPortalResellerRow } from "@/lib/repos/managerPortal";
import { listResellersOwnedByManager } from "@/lib/repos/managerPortal";
import { managerDealerNewFlashItems, managerResellerNewFlashItems } from "@/lib/urlFlashToasts";
import {
  getManagerStaffTypeCounts,
  listDealersPagedForManager,
  listManagerStaffHubPaged,
  listResellersPagedForManager,
  type ManagerStaffTypeCounts,
} from "@/lib/repos/staffListPaged";
import { cn } from "@/lib/cn";
import { dataTableZebraRowClass } from "@/lib/ui/dataTableSticky";
import { parseStaffListColsFromSearchParam } from "@/lib/adminStaffListColumns";
import { clampAdminStaffListPageSize, isAdminStaffListPageSize } from "@/lib/adminStaffListPageSize";
import { staffInlineStatusValue } from "@/lib/staffInlineStatus";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";

type SortKey =
  | "name"
  | "username"
  | "credits"
  | "dealerCount"
  | "parentReseller"
  | "status"
  | "state"
  | "type"
  | "activeUsers"
  | "expiredUsers"
  | "totalUsers";

type SortDir = "asc" | "desc";

const DEFAULT_STAFF_PAGE_SIZE = 25;
const CLIENT_BULK_PAGE_SIZE = 5000;
const LIST_PATH = "/manager/resellers";

function firstString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function managerListPath(sp: {
  q?: string;
  p?: number;
  ps?: number;
  type?: string;
  status?: string;
  sort?: SortKey;
  dir?: SortDir;
  cols?: string;
  quick?: string;
  bq?: string;
  bs?: string;
}) {
  const params = new URLSearchParams();
  const q = sp.q?.trim();
  if (q) params.set("q", q);
  if (sp.ps && isAdminStaffListPageSize(sp.ps)) params.set("ps", String(sp.ps));
  if (sp.type && ["reseller", "dealer"].includes(sp.type)) params.set("type", sp.type);
  if (sp.status && ["active", "inactive"].includes(sp.status)) params.set("status", sp.status);
  if (sp.sort) params.set("sort", sp.sort);
  if (sp.dir) params.set("dir", sp.dir);
  if (sp.cols) params.set("cols", sp.cols);
  if (sp.quick === "1") params.set("quick", "1");
  const backQ = sp.bq?.trim();
  if (backQ) params.set("bq", backQ);
  if (sp.bs && ["active", "inactive"].includes(sp.bs)) params.set("bs", sp.bs);
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

function parseBillingDateTime(raw: string): Date | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "—" || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function formatStateLastSeen(raw: string): string {
  const d = parseBillingDateTime(raw);
  if (!d) return "Never seen";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function pickDbStateDate(currentRaw: string, lastRaw: string): Date | null {
  const current = parseBillingDateTime(currentRaw);
  const last = parseBillingDateTime(lastRaw);
  if (current && last) return current.getTime() >= last.getTime() ? current : last;
  return current ?? last;
}

const STAFF_TYPE_ORDER = { RESELLER: 0, DEALER: 1 } as const;

function compareStaffRows(
  a: { rowType: keyof typeof STAFF_TYPE_ORDER; username: string },
  b: { rowType: keyof typeof STAFF_TYPE_ORDER; username: string },
) {
  const ta = STAFF_TYPE_ORDER[a.rowType];
  const tb = STAFF_TYPE_ORDER[b.rowType];
  if (ta !== tb) return ta - tb;
  return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
}

const COLUMN_IDS = [
  "name",
  "username",
  "credits",
  "dealerCount",
  "parentReseller",
  "status",
  "state",
  "type",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
] as const;

type ColumnId = (typeof COLUMN_IDS)[number];

const COLUMN_LABELS: Record<ColumnId, string> = {
  name: "Name",
  username: "Username",
  credits: "Credits",
  dealerCount: "DLR",
  parentReseller: "Parent",
  status: "Status",
  state: "State",
  type: "Type",
  activeUsers: "Active",
  expiredUsers: "Expired",
  totalUsers: "Total",
};

const SORT_KEYS: readonly SortKey[] = [
  "name",
  "username",
  "credits",
  "dealerCount",
  "parentReseller",
  "status",
  "state",
  "type",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
];

function staffHierarchyBranchCount(r: { rowType: keyof typeof STAFF_TYPE_ORDER; dealerCount: number }) {
  if (r.rowType === "RESELLER") return r.dealerCount;
  return 0;
}

function compareBySort(
  a: {
    rowType: keyof typeof STAFF_TYPE_ORDER;
    username: string;
    name: string;
    credits: number;
    dealerCount: number;
    parentReseller: string;
    status: string;
    stateCurrentLogin: string;
    stateLastLogin: string;
    activeUsers: number;
    expiredUsers: number;
    totalUsers: number;
  },
  b: {
    rowType: keyof typeof STAFF_TYPE_ORDER;
    username: string;
    name: string;
    credits: number;
    dealerCount: number;
    parentReseller: string;
    status: string;
    stateCurrentLogin: string;
    stateLastLogin: string;
    activeUsers: number;
    expiredUsers: number;
    totalUsers: number;
  },
  sortBy: SortKey,
  sortDir: SortDir,
) {
  const dir = sortDir === "asc" ? 1 : -1;
  const txt = (x: string, y: string) => x.localeCompare(y, undefined, { sensitivity: "base" });
  const num = (x: number, y: number) => x - y;
  const date = (x: Date | null, y: Date | null) => (x?.getTime() ?? 0) - (y?.getTime() ?? 0);

  let out = 0;
  switch (sortBy) {
    case "name":
      out = txt(a.name || "", b.name || "");
      break;
    case "username":
      out = txt(a.username, b.username);
      break;
    case "credits":
      out = num(a.credits, b.credits);
      break;
    case "dealerCount":
      out = num(staffHierarchyBranchCount(a), staffHierarchyBranchCount(b));
      break;
    case "parentReseller":
      out = txt(a.parentReseller || "", b.parentReseller || "");
      break;
    case "status":
      out = txt(a.status, b.status);
      break;
    case "state":
      out = date(
        pickDbStateDate(a.stateCurrentLogin, a.stateLastLogin),
        pickDbStateDate(b.stateCurrentLogin, b.stateLastLogin),
      );
      break;
    case "type":
      out = num(STAFF_TYPE_ORDER[a.rowType], STAFF_TYPE_ORDER[b.rowType]);
      break;
    case "activeUsers":
      out = num(a.activeUsers, b.activeUsers);
      break;
    case "expiredUsers":
      out = num(a.expiredUsers, b.expiredUsers);
      break;
    case "totalUsers":
      out = num(a.totalUsers, b.totalUsers);
      break;
  }
  if (out !== 0) return out * dir;
  return compareStaffRows(a, b);
}

function pagedStatusFilter(status: string): "" | "active" | "inactive" {
  return status === "active" || status === "inactive" ? status : "";
}

function mapResellerHubSort(sort: SortKey): string {
  switch (sort) {
    case "name":
      return "name";
    case "username":
      return "username";
    case "credits":
      return "credits";
    case "dealerCount":
      return "dealerCount";
    case "status":
      return "status";
    case "totalUsers":
    case "activeUsers":
      return "userCount";
    default:
      return "username";
  }
}

function mapDealerHubSort(sort: SortKey): string {
  switch (sort) {
    case "name":
      return "name";
    case "username":
      return "username";
    case "status":
      return "status";
    case "parentReseller":
      return "reseller";
    default:
      return "username";
  }
}

function resellerListFlashes(sp: Record<string, string | string[] | undefined>): FlashToastItem[] {
  const ok = firstString(sp.ok);
  const err = firstString(sp.error);
  const items: FlashToastItem[] = [];
  if (ok === "created") {
    items.push({
      type: "success",
      message: "Reseller created",
      description: "They can sign in with the username and password you set.",
    });
  }
  if (ok === "deleted") {
    items.push({ type: "success", message: "Reseller deleted" });
  }
  if (err === "forbidden") {
    items.push({ type: "error", message: "You do not have access to that action." });
  }
  if (err === "missing") {
    items.push({ type: "error", message: "Required fields were missing." });
  }
  if (err === "delete") {
    items.push({ type: "error", message: "This reseller could not be deleted (still has dealers or subscribers)." });
  }
  return items;
}

function dealerListFlashes(sp: Record<string, string | string[] | undefined>): FlashToastItem[] {
  const ok = firstString(sp.ok);
  const err = firstString(sp.error);
  const items: FlashToastItem[] = [];
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
  if (ok === "status_activate") {
    items.push({ type: "success", message: "Dealer activated" });
  }
  if (ok === "status_block") {
    items.push({ type: "success", message: "Dealer suspended" });
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
  if (err === "db") {
    items.push({ type: "error", message: "That update could not be applied." });
  }
  return items;
}

export async function ManagerStaffHubPage({
  managerUsername,
  searchParams: sp,
}: {
  managerUsername: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qRaw = (firstString(sp.q) ?? "").trim().toLowerCase();
  const typeFilterRaw = (firstString(sp.type) ?? "").trim().toLowerCase();
  const statusFilterRaw = (firstString(sp.status) ?? "").trim().toLowerCase();
  const sortRaw = (firstString(sp.sort) ?? "").trim();
  const dirRaw = (firstString(sp.dir) ?? "").trim().toLowerCase();
  const typeFilter = typeFilterRaw === "reseller" || typeFilterRaw === "dealer" ? typeFilterRaw : "";
  const statusFilter = statusFilterRaw === "active" || statusFilterRaw === "inactive" ? statusFilterRaw : "";
  const drillbackParams: { bq?: string; bs?: "active" | "inactive" } = {};
  const bqStored = typeof sp.bq === "string" ? sp.bq.trim() : firstString(sp.bq)?.trim() ?? "";
  if (bqStored) drillbackParams.bq = bqStored;
  if (sp.bs === "active" || sp.bs === "inactive") drillbackParams.bs = sp.bs;
  const sortBy = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : ("type" as SortKey);
  const sortDir = dirRaw === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number.parseInt(firstString(sp.p) ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(firstString(sp.ps) ?? String(DEFAULT_STAFF_PAGE_SIZE), 10);
  const pageSize = clampAdminStaffListPageSize(
    Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_STAFF_PAGE_SIZE,
    DEFAULT_STAFF_PAGE_SIZE,
  );
  const visibleColumns = parseStaffListColsFromSearchParam(sp.cols, COLUMN_IDS);
  const quickFlag = sp.quick === "1" ? "1" : undefined;
  const mgr = managerUsername.trim();

  const [staffCounts, ownedResellers, managerCreditBalance] = await Promise.all([
    getManagerStaffTypeCounts(mgr).catch(() => null),
    listResellersOwnedByManager(mgr),
    getCreditBalance(mgr).catch(() => 0),
  ]);
  const addStaffResellerOptions = ownedResellers.map((r) => ({
    value: r.username,
    label: formatHierarchySelectLabel(r.username, r.name),
  }));

  const dealerCountLabel = "DLR";
  const columnLabels: Record<ColumnId, string> = {
    ...COLUMN_LABELS,
    dealerCount: dealerCountLabel,
    parentReseller: typeFilter === "reseller" ? "Manager" : "Parent",
  };
  const tableColumns = new Set<ColumnId>(visibleColumns);
  if (typeFilter === "dealer") {
    tableColumns.delete("dealerCount");
  }
  const tableColumnIds = COLUMN_IDS.filter((id) => tableColumns.has(id));
  const columnSettingsLabels: Record<string, string> =
    typeFilter === "dealer"
      ? Object.fromEntries(Object.entries(columnLabels).filter(([id]) => id !== "dealerCount"))
      : columnLabels;

  const pagedStatus = pagedStatusFilter(statusFilter);
  let useServerPaging = false;
  let serverPagedTotal = 0;
  let resellers: ManagerPortalResellerRow[] = [];
  let dealers: ManagerPortalDealerRow[] = [];
  const hubServerPaging = !typeFilter && (sortBy === "type" || !!qRaw);

  if (typeFilter === "reseller") {
    useServerPaging = true;
    const paged = await listResellersPagedForManager({
      managerUsername: mgr,
      search: (firstString(sp.q) ?? "").trim() || undefined,
      status: pagedStatus || undefined,
      page,
      pageSize,
      sort: mapResellerHubSort(sortBy),
      dir: sortDir,
    });
    resellers = paged.rows;
    dealers = [];
    serverPagedTotal = paged.total;
  } else if (typeFilter === "dealer") {
    useServerPaging = true;
    const paged = await listDealersPagedForManager({
      managerUsername: mgr,
      search: (firstString(sp.q) ?? "").trim() || undefined,
      status: pagedStatus || undefined,
      page,
      pageSize,
      sort: mapDealerHubSort(sortBy),
      dir: sortDir,
    });
    resellers = [];
    dealers = paged.rows;
    serverPagedTotal = paged.total;
  } else if (hubServerPaging) {
    useServerPaging = true;
    const hub = await listManagerStaffHubPaged({
      managerUsername: mgr,
      page,
      pageSize,
      search: (firstString(sp.q) ?? "").trim() || undefined,
      status: pagedStatus || undefined,
      dir: sortDir,
    });
    resellers = hub.resellers;
    dealers = hub.dealers;
    serverPagedTotal = hub.total;
  } else {
    const [rBulk, dBulk] = await Promise.all([
      listResellersPagedForManager({
        managerUsername: mgr,
        status: pagedStatus || undefined,
        page: 1,
        pageSize: CLIENT_BULK_PAGE_SIZE,
        sort: "username",
        dir: "asc",
      }),
      listDealersPagedForManager({
        managerUsername: mgr,
        status: pagedStatus || undefined,
        page: 1,
        pageSize: CLIENT_BULK_PAGE_SIZE,
        sort: "username",
        dir: "asc",
      }),
    ]);
    resellers = rBulk.rows;
    dealers = dBulk.rows;
  }

  const includeResellers = !typeFilter || typeFilter === "reseller";
  const includeDealers = !typeFilter || typeFilter === "dealer";

  const all = [
    ...(includeResellers
      ? resellers.map((r) => ({
          rowType: "RESELLER" as const,
          username: r.username,
          stateCurrentLogin: r.currentLoginTime,
          stateLastLogin: r.lastLoginTime,
          lastLoginIp: r.lastLoginIp,
          currentLoginIp: r.currentLoginIp,
          name: r.name,
          credits: r.credits,
          dealerCount: r.dealerCount,
          parentReseller: mgr || "—",
          status: r.status,
          activeUsers: r.activeUserCount,
          expiredUsers: r.expiredUserCount,
          totalUsers: r.userCount,
          canDelete: r.canDelete,
          resellerUsername: r.username,
        }))
      : []),
    ...(includeDealers
      ? dealers.map((d) => ({
          rowType: "DEALER" as const,
          username: d.username,
          stateCurrentLogin: d.currentLoginTime,
          stateLastLogin: d.lastLoginTime,
          lastLoginIp: d.lastLoginIp,
          currentLoginIp: d.currentLoginIp,
          name: d.name,
          credits: d.credits,
          dealerCount: 0,
          parentReseller: d.resellerUsername || "—",
          status: d.status,
          activeUsers: d.activeUserCount,
          expiredUsers: d.expiredUserCount,
          totalUsers: d.userCount,
          canDelete: d.canDelete,
          resellerUsername: d.resellerUsername,
        }))
      : []),
  ];

  const searchFilteredRows =
    useServerPaging || !qRaw
      ? all
      : all.filter((r) => {
          const statusLabel = r.status === "A" ? "active" : "inactive";
          const extra = r.rowType === "DEALER" ? [r.resellerUsername] : [];
          const hay = [
            r.username,
            formatStateLastSeen(r.stateCurrentLogin),
            formatStateLastSeen(r.stateLastLogin),
            r.name,
            r.rowType.toLowerCase(),
            String(r.dealerCount),
            r.parentReseller,
            String(r.activeUsers),
            String(r.expiredUsers),
            String(r.totalUsers),
            String(r.credits),
            statusLabel,
            ...extra,
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(qRaw);
        });

  const filteredRows = useServerPaging
    ? searchFilteredRows
    : searchFilteredRows.filter((r) => {
        if (typeFilter && r.rowType.toLowerCase() !== typeFilter) return false;
        if (statusFilter) {
          const rowStatus = r.status === "A" ? "active" : "inactive";
          if (rowStatus !== statusFilter) return false;
        }
        return true;
      });

  const filteredRowsSorted = useServerPaging
    ? filteredRows
    : [...filteredRows].sort((a, b) => compareBySort(a, b, sortBy, sortDir));

  const listTotal = useServerPaging ? serverPagedTotal : filteredRowsSorted.length;
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = useServerPaging ? filteredRowsSorted : filteredRowsSorted.slice(start, start + pageSize);

  const resellerActive = staffCounts?.resellers.active ?? resellers.filter((r) => r.status === "A").length;
  const dealerActive = staffCounts?.dealers.active ?? dealers.filter((d) => d.status === "A").length;
  const resellerTotal = staffCounts?.resellers.total ?? 0;
  const dealerTotal = staffCounts?.dealers.total ?? 0;
  const resellerInactive = Math.max(0, resellerTotal - resellerActive);
  const dealerInactive = Math.max(0, dealerTotal - dealerActive);
  const totalStaff = resellerTotal + dealerTotal;

  const colsQuery = visibleColumns.size === COLUMN_IDS.length ? undefined : Array.from(visibleColumns).join(",");
  const redirectPath = managerListPath({
    q: firstString(sp.q),
    p: currentPage,
    ps: pageSize,
    type: typeFilter,
    status: statusFilter,
    sort: sortBy,
    dir: sortDir,
    cols: colsQuery,
    quick: quickFlag,
    ...drillbackParams,
  });
  const staffNew = firstString(sp.staff_new);
  const createFlashSp = {
    error: firstString(sp.error),
    bal: firstString(sp.bal),
    req: firstString(sp.req),
  };
  const modalCreateErrors =
    staffNew === "reseller"
      ? managerResellerNewFlashItems(createFlashSp, formatInt(managerCreditBalance))
      : staffNew === "dealer"
        ? managerDealerNewFlashItems(createFlashSp)
        : [];
  const listFlashes = [
    ...modalCreateErrors,
    ...adminStaffCreateSuccessFlashItems({ ok: firstString(sp.ok) }),
    ...adminStaffPasswordResetFlashItems(sp),
    ...resellerListFlashes(sp),
    ...dealerListFlashes(sp),
  ].filter((item, idx, arr) => arr.findIndex((x) => x.type === item.type && x.message === item.message) === idx);

  const staffCell = (col: ColumnId, extra?: string) => staffHubDataCell(col, extra);

  const sortableHeader = (key: SortKey, label: string, thClassName?: string) => {
    const mobileLabel = STAFF_TABLE_MOBILE_TH_LABEL[key];
    return (
      <th key={key} className={staffHubHeaderCell(key, thClassName)}>
        <Link
          href={managerListPath({
            q: firstString(sp.q),
            ps: pageSize,
            type: typeFilter,
            status: statusFilter,
            sort: key,
            dir: sortBy === key && sortDir === "asc" ? "desc" : "asc",
            cols: colsQuery,
            quick: quickFlag,
            ...drillbackParams,
          })}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground",
            thClassName?.includes("text-right") ? "justify-end" : "",
            thClassName?.includes("text-center") ? "justify-center" : "",
          )}
        >
          {mobileLabel ? (
            <>
              <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
          {sortBy === key ? (
            <ChevronDown className={cn("h-3.5 w-3.5", sortDir === "asc" ? "rotate-180" : "")} aria-hidden />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
          )}
        </Link>
      </th>
    );
  };

  const staffFilterHref = (opts: { type?: "reseller" | "dealer"; clearAll?: boolean }) => {
    if (opts.clearAll) {
      return managerListPath({
        q: firstString(sp.q),
        p: 1,
        ps: pageSize,
        status: statusFilter || undefined,
        sort: sortBy,
        dir: sortDir,
        cols: colsQuery,
      });
    }
    return managerListPath({
      q: firstString(sp.q),
      p: 1,
      ps: pageSize,
      type: opts.type,
      sort: sortBy,
      dir: sortDir,
      cols: colsQuery,
      quick: quickFlag,
      ...drillbackParams,
    });
  };

  const quickReturnHref =
    quickFlag === "1" && typeFilter === "dealer"
      ? (() => {
          const restoredListQ = typeof sp.bq === "string" ? sp.bq.trim() : firstString(sp.bq)?.trim() ?? "";
          const resellerListQ = restoredListQ || undefined;
          const resellerQuick = restoredListQ ? "1" : undefined;
          if (!restoredListQ) {
            return managerListPath({
              p: 1,
              ps: pageSize,
              sort: sortBy,
              dir: sortDir,
              cols: colsQuery,
            });
          }
          return managerListPath({
            q: resellerListQ,
            p: 1,
            ps: pageSize,
            type: "reseller",
            status: (sp.bs === "active" || sp.bs === "inactive" ? sp.bs : statusFilter) || undefined,
            sort: sortBy,
            dir: sortDir,
            cols: colsQuery,
            quick: resellerQuick,
          });
        })()
      : quickFlag === "1" && typeFilter === "reseller"
        ? managerListPath({
            q: sp.bq !== undefined && sp.bq !== null ? String(firstString(sp.bq) ?? "").trim() || undefined : undefined,
            p: 1,
            ps: pageSize,
            status: (sp.bs === "active" || sp.bs === "inactive" ? sp.bs : statusFilter) || undefined,
            sort: sortBy,
            dir: sortDir,
            cols: colsQuery,
          })
        : staffFilterHref({ clearAll: true });

  const staffHubFilterHrefs = {
    all: staffFilterHref({ clearAll: true }),
    manager: staffFilterHref({ clearAll: true }),
    reseller: staffFilterHref({ type: "reseller" }),
    dealer: staffFilterHref({ type: "dealer" }),
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      

      <div className="shrink-0 px-3 pt-3 sm:px-5 sm:pt-4">
      <StaffHubKpiCollapsible
        totalStaff={totalStaff}
        managerTotal={0}
        resellerTotal={resellerTotal}
        dealerTotal={dealerTotal}
        managerActive={0}
        managerInactive={0}
        resellerActive={resellerActive}
        resellerInactive={resellerInactive}
        dealerActive={dealerActive}
        dealerInactive={dealerInactive}
        filterHrefs={staffHubFilterHrefs}
        activeType={typeFilter}
        hideManagers
      />
      </div>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
        <StaffListMobileColsBootstrap />
        <div className="shrink-0 border-b border-border/50 px-2 py-1.5 sm:px-2">
          <ManagersFiltersBar
            listPath={LIST_PATH}
            allowedTypes={["reseller", "dealer"]}
            q={firstString(sp.q)}
            type={typeFilter}
            status={statusFilter}
            ps={pageSize}
            sort={sortBy}
            dir={sortDir}
            cols={colsQuery}
            quick={quickFlag}
            bq={drillbackParams.bq}
            bs={drillbackParams.bs}
            toolbarActions={
              <>
                {sp.quick === "1" ? (
                  <Link
                    href={quickReturnHref}
                    className={managersToolbarIconButtonClass}
                    title="Return to full staff list"
                    aria-label="Return to full staff list"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
                  </Link>
                ) : null}
                <AdminAddStaffModal
                  portal="manager"
                  resellerOptions={addStaffResellerOptions}
                  triggerLabel="Add staff"
                  triggerClassName={managersToolbarPrimaryButtonClass}
                />
                <ManagersColumnSettings
                  selectedColumns={Array.from(visibleColumns)}
                  labels={columnSettingsLabels}
                  currentQuery={{
                    q: firstString(sp.q),
                    p: currentPage,
                    ps: pageSize,
                    type: typeFilter,
                    status: statusFilter,
                    sort: sortBy,
                    dir: sortDir,
                    quick: quickFlag,
                    bq: drillbackParams.bq,
                    bs: drillbackParams.bs,
                  }}
                />
              </>
            }
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl60 bg-card/80 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <StaffHubTableScrollShell columnIds={tableColumnIds}>
          <table className={STAFF_HUB_TABLE_CLASS}>
            <thead>
              <tr>
                {tableColumnIds.map((col) =>
                  sortableHeader(col, columnLabels[col], "py-1 text-center"),
                )}
                <th className={staffHubActionsHeaderCell("py-1 text-center")}>
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
                  <td colSpan={tableColumnIds.length + 1} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {qRaw ? "No staff rows match your search" : "No staff rows yet"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {qRaw
                        ? "Clear the search box to see the full list, or try another keyword."
                        : "Create staff with Add reseller or Add dealer when you are ready to onboard."}
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const rowActions =
                  r.rowType === "RESELLER" ? (
                    <AdminResellerRowActions
                      staffPortal="manager"
                      username={r.username}
                      displayName={r.name || r.username}
                      canDelete={r.canDelete}
                      redirectPath={redirectPath}
                      status={r.status}
                      managerLogin={mgr}
                      credits={r.credits}
                      dealerCount={r.dealerCount}
                      activeUsers={r.activeUsers}
                      expiredUsers={r.expiredUsers}
                      totalUsers={r.totalUsers}
                      stateCurrentLogin={r.stateCurrentLogin}
                      stateLastLogin={r.stateLastLogin}
                      stateLastLoginIp={r.lastLoginIp}
                      stateCurrentLoginIp={r.currentLoginIp}
                      initialCreditsModal={firstString(sp.credit_user) === r.username ? firstString(sp.credit_modal) : undefined}
                      viewDealersStaffHref={managerListPath({
                        q: r.username,
                        p: 1,
                        ps: pageSize,
                        type: "dealer",
                        status: statusFilter,
                        sort: sortBy,
                        dir: sortDir,
                        cols: colsQuery,
                        quick: quickFlag ?? "1",
                        bq: firstString(sp.q),
                        ...(statusFilter === "active" || statusFilter === "inactive" ? { bs: statusFilter } : {}),
                      })}
                    />
                  ) : (
                    <AdminDealerRowActions
                      staffPortal="manager"
                      username={r.username}
                      displayName={r.name || r.username}
                      canDelete={r.canDelete}
                      redirectPath={redirectPath}
                      status={r.status}
                      managerLogin={mgr}
                      resellerLogin={r.resellerUsername}
                      credits={r.credits}
                      activeUsers={r.activeUsers}
                      expiredUsers={r.expiredUsers}
                      totalUsers={r.totalUsers}
                      stateCurrentLogin={r.stateCurrentLogin}
                      stateLastLogin={r.stateLastLogin}
                      stateLastLoginIp={r.lastLoginIp}
                      stateCurrentLoginIp={r.currentLoginIp}
                      initialCreditsModal={firstString(sp.credit_user) === r.username ? firstString(sp.credit_modal) : undefined}
                    />
                  );
                const detailRow = portalStaffHubRowForDetails({
                  rowType: r.rowType,
                  username: r.username,
                  name: r.name,
                  status: r.status,
                  credits: r.credits,
                  dealerCount: r.dealerCount,
                  parentReseller: r.parentReseller,
                  activeUsers: r.activeUsers,
                  expiredUsers: r.expiredUsers,
                  totalUsers: r.totalUsers,
                  stateCurrentLogin: r.stateCurrentLogin,
                  stateLastLogin: r.stateLastLogin,
                });
                return (
                  <StaffHubExpandableRow
                    key={`${r.rowType}:${r.username}`}
                    colSpan={tableColumnIds.length + 1}
                    tableColumnIds={tableColumnIds}
                    expandPersistId={`${r.rowType}:${r.username}`}
                    rowClassName={dataTableZebraRowClass}
                    actions={rowActions}
                    details={
                      <StaffHubRowDetailsPanel
                        row={detailRow}
                        columnLabels={columnLabels}
                        tableColumnIds={tableColumnIds}
                        cellCtx={{
                          portal: "manager",
                          parentModalType:
                            r.rowType === "DEALER" && r.resellerUsername ? "RESELLER" : null,
                          parentModalUsername: r.rowType === "DEALER" ? r.resellerUsername : "",
                          dealerParentResellerUsername:
                            r.rowType === "DEALER" ? r.resellerUsername : undefined,
                          inlineApiPath: "/api/manager/staff-inline",
                          editorApiBase: "/api/manager",
                          branchesApiBase: "/api/manager",
                          subscribersPortal: "manager",
                        }}
                      />
                    }
                  >
                    {tableColumnIds.map((col) => {
                      switch (col) {
                        case "name":
                          return (
                            <td key={col} className={staffCell(col, "text-center font-semibold")}>
                              <InlineEditableStaffCell
                                rowType={r.rowType}
                                username={r.username}
                                field="name"
                                value={r.name || ""}
                                inlineApiPath="/api/manager/staff-inline"
                              />
                            </td>
                          );
                        case "username":
                          return (
                            <td key={col} className={staffCell(col, "text-center")}>
                              <AdminStaffEditModalTrigger
                                rowType={r.rowType}
                                username={r.username}
                                editorApiBase="/api/manager"
                                label={
                                  <span className="font-medium text-foreground hover:text-primary">{r.username}</span>
                                }
                                className="inline cursor-pointer bg-transparent p-0 text-left"
                              />
                            </td>
                          );
                        case "credits":
                          return (
                            <td key={col} className={staffCell(col, "text-center tabular-nums text-muted-foreground")}>
                              {formatInt(r.credits)}
                            </td>
                          );
                        case "dealerCount":
                          return (
                            <td key={col} className={staffCell(col, "text-center tabular-nums text-muted-foreground")}>
                              {r.rowType === "RESELLER" && staffHierarchyBranchCount(r) > 0 ? (
                                <AdminListModalTrigger
                                  rowType="RESELLER"
                                  username={r.username}
                                  branchesApiBase="/api/manager"
                                  className="inline rounded-none border-0 bg-transparent p-0 font-medium text-foreground no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                  label={formatInt(staffHierarchyBranchCount(r))}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          );
                        case "parentReseller":
                          return (
                            <td key={col} className={staffCell(col, "text-center text-muted-foreground")}>
                              {r.rowType === "DEALER" && r.resellerUsername ? (
                                <AdminStaffEditModalTrigger
                                  rowType="RESELLER"
                                  username={r.resellerUsername}
                                  editorApiBase="/api/manager"
                                  label={
                                    <span className="font-medium text-foreground hover:text-primary">
                                      {r.parentReseller || "—"}
                                    </span>
                                  }
                                  className="inline cursor-pointer bg-transparent p-0 text-center"
                                />
                              ) : (
                                <span className="text-foreground">{r.parentReseller || "—"}</span>
                              )}
                            </td>
                          );
                        case "status":
                          return (
                            <td key={col} className={staffCell(col, "text-center")}>
                              <StaffHubStatusCell
                                rowType={r.rowType}
                                username={r.username}
                                value={staffInlineStatusValue(r.status)}
                                inlineApiPath="/api/manager/staff-inline"
                              />
                            </td>
                          );
                        case "state":
                          return (
                            <td key={col} className={staffCell(col, "text-center text-muted-foreground")}>
                              <StaffHubStateCell
                                username={r.username}
                                dbCurrentLogin={r.stateCurrentLogin}
                                dbLastLogin={r.stateLastLogin}
                              />
                            </td>
                          );
                        case "type":
                          return (
                            <td key={col} className={staffCell(col, "text-center font-semibold")}>
                              <StaffHubTypeCell rowType={r.rowType} />
                            </td>
                          );
                        case "activeUsers":
                          return (
                            <td key={col} className={staffCell(col, "text-center tabular-nums font-medium text-emerald-700 dark:text-emerald-300")}>
                              {hasPositiveCount(r.activeUsers) ? (
                                <AdminUsersListModalTrigger
                                  rowType={r.rowType}
                                  username={r.username}
                                  displayName={r.name || r.username}
                                  status="active"
                                  subscribersPortal="manager"
                                  className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                  label={formatInt(r.activeUsers)}
                                />
                              ) : (
                                <span className="text-muted-foreground">{formatInt(r.activeUsers)}</span>
                              )}
                            </td>
                          );
                        case "expiredUsers":
                          return (
                            <td key={col} className={staffCell(col, "text-center tabular-nums font-medium text-orange-700 dark:text-orange-300")}>
                              {hasPositiveCount(r.expiredUsers) ? (
                                <AdminUsersListModalTrigger
                                  rowType={r.rowType}
                                  username={r.username}
                                  displayName={r.name || r.username}
                                  status="expired"
                                  subscribersPortal="manager"
                                  className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                  label={formatInt(r.expiredUsers)}
                                />
                              ) : (
                                <span className="text-muted-foreground">{formatInt(r.expiredUsers)}</span>
                              )}
                            </td>
                          );
                        case "totalUsers":
                          return (
                            <td key={col} className={staffCell(col, "text-center tabular-nums font-medium text-muted-foreground")}>
                              {hasPositiveCount(r.totalUsers) ? (
                                <AdminUsersListModalTrigger
                                  rowType={r.rowType}
                                  username={r.username}
                                  displayName={r.name || r.username}
                                  status=""
                                  subscribersPortal="manager"
                                  className="inline rounded-none border-0 bg-transparent p-0 font-medium text-foreground no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                  label={formatInt(r.totalUsers)}
                                />
                              ) : (
                                <span>{formatInt(r.totalUsers)}</span>
                              )}
                            </td>
                          );
                        default:
                          return null;
                      }
                    })}
                  </StaffHubExpandableRow>
                );
              })}
            </tbody>
          </table>
          </StaffHubTableScrollShell>
        <StaffListTableFooterBar
          tip="Resellers and dealers under your manager account."
          pagination={
          <nav
            className="flex shrink-0 flex-nowrap items-center gap-0.5 sm:gap-1"
            aria-label="Staff list pages"
          >
            <Link
              href={managerListPath({
                q: firstString(sp.q),
                p: currentPage - 1,
                ps: pageSize,
                type: typeFilter,
                status: statusFilter,
                sort: sortBy,
                dir: sortDir,
                cols: colsQuery,
                quick: quickFlag,
                ...drillbackParams,
              })}
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
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {buildManagersStaffPaginationItems(totalPages, currentPage).map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="inline-flex min-w-6 select-none items-center justify-center px-0.5 text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : item === currentPage ? (
                <span
                  key={item}
                  aria-current="page"
                  className={cn(
                    managersStaffPageBtnBaseClass,
                    "cursor-default border-primary/45 bg-primary/12 font-semibold text-primary",
                  )}
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={managerListPath({
                    q: firstString(sp.q),
                    p: item,
                    ps: pageSize,
                    type: typeFilter,
                    status: statusFilter,
                    sort: sortBy,
                    dir: sortDir,
                    cols: colsQuery,
                    quick: quickFlag,
                    ...drillbackParams,
                  })}
                  prefetch={false}
                  className={cn(managersStaffPageBtnBaseClass, "border-border/70 text-foreground hover:bg-muted/50")}
                >
                  {item}
                </Link>
              ),
            )}
            <form method="get" action={LIST_PATH} className="ml-0.5 inline-flex items-center gap-0.5">
              {firstString(sp.q) ? <input type="hidden" name="q" value={firstString(sp.q)} /> : null}
              {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
              {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
              <input type="hidden" name="sort" value={sortBy} />
              <input type="hidden" name="dir" value={sortDir} />
              <input type="hidden" name="ps" value={String(pageSize)} />
              {colsQuery ? <input type="hidden" name="cols" value={colsQuery} /> : null}
              {quickFlag ? <input type="hidden" name="quick" value={quickFlag} /> : null}
              {drillbackParams.bq ? <input type="hidden" name="bq" value={drillbackParams.bq} /> : null}
              {drillbackParams.bs ? <input type="hidden" name="bs" value={drillbackParams.bs} /> : null}
              <label htmlFor="mgr-staff-jump-page" className="sr-only">
                Go to page
              </label>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pg</span>
              <input
                id="mgr-staff-jump-page"
                name="p"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={currentPage}
                inputMode="numeric"
                className="h-7 w-11 appearance-none rounded-md border-x-1 border-border/70 bg-background px-1 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </form>
            <Link
              href={managerListPath({
                q: firstString(sp.q),
                p: currentPage + 1,
                ps: pageSize,
                type: typeFilter,
                status: statusFilter,
                sort: sortBy,
                dir: sortDir,
                cols: colsQuery,
                quick: quickFlag,
                ...drillbackParams,
              })}
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
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </nav>
          }
          summary={
            <>
              Showing <span className="font-medium text-foreground">{rows.length}</span> of{" "}
              <span className="font-medium text-foreground">{filteredRowsSorted.length}</span> filtered row
              {filteredRowsSorted.length === 1 ? "" : "s"} ({all.length} total staff)
              {qRaw ? ` for “${(firstString(sp.q) ?? "").trim()}”.` : "."}
            </>
          }
        />
        </div>
      </div>
    </div>
  );
}
