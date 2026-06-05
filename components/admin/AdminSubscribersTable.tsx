"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Download,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PortalAddSubscriberToolbarButton } from "@/components/portal/PortalAddSubscriberToolbarButton";
import { operatorCopy } from "@/lib/operatorUiCopy";
import {
  bulkDeleteAccountsAction,
  bulkDeletePortalAccountsAction,
  bulkRenewAccountsAction,
  bulkRenewPortalAccountsAction,
  bulkSendAccountsMessageAction,
  bulkSendPortalAccountsMessageAction,
  getAccountRenewRecoveryAvailabilityAction,
  getPortalAccountRenewRecoveryAvailabilityAction,
  renewSubscriberAccountAction,
  renewPortalSubscriberAccountAction,
  disableSubscriberAutoRenewAction,
  disablePortalSubscriberAutoRenewAction,
  setSubscriberAutoRenewAction,
  setPortalSubscriberAutoRenewAction,
  createDealerEndUserFromListAction,
  createDealerEndUserFromListResultAction,
  createManagerEndUserAction,
  createManagerEndUserFromListResultAction,
  createResellerEndUserFromListAction,
  createResellerEndUserFromListResultAction,
  createUserResultAction,
  loadDealersForManagerResellerAction,
  loadDealersForResellerPortalAction,
  saveDealerUserFromListAction,
  saveManagerUserFromListAction,
  saveResellerUserFromListAction,
} from "@/actions/forms";
import { exportSubscribersCsvAction } from "@/actions/clientData";
import {
  loadEndUserDetailsModalAction,
  loadEndUserTransactionsModalAction,
  loadHierarchyProfileModalAction,
} from "@/actions/modalData";
import type { SubscribersExportFilters } from "@/lib/server/subscribersExportClientData";
import { apiBaseToModalScope } from "@/lib/modalScope";
import { cachedDataLoad, dataCacheKey, DATA_CACHE_NS, BILLING_DATA_CACHE_INVALIDATE, getDataCache, setDataCache } from "@/lib/client/dataCache";
import {
  invalidateAfterEndUserDetailMutation,
  invalidateAfterEndUserMutation,
} from "@/lib/client/invalidateAfterBillingMutation";
import { dispatchBillingHeaderStatsRefresh } from "@/lib/realtime/client-events";
import type { SubscribersTablePortal } from "@/lib/subscribersPortalTable";
import { ADMIN_SUBSCRIBERS_PORTAL } from "@/lib/subscribersPortalTable";
import { SubscriberAutoRenewCell } from "@/components/subscribers/SubscriberAutoRenewCell";
import { toastBulkRenewSummary } from "@/lib/bulkRenewResultToast";
import { AdminSubscriberRowActions } from "@/components/admin/AdminSubscriberRowActions";
import { SubscriberDetailViewModal } from "@/components/subscribers/SubscriberDetailViewModal";
import { SubscriberRenewAccountModal } from "@/components/subscribers/SubscriberRenewAccountModal";
import { SubscriberSetAutoRenewModal } from "@/components/subscribers/SubscriberSetAutoRenewModal";
import { InlineEditableUserCell, type InlineUserSavePayload } from "@/components/admin/InlineEditableUserCell";
import { openAutoRenewConfigureOrWarn } from "@/lib/client/openAutoRenewConfigureOrWarn";
import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import { cn } from "@/lib/cn";
import {
  subscriberAccountStatusBadgeClassName,
} from "@/components/admin/HierarchyTableBadges";
import { SubscriberParentsCell } from "@/components/admin/SubscriberParentsCell";
import {
  SubscriberAccountUsernameCell,
  SubscriberStalkerUserIdCell,
} from "@/components/admin/SubscriberTableIdentityCells";
import { SubscriberStateCell } from "@/components/admin/SubscriberStateCell";
import { BulkRenewAccountsModal } from "@/components/subscribers/BulkRenewAccountsModal";
import { SubscriberRenewRecoverSuccessModal } from "@/components/subscribers/SubscriberRenewRecoverSuccessModal";
import {
  aggregateBulkRenewAvailability,
  buildBulkRenewSuccessDetails,
  clampValiditySelection,
  filterBulkRenewValidityOptions,
  type BulkRenewAvailabilitySnapshot,
} from "@/lib/bulkRenewPlanning";
import type { SubscriberRenewRecoverSuccessDetails } from "@/lib/subscriberRenewRecoverSuccess";
import {
  adminListTableBulkMenuItemClass,
  adminListTableBulkMenuItemDestructiveClass,
  adminListTableToolbarBulkButtonClass,
  adminListTableToolbarSearchFieldEmbeddedClass,
  adminListTableToolbarShellClass,
  adminListTableToolbarShellEmbeddedClass,
  managersToolbarIconButtonClass,
  managersToolbarPrimaryButtonClass,
  managersToolbarMenuSurfaceClass,
  managersToolbarSelectTriggerClass,
  adminHudModalBackdropClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalOpaqueShellClass,
  managersToolbarModalShellClass,
  managersToolbarSearchInputClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import { floatingCompactMenuPanelClass, floatingPopoverMenuPanelClass } from "@/lib/ui/floatingActionMenu";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { Button } from "@/components/ui/button";
import { dataTableSelectionColumnClass, dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { embeddedTableTdClass, embeddedTableThClass } from "@/lib/ui/embeddedTableTypography";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { DataTableSelectionCheckbox } from "@/components/ui/DataTableSelectionCheckbox";
import { AdminUsersStatusControl } from "@/components/admin/AdminUsersStatusControl";
import { AdminUsersAutoRenewControl } from "@/components/admin/AdminUsersAutoRenewControl";
import { AdminUsersPerPageControl } from "@/components/admin/AdminUsersPerPageControl";
import type { FormSelectOption } from "@/components/forms/form-select";
import { SubscribersPageExpandableRow } from "@/components/admin/SubscribersPageExpandableRow";
import { SubscribersPageRowDetailsPanel } from "@/components/admin/SubscribersPageRowDetailsPanel";
import { SubscribersPageTableScrollShell } from "@/components/admin/SubscribersPageTableScrollShell";
import { SubscribersPageVirtualizedTbody } from "@/components/admin/SubscribersPageVirtualizedTbody";
import {
  subscribersPageTableColumnIds,
  type SubscribersPageColumnKey,
} from "@/components/admin/subscribersPageBuildRowDetails";
import {
  SUBSCRIBERS_USER_COLUMN_LAYOUT_WEIGHT,
  SUBSCRIBERS_USER_COLUMN_SHORT_LABELS,
  SUBSCRIBERS_USER_TABLE_COLUMNS,
  formatSubscriberCreated,
  subscribersUserConfigurableColumns,
  type SubscribersUserColumnKey,
} from "@/lib/subscribers/subscribersTableModel";
import { adminEmbeddedListRowClass } from "@/lib/ui/adminEmbeddedListTable";
import { SUBSCRIBERS_PAGE_RESPONSIVE_TABLE_CLASS } from "@/lib/ui/subscribersPageResponsiveTable";
import {
  subscribersPageActionsHeaderCell,
  subscribersPageDataCell,
  subscribersPageHeaderCell,
  subscribersPageCellAlign,
  subscribersPageHeaderLabelWrapClass,
  subscribersPageSortHeaderLinkClass,
} from "@/components/admin/subscribersPageTableUi";
import { SubscriberExpiryTableCell } from "@/components/admin/subscribersPageFormatters";
import type { AccountTransactionRow } from "@/lib/repos/billing";

const AdminAddUserModal = dynamic(
  () => import("@/components/admin/AdminAddUserModal").then((m) => m.AdminAddUserModal),
  { ssr: false },
);

const EndUserTransactionsTable = dynamic(
  () => import("@/components/admin/EndUserTransactionsTable").then((m) => m.EndUserTransactionsTable),
  {
    ssr: false,
    loading: () => (
      <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
        Loading transaction history…
      </p>
    ),
  },
);

const BulkDeleteAccountsModal = dynamic(
  () => import("@/components/admin/BulkDeleteAccountsModal").then((m) => m.BulkDeleteAccountsModal),
  { ssr: false },
);

const BulkUpdateResultsModal = dynamic(
  () => import("@/components/admin/BulkUpdateResultsModal").then((m) => m.BulkUpdateResultsModal),
  { ssr: false },
);

const AdminSendMessageModal = dynamic(
  () => import("@/components/admin/AdminSendMessageModal").then((m) => m.AdminSendMessageModal),
  { ssr: false },
);

type ValidityOption = { value: string; label: string };

export type AdminSubscribersSortUrls = Record<
  "account" | "username" | "full_name" | "mac" | "status" | "expires" | "created",
  string
>;

type Props = {
  rows: SubscriberListClientRow[];
  validityOptions: ValidityOption[];
  sortUrls: AdminSubscribersSortUrls;
  sort: string;
  dir: "asc" | "desc";
  resetReturnPath: string;
  filterNotice?: {
    message: string;
    value: string;
    clearHref: string;
    clearLabel: string;
  };
  actionLinks?: {
    addSubscriberHref: string;
    /** Portal lists: false when debit wallet has 0 credits (default true). */
    canAddSubscriber?: boolean;
    exportFilters?: SubscribersExportFilters;
  };
  embedded?: boolean;
  toolbarFilters?: {
    query: string;
    status: string;
    autoRenew: string;
    statusOptions: FormSelectOption[];
    statusHrefByValue: Record<string, string>;
    autoRenewOptions: FormSelectOption[];
    autoRenewHrefByValue: Record<string, string>;
    pageSize: string;
    pageSizeOptions: FormSelectOption[];
    pageSizeHrefByValue: Record<string, string>;
    searchAction: string;
    searchHiddenParams: Record<string, string>;
  };
  addUserModalData?: {
    managers?: Array<{ username: string; name: string }>;
    resellers: Array<{ username: string; name: string }>;
    tariffs: Array<{ id: number; name: string }>;
    validityOptions: Array<{ value: string; label: string }>;
    customPlanId: number | null;
    addonPackages: Array<{ package_id: number; name: string }>;
  };
  initialAddUserOpen?: boolean;
  initialEditAccount?: string;
  /** When false, RCDT-style recovery is hidden (matches `is_recover_bonus_credit` off). */
  recoverBonusEnabled?: boolean;
  /** Admin (default) or manager portal — API paths and bulk actions. */
  subscribersPortal?: SubscribersTablePortal;
};

type DetailUser = {
  id: string;
  name: string;
  username: string;
  mac: string;
  ip: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE";
  statusCode: number;
  reseller: string;
  dealer: string;
  tariffPlanId: number;
  packageLabel: string;
  stalkerUserId: number | null;
  comments: string;
  subscribedPackageIds: number[];
  stb: { online: boolean; ip: string; firmware: string; expiry: string; watching: string };
  transactionSummary: {
    total: number;
    creditCount: number;
    debitCount: number;
    netPeriods: number;
    creditPeriods: number;
    debitPeriods: number;
    lastTransactionAt: string | null;
  };
  recentTransactions: Array<{ type: string; periods: number; timestamp: string | null }>;
};

type HierarchyProfile = {
  role: "manager" | "reseller" | "dealer";
  username: string;
  name: string;
  status: string;
  manager?: string;
  reseller?: string;
  ticketsManager?: string;
  comments: string;
  credits: number;
  transactionSummary: {
    total: number;
    creditCount: number;
    debitCount: number;
    netPeriods: number;
    creditPeriods: number;
    debitPeriods: number;
    lastTransactionAt: string | null;
  };
  recentTransactions: Array<{ type: string; periods: number; timestamp: string | null }>;
};

const userDetailSectionShell = cn(managersToolbarModalInsetPanelClass, "rounded-lg p-2.5");

const userDetailStatPillClass =
  "inline-flex rounded-full border border-cyan-700/35 bg-cyan-600 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-[0_1px_2px_rgb(8_145_178/0.3)] dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-foreground dark:shadow-none";

function Row({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 border-b border-cyan-600/12 py-1.5 last:border-b-0 dark:border-cyan-400/10">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-sm font-medium leading-snug text-foreground",
          multiline && "thin-scrollbar max-h-20 overflow-auto whitespace-pre-wrap text-[13px] font-normal",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

type ColumnKey = SubscribersUserColumnKey;

const TABLE_COLUMNS = SUBSCRIBERS_USER_TABLE_COLUMNS;

type TableLayoutKey = "__sel__" | ColumnKey | "__actions__";

const SELECTION_LAYOUT_WEIGHT = 3;
const ACTIONS_LAYOUT_WEIGHT = 4;

function subscriberTableLayoutKeys(visible: Set<ColumnKey>, showUserIdColumn: boolean): TableLayoutKey[] {
  const keys: TableLayoutKey[] = ["__sel__"];
  for (const col of TABLE_COLUMNS) {
    if (col.key === "account" && !showUserIdColumn) continue;
    if (visible.has(col.key)) keys.push(col.key);
  }
  keys.push("__actions__");
  return keys;
}

function subscriberTableColumnWidths(visible: Set<ColumnKey>, showUserIdColumn: boolean): string[] {
  const keys = subscriberTableLayoutKeys(visible, showUserIdColumn);
  const weightOf = (k: TableLayoutKey) =>
    k === "__sel__"
      ? SELECTION_LAYOUT_WEIGHT
      : k === "__actions__"
        ? ACTIONS_LAYOUT_WEIGHT
        : SUBSCRIBERS_USER_COLUMN_LAYOUT_WEIGHT[k];
  const weights = keys.map(weightOf);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => `${((w / sum) * 100).toFixed(4)}%`);
}

const subscribersThCompact = cn(
  "min-w-0 px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 text-[10px] sm:text-[11px] md:text-xs leading-tight font-semibold uppercase tracking-wide",
);
const subscribersTdBase =
  "max-w-0 px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 align-middle text-sm md:text-base leading-tight text-foreground";
const subscribersTdTruncate = "truncate";

const COLUMN_SHORT_LABELS = SUBSCRIBERS_USER_COLUMN_SHORT_LABELS;

export function AdminSubscribersTable({
  rows,
  validityOptions,
  sortUrls,
  sort,
  dir,
  resetReturnPath,
  filterNotice,
  actionLinks,
  embedded = false,
  toolbarFilters,
  addUserModalData,
  initialAddUserOpen = false,
  initialEditAccount = "",
  recoverBonusEnabled = true,
  subscribersPortal = ADMIN_SUBSCRIBERS_PORTAL,
}: Props) {
  const router = useRouter();
  const isOperatorPortal = subscribersPortal.apiBase !== "/api/admin";
  const isManagerPortal = subscribersPortal.apiBase === "/api/manager";
  const isResellerPortal = subscribersPortal.apiBase === "/api/reseller";
  const isDealerPortal = subscribersPortal.apiBase === "/api/dealer";
  const apiBase = subscribersPortal.apiBase;
  const usersListPath = subscribersPortal.usersPath;
  const canAddSubscriber = actionLinks?.canAddSubscriber !== false;
  const hierarchyRoles = useMemo(
    () => new Set(subscribersPortal.hierarchyRoles ?? (["manager", "reseller", "dealer"] as const)),
    [subscribersPortal.hierarchyRoles],
  );
  const showUserIdColumn = subscribersPortal.showUserIdColumn ?? !isOperatorPortal;
  const configurableColumns = useMemo(
    () => subscribersUserConfigurableColumns(showUserIdColumn),
    [showUserIdColumn],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const bulkActionsAnchorRef = useRef<HTMLButtonElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const initialShowUserId = subscribersPortal.showUserIdColumn ?? subscribersPortal.apiBase === "/api/admin";
    return new Set(
      subscribersUserConfigurableColumns(initialShowUserId).map((c) => c.key),
    );
  });
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [validity, setValidity] = useState("1");
  const [bulkRenewAvailability, setBulkRenewAvailability] = useState<BulkRenewAvailabilitySnapshot | null>(null);
  const [bulkRenewAvailabilityLoading, setBulkRenewAvailabilityLoading] = useState(false);
  const [bulkRenewSuccess, setBulkRenewSuccess] = useState<SubscriberRenewRecoverSuccessDetails | null>(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [results, setResults] = useState<{ account: string; ok: boolean; message: string }[]>([]);
  const [detailRow, setDetailRow] = useState<SubscriberListClientRow | null>(null);
  const [detailRenewOpen, setDetailRenewOpen] = useState(false);
  const [autoRenewModalTarget, setAutoRenewModalTarget] = useState<{
    account: string;
    displayName?: string | null;
    accountActive: boolean;
  } | null>(null);
  const [detailEditOpen, setDetailEditOpen] = useState(false);
  const [detailReloadGeneration, setDetailReloadGeneration] = useState(0);
  const detailAccount = detailRow?.account ?? null;
  const openDetailAccountRef = useRef<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailUser | null>(null);
  const [hierarchyModal, setHierarchyModal] = useState<{ role: "manager" | "reseller" | "dealer"; username: string } | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [hierarchyData, setHierarchyData] = useState<HierarchyProfile | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(initialAddUserOpen);
  const [transactionsModalAccount, setTransactionsModalAccount] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsRows, setTransactionsRows] = useState<AccountTransactionRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    openDetailAccountRef.current = detailAccount;
  }, [detailAccount]);

  async function exportSubscribersCsv() {
    if (!actionLinks?.exportFilters) return;
    setExportBusy(true);
    try {
      const result = await exportSubscribersCsvAction(
        apiBaseToModalScope(subscribersPortal.apiBase),
        actionLinks.exportFilters,
      );
      if (!result.ok) {
        toast.error("Could not export subscribers.");
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export started.");
    } catch {
      toast.error("Could not export subscribers.");
    } finally {
      setExportBusy(false);
    }
  }

  const allAccounts = useMemo(() => rows.map((r) => r.account), [rows]);

  type InlineUserRowPatch = Partial<Pick<SubscriberListClientRow, "full_name" | "mac" | "ip" | "status">>;
  const [inlineUserRowPatches, setInlineUserRowPatches] = useState<Record<string, InlineUserRowPatch>>({});
  const tableRows = useMemo(() => {
    if (Object.keys(inlineUserRowPatches).length === 0) return rows;
    return rows.map((row) => {
      const patch = inlineUserRowPatches[row.account];
      return patch ? { ...row, ...patch } : row;
    });
  }, [rows, inlineUserRowPatches]);

  const applyInlineUserSave = useCallback(({ account, field, value }: InlineUserSavePayload) => {
    setInlineUserRowPatches((prev) => {
      const cur = prev[account] ?? {};
      let patch: InlineUserRowPatch;
      if (field === "user") patch = { ...cur, full_name: value || null };
      else if (field === "mac") patch = { ...cur, mac: value || null };
      else if (field === "ip") patch = { ...cur, ip: value || null };
      else if (field === "status") patch = { ...cur, status: Number(value) };
      else return prev;
      return { ...prev, [account]: patch };
    });
    setDetailRow((detail) => {
      if (!detail || detail.account !== account) return detail;
      if (field === "user") return { ...detail, full_name: value || null };
      if (field === "mac") return { ...detail, mac: value || null };
      if (field === "ip") return { ...detail, ip: value || null };
      if (field === "status") return { ...detail, status: Number(value) };
      return detail;
    });
    if (openDetailAccountRef.current === account) {
      setDetailData((detail) => {
        if (!detail) return detail;
        if (field === "user") return { ...detail, name: value };
        if (field === "mac") return { ...detail, mac: value };
        if (field === "ip") return { ...detail, ip: value };
        if (field === "status") {
          const statusCode = Number(value);
          return {
            ...detail,
            statusCode,
            status: statusCode === 0 ? "ACTIVE" : "INACTIVE",
          };
        }
        return detail;
      });
    }
  }, []);
  const allSelected = allAccounts.length > 0 && allAccounts.every((a) => selected.has(a));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allAccounts) : new Set());
  }

  function toggleOne(account: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(account);
      else n.delete(account);
      return n;
    });
  }

  function openRenewModal() {
    if (selected.size === 0) {
      toast.warning("Select accounts for renew");
      return;
    }
    setBulkRenewAvailability(null);
    const ids = Array.from(selected);
    setBulkRenewAvailabilityLoading(true);
    const loadAvailability = isOperatorPortal
      ? getPortalAccountRenewRecoveryAvailabilityAction
      : getAccountRenewRecoveryAvailabilityAction;
    void Promise.all(
      ids.map(async (account) => {
        const res = await loadAvailability(account);
        return { account, res };
      }),
    )
      .then((rows) => {
        setBulkRenewAvailability(
          aggregateBulkRenewAvailability(
            ids.length,
            rows.map(({ account, res }) => ({
              account,
              ok: res.ok,
              debitUsername: res.ok ? res.debitUsername : null,
              debitCredits: res.ok ? res.debitCredits : null,
            })),
          ),
        );
      })
      .finally(() => setBulkRenewAvailabilityLoading(false));
    setRenewOpen(true);
  }

  function dismissBulkRenewSuccess() {
    setBulkRenewSuccess(null);
    if (results.length > 0) setResultsOpen(true);
  }

  function runBulkRenew() {
    const ids = Array.from(selected);
    const wallets = bulkRenewAvailability?.wallets ?? [];
    const affordableOptions = filterBulkRenewValidityOptions(validityOptions, wallets);
    const selectedOption = affordableOptions.find((v) => v.value === validity);
    startTransition(async () => {
      const res = isOperatorPortal
        ? await bulkRenewPortalAccountsAction(ids, validity)
        : await bulkRenewAccountsAction(ids, validity);
      if (!res.ok) {
        toast.error(res.error === "no_accounts" ? "Select at least one account." : res.error);
        return;
      }
      const successes = res.results.filter((r) => r.ok);
      const failures = res.results.filter((r) => !r.ok);
      setResults(failures.length > 0 ? res.results : []);
      setRenewOpen(false);
      setSelected(new Set());
      for (const row of successes) invalidateAfterEndUserMutation(row.account);
      dispatchBillingHeaderStatsRefresh();
      if (successes.length > 0 && selectedOption && bulkRenewAvailability) {
        setBulkRenewSuccess(
          buildBulkRenewSuccessDetails({
            selectedOption,
            wallets: bulkRenewAvailability.wallets,
            successAccounts: successes.map((r) => r.account),
            accountWalletMap: bulkRenewAvailability.accountWalletMap,
          }),
        );
      }
      if (failures.length > 0) {
        if (successes.length === 0) setResultsOpen(true);
        toastBulkRenewSummary(res.results);
      } else if (successes.length === 0) {
        setResultsOpen(true);
        toastBulkRenewSummary(res.results);
      }
    });
  }

  const bulkRenewValidityOptions = useMemo(
    () => filterBulkRenewValidityOptions(validityOptions, bulkRenewAvailability?.wallets ?? []),
    [validityOptions, bulkRenewAvailability?.wallets],
  );

  useEffect(() => {
    if (!renewOpen) return;
    const timer = window.setTimeout(
      () => setValidity((prev) => clampValiditySelection(prev, bulkRenewValidityOptions)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [renewOpen, bulkRenewValidityOptions]);

  function openDeleteModal() {
    if (selected.size === 0) {
      toast.warning("Select accounts for delete");
      return;
    }
    setDeleteOpen(true);
  }

  function runBulkDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = isOperatorPortal ? await bulkDeletePortalAccountsAction(ids) : await bulkDeleteAccountsAction(ids);
      if (!res.ok) {
        toast.error(res.error === "no_accounts" ? "Select at least one account." : res.error);
        return;
      }
      setResults(res.results);
      setDeleteOpen(false);
      setResultsOpen(true);
      setSelected(new Set());
      const okCount = res.results.filter((r) => r.ok).length;
      const failCount = res.results.length - okCount;
      if (okCount && !failCount) toast.success(`Deleted ${okCount} account(s).`);
      else if (okCount) toast.warning(`Deleted ${okCount} account(s), ${failCount} failed.`);
      else toast.error("No accounts were deleted.");
    });
  }

  const selectedAccounts = useMemo(() => Array.from(selected), [selected]);

  function openMessageModal() {
    if (!selected.size) {
      toast.warning("Select at least one user");
      return;
    }
    setMessageOpen(true);
  }

  function runBulkMessage() {
    const ids = Array.from(selected);
    const message = bulkMessage.trim();
    if (!message) {
      toast.warning("Message is required.");
      return;
    }
    startTransition(async () => {
      const res = isOperatorPortal
        ? await bulkSendPortalAccountsMessageAction({ accounts: ids, message, priority: 2 })
        : await bulkSendAccountsMessageAction({ accounts: ids, message, priority: 2 });
      if (!res.ok) {
        if (res.error === "no_accounts") toast.error("Select at least one account.");
        else if (res.error === "empty") toast.error("Message is required.");
        else if (res.error === "no_recipients") toast.error("No selected accounts are linked to a device profile.");
        else if (res.error === "events_table") toast.error(operatorCopy.deviceMessagingUnavailable);
        else toast.error("Failed to queue bulk message.");
        return;
      }
      setMessageOpen(false);
      setBulkMessage("");
      const unresolved = res.unresolvedAccounts.length;
      if (unresolved > 0) {
        toast.warning(`Queued ${res.queued} messages. ${unresolved} account(s) were skipped (no device profile).`);
      } else {
        toast.success(`Queued ${res.queued} message event(s).`);
      }
    });
  }

  const openAutoRenewForRow = useCallback((row: SubscriberListClientRow) => {
    openAutoRenewConfigureOrWarn({
      subscriptionExpired: isBillingAccountExpired(row.expires),
      accountActive: row.status === 0,
      onOpen: () => {
        setAutoRenewModalTarget({
          account: row.account,
          displayName: row.full_name ?? row.username ?? row.account,
          accountActive: row.status === 0,
        });
      },
    });
  }, []);

  const refreshDetailModal = useCallback(() => {
    if (!detailAccount) return;
    invalidateAfterEndUserDetailMutation(detailAccount);
    setDetailReloadGeneration((g) => g + 1);
  }, [detailAccount]);

  const handleDisableAutoRenew = useCallback(
    async (account: string) => {
      const res = isOperatorPortal
        ? await disablePortalSubscriberAutoRenewAction(account)
        : await disableSubscriberAutoRenewAction(account);
      if (!res.ok) return { ok: false, message: res.message };
      invalidateAfterEndUserDetailMutation(account);
      if (detailRow?.account === account) refreshDetailModal();
      dispatchBillingHeaderStatsRefresh();
      router.refresh();
      return { ok: true };
    },
    [detailRow?.account, isOperatorPortal, refreshDetailModal, router],
  );

  const reloadDetailModal = useCallback(() => {
    if (!detailAccount) return;
    setDetailReloadGeneration((g) => g + 1);
  }, [detailAccount]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDetailReloadGeneration(0), 0);
    return () => window.clearTimeout(timer);
  }, [detailAccount]);

  useEffect(() => {
    if (!detailRow) return;
    const fresh = tableRows.find((r) => r.account === detailRow.account);
    if (!fresh) return;
    const rowChanged =
      fresh.expires !== detailRow.expires ||
      fresh.autoRenew !== detailRow.autoRenew ||
      fresh.autoRenewCyclesRemaining !== detailRow.autoRenewCyclesRemaining ||
      fresh.full_name !== detailRow.full_name ||
      fresh.status !== detailRow.status ||
      fresh.lastActive !== detailRow.lastActive ||
      fresh.phone !== detailRow.phone ||
      fresh.mac !== detailRow.mac;
    if (!rowChanged) return;
    const timer = window.setTimeout(() => {
      setDetailRow(fresh);
      setDetailReloadGeneration((g) => g + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tableRows, detailRow]);

  useEffect(() => {
    if (!detailRow) return;
    const handler = (event: Event) => {
      const prefix = (event as CustomEvent<{ prefix?: string }>).detail?.prefix ?? "";
      if (!prefix.startsWith(DATA_CACHE_NS.endUserDetails)) return;
      reloadDetailModal();
    };
    window.addEventListener(BILLING_DATA_CACHE_INVALIDATE, handler);
    return () => window.removeEventListener(BILLING_DATA_CACHE_INVALIDATE, handler);
  }, [detailRow, reloadDetailModal]);

  useEffect(() => {
    if (!detailAccount) {
      const timer = window.setTimeout(() => {
        setDetailLoading(false);
        setDetailError(null);
        setDetailData(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      setDetailLoading(true);
      setDetailError(null);
    }, 0);
    const scope = apiBaseToModalScope(apiBase);
    const cacheKey = dataCacheKey(DATA_CACHE_NS.endUserDetails, scope, detailAccount);
    const bypassCache = detailReloadGeneration > 0;
    if (!bypassCache) {
      const cached = getDataCache<Awaited<ReturnType<typeof loadEndUserDetailsModalAction>>>(cacheKey);
      if (cached?.ok && cached.user) {
        const cachedTimer = window.setTimeout(() => {
          setDetailData(cached.user);
          setDetailLoading(false);
        }, 0);
        return () => {
          controller.abort();
          window.clearTimeout(cachedTimer);
          window.clearTimeout(startTimer);
        };
      }
    }
    void loadEndUserDetailsModalAction({
      scope,
      account: detailAccount,
    })
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (!payload.ok || !payload.user) {
          throw new Error("failed");
        }
        setDetailData(payload.user);
        setDataCache(cacheKey, payload);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setDetailError("Could not load full user info.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => {
      controller.abort();
      window.clearTimeout(startTimer);
    };
  }, [detailAccount, apiBase, detailReloadGeneration]);

  useEffect(() => {
    if (!transactionsModalAccount) {
      const timer = window.setTimeout(() => {
        setTransactionsRows([]);
        setTransactionsError(null);
        setTransactionsLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      setTransactionsLoading(true);
      setTransactionsError(null);
    }, 0);
    const scope = apiBaseToModalScope(apiBase);
    const cacheKey = dataCacheKey(DATA_CACHE_NS.endUserTransactions, scope, transactionsModalAccount);
    const cached = getDataCache<Awaited<ReturnType<typeof loadEndUserTransactionsModalAction>>>(cacheKey);
    if (cached?.ok) {
      const cachedTimer = window.setTimeout(() => {
        setTransactionsRows(Array.isArray(cached.rows) ? cached.rows : []);
        setTransactionsLoading(false);
      }, 0);
      return () => {
        controller.abort();
        window.clearTimeout(cachedTimer);
        window.clearTimeout(startTimer);
      };
    }
    void cachedDataLoad(cacheKey, () =>
      loadEndUserTransactionsModalAction({
        scope,
        account: transactionsModalAccount,
      }),
    )
      .then((json) => {
        if (controller.signal.aborted) return;
        if (!json.ok) throw new Error("bad_payload");
        setTransactionsRows(Array.isArray(json.rows) ? json.rows : []);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load transactions", e);
        setTransactionsError("Could not load transaction history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setTransactionsLoading(false);
      });
    return () => {
      controller.abort();
      window.clearTimeout(startTimer);
    };
  }, [transactionsModalAccount, apiBase]);

  useEffect(() => {
    if (!hierarchyModal || !hierarchyRoles.has(hierarchyModal.role)) {
      const timer = window.setTimeout(() => {
        setHierarchyLoading(false);
        setHierarchyError(null);
        setHierarchyData(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const startTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      setHierarchyLoading(true);
      setHierarchyError(null);
      setHierarchyData(null);
    }, 0);
    const scope = apiBaseToModalScope(apiBase);
    const cacheKey = dataCacheKey(
      DATA_CACHE_NS.hierarchyProfile,
      scope,
      hierarchyModal.role,
      hierarchyModal.username,
    );
    const cached = getDataCache<Awaited<ReturnType<typeof loadHierarchyProfileModalAction>>>(cacheKey);
    if (cached?.ok && cached.profile) {
      const cachedTimer = window.setTimeout(() => {
        setHierarchyData(cached.profile);
        setHierarchyLoading(false);
      }, 0);
      return () => {
        controller.abort();
        window.clearTimeout(cachedTimer);
        window.clearTimeout(startTimer);
      };
    }
    void cachedDataLoad(cacheKey, () =>
      loadHierarchyProfileModalAction({
        scope,
        role: hierarchyModal.role,
        username: hierarchyModal.username,
      }),
    )
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (!payload.ok || !payload.profile) throw new Error("bad_payload");
        setHierarchyData(payload.profile);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load hierarchy profile", e);
        setHierarchyError("Could not load hierarchy profile.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setHierarchyLoading(false);
      });
    return () => {
      controller.abort();
      window.clearTimeout(startTimer);
    };
  }, [hierarchyModal, hierarchyRoles, apiBase]);
  const hasColumn = (key: ColumnKey) => visibleColumns.has(key);

  const visibleDataColumnCount = useMemo(
    () =>
      TABLE_COLUMNS.filter((c) => {
        if (c.key === "account" && !showUserIdColumn) return false;
        return visibleColumns.has(c.key);
      }).length,
    [visibleColumns, showUserIdColumn],
  );
  const emptyColSpan = 1 + visibleDataColumnCount + 1;
  const tableLayoutKeys = useMemo(
    () => subscriberTableLayoutKeys(visibleColumns, showUserIdColumn),
    [visibleColumns, showUserIdColumn],
  );
  const tableColWidths = useMemo(
    () => subscriberTableColumnWidths(visibleColumns, showUserIdColumn),
    [visibleColumns, showUserIdColumn],
  );
  const tableColumnIds = useMemo(
    () => subscribersPageTableColumnIds(visibleColumns as ReadonlySet<SubscribersPageColumnKey>, showUserIdColumn),
    [visibleColumns, showUserIdColumn],
  );
  const onHierarchyClick = (role: "manager" | "reseller" | "dealer", username: string) => {
    setHierarchyModal({ role, username });
  };
  /** Embedded list pages: content-width columns (same pattern as resellers table). */
  const compactTable = embedded;
  const embeddedFilterSelectClass = cn(
    managersToolbarSelectTriggerClass,
    "!w-full min-w-0 max-w-full !shrink justify-between gap-1 px-1.5 sm:gap-1.5 sm:px-2.5",
    "sm:!w-max sm:max-w-none sm:shrink-0",
  );

  const USERS_SEARCH_DEBOUNCE_MS = 350;
  const [queryInput, setQueryInput] = useState(toolbarFilters?.query ?? "");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingQueryRef = useRef<string | null>(null);

  const buildSearchHref = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams();
      const trimmed = nextQuery.trim();
      if (trimmed) params.set("query", trimmed);
      for (const [k, v] of Object.entries(toolbarFilters?.searchHiddenParams ?? {})) {
        const vv = String(v ?? "").trim();
        if (vv) params.set(k, vv);
      }
      const q = params.toString();
      const base = toolbarFilters?.searchAction ?? "/admin/users";
      return q ? `${base}?${q}` : base;
    },
    [toolbarFilters?.searchAction, toolbarFilters?.searchHiddenParams],
  );

  const applySearchNow = useCallback(
    (nextQuery: string) => {
      if (!toolbarFilters) return;
      router.replace(buildSearchHref(nextQuery), { scroll: false });
    },
    [buildSearchHref, router, toolbarFilters],
  );

  useEffect(() => {
    if (!toolbarFilters) return;
    const nextQ = toolbarFilters.query ?? "";
    const nextTrimmed = nextQ.trim();
    if (pendingQueryRef.current != null && pendingQueryRef.current === nextTrimmed) {
      pendingQueryRef.current = null;
    }
    const focused = typeof document !== "undefined" && document.activeElement === searchInputRef.current;
    if (focused && pendingQueryRef.current != null) return;
    setQueryInput(nextQ);
  }, [toolbarFilters]);

  useEffect(() => {
    if (!toolbarFilters) return;
    const trimmed = queryInput.trim();
    const urlQ = (toolbarFilters.query ?? "").trim();
    if (trimmed === urlQ) return;
    pendingQueryRef.current = trimmed;
    const t = window.setTimeout(() => applySearchNow(trimmed), USERS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [applySearchNow, queryInput, toolbarFilters]);
  const toolbarSearchField = (
    className?: string,
  ) => (
    <div className={cn("relative min-w-0 w-full", className)}>
      <input
        name="query"
        ref={searchInputRef}
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          applySearchNow(queryInput);
        }}
        className={
          embedded
            ? cn(managersToolbarSearchInputClass, "relative z-0 w-full")
            : "h-10 w-full rounded-lg border border-border/70 bg-background pl-10 pr-3 text-sm text-foreground outline-none ring-offset-background transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary/35 focus-visible:ring-1 focus-visible:ring-primary/35 focus-visible:shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
        }
        placeholder={
          isDealerPortal
            ? "Search name, username, or MAC…"
            : isResellerPortal
              ? "Search name, username, MAC, or owner…"
              : isManagerPortal
                ? "Search name, username, MAC, or owner…"
                : embedded
                  ? "Search name, user, MAC, owner, or user ID…"
                  : "Search name, username, MAC, owner, or user ID…"
        }
      />
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 text-muted-foreground",
          embedded ? "left-2 h-3.5 w-3.5 sm:left-2.5" : "left-3 h-4 w-4",
        )}
        aria-hidden
      />
    </div>
  );
  const th = compactTable
    ? (className?: string) => dataTableStickyTh(cn(embeddedTableThClass(className)))
    : (className?: string) => dataTableStickyTh(cn(subscribersThCompact, className));
  const td = compactTable ? embeddedTableTdClass() : subscribersTdBase;
  const legacyTd = (col: ColumnKey, extra?: string) =>
    cn(td, compactTable ? subscribersPageCellAlign(col) : "", extra);
  const tdClip = compactTable ? "" : subscribersTdTruncate;
  const columnLabel = (key: ColumnKey, full: string) =>
    responsiveTableColumnHeader(COLUMN_SHORT_LABELS[key], full, { compact: compactTable, breakpoint: "lg" });
  const dataTh = (col: ColumnKey, extra?: string) =>
    embedded
      ? subscribersPageHeaderCell(col, cn(subscribersPageCellAlign(col), embeddedTableThClass(extra, "tight")))
      : th(extra);
  const dataTd = (col: ColumnKey, extra?: string) =>
    embedded ? subscribersPageDataCell(col, cn(subscribersPageCellAlign(col), extra)) : cn(td, extra);

  const bulkToolbarBlock = (
    <div className="flex shrink-0 items-center gap-2">
      <span className={cn("whitespace-nowrap text-muted-foreground", embedded && "text-[11px] sm:text-xs")}>
        Selected: <span className="font-semibold text-foreground">{selected.size}</span>
      </span>
      <div className="relative">
        <button
          ref={bulkActionsAnchorRef}
          type="button"
          onClick={() => setBulkMenuOpen((o) => !o)}
          className={
            embedded
              ? adminListTableToolbarBulkButtonClass
              : "inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
          }
          aria-haspopup="menu"
          aria-expanded={bulkMenuOpen}
          aria-label={embedded ? "Bulk actions" : undefined}
          title={embedded ? "Bulk actions" : undefined}
        >
          <Settings className={embedded ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          {embedded ? "Bulk Action" : "Bulk Actions"}
        </button>
        <FloatingMenuPortal
          open={bulkMenuOpen}
          onOpenChange={setBulkMenuOpen}
          anchorRef={bulkActionsAnchorRef}
          align="start"
          hudCorners
          matchAnchorWidth
          matchAnchorToContentMaxWidth
          menuClassName={cn(floatingCompactMenuPanelClass, managersToolbarMenuSurfaceClass)}
        >
          <button
            type="button"
            onClick={() => {
              setBulkMenuOpen(false);
              openRenewModal();
            }}
            className={adminListTableBulkMenuItemClass}
            role="menuitem"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
            <span className="min-w-0 whitespace-nowrap">Renew</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkMenuOpen(false);
              openMessageModal();
            }}
            className={adminListTableBulkMenuItemClass}
            role="menuitem"
          >
            <MessageSquareText className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
            <span className="min-w-0 whitespace-nowrap">Message</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkMenuOpen(false);
              openDeleteModal();
            }}
            className={adminListTableBulkMenuItemDestructiveClass}
            role="menuitem"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            <span className="min-w-0 whitespace-nowrap">Delete</span>
          </button>
        </FloatingMenuPortal>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          embedded ? "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden" : "contents",
        )}
      >
      <div
        className={cn(
          embedded
            ? cn(
                adminListTableToolbarShellClass,
                adminListTableToolbarShellEmbeddedClass,
                toolbarFilters && "flex-col gap-2",
              )
            : "mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm",
        )}
      >
        {!(embedded && toolbarFilters) ? bulkToolbarBlock : null}
        <div
          className={cn(
            "flex min-w-0 items-center justify-start gap-2 sm:gap-2.5",
            embedded && toolbarFilters ? "w-full" : "flex-1",
            embedded && !toolbarFilters ? "flex-nowrap" : "",
            !embedded ? "flex-wrap" : "",
          )}
        >
          {toolbarFilters ? (
            <form
              action={toolbarFilters.searchAction}
              method="get"
              className={cn(
                "flex min-w-0 gap-2 sm:gap-2.5",
                embedded ? "w-full flex-col gap-2" : "items-center",
              )}
              onSubmit={(e) => {
                e.preventDefault();
                applySearchNow(queryInput);
              }}
            >
              {Object.entries(toolbarFilters.searchHiddenParams).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              {embedded ? (
                <>
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                    {toolbarSearchField("sm:min-w-[12rem] sm:max-w-[min(100%,28rem)] sm:flex-1")}
                    <div className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
                    <div className="min-w-0 sm:min-w-[6.75rem] sm:max-w-[9rem]">
                      <AdminUsersStatusControl
                        value={toolbarFilters.status}
                        options={toolbarFilters.statusOptions}
                        hrefByValue={toolbarFilters.statusHrefByValue}
                        triggerClassName={embeddedFilterSelectClass}
                      />
                    </div>
                    <div className="min-w-0 sm:min-w-[6.75rem] sm:max-w-[9rem]">
                      <AdminUsersAutoRenewControl
                        value={toolbarFilters.autoRenew}
                        options={toolbarFilters.autoRenewOptions}
                        hrefByValue={toolbarFilters.autoRenewHrefByValue}
                        triggerClassName={embeddedFilterSelectClass}
                      />
                    </div>
                    <div className="min-w-0 sm:min-w-[6.25rem] sm:max-w-[8rem]" id="admin-users-page-size-inline">
                      <AdminUsersPerPageControl
                        pageSize={toolbarFilters.pageSize}
                        options={toolbarFilters.pageSizeOptions}
                        hrefByValue={toolbarFilters.pageSizeHrefByValue}
                        triggerClassName={embeddedFilterSelectClass}
                      />
                    </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    {bulkToolbarBlock}
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {actionLinks ? (
                        <PortalAddSubscriberToolbarButton
                          href={actionLinks.addSubscriberHref}
                          canAdd={canAddSubscriber}
                          onModalOpen={
                            addUserModalData
                              ? () => {
                                  if (!canAddSubscriber) return;
                                  setAddUserOpen(true);
                                }
                              : undefined
                          }
                        />
                      ) : null}
                      {actionLinks?.exportFilters ? (
                        <button
                          type="button"
                          onClick={() => void exportSubscribersCsv()}
                          disabled={exportBusy}
                          className={managersToolbarIconButtonClass}
                          aria-label="Export CSV"
                          title="Export CSV"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                        </button>
                      ) : null}
                      <div className="relative">
                        <button
                          ref={columnsButtonRef}
                          type="button"
                          onClick={() => setColumnsOpen((o) => !o)}
                          className={managersToolbarIconButtonClass}
                          aria-label="Column settings"
                          title="Column settings"
                          aria-haspopup="menu"
                          aria-expanded={columnsOpen}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
                        </button>
                        <FloatingMenuPortal
                          open={columnsOpen}
                          onOpenChange={setColumnsOpen}
                          anchorRef={columnsButtonRef}
                          hudCorners
                          menuClassName={cn("px-1 py-1 text-xs leading-tight", floatingPopoverMenuPanelClass, managersToolbarMenuSurfaceClass)}
                        >
                          <p className="mb-1 whitespace-nowrap border-b border-border/50 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-b-cyan-400/10">
                            Visible columns
                          </p>
                          <div className="flex flex-col" role="menu">
                            {configurableColumns.map((col) => {
                              const isChecked = visibleColumns.has(col.key);
                              const soleVisibleLock = isChecked && visibleColumns.size === 1;
                              return (
                                <button
                                  key={col.key}
                                  type="button"
                                  role="menuitemcheckbox"
                                  aria-checked={isChecked}
                                  disabled={soleVisibleLock}
                                  onClick={() => {
                                    if (soleVisibleLock) return;
                                    setVisibleColumns((prev) => {
                                      const next = new Set(prev);
                                      if (isChecked) next.delete(col.key);
                                      else next.add(col.key);
                                      return next;
                                    });
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-2 rounded-none px-1.5 py-1 text-left text-xs leading-tight text-foreground transition-colors first:pt-0.5 last:pb-0.5 hover:bg-muted/40",
                                    soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "min-w-0 flex-1 truncate pr-1",
                                      soleVisibleLock && "text-muted-foreground",
                                    )}
                                  >
                                    {col.label}
                                  </span>
                                  <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
                                    {isChecked ? (
                                      <Check
                                        className={cn(
                                          "h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400",
                                          soleVisibleLock && "text-cyan-600/35 dark:text-cyan-400/35",
                                        )}
                                        strokeWidth={2.25}
                                      />
                                    ) : null}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </FloatingMenuPortal>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {toolbarSearchField(cn("min-w-0 flex-1", adminListTableToolbarSearchFieldEmbeddedClass))}
                  <AdminUsersStatusControl
                    value={toolbarFilters.status}
                    options={toolbarFilters.statusOptions}
                    hrefByValue={toolbarFilters.statusHrefByValue}
                  />
                  <AdminUsersAutoRenewControl
                    value={toolbarFilters.autoRenew}
                    options={toolbarFilters.autoRenewOptions}
                    hrefByValue={toolbarFilters.autoRenewHrefByValue}
                  />
                  <div className="ml-1 flex items-center">
                    <div id="admin-users-page-size-inline">
                      <AdminUsersPerPageControl
                        pageSize={toolbarFilters.pageSize}
                        options={toolbarFilters.pageSizeOptions}
                        hrefByValue={toolbarFilters.pageSizeHrefByValue}
                      />
                    </div>
                  </div>
                </>
              )}
            </form>
          ) : null}
          {filterNotice ? (
            <div className="flex min-w-0 max-w-md shrink-0 items-center gap-2 text-xs text-muted-foreground sm:max-w-lg sm:text-sm">
              <span className="min-w-0 truncate">
                {filterNotice.message} <span className="font-mono font-semibold text-primary">{filterNotice.value}</span>
              </span>
              <Link href={filterNotice.clearHref} className="shrink-0 font-medium text-primary underline-offset-2 hover:underline">
                {filterNotice.clearLabel}
              </Link>
            </div>
          ) : null}
          {!embedded ? (
            <>
              <div className="ml-auto flex shrink-0 items-center gap-2 text-xs sm:text-sm">
                {actionLinks ? (
                  <PortalAddSubscriberToolbarButton
                    href={actionLinks.addSubscriberHref}
                    canAdd={canAddSubscriber}
                    onModalOpen={
                      addUserModalData
                        ? () => {
                            if (!canAddSubscriber) return;
                            setAddUserOpen(true);
                          }
                        : undefined
                    }
                  />
                ) : null}
              </div>
              <div className="relative">
                <button
                  ref={columnsButtonRef}
                  type="button"
                  onClick={() => setColumnsOpen((o) => !o)}
                  className={cn(managersToolbarIconButtonClass, "list-none cursor-pointer")}
                  aria-label="Column settings"
                  title="Column settings"
                  aria-haspopup="menu"
                  aria-expanded={columnsOpen}
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
                </button>
                <FloatingMenuPortal
                  open={columnsOpen}
                  onOpenChange={setColumnsOpen}
                  anchorRef={columnsButtonRef}
                  hudCorners
                  menuClassName={cn("px-1 py-1 text-xs leading-tight", floatingPopoverMenuPanelClass, managersToolbarMenuSurfaceClass)}
                >
                  <p className="mb-1 whitespace-nowrap border-b border-border/50 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-b-cyan-400/10">
                    Visible columns
                  </p>
                  <div className="flex flex-col" role="menu">
                    {configurableColumns.map((col) => {
                      const isChecked = visibleColumns.has(col.key);
                      const soleVisibleLock = isChecked && visibleColumns.size === 1;
                      return (
                        <button
                          key={col.key}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={isChecked}
                          disabled={soleVisibleLock}
                          onClick={() => {
                            if (soleVisibleLock) return;
                            setVisibleColumns((prev) => {
                              const next = new Set(prev);
                              if (isChecked) next.delete(col.key);
                              else next.add(col.key);
                              return next;
                            });
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-none px-1.5 py-1 text-left text-xs leading-tight text-foreground transition-colors first:pt-0.5 last:pb-0.5 hover:bg-muted/40",
                            soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate pr-1",
                              soleVisibleLock && "text-muted-foreground",
                            )}
                          >
                            {col.label}
                          </span>
                          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
                            {isChecked ? (
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400",
                                  soleVisibleLock && "text-cyan-600/35 dark:text-cyan-400/35",
                                )}
                                strokeWidth={2.25}
                              />
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FloatingMenuPortal>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {addUserModalData && addUserOpen ? (
        <AdminAddUserModal
          open={addUserOpen}
          onClose={() => setAddUserOpen(false)}
          managers={addUserModalData.managers ?? []}
          resellers={addUserModalData.resellers}
          tariffs={addUserModalData.tariffs}
          validityOptions={addUserModalData.validityOptions}
          customPlanId={addUserModalData.customPlanId}
          addonPackages={addUserModalData.addonPackages}
          returnTo={resetReturnPath}
          billingOwnershipRole={isDealerPortal ? "dealer" : isResellerPortal ? "reseller" : isManagerPortal ? "manager" : "admin"}
          createAction={
            isManagerPortal
              ? createManagerEndUserAction
              : isResellerPortal
                ? createResellerEndUserFromListAction
                : isDealerPortal
                  ? createDealerEndUserFromListAction
                  : undefined
          }
          createResultAction={
            isManagerPortal
              ? createManagerEndUserFromListResultAction
              : isResellerPortal
                ? createResellerEndUserFromListResultAction
                : isDealerPortal
                  ? createDealerEndUserFromListResultAction
                  : createUserResultAction
          }
          saveAction={
            isManagerPortal
              ? saveManagerUserFromListAction
              : isResellerPortal
                ? saveResellerUserFromListAction
                : isDealerPortal
                  ? saveDealerUserFromListAction
                  : undefined
          }
          loadDealersAction={
            isManagerPortal
              ? loadDealersForManagerResellerAction
              : isResellerPortal
                ? loadDealersForResellerPortalAction
                : undefined
          }
          hideBillingOwnership={isDealerPortal}
        />
      ) : null}

      {transactionsModalAccount ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto p-2 sm:p-3"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close transaction history"
            onClick={() => setTransactionsModalAccount(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transactions-modal-title"
            className={cn(
              "relative z-10 box-border flex w-full max-w-[min(96vw,1400px)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden shadow-xl sm:max-h-[calc(100dvh-2.5rem)]",
              managersToolbarModalShellClass,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <HudCornerOverlay tone="bright" />
            <div className="relative z-[1] flex min-h-0 w-full flex-col overflow-hidden p-2.5 sm:p-3">
              <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 pb-2 dark:border-b-cyan-400/10">
                <div className="min-w-0">
                  <h2 id="transactions-modal-title" className="inline-flex items-center gap-1.5 text-base font-semibold leading-tight text-foreground">
                    <ReceiptText className="h-4 w-4 shrink-0 text-primary/90" aria-hidden />
                    Transaction history
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Account{" "}
                    <span className="font-mono font-semibold text-foreground">{transactionsModalAccount}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label="Close transaction history"
                  onClick={() => setTransactionsModalAccount(null)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              {transactionsLoading ? (
                <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
                  Loading transaction history…
                </p>
              ) : null}
              {transactionsError ? (
                <p className="py-3 text-center text-sm text-destructive">{transactionsError}</p>
              ) : null}
              {!transactionsLoading && !transactionsError ? (
                <div className="flex min-h-0 w-full flex-col overflow-hidden">
                  <EndUserTransactionsTable rows={transactionsRows} fillHeight modalColumnPreset="subscriber" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
          embedded && "flex min-h-0 flex-1 flex-col rounded-none border-x-0 border-y-0 shadow-none ring-0",
        )}
      >
        {embedded ? (
          <SubscribersPageTableScrollShell columnIds={tableColumnIds}>
            <table className={SUBSCRIBERS_PAGE_RESPONSIVE_TABLE_CLASS}>
              <thead>
                <tr>
                  <th className={cn(th(), dataTableSelectionColumnClass)}>
                    <DataTableSelectionCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all on this page"
                    />
                  </th>
                  {showUserIdColumn && hasColumn("account") ? (
                    <th className={dataTh("account")}>
                      <Link href={sortUrls.account} className={cn(subscribersPageSortHeaderLinkClass("account"), "hover:text-foreground")}>
                        {columnLabel("account", "User ID")}
                        {sort === "account" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("name") ? (
                    <th className={dataTh("name")}>
                      <Link href={sortUrls.full_name} className={cn(subscribersPageSortHeaderLinkClass("name"), "hover:text-foreground")}>
                        {columnLabel("name", "Name")}
                        {sort === "full_name" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("username") ? (
                    <th className={dataTh("username")}>
                      <Link href={sortUrls.username} className={cn(subscribersPageSortHeaderLinkClass("username"), "hover:text-foreground")}>
                        {columnLabel("username", "Username")}
                        {sort === "username" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("mac") ? (
                    <th className={dataTh("mac")}>
                      <Link href={sortUrls.mac} className={cn(subscribersPageSortHeaderLinkClass("mac"), "hover:text-foreground")}>
                        {columnLabel("mac", "MAC ID")}
                        {sort === "mac" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("parents") ? (
                    <th className={dataTh("parents")}>
                      <span className={subscribersPageHeaderLabelWrapClass("parents")}>
                        {columnLabel("parents", "Parents")}
                      </span>
                    </th>
                  ) : null}
                  {hasColumn("status") ? (
                    <th className={dataTh("status")}>
                      <Link href={sortUrls.status} className={cn(subscribersPageSortHeaderLinkClass("status"), "hover:text-foreground")}>
                        {columnLabel("status", "Status")}
                        {sort === "status" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("state") ? (
                    <th className={dataTh("state")}>
                      <span className={subscribersPageHeaderLabelWrapClass("state")}>{columnLabel("state", "State")}</span>
                    </th>
                  ) : null}
                  {hasColumn("created") ? (
                    <th className={dataTh("created")}>
                      <Link href={sortUrls.created} className={cn(subscribersPageSortHeaderLinkClass("created"), "hover:text-foreground")}>
                        {columnLabel("created", "Create date")}
                        {sort === "created" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("expiry") ? (
                    <th className={dataTh("expiry")}>
                      <Link href={sortUrls.expires} className={cn(subscribersPageSortHeaderLinkClass("expiry"), "hover:text-foreground")}>
                        {columnLabel("expiry", "Expiry date")}
                        {sort === "expires" ? (
                          <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </Link>
                    </th>
                  ) : null}
                  {hasColumn("autoRenew") ? (
                    <th className={dataTh("autoRenew")}>
                      <span className={subscribersPageHeaderLabelWrapClass("autoRenew")}>
                        {columnLabel("autoRenew", "Auto renewal")}
                      </span>
                    </th>
                  ) : null}
                  <th className={subscribersPageActionsHeaderCell("text-center")}>
                    <span className="inline-flex items-center justify-center" aria-hidden>
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={emptyColSpan} className="px-4 py-12 text-center">
                      <p className="text-sm font-medium text-foreground">No users match your filters</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        Try clearing the search box, widening filters, or changing page size.
                      </p>
                    </td>
                  </tr>
                ) : (
                  <SubscribersPageVirtualizedTbody rowCount={tableRows.length} colSpan={emptyColSpan}>
                    {({ index }) => {
                    const r = tableRows[index]!;
                    const subscriptionExpired = isBillingAccountExpired(r.expires);
                    const rowActions = (
                      <AdminSubscriberRowActions
                        account={r.account}
                        displayName={r.full_name ?? r.username ?? r.account}
                        resetReturnPath={resetReturnPath}
                        subscriptionExpired={subscriptionExpired}
                        accountActive={r.status === 0}
                        validityOptions={validityOptions}
                        recoverBonusEnabled={recoverBonusEnabled}
                        subscribersPortal={subscribersPortal}
                        openEditOnMount={initialEditAccount === r.account}
                        onViewDetail={() => setDetailRow(r)}
                        onViewTransactions={() => setTransactionsModalAccount(r.account)}
                        editModalData={
                          addUserModalData
                            ? {
                                resellers: addUserModalData.resellers,
                                tariffs: addUserModalData.tariffs,
                                customPlanId: addUserModalData.customPlanId,
                                addonPackages: addUserModalData.addonPackages,
                              }
                            : undefined
                        }
                      />
                    );
                    return (
                      <SubscribersPageExpandableRow
                        colSpan={emptyColSpan}
                        expandPersistId={`user:${r.account}`}
                        actions={rowActions}
                        details={
                          <SubscribersPageRowDetailsPanel
                            row={r}
                            visibleColumns={visibleColumns as ReadonlySet<SubscribersPageColumnKey>}
                            showUserIdColumn={showUserIdColumn}
                            autoRenewHandlers={{
                              onConfigure: () => openAutoRenewForRow(r),
                              onDisable: handleDisableAutoRenew,
                            }}
                          />
                        }
                        rowClassName={adminEmbeddedListRowClass}
                      >
                        <td className={cn(td, dataTableSelectionColumnClass)}>
                          <DataTableSelectionCheckbox
                            checked={selected.has(r.account)}
                            onChange={(e) => toggleOne(r.account, e.target.checked)}
                            aria-label={`Select ${r.account}`}
                          />
                        </td>
                        {showUserIdColumn && hasColumn("account") ? (
                          <td className={dataTd("account")}>
                            <SubscriberStalkerUserIdCell row={r} />
                          </td>
                        ) : null}
                        {hasColumn("name") ? (
                          <td className={dataTd("name", "font-medium text-foreground")}>
                            <div className="flex w-full justify-center">
                              <InlineEditableUserCell
                                account={r.account}
                                field="user"
                                value={r.full_name?.trim() || ""}
                                inlineApiPath={`${apiBase}/users-inline`}
                                className="min-w-0"
                                onInlineSave={applyInlineUserSave}
                              />
                            </div>
                          </td>
                        ) : null}
                        {hasColumn("username") ? (
                          <td className={dataTd("username")}>
                            <SubscriberAccountUsernameCell
                              row={r}
                              linkClassName="whitespace-nowrap"
                              onOpenDetail={() => setDetailRow(r)}
                            />
                          </td>
                        ) : null}
                        {hasColumn("mac") ? (
                          <td className={dataTd("mac", "text-xs text-muted-foreground")}>
                            <div className="flex w-full flex-col items-center">
                              <InlineEditableUserCell
                                account={r.account}
                                field="mac"
                                value={r.mac || ""}
                                inlineApiPath={`${apiBase}/users-inline`}
                                className="min-w-0"
                                onInlineSave={applyInlineUserSave}
                              />
                            </div>
                          </td>
                        ) : null}
                        {hasColumn("parents") ? (
                          <td className={dataTd("parents", "text-xs text-muted-foreground")}>
                            <div className="flex w-full justify-center">
                              <SubscriberParentsCell
                                row={r}
                                usersListPath={usersListPath}
                                hierarchyRoles={hierarchyRoles}
                                onHierarchyClick={onHierarchyClick}
                              />
                            </div>
                          </td>
                        ) : null}
                        {hasColumn("status") ? (
                          <td className={dataTd("status", "relative overflow-visible")}>
                            <InlineEditableUserCell
                              account={r.account}
                              field="status"
                              value={String(r.status ?? 0)}
                              expired={subscriptionExpired}
                              inlineApiPath={`${apiBase}/users-inline`}
                              onInlineSave={applyInlineUserSave}
                            />
                          </td>
                        ) : null}
                        {hasColumn("state") ? (
                          <td className={dataTd("state")}>
                            <SubscriberStateCell
                              online={r.receiverOnline}
                              nowPlaying={r.nowPlaying}
                              compact
                              dense
                            />
                          </td>
                        ) : null}
                        {hasColumn("created") ? (
                          <td className={dataTd("created", "tabular-nums text-muted-foreground")}>
                            {formatSubscriberCreated(r.created)}
                          </td>
                        ) : null}
                        {hasColumn("expiry") ? (
                          <td className={dataTd("expiry", "tabular-nums text-muted-foreground")} title={r.expires ? String(r.expires) : undefined}>
                            <SubscriberExpiryTableCell expires={r.expires} compact />
                          </td>
                        ) : null}
                        {hasColumn("autoRenew") ? (
                          <td className={cn(dataTd("autoRenew"), "align-middle")}>
                            <div className="flex justify-center">
                              <SubscriberAutoRenewCell
                                account={r.account}
                                expires={r.expires}
                                autoRenew={r.autoRenew}
                                autoRenewCyclesRemaining={r.autoRenewCyclesRemaining}
                                onConfigure={() => openAutoRenewForRow(r)}
                                onDisable={handleDisableAutoRenew}
                              />
                            </div>
                          </td>
                        ) : null}
                      </SubscribersPageExpandableRow>
                    );
                    }}
                  </SubscribersPageVirtualizedTbody>
                )}
              </tbody>
            </table>
          </SubscribersPageTableScrollShell>
        ) : (
        <div
          className={cn(
            "thin-scrollbar w-full max-w-full min-w-0",
            "app-data-table-scroll",
          )}
        >
          <table
            className={cn(
              "border-collapse text-left",
              "w-full min-w-[1080px] table-fixed text-sm",
            )}
          >
            <colgroup>
              {tableLayoutKeys.map((key, i) => (
                <col key={key} style={{ width: tableColWidths[i] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={cn(th(), dataTableSelectionColumnClass)}>
                  <DataTableSelectionCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all on this page"
                  />
                </th>
                {showUserIdColumn && hasColumn("account") ? (
                  <th className={th(subscribersPageCellAlign("account"))}>
                    <Link href={sortUrls.account} className={cn(subscribersPageSortHeaderLinkClass("account"), "hover:text-foreground")}>
                      {columnLabel("account", "User ID")}
                      {sort === "account" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("name") ? (
                  <th className={th(subscribersPageCellAlign("name"))}>
                    <Link href={sortUrls.full_name} className={cn(subscribersPageSortHeaderLinkClass("name"), "hover:text-foreground")}>
                      {columnLabel("name", "Name")}
                      {sort === "full_name" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("username") ? (
                  <th className={th(subscribersPageCellAlign("username"))}>
                    <Link href={sortUrls.username} className={cn(subscribersPageSortHeaderLinkClass("username"), "hover:text-foreground")}>
                      {columnLabel("username", "Username")}
                      {sort === "username" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("mac") ? (
                  <th className={th(subscribersPageCellAlign("mac"))}>
                    <Link href={sortUrls.mac} className={cn(subscribersPageSortHeaderLinkClass("mac"), "hover:text-foreground")}>
                      {columnLabel("mac", "MAC ID")}
                      {sort === "mac" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("parents") ? (
                  <th className={th(subscribersPageCellAlign("parents"))}>
                    <span className={subscribersPageHeaderLabelWrapClass("parents")}>
                      {columnLabel("parents", "Parents")}
                    </span>
                  </th>
                ) : null}
                {hasColumn("status") ? (
                  <th className={th(subscribersPageCellAlign("status"))}>
                    <Link href={sortUrls.status} className={cn(subscribersPageSortHeaderLinkClass("status"), "hover:text-foreground")}>
                      {columnLabel("status", "Status")}
                      {sort === "status" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("state") ? (
                  <th className={th(subscribersPageCellAlign("state"))}>
                    <span className={subscribersPageHeaderLabelWrapClass("state")}>{columnLabel("state", "State")}</span>
                  </th>
                ) : null}
                {hasColumn("created") ? (
                  <th className={th(subscribersPageCellAlign("created"))}>
                    <Link href={sortUrls.created} className={cn(subscribersPageSortHeaderLinkClass("created"), "hover:text-foreground")}>
                      {columnLabel("created", "Create date")}
                      {sort === "created" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("expiry") ? (
                  <th className={th(subscribersPageCellAlign("expiry"))}>
                    <Link href={sortUrls.expires} className={cn(subscribersPageSortHeaderLinkClass("expiry"), "hover:text-foreground")}>
                      {columnLabel("expiry", "Expiry date")}
                      {sort === "expires" ? (
                        <ChevronDown className={cn("h-3.5 w-3.5", dir === "asc" ? "rotate-180" : "")} aria-hidden />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      )}
                    </Link>
                  </th>
                ) : null}
                {hasColumn("autoRenew") ? (
                  <th className={th(subscribersPageCellAlign("autoRenew"))}>
                    <span className={subscribersPageHeaderLabelWrapClass("autoRenew")}>
                      {columnLabel("autoRenew", "Auto renewal")}
                    </span>
                  </th>
                ) : null}
                <th className={th("text-center")}>
                  <span className="inline-flex items-center justify-center" aria-hidden>
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">No users match your filters</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Try clearing the search box, widening filters, or changing page size.
                    </p>
                  </td>
                </tr>
              ) : (
                tableRows.map((r) => {
                  const subscriptionExpired = isBillingAccountExpired(r.expires);
                  return (
                    <tr key={r.account} className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/15">
                      <td className={cn(td, dataTableSelectionColumnClass)}>
                        <DataTableSelectionCheckbox
                          checked={selected.has(r.account)}
                          onChange={(e) => toggleOne(r.account, e.target.checked)}
                          aria-label={`Select ${r.account}`}
                        />
                      </td>
                      {showUserIdColumn && hasColumn("account") ? (
                        <td className={legacyTd("account")}>
                          <SubscriberStalkerUserIdCell row={r} className={compactTable ? undefined : "text-xs"} />
                        </td>
                      ) : null}
                      {hasColumn("name") ? (
                        <td className={legacyTd("name", "font-medium text-foreground")}>
                          <div className="flex w-full justify-center">
                            <InlineEditableUserCell
                              account={r.account}
                              field="user"
                              value={r.full_name?.trim() || ""}
                              inlineApiPath={`${apiBase}/users-inline`}
                              className="min-w-0"
                              onInlineSave={applyInlineUserSave}
                            />
                          </div>
                        </td>
                      ) : null}
                      {hasColumn("username") ? (
                        <td className={legacyTd("username", compactTable ? "" : tdClip)}>
                          <SubscriberAccountUsernameCell
                            row={r}
                            linkClassName={compactTable ? "whitespace-nowrap" : "max-w-full truncate"}
                            onOpenDetail={() => setDetailRow(r)}
                          />
                        </td>
                      ) : null}
                      {hasColumn("mac") ? (
                        <td className={legacyTd("mac", "text-xs text-muted-foreground")}>
                          <div className="flex w-full flex-col items-center">
                            <InlineEditableUserCell
                              account={r.account}
                              field="mac"
                              value={r.mac || ""}
                              inlineApiPath={`${apiBase}/users-inline`}
                              className="min-w-0"
                              onInlineSave={applyInlineUserSave}
                            />
                          </div>
                        </td>
                      ) : null}
                      {hasColumn("parents") ? (
                        <td className={legacyTd("parents", compactTable ? "text-muted-foreground" : cn(tdClip, "text-xs text-muted-foreground"))}>
                          <div className="flex w-full justify-center">
                            <SubscriberParentsCell
                              row={r}
                              usersListPath={usersListPath}
                              hierarchyRoles={hierarchyRoles}
                              onHierarchyClick={onHierarchyClick}
                              truncate={!compactTable}
                            />
                          </div>
                        </td>
                      ) : null}
                      {hasColumn("status") ? (
                        <td className={cn(td, "relative overflow-visible text-center")}>
                          <InlineEditableUserCell
                            account={r.account}
                            field="status"
                            value={String(r.status ?? 0)}
                            expired={subscriptionExpired}
                            inlineApiPath={`${apiBase}/users-inline`}
                            onInlineSave={applyInlineUserSave}
                          />
                        </td>
                      ) : null}
                      {hasColumn("state") ? (
                        <td className={cn(td, "text-center")}>
                          <SubscriberStateCell
                            online={r.receiverOnline}
                            nowPlaying={r.nowPlaying}
                            compact={compactTable}
                            dense={compactTable}
                          />
                        </td>
                      ) : null}
                      {hasColumn("created") ? (
                        <td className={cn(td, "tabular-nums text-muted-foreground text-center")}>
                          {formatSubscriberCreated(r.created)}
                        </td>
                      ) : null}
                      {hasColumn("expiry") ? (
                        <td className={cn(td, "tabular-nums text-muted-foreground")} title={r.expires ? String(r.expires) : undefined}>
                          <SubscriberExpiryTableCell expires={r.expires} compact={compactTable} />
                        </td>
                      ) : null}
                      {hasColumn("autoRenew") ? (
                        <td className={cn(td, "text-center align-middle")}>
                          <div className="flex justify-center">
                            <SubscriberAutoRenewCell
                              account={r.account}
                              expires={r.expires}
                              autoRenew={r.autoRenew}
                              autoRenewCyclesRemaining={r.autoRenewCyclesRemaining}
                              onConfigure={() => openAutoRenewForRow(r)}
                              onDisable={handleDisableAutoRenew}
                            />
                          </div>
                        </td>
                      ) : null}
                      <td className={cn(td, "text-center")}>
                        <AdminSubscriberRowActions
                          account={r.account}
                          displayName={r.full_name ?? r.username ?? r.account}
                          resetReturnPath={resetReturnPath}
                          subscriptionExpired={subscriptionExpired}
                          accountActive={r.status === 0}
                          validityOptions={validityOptions}
                          recoverBonusEnabled={recoverBonusEnabled}
                          subscribersPortal={subscribersPortal}
                          openEditOnMount={initialEditAccount === r.account}
                          onViewDetail={() => setDetailRow(r)}
                          onViewTransactions={() => setTransactionsModalAccount(r.account)}
                          editModalData={
                            addUserModalData
                              ? {
                                  resellers: addUserModalData.resellers,
                                  tariffs: addUserModalData.tariffs,
                                  customPlanId: addUserModalData.customPlanId,
                                  addonPackages: addUserModalData.addonPackages,
                                }
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
      </div>

      {detailRow ? (
        <SubscriberDetailViewModal
          row={detailRow}
          detailData={detailData}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setDetailRow(null);
            setDetailRenewOpen(false);
            setAutoRenewModalTarget(null);
            setDetailEditOpen(false);
          }}
          onRenew={() => setDetailRenewOpen(true)}
          onAutoRenew={() =>
            setAutoRenewModalTarget({
              account: detailRow.account,
              displayName: detailRow.full_name ?? detailRow.username ?? detailRow.account,
            })
          }
          onEdit={() => setDetailEditOpen(true)}
          onViewTransactions={() => setTransactionsModalAccount(detailRow.account)}
        />
      ) : null}

      {detailRow && detailRenewOpen ? (
        <SubscriberRenewAccountModal
          account={detailRow.account}
          displayName={detailRow.full_name ?? detailRow.username ?? detailRow.account}
          open
          onClose={() => setDetailRenewOpen(false)}
          onAfterSuccess={() => {
            refreshDetailModal();
            dispatchBillingHeaderStatsRefresh();
          }}
          validityOptions={validityOptions}
          loadAvailability={async () => {
            const res = isOperatorPortal
              ? await getPortalAccountRenewRecoveryAvailabilityAction(detailRow.account)
              : await getAccountRenewRecoveryAvailabilityAction(detailRow.account);
            if (!res.ok) return null;
            return res;
          }}
          onSubmit={async (validity) => {
            const account = detailRow.account;
            const res = isOperatorPortal
              ? await renewPortalSubscriberAccountAction({
                  account,
                  validity,
                  autoRenewEnabled: false,
                  autoRenewTotalCycles: 0,
                })
              : await renewSubscriberAccountAction({
                  account,
                  validity,
                  autoRenewEnabled: false,
                  autoRenewTotalCycles: 0,
                });
            if (!res.ok) return { ok: false, message: res.message };
            invalidateAfterEndUserDetailMutation(account);
            return { ok: true };
          }}
        />
      ) : null}

      {autoRenewModalTarget ? (
        <SubscriberSetAutoRenewModal
          account={autoRenewModalTarget.account}
          displayName={autoRenewModalTarget.displayName ?? autoRenewModalTarget.account}
          accountActive={autoRenewModalTarget.accountActive}
          open
          onClose={() => setAutoRenewModalTarget(null)}
          validityOptions={validityOptions}
          loadAvailability={async () => {
            const account = autoRenewModalTarget.account;
            const res = isOperatorPortal
              ? await getPortalAccountRenewRecoveryAvailabilityAction(account)
              : await getAccountRenewRecoveryAvailabilityAction(account);
            if (!res.ok) return null;
            return res;
          }}
          onSubmit={async (period) => {
            const account = autoRenewModalTarget.account;
            const res = isOperatorPortal
              ? await setPortalSubscriberAutoRenewAction({ account, period })
              : await setSubscriberAutoRenewAction({ account, period });
            if (!res.ok) return { ok: false, message: res.message };
            setAutoRenewModalTarget(null);
            invalidateAfterEndUserDetailMutation(account);
            if (detailRow?.account === account) refreshDetailModal();
            dispatchBillingHeaderStatsRefresh();
            router.refresh();
            return { ok: true };
          }}
        />
      ) : null}

      {detailRow && detailEditOpen ? (
          <AdminSubscriberRowActions
            key={`detail-edit-${detailRow.account}-${detailEditOpen}`}
            account={detailRow.account}
            displayName={detailRow.full_name ?? detailRow.username ?? detailRow.account}
            resetReturnPath={resetReturnPath}
            subscriptionExpired={isBillingAccountExpired(detailRow.expires)}
            accountActive={detailRow.status === 0}
            validityOptions={validityOptions}
            recoverBonusEnabled={recoverBonusEnabled}
            subscribersPortal={subscribersPortal}
            hideMenuTrigger
            openEditOnMount
            onEditClosed={() => {
              setDetailEditOpen(false);
            }}
            initialEditData={
              detailData
                ? {
                    name: detailData.name ?? "",
                    mac: detailData.mac ?? "",
                    ip: detailData.ip ?? "",
                    phone: detailData.phone ?? "",
                    comments: detailData.comments ?? "",
                    statusCode: Number(detailData.statusCode ?? 0),
                    reseller: detailData.reseller ?? "",
                    dealer: detailData.dealer ?? "",
                    tariffPlanId: Number(detailData.tariffPlanId ?? 0),
                    subscribedPackageIds: (detailData.subscribedPackageIds ?? [])
                      .map((n) => Number(n))
                      .filter((n) => Number.isFinite(n) && n > 0),
                  }
                : undefined
            }
            editModalData={
              addUserModalData
                ? {
                    resellers: addUserModalData.resellers,
                    tariffs: addUserModalData.tariffs,
                    customPlanId: addUserModalData.customPlanId,
                    addonPackages: addUserModalData.addonPackages,
                  }
                : undefined
            }
          />
      ) : null}

      {hierarchyModal ? (
        <div
          className={cn("fixed inset-0 z-50 flex items-center justify-center p-2.5", adminHudModalBackdropClass)}
          role="dialog"
          aria-modal="true"
          onClick={() => setHierarchyModal(null)}
        >
          <div
            className={cn(
              "relative flex max-h-[min(92dvh,880px)] w-full max-w-[920px] flex-col overflow-hidden shadow-xl",
              managersToolbarModalOpaqueShellClass,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <HudCornerOverlay />
            <div className="hud-modal-opaque-panel relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-white dark:bg-[hsl(222_47%_6%/0.94)]">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cyan-600/15 px-4 py-3 dark:border-cyan-400/10">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">User information</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {hierarchyModal.role}: <span className="font-semibold text-foreground">{hierarchyModal.username}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHierarchyModal(null)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            <div className="space-y-3">
              {hierarchyLoading ? <p className="text-sm text-muted-foreground">Loading full user info...</p> : null}
              {hierarchyError ? <p className="text-sm text-destructive">{hierarchyError}</p> : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    subscriberAccountStatusBadgeClassName(String(hierarchyData?.status ?? "A").toUpperCase() === "A"),
                  )}
                >
                  {String(hierarchyData?.status ?? "A").toUpperCase() === "A" ? "Active" : "Inactive"}
                </span>
                <span className={userDetailStatPillClass}>Credits: {hierarchyData?.credits ?? 0}</span>
                <span className={userDetailStatPillClass}>Tx: {hierarchyData?.transactionSummary?.total ?? 0}</span>
                <span className={userDetailStatPillClass}>Credits in: {hierarchyData?.transactionSummary?.creditCount ?? 0}</span>
                <span className={userDetailStatPillClass}>Credits out: {hierarchyData?.transactionSummary?.debitCount ?? 0}</span>
                <span className={userDetailStatPillClass}>+Periods: {hierarchyData?.transactionSummary?.creditPeriods ?? 0}</span>
                <span className={userDetailStatPillClass}>-Periods: {hierarchyData?.transactionSummary?.debitPeriods ?? 0}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">Profile</h3>
                  <dl className="space-y-1.5">
                    <Row label="Name" value={hierarchyData?.name || "—"} />
                    <Row label="Username" value={hierarchyData?.username || hierarchyModal.username} />
                    <Row label="Comments" value={hierarchyData?.comments || "—"} multiline />
                  </dl>
                </section>
                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">Ownership</h3>
                  <dl className="space-y-1.5">
                    <Row label="Role" value={hierarchyModal.role} />
                    <Row label="Manager" value={hierarchyData?.manager || "—"} />
                    <Row label="Reseller" value={hierarchyData?.reseller || "—"} />
                    <Row label="Tickets manager" value={hierarchyData?.ticketsManager || "—"} />
                    <Row label="Net periods" value={String(hierarchyData?.transactionSummary?.netPeriods ?? 0)} />
                    <Row label="Last transaction" value={hierarchyData?.transactionSummary?.lastTransactionAt ? String(hierarchyData.transactionSummary.lastTransactionAt).slice(0, 19) : "—"} />
                  </dl>
                </section>
                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">Recent transaction preview</h3>
                  <dl className="space-y-1.5">
                    {hierarchyData?.recentTransactions?.length
                      ? hierarchyData.recentTransactions.slice(0, 3).map((tx, i) => (
                          <Row
                            key={`h-tx-${i}`}
                            label={`${tx.type || "TX"} ${i + 1}`}
                            value={`${tx.periods} periods • ${tx.timestamp ? String(tx.timestamp).slice(0, 19) : "—"}`}
                          />
                        ))
                      : <Row label="Transactions" value="—" />}
                  </dl>
                </section>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {renewOpen ? (
        <BulkRenewAccountsModal
          open
          onClose={() => setRenewOpen(false)}
          selectedCount={selected.size}
          validityOptions={validityOptions}
          availability={bulkRenewAvailability}
          loading={bulkRenewAvailabilityLoading}
          validity={validity}
          onValidityChange={setValidity}
          pending={pending}
          onSubmit={runBulkRenew}
        />
      ) : null}

      {bulkRenewSuccess ? (
        <SubscriberRenewRecoverSuccessModal
          open
          details={bulkRenewSuccess}
          onDismiss={dismissBulkRenewSuccess}
        />
      ) : null}

      {deleteOpen ? (
        <BulkDeleteAccountsModal
          open={deleteOpen}
          count={selected.size}
          pending={pending}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={runBulkDelete}
        />
      ) : null}

      {messageOpen ? (
        <AdminSendMessageModal
          open={messageOpen}
          title="Send Bulk Message"
          description={`Send one message to ${selectedAccounts.length} selected account(s). Messages are delivered on the next device check-in.`}
          recipients={selectedAccounts}
          message={bulkMessage}
          maxLength={1000}
          pending={pending}
          submitLabel="Send Messages"
          onMessageChange={setBulkMessage}
          onClose={() => setMessageOpen(false)}
          onSubmit={runBulkMessage}
        />
      ) : null}

      {resultsOpen ? (
        <BulkUpdateResultsModal
          open={resultsOpen}
          results={results}
          onClose={() => {
            setResultsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
