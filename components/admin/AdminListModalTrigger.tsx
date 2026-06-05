"use client";

import type { ReactNode, Ref } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { AdminListModalResponsiveTable } from "@/components/admin/AdminListModalResponsiveTable";
import { loadStaffBranchesModalAction } from "@/actions/modalData";
import {
  BRANCH_MODAL_SERVER_SORT_KEYS,
  sortBranchModalPageRows,
  type BranchModalSortKey,
} from "@/lib/client/sortBranchModalRows";
import { cachedDataLoad, dataCacheKey, DATA_CACHE_NS, getDataCache } from "@/lib/client/dataCache";
import { staffBranchesApiBaseToPortal } from "@/lib/modalScope";
import { buildManagersStaffPaginationItems, managersStaffPageBtnBaseClass } from "@/lib/adminManagersStaffPagination";
import { Button } from "@/components/ui/button";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import { floatingPopoverMenuPanelClass } from "@/lib/ui/floatingActionMenu";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarIconButtonClass,
  managersToolbarMenuSurfaceClass,
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
  staffDetailsOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";

type RowType = "MANAGER" | "RESELLER";

type BranchRow = {
  type: "RESELLER" | "DEALER";
  username: string;
  name: string;
  parent: string;
  status: string;
  stateCurrentLogin: string;
  stateLastLogin: string;
  branchCount: number;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  credits: number;
};

type SortKey = BranchModalSortKey;

const COLUMN_SHORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  username: "User",
  credits: "Cr",
  branchCount: "Dlrs",
  parent: "Parent",
  status: "St",
  state: "State",
  type: "Type",
  activeUsers: "Act",
  expiredUsers: "Exp",
  totalUsers: "Tot",
};

export function AdminListModalTrigger({
  label,
  rowType,
  username,
  className,
  triggerRef,
  branchesApiBase = "/api/admin",
}: {
  label: ReactNode;
  rowType: RowType;
  username: string;
  className?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  /** `/api/admin` (default) or `/api/manager` for scoped branch lists. */
  branchesApiBase?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Active" | "Inactive">("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCols, setVisibleCols] = useState({
    name: true,
    username: true,
    credits: true,
    branchCount: true,
    parent: true,
    status: true,
    state: true,
    type: true,
    activeUsers: true,
    expiredUsers: true,
    totalUsers: true,
  });
  const [title, setTitle] = useState("Staff");
  const [subtitle, setSubtitle] = useState("");
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [appliedQuery, setAppliedQuery] = useState("");
  const searchFieldId = useId();
  const showBranchColumn = title !== "Dealers";
  const branchLabel = "Dealers";

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  const statusApi =
    statusFilter === "Active" ? ("active" as const) : statusFilter === "Inactive" ? ("inactive" as const) : ("" as const);

  const pageRows = useMemo(() => {
    if (BRANCH_MODAL_SERVER_SORT_KEYS.has(sortKey)) return rows;
    return sortBranchModalPageRows(rows, sortKey, sortDir);
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    const timer = window.setTimeout(() => setPageInput(String(currentPage)), 0);
    return () => window.clearTimeout(timer);
  }, [currentPage]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setQuery("");
      setAppliedQuery("");
      setPage(1);
      setStatusFilter("");
      setSortKey("name");
      setSortDir("asc");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, rowType, username, branchesApiBase]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const portal = staffBranchesApiBaseToPortal(branchesApiBase);
    const serverSort = BRANCH_MODAL_SERVER_SORT_KEYS.has(sortKey) ? sortKey : "username";
    const cacheKey = dataCacheKey(
      DATA_CACHE_NS.staffBranches,
      portal,
      rowType,
      username,
      currentPage,
      pageSize,
      appliedQuery,
      statusApi,
      serverSort,
      sortDir,
    );
    const cached = getDataCache<Awaited<ReturnType<typeof loadStaffBranchesModalAction>>>(cacheKey);
    if (cached?.ok) {
      const timer = window.setTimeout(() => {
        setTitle(cached.title);
        setSubtitle(cached.subtitle);
        setRows(cached.rows);
        setTotal(cached.total ?? cached.rows.length);
        setVisibleCols((prev) => ({ ...prev, branchCount: cached.title !== "Dealers" }));
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    const run = async () => {
      try {
        const result = await cachedDataLoad(cacheKey, () =>
          loadStaffBranchesModalAction({
            portal,
            rowType,
            username,
            page: currentPage,
            pageSize,
            search: appliedQuery || undefined,
            status: statusApi || undefined,
            sort: serverSort,
            dir: sortDir,
          }),
        );
        if (!result.ok) throw new Error("load_failed");
        if (!cancelled) {
          setTitle(result.title);
          setSubtitle(result.subtitle);
          setRows(result.rows);
          setTotal(result.total ?? result.rows.length);
          setVisibleCols((prev) => ({ ...prev, branchCount: result.title !== "Dealers" }));
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [open, rowType, username, branchesApiBase, currentPage, pageSize, appliedQuery, statusApi, sortKey, sortDir]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [appliedQuery, statusFilter, pageSize, sortKey, sortDir, open]);

  const sortHeader = (key: SortKey, label?: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
          setSortKey(key);
          setSortDir("asc");
        }
      }}
      className="inline-flex w-full items-center justify-center gap-0.5 hover:text-foreground"
    >
      {label ?? COLUMN_SHORT_LABELS[key]}
      {sortKey === key ? (
        <ChevronDown className={cn("h-3 w-3 shrink-0", sortDir === "asc" ? "rotate-180" : "")} aria-hidden />
      ) : (
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      )}
    </button>
  );

  const filterSelectClass = cn(
    managersToolbarSelectTriggerClass,
    "h-8 w-auto min-w-[5.5rem] shrink-0 justify-between gap-1 sm:min-w-[6.25rem]",
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className={staffDetailsOverlayShellClass} role="presentation">
            <button
              type="button"
              className={cn("absolute inset-0", managersToolbarModalBackdropClass)}
              aria-label="Close list modal"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className={cn(
                "relative z-10 box-border flex w-full max-w-[min(96vw,1400px)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden sm:max-h-[calc(100dvh-2.5rem)]",
                managersToolbarModalOpaqueShellClass,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <HudCornerOverlay tone="bright" />
              <div className="hud-modal-opaque-panel relative z-[1] flex flex-col overflow-hidden rounded-[inherit] bg-white p-2.5 dark:bg-[hsl(222_47%_6%/0.94)] sm:p-3">
              <div className="mb-1.5 flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 pb-2 dark:border-b-cyan-400/10">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
                  {subtitle ? (
                    <p className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate font-mono font-semibold text-foreground">{subtitle}</span>
                    </p>
                  ) : null}
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" aria-hidden />
                    Scoped list view with table filters and sorting.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={() => setOpen(false)} aria-label="Close list modal">
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              <div className="mt-2 flex flex-col gap-2 overflow-hidden">
                <div className="flex min-w-0 w-full flex-nowrap items-center gap-2 shrink-0">
                  <label htmlFor={searchFieldId} className="sr-only">
                    Search list
                  </label>
                  <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80 sm:left-2.5"
                        aria-hidden
                      />
                      <input
                        id={searchFieldId}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name, username…"
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
                          setColumnsOpen((v) => !v);
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
                          {(
                            [
                              ["name", "Name"],
                              ["username", "Username"],
                              ["credits", "Credits"],
                              ...(showBranchColumn ? ([["branchCount", branchLabel]] as const) : ([] as const)),
                              ["parent", "Parent"],
                              ["status", "Status"],
                              ["state", "State"],
                              ["type", "Type"],
                              ["activeUsers", "Active"],
                              ["expiredUsers", "Expired"],
                              ["totalUsers", "Total"],
                            ] as const
                          ).map(([key, colLabel]) => {
                            const checked = visibleCols[key];
                            const soleVisibleLock = checked && visibleColCount === 1;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="menuitemcheckbox"
                                aria-checked={checked}
                                disabled={soleVisibleLock}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => {
                                  if (soleVisibleLock) return;
                                  setVisibleCols((prev) => ({ ...prev, [key]: !checked }));
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between gap-2 rounded-none px-1.5 py-1 text-left text-xs leading-tight text-foreground transition-colors first:pt-0.5 last:pb-0.5 hover:bg-muted/40",
                                  soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                                )}
                              >
                                <span className={cn("min-w-0 flex-1 truncate pr-1", soleVisibleLock && "text-muted-foreground")}>{colLabel}</span>
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
                  <SelectRoot value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : (v as "Active" | "Inactive"))}>
                    <SelectTrigger className={filterSelectClass} aria-label="Filter by status">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent position="popper" hudCorners className={cn(managersToolbarDropdownPanelClass, "z-[380]")}>
                      <SelectItem value="ALL" showCheck={false} className={managersToolbarSelectItemClass}>
                        All status
                      </SelectItem>
                      <SelectItem value="Active" showCheck={false} className={managersToolbarSelectItemClass}>
                        Active
                      </SelectItem>
                      <SelectItem value="Inactive" showCheck={false} className={managersToolbarSelectItemClass}>
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </SelectRoot>
                  <SelectRoot value={String(pageSize)} onValueChange={(v) => setPageSize(Number.parseInt(v, 10))}>
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

                {loading ? (
                  <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
                    Loading…
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <AdminListModalResponsiveTable
                        pageRows={pageRows}
                        visibleCols={visibleCols}
                        showBranchColumn={showBranchColumn}
                        branchLabel={branchLabel}
                        sortHeader={sortHeader}
                      />
                    </div>
                    {total > pageSize ? (
                      <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1 text-xs sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-1.5">
                        <p className="shrink-0 tabular-nums text-[11px] leading-snug text-muted-foreground sm:text-xs">
                          {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of {total}
                        </p>
                        <nav
                          className="flex shrink-0 flex-wrap items-center justify-center gap-1 sm:flex-nowrap sm:justify-end"
                          aria-label="Staff list pages"
                        >
                          <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Previous page"
                            className={cn(
                              managersStaffPageBtnBaseClass,
                              "font-medium",
                              currentPage <= 1
                                ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                                : "border-border/70 hover:bg-muted/50",
                            )}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                          </button>
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
                          <form
                            className="ml-0.5 inline-flex items-center gap-0.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const next = Number.parseInt(pageInput, 10);
                              if (!Number.isFinite(next)) {
                                setPageInput(String(currentPage));
                                return;
                              }
                              const clamped = Math.max(1, Math.min(totalPages, next));
                              setPage(clamped);
                              setPageInput(String(clamped));
                            }}
                          >
                            <label htmlFor={`staff-list-modal-jump-${searchFieldId}`} className="sr-only">
                              Go to page
                            </label>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pg</span>
                            <input
                              id={`staff-list-modal-jump-${searchFieldId}`}
                              value={pageInput}
                              onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
                              inputMode="numeric"
                              aria-label="Go to page"
                              className="h-7 w-11 appearance-none rounded-md border-x-1 border-border/70 bg-background px-1 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </form>
                          <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Next page"
                            className={cn(
                              managersStaffPageBtnBaseClass,
                              "font-medium",
                              currentPage >= totalPages
                                ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
                                : "border-border/70 hover:bg-muted/50",
                            )}
                          >
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </nav>
                      </div>
                    ) : total > 0 ? (
                      <footer className="shrink-0 border-t border-border/50 px-2 py-1 text-[11px] text-muted-foreground sm:px-3 sm:py-1.5">
                        {total} row{total === 1 ? "" : "s"}
                      </footer>
                    ) : null}
                  </>
                )}
              </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" ref={triggerRef} className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {modal}
    </>
  );
}
