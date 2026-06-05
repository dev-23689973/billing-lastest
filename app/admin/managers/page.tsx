import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, CornerUpLeft, Settings2 } from "lucide-react";
import { getManagers, getResellers, getDealers } from "@/lib/data";
import type { AdminDealerListRow, AdminManagerListRow, AdminResellerListRow } from "@/lib/repos/billing";
import {
  toStaffHubTableRowFromDealer,
  toStaffHubTableRowFromManager,
  toStaffHubTableRowFromReseller,
  type StaffHubTableClientRow,
} from "@/lib/dto/staffList";
import {
  adminStaffHubUsesServerPaging,
  getAdminStaffTypeCounts,
  listAdminStaffHubPaged,
  listDealersPagedAdmin,
  listManagersPagedAdmin,
  listResellersPagedAdmin,
  listStaffHierarchySelectOptions,
  type AdminStaffHubOrderedKey,
  type AdminStaffTypeCounts,
  type StaffHierarchySelectOption,
} from "@/lib/repos/staffListPaged";
import { AdminManagerRowActions } from "@/components/admin/AdminManagerRowActions";
import { AdminResellerRowActions } from "@/components/admin/AdminResellerRowActions";
import { AdminDealerRowActions } from "@/components/admin/AdminDealerRowActions";
import { AdminAddStaffModal } from "@/components/admin/AdminAddStaffModal";
import { AdminStaffEditModalTrigger } from "@/components/admin/AdminStaffEditModalTrigger";
import { AdminListModalTrigger } from "@/components/admin/AdminListModalTrigger";
import { AdminUsersListModalTrigger } from "@/components/admin/AdminUsersListModalTrigger";
import { ManagersFiltersBar } from "@/components/admin/ManagersFiltersBar";
import { ManagersColumnSettings } from "@/components/admin/ManagersColumnSettings";
import {
  managersToolbarIconButtonClass,
  managersToolbarPrimaryButtonClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { InlineEditableStaffCell } from "@/components/admin/InlineEditableStaffCell";
import { StaffHubKpiCollapsible } from "@/components/admin/StaffHubKpiCollapsible";
import { StaffListTableFooterBar } from "@/components/admin/StaffListTableFooterBar";
import { cn } from "@/lib/cn";
import { dataTableZebraRowClass } from "@/lib/ui/dataTableSticky";
import { FlashToastsBoundary } from "@/components/FlashToasts";
import { adminStaffCreateSuccessFlashItems, adminStaffListFlashItems, adminStaffPasswordResetFlashItems } from "@/lib/adminInlineFlashToasts";
import { adminHierarchyNewMissingFlashItems } from "@/lib/urlFlashToasts";
import {
  parseStaffListColsFromSearchParam,
  staffListColsQueryFromSet,
  staffListOrderedVisibleColumns,
} from "@/lib/adminStaffListColumns";
import { clampAdminStaffListPageSize, isAdminStaffListPageSize } from "@/lib/adminStaffListPageSize";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";
import { formatHierarchySelectLabel } from "@/lib/formatHierarchySelectLabel";
import { StaffListMobileColsBootstrap } from "@/components/admin/StaffListMobileColsBootstrap";
import { StaffHubStateCell, StaffHubStatusCell, StaffHubTypeCell } from "@/components/admin/staffHubResponsiveCells";
import { StaffHubExpandableRow } from "@/components/admin/StaffHubExpandableRow";
import { StaffHubRowDetailsPanel } from "@/components/admin/StaffHubRowDetailsPanel";
import {
  STAFF_HUB_TABLE_CLASS,
  STAFF_TABLE_MOBILE_TH_LABEL,
  staffHubActionsHeaderCell,
  staffHubDataCell,
  staffHubHeaderCell,
} from "@/components/admin/staffHubTableUi";
import { StaffHubTableScrollShell } from "@/components/admin/StaffHubTableScrollShell";
import { formatStaffCreatedAtDisplay } from "@/lib/repos/billing";

type Props = {
  searchParams?: Promise<{
    ok?: string;
    error?: string;
    q?: string;
    p?: string;
    ps?: string;
    type?: string;
    status?: string;
    sort?: string;
    dir?: string;
    cols?: string | string[];
    staff_new?: string;
    credit_modal?: string;
    credit_user?: string;
    quick?: string;
    bq?: string;
    bs?: string;
    modal?: string;
  }>;
};

type SortKey =
  | "name"
  | "username"
  | "password"
  | "credits"
  | "dealerCount"
  | "parentReseller"
  | "createdAt"
  | "status"
  | "state"
  | "type"
  | "activeUsers"
  | "expiredUsers"
  | "totalUsers";

type SortDir = "asc" | "desc";

/** Rows per page when `ps` is missing or invalid in the URL. */
const DEFAULT_STAFF_PAGE_SIZE = 25;

function managersListPath(sp: {
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
  if (sp.type && ["manager", "reseller", "dealer"].includes(sp.type)) params.set("type", sp.type);
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
  return query ? `/admin/managers?${query}` : "/admin/managers";
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function staffSelectOptions(rows: StaffHierarchySelectOption[]) {
  return rows.map((r) => ({
    value: r.username,
    label: formatHierarchySelectLabel(r.username, r.name),
  }));
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

const STAFF_TYPE_ORDER = { MANAGER: 0, RESELLER: 1, DEALER: 2 } as const;

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
  "createdAt",
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
  dealerCount: "RSLR / DLR",
  parentReseller: "Parent",
  createdAt: "Created",
  status: "Status",
  state: "State",
  type: "Type",
  activeUsers: "Active",
  expiredUsers: "Expired",
  totalUsers: "Total",
};

const STAFF_TABLE_TH_CLASS: Partial<Record<ColumnId, string>> = {
  credits: "py-1 px-2 text-center",
  dealerCount: "py-1 px-2 text-center whitespace-nowrap",
  parentReseller: "py-1 px-2 text-center",
  createdAt: "py-1 px-2 text-center whitespace-nowrap",
};

const SORT_KEYS: readonly SortKey[] = [
  "name",
  "username",
  "password",
  "credits",
  "dealerCount",
  "parentReseller",
  "createdAt",
  "status",
  "state",
  "type",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
];

function staffHierarchyBranchCount(r: {
  rowType: keyof typeof STAFF_TYPE_ORDER;
  managerResellerCount?: number;
  dealerCount: number;
}) {
  if (r.rowType === "MANAGER") return r.managerResellerCount ?? 0;
  if (r.rowType === "RESELLER") return r.dealerCount;
  return 0;
}

function compareBySort(
  a: {
    rowType: keyof typeof STAFF_TYPE_ORDER;
    username: string;
    name: string;
    credits: number;
    managerResellerCount?: number;
    dealerCount: number;
    parentReseller: string;
    createdAt: string;
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
    managerResellerCount?: number;
    dealerCount: number;
    parentReseller: string;
    createdAt: string;
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
    case "createdAt":
      out = date(parseBillingDateTime(a.createdAt), parseBillingDateTime(b.createdAt));
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

function mapManagerHubSort(sort: SortKey): string {
  switch (sort) {
    case "name":
      return "name";
    case "username":
      return "username";
    case "status":
      return "status";
    default:
      return "username";
  }
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

export default async function ManagersPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const qRaw = (sp.q ?? "").trim().toLowerCase();
  const typeFilterRaw = (sp.type ?? "").trim().toLowerCase();
  const statusFilterRaw = (sp.status ?? "").trim().toLowerCase();
  const sortRaw = (sp.sort ?? "").trim();
  const dirRaw = (sp.dir ?? "").trim().toLowerCase();
  const typeFilter = typeFilterRaw === "manager" || typeFilterRaw === "reseller" || typeFilterRaw === "dealer" ? typeFilterRaw : "";
  const statusFilter = statusFilterRaw === "active" || statusFilterRaw === "inactive" ? statusFilterRaw : "";
  /** Preserved list state when drilling down (manager → reseller → dealer). */
  const drillbackParams: { bq?: string; bs?: "active" | "inactive" } = {};
  const bqStored = typeof sp.bq === "string" ? sp.bq.trim() : "";
  if (bqStored) drillbackParams.bq = bqStored;
  if (sp.bs === "active" || sp.bs === "inactive") drillbackParams.bs = sp.bs;
  const sortBy = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : ("type" as SortKey);
  const sortDir = dirRaw === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number.parseInt(sp.p ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(sp.ps ?? String(DEFAULT_STAFF_PAGE_SIZE), 10);
  const pageSize = clampAdminStaffListPageSize(Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_STAFF_PAGE_SIZE, DEFAULT_STAFF_PAGE_SIZE);
  const visibleColumns = parseStaffListColsFromSearchParam(sp.cols, COLUMN_IDS);
  const quickFlag = sp.quick === "1" ? "1" : undefined;
  const isListModal = sp.modal === "1";
  /** Full DB totals for KPI charts — never use current page row counts. */
  const staffCounts: AdminStaffTypeCounts | null = !isListModal
    ? await getAdminStaffTypeCounts().catch(() => null)
    : null;
  const dealerCountLabel =
    typeFilter === "dealer"
      ? "DLR"
      : typeFilter === "reseller"
        ? "DLR"
        : typeFilter === "manager"
          ? "RSLR"
          : "RSLR / DLR";
  const columnLabels: Record<ColumnId, string> = {
    ...COLUMN_LABELS,
    dealerCount: dealerCountLabel,
  };
  /** Role-specific table cleanup: hide columns that are meaningless for the current type filter. */
  const roleHiddenTableColumns: ColumnId[] =
    typeFilter === "manager" ? ["parentReseller"] : typeFilter === "dealer" ? ["dealerCount"] : [];
  const tableColumnIds = staffListOrderedVisibleColumns(visibleColumns, COLUMN_IDS, roleHiddenTableColumns);
  const selectedColumnIds = staffListOrderedVisibleColumns(visibleColumns, COLUMN_IDS);
  const columnSettingsLabels: Record<string, string> =
    typeFilter === "dealer"
      ? Object.fromEntries(Object.entries(columnLabels).filter(([id]) => id !== "dealerCount"))
      : typeFilter === "manager"
        ? Object.fromEntries(Object.entries(columnLabels).filter(([id]) => id !== "parentReseller"))
        : columnLabels;
  const pagedStatus = pagedStatusFilter(statusFilter);
  let useServerPaging = false;
  let serverPagedTotal = 0;
  let managers: AdminManagerListRow[];
  let resellers: AdminResellerListRow[];
  let dealers: AdminDealerListRow[];
  let hierarchySelectOptions: { managers: StaffHierarchySelectOption[]; resellers: StaffHierarchySelectOption[] } | null =
    null;
  /** All-types hub: SQL page — avoids loading every manager/reseller/dealer on remote DB. */
  const hubServerPaging = !typeFilter && adminStaffHubUsesServerPaging(sortBy, !!(sp.q ?? "").trim());
  let hubOrderedKeys: AdminStaffHubOrderedKey[] | null = null;

  if (typeFilter === "reseller") {
    useServerPaging = true;
    const paged = await listResellersPagedAdmin({
        search: (sp.q ?? "").trim() || undefined,
        status: pagedStatus || undefined,
        page,
        pageSize,
        sort: mapResellerHubSort(sortBy),
        dir: sortDir,
      });
    managers = [];
    resellers = paged.rows;
    dealers = [];
    serverPagedTotal = paged.total;
  } else if (typeFilter === "dealer") {
    useServerPaging = true;
    const [selectOpts, paged] = await Promise.all([
      listStaffHierarchySelectOptions(),
      listDealersPagedAdmin({
        search: (sp.q ?? "").trim() || undefined,
        status: pagedStatus || undefined,
        page,
        pageSize,
        sort: mapDealerHubSort(sortBy),
        dir: sortDir,
      }),
    ]);
    managers = [];
    hierarchySelectOptions = selectOpts;
    resellers = [];
    dealers = paged.rows;
    serverPagedTotal = paged.total;
  } else if (typeFilter === "manager") {
    useServerPaging = true;
    const [paged, selectOpts] = await Promise.all([
      listManagersPagedAdmin({
        search: (sp.q ?? "").trim() || undefined,
        status: pagedStatus || undefined,
        page,
        pageSize,
        sort: mapManagerHubSort(sortBy),
        dir: sortDir,
      }),
      listStaffHierarchySelectOptions(),
    ]);
    managers = paged.rows;
    hierarchySelectOptions = selectOpts;
    resellers = [];
    dealers = [];
    serverPagedTotal = paged.total;
  } else if (hubServerPaging) {
    useServerPaging = true;
    const [hub, selectOpts] = await Promise.all([
      listAdminStaffHubPaged({
        page,
        pageSize,
        search: (sp.q ?? "").trim() || undefined,
        status: pagedStatus || undefined,
        sort: sortBy,
        dir: sortDir,
      }),
      listStaffHierarchySelectOptions(),
    ]);
    managers = hub.managers;
    resellers = hub.resellers;
    dealers = hub.dealers;
    serverPagedTotal = hub.total;
    hubOrderedKeys = hub.orderedKeys;
    hierarchySelectOptions = selectOpts;
  } else {
    [managers, resellers, dealers] = await Promise.all([getManagers(), getResellers(), getDealers()]);
  }

  const includeManagers = !typeFilter || typeFilter === "manager";
  const includeResellers = !typeFilter || typeFilter === "reseller";
  const includeDealers = !typeFilter || typeFilter === "dealer";

  const managerRow = toStaffHubTableRowFromManager;
  const resellerRow = toStaffHubTableRowFromReseller;
  const dealerRow = toStaffHubTableRowFromDealer;

  const mgrMap = new Map(managers.map((r) => [r.username, r]));
  const rslMap = new Map(resellers.map((r) => [r.username, r]));
  const dlrMap = new Map(dealers.map((d) => [d.username, d]));

  type HubTableRow = StaffHubTableClientRow;
  let all: HubTableRow[];
  if (hubOrderedKeys?.length) {
    all = [];
    for (const k of hubOrderedKeys) {
      if (k.kind === "MNGR") {
        const r = mgrMap.get(k.username);
        if (r && includeManagers) all.push(managerRow(r));
      } else if (k.kind === "SRSLR") {
        const r = rslMap.get(k.username);
        if (r && includeResellers) all.push(resellerRow(r));
      } else {
        const d = dlrMap.get(k.username);
        if (d && includeDealers) all.push(dealerRow(d));
      }
    }
  } else {
    all = [
      ...(includeManagers ? managers.map(managerRow) : []),
      ...(includeResellers ? resellers.map(resellerRow) : []),
      ...(includeDealers ? dealers.map(dealerRow) : []),
    ];
  }

  const searchFilteredRows = useServerPaging || !qRaw
    ? all
    : all.filter((r) => {
        const statusLabel = r.status === "A" ? "active" : "inactive";
        const extra =
          r.rowType === "RESELLER"
            ? [r.manager]
            : r.rowType === "DEALER"
              ? [r.reseller, r.manager]
              : [];
        const hay = [
          r.username,
          formatStateLastSeen(r.stateCurrentLogin),
          formatStateLastSeen(r.stateLastLogin),
          r.name,
          r.rowType.toLowerCase(),
          String(r.dealerCount),
          String(r.managerResellerCount ?? 0),
          r.parentReseller,
          formatStaffCreatedAtDisplay(r.createdAt),
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

  const managerActive = staffCounts?.managers.active ?? managers.filter((m) => m.status === "A").length;
  const resellerActive = staffCounts?.resellers.active ?? resellers.filter((r) => r.status === "A").length;
  const dealerActive = staffCounts?.dealers.active ?? dealers.filter((d) => d.status === "A").length;
  const managerTotal = staffCounts?.managers.total ?? 0;
  const resellerTotal = staffCounts?.resellers.total ?? 0;
  const dealerTotal = staffCounts?.dealers.total ?? 0;
  const managerExpired = Math.max(0, managerTotal - managerActive);
  const resellerExpired = Math.max(0, resellerTotal - resellerActive);
  const dealerExpired = Math.max(0, dealerTotal - dealerActive);
  const totalStaff = managerTotal + resellerTotal + dealerTotal;

  const colsQuery = staffListColsQueryFromSet(visibleColumns, COLUMN_IDS);
  const redirectPath = managersListPath({
    q: sp.q,
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
  const staffNewMissing =
    sp.staff_new === "manager"
      ? adminHierarchyNewMissingFlashItems(sp, "manager")
      : sp.staff_new === "reseller"
        ? adminHierarchyNewMissingFlashItems(sp, "admin_reseller")
        : sp.staff_new === "dealer"
          ? adminHierarchyNewMissingFlashItems(sp, "admin_dealer")
          : [];
  const listFlashes = [
    ...staffNewMissing,
    ...adminStaffCreateSuccessFlashItems(sp),
    ...adminStaffPasswordResetFlashItems(sp),
    ...adminStaffListFlashItems(sp, "manager"),
    ...adminStaffListFlashItems(sp, "reseller"),
    ...adminStaffListFlashItems(sp, "dealer"),
  ].filter((item, idx, arr) => arr.findIndex((x) => x.type === item.type && x.message === item.message) === idx);

  const managerOptions = hierarchySelectOptions
    ? staffSelectOptions(hierarchySelectOptions.managers)
    : managers.map((m) => ({
        value: m.username,
        label: formatHierarchySelectLabel(m.username, m.name),
      }));
  const resellerOptions = hierarchySelectOptions
    ? staffSelectOptions(hierarchySelectOptions.resellers)
    : resellers.map((r) => ({
        value: r.username,
        label: formatHierarchySelectLabel(r.username, r.name),
      }));
  const staffCell = (col: ColumnId, extra?: string) => staffHubDataCell(col, extra);
  const sortableHeader = (key: SortKey, label: string, thClassName?: string) => {
    const mobileLabel = STAFF_TABLE_MOBILE_TH_LABEL[key];
    return (
      <th key={key} className={staffHubHeaderCell(key, thClassName)}>
        <Link
          href={managersListPath({
            q: sp.q,
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

  /** Same drill-down as dashboard Team hierarchy — shortcuts filter this list (`type` / clear). */
  const staffFilterHref = (opts: { type?: "manager" | "reseller" | "dealer"; clearAll?: boolean }) => {
    if (opts.clearAll) {
      return managersListPath({
        q: sp.q,
        p: 1,
        ps: pageSize,
        status: statusFilter || undefined,
        sort: sortBy,
        dir: sortDir,
        cols: colsQuery,
      });
    }
    return managersListPath({
      q: sp.q,
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
          /** List search before dealer drill (e.g. manager login on reseller list). Never use `sp.q` here — that is the drilled reseller, not the list filter. */
          const restoredListQ = typeof sp.bq === "string" ? sp.bq.trim() : "";
          const resellerListQ = restoredListQ || undefined;
          /** quick=1 only when there is a parent list filter to step back through (e.g. manager → resellers → dealers). Plain type=reseller + dealers → back should match that list without quick. */
          const resellerQuick = restoredListQ ? "1" : undefined;
          /** No `bq`: user was on plain type=resellers → dealers; return to full staff default (not `type=reseller` in URL). */
          if (!restoredListQ) {
            return managersListPath({
              p: 1,
              ps: pageSize,
              sort: sortBy,
              dir: sortDir,
              cols: colsQuery,
            });
          }
          return managersListPath({
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
        ? managersListPath({
            q: sp.bq !== undefined && sp.bq !== null ? String(sp.bq).trim() || undefined : undefined,
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
    manager: staffFilterHref({ type: "manager" }),
    reseller: staffFilterHref({ type: "reseller" }),
    dealer: staffFilterHref({ type: "dealer" }),
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        isListModal ? "min-h-0" : "flex-1 min-h-0",
      )}
    >
      

        {!isListModal ? (
          <div className="shrink-0 px-3 pt-3 sm:px-5 sm:pt-4">
          <StaffHubKpiCollapsible
            totalStaff={totalStaff}
            managerTotal={managerTotal}
            resellerTotal={resellerTotal}
            dealerTotal={dealerTotal}
            managerActive={managerActive}
            managerInactive={managerExpired}
            resellerActive={resellerActive}
            resellerInactive={resellerExpired}
            dealerActive={dealerActive}
            dealerInactive={dealerExpired}
            filterHrefs={staffHubFilterHrefs}
            activeType={typeFilter}
          />
          </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StaffListMobileColsBootstrap />
        <div className="shrink-0 border-b border-border/50 px-2 py-1.5 sm:px-2">
          <ManagersFiltersBar
            q={sp.q}
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
                  managerOptions={managerOptions}
                  resellerOptions={resellerOptions}
                  triggerLabel="Add staff"
                  triggerClassName={managersToolbarPrimaryButtonClass}
                />
                <ManagersColumnSettings
                  selectedColumns={selectedColumnIds}
                  labels={columnSettingsLabels}
                  currentQuery={{
                    q: sp.q,
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
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden  shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            isListModal && "rounded-none border-x-0 border-y-0 shadow-none ring-0",
          )}
        >
          <StaffHubTableScrollShell columnIds={tableColumnIds}>
          <table className={STAFF_HUB_TABLE_CLASS}>
            <thead>
              <tr>
                {tableColumnIds.map((col) =>
                  sortableHeader(col, columnLabels[col], STAFF_TABLE_TH_CLASS[col] ?? "py-1 text-center"),
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
                        : "Create staff with Add manager, Add reseller, or Add dealer when you are ready to onboard."}
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const branchHref =
                  r.rowType === "MANAGER"
                    ? managersListPath({
                        q: r.username,
                        p: 1,
                        ps: pageSize,
                        type: "reseller",
                        status: statusFilter,
                        sort: sortBy,
                        dir: sortDir,
                        cols: colsQuery,
                        quick: quickFlag ?? "1",
                        bq: sp.q,
                        ...(statusFilter === "active" || statusFilter === "inactive" ? { bs: statusFilter } : {}),
                      })
                    : r.rowType === "RESELLER"
                      ? managersListPath({
                          q: r.username,
                          p: 1,
                          ps: pageSize,
                          type: "dealer",
                          status: statusFilter,
                          sort: sortBy,
                          dir: sortDir,
                          cols: colsQuery,
                          quick: quickFlag ?? "1",
                          bq: sp.q,
                          ...(statusFilter === "active" || statusFilter === "inactive" ? { bs: statusFilter } : {}),
                        })
                      : undefined;
                const parentModalType =
                  r.rowType === "RESELLER" && r.manager ? "MANAGER" : r.rowType === "DEALER" && r.reseller ? "RESELLER" : null;
                const parentModalUsername = r.rowType === "RESELLER" ? r.manager : r.rowType === "DEALER" ? r.reseller : "";
                const rowActions =
                  r.rowType === "MANAGER" ? (
                      <AdminManagerRowActions
                        username={r.username}
                        displayName={r.name || r.username}
                        canDelete={r.canDelete}
                        redirectPath={redirectPath}
                        status={r.status}
                        credits={r.credits}
                        resellerCount={r.managerResellerCount}
                        dealerCount={r.managerDealerCount}
                        activeUsers={r.activeUsers}
                        expiredUsers={r.expiredUsers}
                        totalUsers={r.totalUsers}
                        stateCurrentLogin={r.stateCurrentLogin}
                        stateLastLogin={r.stateLastLogin}
                        stateLastLoginIp={r.lastLoginIp}
                        stateCurrentLoginIp={r.currentLoginIp}
                        initialCreditsModal={sp.credit_user === r.username ? sp.credit_modal : undefined}
                        viewResellersHref={managersListPath({
                          q: r.username,
                          p: 1,
                          ps: pageSize,
                          type: "reseller",
                          status: statusFilter,
                          sort: sortBy,
                          dir: sortDir,
                          cols: colsQuery,
                          quick: quickFlag ?? "1",
                          bq: sp.q,
                          ...(statusFilter === "active" || statusFilter === "inactive" ? { bs: statusFilter } : {}),
                        })}
                      />
                    ) : r.rowType === "RESELLER" ? (
                      <AdminResellerRowActions
                        username={r.username}
                        displayName={r.name || r.username}
                        canDelete={r.canDelete}
                        redirectPath={redirectPath}
                        status={r.status}
                        managerLogin={r.manager ?? ""}
                        credits={r.credits}
                        dealerCount={r.dealerCount}
                        activeUsers={r.activeUsers}
                        expiredUsers={r.expiredUsers}
                        totalUsers={r.totalUsers}
                        stateCurrentLogin={r.stateCurrentLogin}
                        stateLastLogin={r.stateLastLogin}
                        stateLastLoginIp={r.lastLoginIp}
                        stateCurrentLoginIp={r.currentLoginIp}
                        initialCreditsModal={sp.credit_user === r.username ? sp.credit_modal : undefined}
                        viewDealersStaffHref={managersListPath({
                          q: r.username,
                          p: 1,
                          ps: pageSize,
                          type: "dealer",
                          status: statusFilter,
                          sort: sortBy,
                          dir: sortDir,
                          cols: colsQuery,
                          quick: quickFlag ?? "1",
                          bq: sp.q,
                          ...(statusFilter === "active" || statusFilter === "inactive" ? { bs: statusFilter } : {}),
                        })}
                      />
                    ) : (
                      <AdminDealerRowActions
                        username={r.username}
                        displayName={r.name || r.username}
                        canDelete={r.canDelete}
                        redirectPath={redirectPath}
                        status={r.status}
                        managerLogin={r.manager ?? ""}
                        resellerLogin={r.reseller ?? ""}
                        credits={r.credits}
                        activeUsers={r.activeUsers}
                        expiredUsers={r.expiredUsers}
                        totalUsers={r.totalUsers}
                        stateCurrentLogin={r.stateCurrentLogin}
                        stateLastLogin={r.stateLastLogin}
                        stateLastLoginIp={r.lastLoginIp}
                        stateCurrentLoginIp={r.currentLoginIp}
                        initialCreditsModal={sp.credit_user === r.username ? sp.credit_modal : undefined}
                      />
                    );
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
                      row={r}
                      columnLabels={columnLabels}
                      tableColumnIds={tableColumnIds}
                      cellCtx={{
                        portal: "admin",
                        branchHref,
                        parentModalType,
                        parentModalUsername: parentModalUsername ?? "",
                      }}
                    />
                  }
                >
                  {tableColumnIds.map((col) => {
                    switch (col) {
                      case "name":
                        return (
                          <td key={col} className={staffCell(col, "text-center font-semibold")}>
                            <InlineEditableStaffCell rowType={r.rowType} username={r.username} field="name" value={r.name || ""} />
                          </td>
                        );
                      case "username":
                        return (
                          <td key={col} className={staffCell(col, "text-center")}>
                            <AdminStaffEditModalTrigger
                              rowType={r.rowType}
                              username={r.username}
                              label={<span className="font-medium text-foreground hover:text-primary">{r.username}</span>}
                              className="inline cursor-pointer bg-transparent p-0 text-left"
                            />
                          </td>
                        );
                      case "credits":
                        return (
                          <td key={col} className={staffCell(col, "text-center tabular-nums text-slate-700 dark:text-muted-foreground")}>
                            {formatInt(r.credits)}
                          </td>
                        );
                      case "dealerCount":
                        return (
                          <td key={col} className={staffCell(col, "text-center tabular-nums text-muted-foreground")}>
                            {staffHierarchyBranchCount(r) > 0 && branchHref ? (
                              <AdminListModalTrigger
                                rowType={r.rowType === "MANAGER" ? "MANAGER" : "RESELLER"}
                                username={r.username}
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
                            {parentModalType && parentModalUsername ? (
                              <AdminStaffEditModalTrigger
                                rowType={parentModalType}
                                username={parentModalUsername}
                                label={<span className="font-medium text-foreground hover:text-primary">{r.parentReseller || "—"}</span>}
                                className="inline cursor-pointer bg-transparent p-0 text-center"
                              />
                            ) : (
                              <span className="text-foreground">{r.parentReseller || "—"}</span>
                            )}
                          </td>
                        );
                      case "createdAt":
                        return (
                          <td key={col} className={staffCell(col, "text-center tabular-nums text-muted-foreground")}>
                            {formatStaffCreatedAtDisplay(r.createdAt)}
                          </td>
                        );
                      case "status":
                        return (
                          <td key={col} className={staffCell(col, "text-center")}>
                            <StaffHubStatusCell rowType={r.rowType} username={r.username} value={r.status} />
                          </td>
                        );
                      case "state":
                        return (
                          <td key={col} className={staffCell(col, "text-center text-slate-700 dark:text-muted-foreground")}>
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
                                className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                label={formatInt(r.activeUsers)}
                              >
                              </AdminUsersListModalTrigger>
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
                                className="inline rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                label={formatInt(r.expiredUsers)}
                              >
                              </AdminUsersListModalTrigger>
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
                                className="inline rounded-none border-0 bg-transparent p-0 font-medium text-foreground no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent"
                                label={formatInt(r.totalUsers)}
                              >
                              </AdminUsersListModalTrigger>
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
          pagination={
          <nav
            className="flex shrink-0 flex-nowrap items-center gap-0.5 sm:gap-1"
            aria-label="Staff list pages"
          >
            <Link
              href={managersListPath({
                q: sp.q,
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
                currentPage <= 1 ? "pointer-events-none border-border/40 text-muted-foreground opacity-50" : "border-border/70 hover:bg-muted/50",
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
                  className={cn(managersStaffPageBtnBaseClass, "cursor-default border-primary/45 bg-primary/12 font-semibold text-primary")}
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={managersListPath({
                    q: sp.q,
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
            <form method="get" action="/admin/managers" className="ml-0.5 inline-flex items-center gap-0.5">
              {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
              {typeFilter ? <input type="hidden" name="type" value={typeFilter} /> : null}
              {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
              <input type="hidden" name="sort" value={sortBy} />
              <input type="hidden" name="dir" value={sortDir} />
              <input type="hidden" name="ps" value={String(pageSize)} />
              {colsQuery ? <input type="hidden" name="cols" value={colsQuery} /> : null}
              {quickFlag ? <input type="hidden" name="quick" value={quickFlag} /> : null}
              {drillbackParams.bq ? <input type="hidden" name="bq" value={drillbackParams.bq} /> : null}
              {drillbackParams.bs ? <input type="hidden" name="bs" value={drillbackParams.bs} /> : null}
              <label htmlFor="staff-jump-page" className="sr-only">
                Go to page
              </label>
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">Pg</span>
              <input
                id="staff-jump-page"
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
              href={managersListPath({
                q: sp.q,
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
              {qRaw ? ` for “${(sp.q ?? "").trim()}”.` : "."}
            </>
          }
        />
        </div>
      </div>
    </div>
  );
}
