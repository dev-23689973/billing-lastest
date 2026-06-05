"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { fetchSubscribersModalPage } from "@/lib/client/fetchSubscribersModalPage";
import { dataCacheKey, DATA_CACHE_NS, getDataCache, setDataCache } from "@/lib/client/dataCache";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";
import { Button } from "@/components/ui/button";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import { floatingPopoverMenuPanelClass } from "@/lib/ui/floatingActionMenu";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarIconButtonClass,
  managersToolbarMenuSurfaceClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { StaffRowActionModal } from "@/components/admin/StaffRowActionModal";
import { SubscribersFetchModalResponsiveTable } from "@/components/admin/SubscribersFetchModalResponsiveTable";
import { subscriptionPill } from "@/components/admin/subscribersPageFormatters";
import {
  SUBSCRIBERS_USER_COLUMN_ORDER,
  subscriberBillingOwner,
  subscribersUserConfigurableColumns,
  type SubscribersUserColumnKey,
} from "@/lib/subscribers/subscribersTableModel";
import { subscribersPortalFromApiBase } from "@/lib/subscribersPortalFromApiBase";

type Row = SubscriberListClientRow;
type SortKey = SubscribersUserColumnKey;
type ColumnKey = SubscribersUserColumnKey;

function defaultVisibleColumns(showUserIdColumn: boolean): Record<ColumnKey, boolean> {
  return Object.fromEntries(
    SUBSCRIBERS_USER_COLUMN_ORDER.map((key) => [key, showUserIdColumn || key !== "account"]),
  ) as Record<ColumnKey, boolean>;
}

function parseSortDate(raw: string | null | undefined): number {
  if (!raw) return 0;
  const t = Date.parse(String(raw).replace(" ", "T"));
  return Number.isNaN(t) ? 0 : t;
}

/** Match `AdminSubscribersTable` users list toolbar search debounce. */
const USERS_SEARCH_DEBOUNCE_MS = 350;

/** Admin modal: paged subscriber list from a JSON API (manager / reseller / dealer scope). */
export function AdminSubscribersFetchModal({
  open,
  onOpenChange,
  apiBaseUrl,
  fixedQuery,
  entityDisplayName,
  entityLogin,
  scopeDescription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. `/api/admin/managers/foo/subscribers` — no `?` query */
  apiBaseUrl: string;
  /** Optional fixed query params included in every request (e.g. status). */
  fixedQuery?: Record<string, string | undefined>;
  entityDisplayName: string;
  entityLogin: string;
  scopeDescription: string;
}) {
  const subscribersPortal = useMemo(() => subscribersPortalFromApiBase(apiBaseUrl), [apiBaseUrl]);
  const showUserIdColumn = subscribersPortal.showUserIdColumn ?? subscribersPortal.apiBase === "/api/admin";
  const configurableColumns = useMemo(
    () => subscribersUserConfigurableColumns(showUserIdColumn),
    [showUserIdColumn],
  );

  const titleId = useId();
  const searchFieldId = useId();
  const searchFormId = useId();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pageInput, setPageInput] = useState("1");
  const [sortKey, setSortKey] = useState<SortKey>(showUserIdColumn ? "account" : "name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() =>
    defaultVisibleColumns(showUserIdColumn),
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Skip one fetch cycle after open-reset so we never request with stale page/search. */
  const skipFetchAfterOpenResetRef = useRef(false);
  const fetchRequestIdRef = useRef(0);
  const [loadEpoch, setLoadEpoch] = useState(0);

  const visibleColumnSet = useMemo(() => {
    const set = new Set<ColumnKey>();
    for (const key of SUBSCRIBERS_USER_COLUMN_ORDER) {
      if (key === "account" && !showUserIdColumn) continue;
      if (visibleColumns[key]) set.add(key);
    }
    return set;
  }, [visibleColumns, showUserIdColumn]);

  const visibleColCount = visibleColumnSet.size;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!open) {
        setLoading(false);
        return;
      }
      skipFetchAfterOpenResetRef.current = true;
      setPage(1);
      setPageSize(25);
      setStatusFilter("all");
      setSearchInput("");
      setAppliedSearch("");
      setPageInput("1");
      setVisibleColumns(defaultVisibleColumns(showUserIdColumn));
      setSortKey(showUserIdColumn ? "account" : "name");
      setSortDir("asc");
      setError(null);
      setLoadEpoch((n) => n + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, apiBaseUrl, showUserIdColumn]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPageInput(String(page)), 0);
    return () => window.clearTimeout(timer);
  }, [page]);

  useEffect(() => {
    if (!open) return;

    if (skipFetchAfterOpenResetRef.current) {
      skipFetchAfterOpenResetRef.current = false;
      return;
    }

    const requestId = ++fetchRequestIdRef.current;
    const startTimer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    const fixedStatus = (fixedQuery?.status ?? "").trim().toLowerCase();
    const hasFixedStatus = fixedStatus === "active" || fixedStatus === "expiring" || fixedStatus === "expired" || fixedStatus === "inactive";
    const statusArg =
      !hasFixedStatus && statusFilter !== "all"
        ? (statusFilter as "active" | "inactive")
        : undefined;
    const fixedStatusArg = hasFixedStatus
      ? (fixedStatus as "active" | "inactive" | "expired" | "expiring")
      : undefined;

    const cacheKey = dataCacheKey(
      DATA_CACHE_NS.subscribersFetch,
      apiBaseUrl,
      page,
      pageSize,
      appliedSearch,
      statusArg ?? "",
      fixedStatusArg ?? "",
      fixedQuery?.status ?? "",
    );

    const applyResult = (rowsNext: Row[], totalNext: number) => {
      if (requestId !== fetchRequestIdRef.current) return;
      window.setTimeout(() => {
        if (requestId !== fetchRequestIdRef.current) return;
        setRows(rowsNext);
        setTotal(totalNext);
        setLoading(false);
      }, 0);
    };

    const applyError = (message: string) => {
      if (requestId !== fetchRequestIdRef.current) return;
      window.setTimeout(() => {
        if (requestId !== fetchRequestIdRef.current) return;
        setError(message);
        setRows([]);
        setTotal(0);
        setLoading(false);
      }, 0);
    };

    const cached = getDataCache<{ ok: boolean; rows?: Row[]; total?: number; error?: string }>(cacheKey);
    if (cached?.ok) {
      applyResult(Array.isArray(cached.rows) ? cached.rows : [], Number(cached.total) || 0);
      return;
    }

    void fetchSubscribersModalPage({
      apiBaseUrl,
      page,
      pageSize,
      query: appliedSearch || undefined,
      status: fixedStatusArg ?? statusArg,
    })
      .then((payload) => {
        if (requestId !== fetchRequestIdRef.current) return;
        if (!payload.ok) {
          applyError(payload.error === "forbidden" ? "Session expired or access denied." : "Request failed");
          return;
        }
        setDataCache(cacheKey, payload);
        applyResult(Array.isArray(payload.rows) ? (payload.rows as Row[]) : [], Number(payload.total) || 0);
      })
      .catch((e: unknown) => {
        applyError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => window.clearTimeout(startTimer);
  }, [open, apiBaseUrl, fixedQuery, page, pageSize, statusFilter, appliedSearch, loadEpoch]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const applySearchNow = useCallback((nextQuery: string) => {
    const trimmed = nextQuery.trim();
    setPage(1);
    setPageInput("1");
    setAppliedSearch(trimmed);
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) return;
    const t = window.setTimeout(() => applySearchNow(searchInput), USERS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput, appliedSearch, open, applySearchNow]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fixedStatus = (fixedQuery?.status ?? "").trim().toLowerCase();
  const hasFixedStatus = fixedStatus === "active" || fixedStatus === "expiring" || fixedStatus === "expired" || fixedStatus === "inactive";
  const sortedRows = useMemo(() => {
    const out = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    const text = (v: string | null | undefined) => String(v ?? "").toLowerCase();
    const boolNum = (v: boolean | null | undefined) => (v == null ? -1 : v ? 1 : 0);
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "account": {
          if (showUserIdColumn) {
            const idA = a.stalkerUserId ?? -1;
            const idB = b.stalkerUserId ?? -1;
            cmp = idA - idB;
          } else {
            cmp = text(a.account).localeCompare(text(b.account));
          }
          break;
        }
        case "name":
          cmp = text(a.full_name).localeCompare(text(b.full_name));
          break;
        case "username":
          cmp = text(a.account).localeCompare(text(b.account));
          break;
        case "mac":
          cmp = text(a.mac).localeCompare(text(b.mac));
          break;
        case "parents": {
          const ownerA = subscriberBillingOwner(a)?.login ?? "";
          const ownerB = subscriberBillingOwner(b)?.login ?? "";
          cmp = text(ownerA).localeCompare(text(ownerB));
          break;
        }
        case "status":
          cmp = subscriptionPill(a).label.localeCompare(subscriptionPill(b).label);
          break;
        case "state":
          cmp = String(a.receiverOnline ?? "").localeCompare(String(b.receiverOnline ?? ""));
          break;
        case "created":
          cmp = parseSortDate(a.created) - parseSortDate(b.created);
          break;
        case "expiry":
          cmp = parseSortDate(a.expires) - parseSortDate(b.expires);
          break;
        case "autoRenew":
          cmp = boolNum(a.autoRenew) - boolNum(b.autoRenew);
          break;
      }
      if (cmp !== 0) return cmp * dir;
      return text(a.account).localeCompare(text(b.account));
    });
    return out;
  }, [rows, sortDir, sortKey, showUserIdColumn]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filterSelectClass = cn(
    managersToolbarSelectTriggerClass,
    "h-8 w-auto min-w-[5.5rem] shrink-0 justify-between gap-1 sm:min-w-[6.25rem]",
  );

  const paginationItems = buildManagersStaffPaginationItems(totalPages, page);

  if (!open) return null;

  return (
    <StaffRowActionModal
      open={open}
      onClose={close}
      dialogClassName="max-w-[min(96vw,1680px)]"
      ariaLabel="Users list"
      perfBackdrop
    >
      <div className="flex flex-col overflow-hidden p-2.5 sm:p-3">
            <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 pb-2 dark:border-b-cyan-400/10">
              <div className="min-w-0">
                <h2 id={titleId} className="sr-only">
                  Users list
                </h2>
                <h3 className="text-base font-semibold leading-tight text-foreground">{entityDisplayName || entityLogin}</h3>
                <p className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-mono font-semibold text-foreground">{entityLogin}</span>
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" aria-hidden />
                  {scopeDescription}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label="Close" onClick={close}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-2 flex flex-col gap-2 overflow-hidden">
              <form
                id={searchFormId}
                className="w-full min-w-0 shrink-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  applySearchNow(searchInput);
                }}
              >
                <div className="flex min-w-0 w-full flex-nowrap items-center gap-2">
                  <label htmlFor={searchFieldId} className="sr-only">
                    Search subscribers
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80 sm:left-2.5"
                      aria-hidden
                    />
                    <input
                      id={searchFieldId}
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        applySearchNow(searchInput);
                      }}
                      placeholder="Name, username, MAC…"
                      autoComplete="off"
                      className={cn(managersToolbarSearchInputClass, "w-full")}
                    />
                  </div>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      data-columns-trigger
                      ref={columnsTriggerRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setColumnsOpen((o) => !o);
                      }}
                      className={managersToolbarIconButtonClass}
                      aria-label="Column settings"
                      title="Visible columns"
                      aria-haspopup="menu"
                      aria-expanded={columnsOpen}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
                    </button>
                    <FloatingMenuPortal
                      open={columnsOpen}
                      onOpenChange={setColumnsOpen}
                      anchorRef={columnsTriggerRef}
                      align="end"
                      zIndex={400}
                      hudCorners
                      menuClassName={cn("px-1 py-1 text-xs leading-tight", floatingPopoverMenuPanelClass, managersToolbarMenuSurfaceClass)}
                    >
                        <p className="mb-1 whitespace-nowrap border-b border-border/50 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-b-cyan-400/10">
                          Visible columns
                        </p>
                        <div className="flex flex-col" role="menu">
                          {configurableColumns.map(({ key, label }) => {
                            const checked = visibleColumns[key];
                            const soleVisibleLock = checked && visibleColCount === 1;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="menuitemcheckbox"
                                aria-checked={checked}
                                disabled={soleVisibleLock}
                                onClick={() => {
                                  if (soleVisibleLock) return;
                                  setVisibleColumns((prev) => ({ ...prev, [key]: !checked }));
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between gap-2 rounded-none px-1.5 py-1 text-left text-xs leading-tight text-foreground transition-colors first:pt-0.5 last:pb-0.5 hover:bg-muted/40",
                                  soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                                )}
                              >
                                <span className={cn("min-w-0 flex-1 truncate pr-1", soleVisibleLock && "text-muted-foreground")}>{label}</span>
                                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
                                  {checked ? (
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
                  {!hasFixedStatus ? (
                    <SelectRoot
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v as "all" | "active" | "inactive");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className={filterSelectClass} aria-label="Status filter">
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent position="popper" hudCorners className={cn(managersToolbarDropdownPanelClass, "z-[380]")}>
                        <SelectItem value="all" showCheck={false} className={managersToolbarSelectItemClass}>
                          All status
                        </SelectItem>
                        <SelectItem value="active" showCheck={false} className={managersToolbarSelectItemClass}>
                          Active
                        </SelectItem>
                        <SelectItem value="inactive" showCheck={false} className={managersToolbarSelectItemClass}>
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </SelectRoot>
                  ) : null}
                  <SelectRoot
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number.parseInt(v, 10));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className={filterSelectClass} aria-label="Rows per page">
                      <SelectValue placeholder="25 / page" />
                    </SelectTrigger>
                    <SelectContent position="popper" hudCorners className={cn(managersToolbarDropdownPanelClass, "z-[380]")}>
                      <SelectItem value="25" showCheck={false} className={managersToolbarSelectItemClass}>
                        25 / page
                      </SelectItem>
                      <SelectItem value="50" showCheck={false} className={managersToolbarSelectItemClass}>
                        50 / page
                      </SelectItem>
                      <SelectItem value="100" showCheck={false} className={managersToolbarSelectItemClass}>
                        100 / page
                      </SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>
              </form>

              {loading ? (
                <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
                  Loading…
                </div>
              ) : error ? (
                <p className="rounded-xl border border-border/40 bg-muted/10 px-3 py-6 text-center text-sm text-destructive">{error}</p>
              ) : (
                <>
                  <SubscribersFetchModalResponsiveTable
                    rows={sortedRows}
                    visibleColumns={visibleColumnSet}
                    subscribersPortal={subscribersPortal}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  {total > pageSize ? (
                    <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1 text-xs sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-1.5">
                      <p className="shrink-0 tabular-nums text-[11px] leading-snug text-muted-foreground sm:text-xs">
                        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                      </p>
                      <nav
                        className="flex shrink-0 flex-wrap items-center justify-center gap-1 sm:flex-nowrap sm:justify-end"
                        aria-label="Subscriber list pages"
                      >
                        <button
                          type="button"
                          onClick={() => setPage(1)}
                          disabled={page <= 1}
                          aria-label="First page"
                          className={cn(
                            managersStaffPageBtnBaseClass,
                            "font-medium",
                            page <= 1
                              ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                              : "border-border/70 hover:bg-muted/50",
                          )}
                        >
                          <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          aria-label="Previous page"
                          className={cn(
                            managersStaffPageBtnBaseClass,
                            "font-medium",
                            page <= 1
                              ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                              : "border-border/70 hover:bg-muted/50",
                          )}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        {paginationItems.map((item, idx) =>
                          item === "ellipsis" ? (
                            <span
                              key={`ellipsis-${idx}`}
                              className="inline-flex min-w-6 select-none items-center justify-center px-0.5 text-muted-foreground"
                              aria-hidden
                            >
                              …
                            </span>
                          ) : item === page ? (
                            <span
                              key={item}
                              aria-current="page"
                              className="inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-cyan-400 px-2 text-xs font-semibold tabular-nums text-black shadow-sm dark:bg-cyan-400 dark:text-black"
                            >
                              {item}
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setPage(item)}
                              className={cn(managersStaffPageBtnBaseClass, "border-border/70 text-foreground hover:bg-muted/50")}
                            >
                              {item}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          aria-label="Next page"
                          className={cn(
                            managersStaffPageBtnBaseClass,
                            "font-medium",
                            page >= totalPages
                              ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                              : "border-border/70 hover:bg-muted/50",
                          )}
                        >
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPage(totalPages)}
                          disabled={page >= totalPages}
                          aria-label="Last page"
                          className={cn(
                            managersStaffPageBtnBaseClass,
                            "font-medium",
                            page >= totalPages
                              ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                              : "border-border/70 hover:bg-muted/50",
                          )}
                        >
                          <ChevronsRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <form
                          className="ml-0.5 inline-flex items-center gap-0.5"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const next = Number.parseInt(pageInput, 10);
                            if (!Number.isFinite(next)) {
                              setPageInput(String(page));
                              return;
                            }
                            const clamped = Math.max(1, Math.min(totalPages, next));
                            setPage(clamped);
                            setPageInput(String(clamped));
                          }}
                        >
                          <label htmlFor={`subscribers-modal-jump-${searchFieldId}`} className="sr-only">
                            Go to page
                          </label>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pg</span>
                          <input
                            id={`subscribers-modal-jump-${searchFieldId}`}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
                            inputMode="numeric"
                            aria-label="Go to page"
                            className="h-7 w-11 appearance-none rounded-md border-x-1 border-border/70 bg-background px-1 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </form>
                      </nav>
                    </div>
                  ) : total > 0 ? (
                    <footer className="shrink-0 border-t border-border/50 px-2 py-1 text-[11px] text-muted-foreground sm:px-3 sm:py-1.5">
                      {total} user{total === 1 ? "" : "s"}
                    </footer>
                  ) : null}
                </>
              )}
            </div>
      </div>
    </StaffRowActionModal>
  );
}
