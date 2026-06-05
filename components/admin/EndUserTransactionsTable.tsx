"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Search, SlidersHorizontal } from "lucide-react";
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import type { AccountTransactionRow } from "@/lib/repos/billing";
import { formatTransactionRemarksForDisplay } from "@/lib/formatTransactionRemarks";
import { cn } from "@/lib/cn";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  embeddedTableTdClass,
  embeddedTableThClass,
} from "@/lib/ui/embeddedTableTypography";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarIconButtonClass,
  managersToolbarMenuSurfaceClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { TRANSACTION_TYPE_FILTER_OPTIONS, isDebitType, normalizeTransactionType } from "@/lib/transactionTypeDisplay";
import { aggregateLedgerRows, reconcileLedgerTotals } from "@/lib/transactionLedgerAnalytics";
import { netLedgerPeriodsForRows, type TransactionLedgerNetMode } from "@/lib/transactionLedgerNet";
import {
  transactionModalColumnHeader,
  transactionModalTableColumns,
  type TransactionModalColumnPreset,
} from "@/lib/ui/transactionModalTableColumns";
import { transactionModalColWidthStyle } from "@/lib/ui/transactionsModalColumnWidths";
import {
  floatingColumnPickerCheckBoxClass,
  floatingColumnPickerCheckClass,
  floatingColumnPickerMenuHeaderClass,
  floatingColumnPickerMenuItemClass,
  floatingPopoverMenuPanelClass,
} from "@/lib/ui/floatingActionMenu";
import { TransactionTypeBadge } from "@/components/transactions/TransactionTypeBadge";
import { TransactionsExpandableRow } from "@/components/admin/TransactionsExpandableRow";
import { TransactionsRowDetailsPanel } from "@/components/admin/TransactionsRowDetailsPanel";
import { TransactionsModalColGroup } from "@/components/admin/TransactionsModalColGroup";
import { TransactionsTableScrollShell } from "@/components/admin/TransactionsTableScrollShell";
import {
  TRANSACTION_TABLE_COLUMNS,
  dash,
  formatCoverageDate,
  formatTxnDateTime,
  normalizeTxnRemarks,
  renderTransactionColumnCell,
  txnCreditsCell,
  txnMonthsCell,
  type TransactionColumnKey,
} from "@/components/admin/transactionsTableFormatters";
import {
  TRANSACTIONS_MODAL_TABLE_CLASS,
  TRANSACTIONS_RESPONSIVE_TABLE_CLASS,
  transactionsActionsColClass,
  transactionsColTableClass,
} from "@/lib/ui/transactionsResponsiveTable";

function formatDateTime(value: string | null | undefined) {
  const dt = formatTxnDateTime(value);
  if (typeof dt === "string") return dt;
  return dt;
}

function normalizeRemarks(raw: string | null | undefined) {
  return normalizeTxnRemarks(raw);
}

function monthsCell(r: AccountTransactionRow) {
  return txnMonthsCell(r);
}

function creditsCell(periods: number) {
  return txnCreditsCell(periods);
}

type Props = {
  rows: AccountTransactionRow[];
  /** Narrow sidebar: fixed table layout, wrapped dates, slim scrollbar — no ultra-wide min-width. */
  compact?: boolean;
  /** Staff transactions modal: table grows to fill remaining dialog height. */
  fillHeight?: boolean;
  /**
   * How `periods` are loaded: subscriber rows use raw DB values; staff uses wallet-signed SQL.
   * @default "subscriberRaw"
   */
  ledgerNetMode?: TransactionLedgerNetMode;
  /** Staff wallet history vs subscriber account history column set. */
  modalColumnPreset?: TransactionModalColumnPreset;
  /** When set, footer shows available credits (wallet) instead of net ledger periods. */
  walletBalance?: number;
};

function formatLedgerInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

type ColumnKey = TransactionColumnKey;

const TABLE_COLUMNS = TRANSACTION_TABLE_COLUMNS;

const COLUMN_SHORT_LABELS: Record<ColumnKey, string> = {
  type: "Type",
  credits: "Cr",
  months: "Mo",
  account: "Acct",
  coverageStart: "CovS",
  coverageEnd: "CovE",
  remarks: "Note",
  timestamp: "Date",
};

function modalThTdWidthStyle(col: ColumnKey): CSSProperties | undefined {
  const w = transactionModalColWidthStyle(col);
  if (!w || col === "remarks") return undefined;
  return { width: w, maxWidth: w };
}

function columnHeaderLabel(
  key: ColumnKey,
  compactHeaders: boolean,
  modalPreset?: TransactionModalColumnPreset,
) {
  if (compactHeaders && modalPreset) {
    const { short } = transactionModalColumnHeader(modalPreset, key);
    return short;
  }
  const full = TABLE_COLUMNS.find((c) => c.key === key)?.label ?? key;
  return responsiveTableColumnHeader(COLUMN_SHORT_LABELS[key], full, { compact: compactHeaders });
}

export function EndUserTransactionsTable({
  rows,
  compact,
  fillHeight,
  ledgerNetMode = "subscriberRaw",
  modalColumnPreset = "subscriber",
  walletBalance,
}: Props) {
  const searchFieldId = useId();
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data available in table.</p>;
  }

  /**
   * Narrow sidebar: `table-fixed` + `%` columns inside a ~360px card forces microscopic
   * column widths (per-character wrapping). Use one card per row instead.
   */
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="thin-scrollbar flex max-h-[min(420px,55vh)] flex-col gap-2 overflow-y-auto pr-0.5">
          {rows.map((r, i) => {
            const remarks = formatTransactionRemarksForDisplay(r.remarks);
            return (
              <article
                key={`${r.transaction}-${i}`}
                className="rounded-xl border border-border/50 bg-muted/10 p-3 text-xs ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]"
              >
                <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="shrink-0">
                      <TransactionTypeBadge type={r.type} size="sm" />
                    </span>
                  </div>
                  <time className="shrink-0 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                    {dash(r.timestamp)}
                  </time>
                </div>
                <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-2 border-t border-border/40 pt-2.5 text-[11px] leading-snug sm:grid-cols-[6.5rem_1fr]">
                  <dt className="text-muted-foreground">Credits</dt>
                  <dd className="font-mono tabular-nums text-foreground">{r.periods}</dd>
                  <dt className="text-muted-foreground">Months</dt>
                  <dd className="font-mono tabular-nums text-foreground">{monthsCell(r)}</dd>
                  <dt className="text-muted-foreground">Sub-account</dt>
                  <dd className="min-w-0 break-words font-mono text-[10px] text-foreground">{dash(r.account)}</dd>
                  <dt className="text-muted-foreground">Coverage</dt>
                  <dd className="min-w-0 space-y-1 text-foreground">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Start </span>
                      <span className="break-words font-mono text-[10px]">{dash(r.coverage_start)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">End </span>
                      <span className="break-words font-mono text-[10px]">{dash(r.coverage_end)}</span>
                    </div>
                  </dd>
                  <dt className="text-muted-foreground">Remarks</dt>
                  <dd className="min-w-0 break-words text-muted-foreground" title={remarks || undefined}>
                    {dash(remarks)}
                  </dd>
                </dl>
              </article>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{rows.length}</span> transaction{rows.length === 1 ? "" : "s"}
          </span>
          {walletBalance != null ? (
            <span title="Available credits (matches wallet)">
              Available{" "}
              <span className="font-mono font-semibold tabular-nums text-violet-600 dark:text-violet-300">
                {formatLedgerInt(walletBalance)}
              </span>
            </span>
          ) : (
            <span>
              Net ledger (periods){" "}
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {netLedgerPeriodsForRows(rows, ledgerNetMode)}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const modalColumns = useMemo(
    () => transactionModalTableColumns(modalColumnPreset),
    [modalColumnPreset],
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() =>
    new Set(fillHeight ? [...modalColumns] : TABLE_COLUMNS.map((c) => c.key)),
  );
  const columnsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "ALL" && normalizeTransactionType(r.type) !== typeFilter) return false;
      if (!needle) return true;
      const hay = [
        r.transaction,
        r.transaction.padStart(8, "0"),
        r.type,
        String(r.periods),
        r.account ?? "",
        r.coverage_start ?? "",
        r.coverage_end ?? "",
        normalizeRemarks(r.remarks),
        r.timestamp ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [query, rows, typeFilter]);

  const hasListFilters = query.trim().length > 0 || typeFilter !== "ALL";
  const listActivityAgg = useMemo(
    () => (walletBalance != null ? aggregateLedgerRows(filteredRows) : null),
    [filteredRows, walletBalance],
  );
  const footerTotals =
    walletBalance != null && listActivityAgg != null
      ? reconcileLedgerTotals(listActivityAgg, walletBalance, !hasListFilters)
      : null;
  const footerIn = footerTotals?.creditsIn ?? 0;
  const footerOut = footerTotals?.creditsOut ?? 0;
  const footerAvailable = footerTotals?.available ?? 0;
  const listActivityTitle = footerTotals?.reconciled
    ? "In minus out equals your available credits"
    : "Credits in and out on filtered rows only";

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, pageSize]);

  const hasColumn = (key: ColumnKey) => visibleColumns.has(key);
  const tableColumnIds = useMemo(() => {
    const order = fillHeight ? modalColumns : TABLE_COLUMNS.map((c) => c.key);
    return order.filter((key) => visibleColumns.has(key));
  }, [visibleColumns, fillHeight, modalColumns]);
  const visibleColCount = tableColumnIds.length;
  const tight = Boolean(fillHeight);
  /** Fluid modals: all columns visible — no expand/actions column (avoids thead/tbody mismatch). */
  const modalShowActionsCol = tight ? false : true;
  const th = (extra?: string) =>
    dataTableStickyTh(
      cn("text-center", embeddedTableThClass(extra, tight ? "tight" : "default")),
    );
  const tdClass = cn(
    "text-center",
    embeddedTableTdClass(undefined, tight ? "tight" : "default"),
    !tight && "md:text-sm",
  );
  const tableScrollClass = cn(
    "app-data-table-scroll thin-scrollbar w-full max-w-full min-w-0 rounded-xl border border-border/40 bg-gradient-to-b from-background/18 to-muted/8 shadow-inner backdrop-blur-sm dark:from-background/12 dark:to-muted/6",
    fillHeight
      ? "[--app-data-table-max-h:min(62vh,calc(100dvh-12rem))]"
      : "[--app-data-table-max-h:min(52vh,26rem)]",
  );
  const txnFilterSelectClass = cn(
    managersToolbarSelectTriggerClass,
    "w-full min-w-0 max-w-full justify-between gap-1 sm:!w-max sm:min-w-[6.25rem]",
  );
  const txnTypeSelectClass = cn(txnFilterSelectClass, "sm:min-w-[6.75rem]");
  return (
    <div className={cn(fillHeight ? "flex min-h-0 w-full flex-col gap-2" : "space-y-2")}>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5",
          fillHeight && "shrink-0",
        )}
      >
        <div className="flex min-w-0 w-full items-center gap-2 sm:min-w-[14rem] sm:max-w-[30rem] sm:flex-1">
          <label htmlFor={searchFieldId} className="sr-only">
            Search transactions
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
              placeholder="Search ID, account, remarks…"
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
              <p className={floatingColumnPickerMenuHeaderClass}>Visible columns</p>
              <div className="flex flex-col" role="menu">
                {(fillHeight
                  ? TABLE_COLUMNS.filter((col) => (modalColumns as readonly string[]).includes(col.key))
                  : TABLE_COLUMNS
                ).map((col) => {
                  const checked = visibleColumns.has(col.key);
                  const soleVisibleLock = checked && visibleColumns.size === 1;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      disabled={soleVisibleLock}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        if (soleVisibleLock) return;
                        setVisibleColumns((prev) => {
                          const next = new Set(prev);
                          if (checked) {
                            if (next.size <= 1) return prev;
                            next.delete(col.key);
                            return next;
                          }
                          next.add(col.key);
                          return next;
                        });
                      }}
                      className={cn(
                        floatingColumnPickerMenuItemClass,
                        soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                      )}
                    >
                      <span className={cn("min-w-0 flex-1 truncate pr-1", soleVisibleLock && "text-muted-foreground")}>
                        {col.label}
                      </span>
                      <span className={floatingColumnPickerCheckBoxClass} aria-hidden>
                        {checked ? (
                          <Check
                            className={cn(
                              floatingColumnPickerCheckClass,
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
        <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:flex sm:flex-1 sm:items-center sm:justify-end sm:gap-2.5">
            <div className="min-w-0">
              <SelectRoot value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={txnTypeSelectClass} aria-label="Filter transaction type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  hudCorners
                  className={cn(managersToolbarDropdownPanelClass, "z-[380]")}
                >
                  {TRANSACTION_TYPE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} showCheck={false} className={managersToolbarSelectItemClass}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            <div className="min-w-0">
              <SelectRoot value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className={txnFilterSelectClass} aria-label="Rows per page">
                  <SelectValue placeholder="25 / page" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  hudCorners
                  className={cn(managersToolbarDropdownPanelClass, "z-[380]")}
                >
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
          </div>
        </div>
      </div>
      {tight ? (
        <TransactionsTableScrollShell
          columnIds={tableColumnIds}
          layout="fluid"
          className={cn(tableScrollClass, "flex-1")}
        >
          <table className={cn(TRANSACTIONS_MODAL_TABLE_CLASS, "text-[11px]")}>
            <TransactionsModalColGroup
              columnIds={tableColumnIds}
              includeActionsCol={modalShowActionsCol}
            />
            <thead>
              <tr>
                {tableColumnIds.map((col) => (
                  <th
                    key={col}
                    className={th(
                      cn(
                        transactionsColTableClass(col),
                        (col === "credits" || col === "months" || col === "type") && "px-1",
                        col === "remarks" || col === "account" ? "text-left" : undefined,
                      ),
                    )}
                    style={modalThTdWidthStyle(col)}
                    title={
                      fillHeight
                        ? transactionModalColumnHeader(modalColumnPreset, col).full
                        : undefined
                    }
                  >
                    {columnHeaderLabel(col, true, modalColumnPreset)}
                  </th>
                ))}
                {modalShowActionsCol ? (
                  <th className={dataTableStickyTh(cn(transactionsActionsColClass, "py-1 text-center"))}>
                    <span className="sr-only">Row details</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, visibleColCount + (modalShowActionsCol ? 1 : 0))}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No transactions match your search or filter.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
                      onClick={() => {
                        setQuery("");
                        setTypeFilter("ALL");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : null}
              {filteredRows.length > 0
                ? pagedRows.map((r, i) => (
                    <TransactionsExpandableRow
                      key={`${r.transaction}-${i}`}
                      colSpan={visibleColCount + (modalShowActionsCol ? 1 : 0)}
                      expandPersistId={`txn:${r.transaction}:${i}`}
                      details={<TransactionsRowDetailsPanel row={r} tableColumnIds={tableColumnIds} />}
                    >
                      {tableColumnIds.map((col) => (
                        <td
                          key={col}
                          className={cn(
                            tdClass,
                            transactionsColTableClass(col),
                            (col === "type" || col === "credits" || col === "months") && "text-center",
                            (col === "remarks" || col === "account") && "min-w-0 text-left",
                          )}
                          style={modalThTdWidthStyle(col)}
                          title={
                            col === "remarks"
                              ? normalizeRemarks(r.remarks) || undefined
                              : col === "account" && r.account
                                ? r.account
                                : undefined
                          }
                        >
                          {renderTransactionColumnCell(col, r, true)}
                        </td>
                      ))}
                    </TransactionsExpandableRow>
                  ))
                : null}
            </tbody>
          </table>
        </TransactionsTableScrollShell>
      ) : (
        <div className={tableScrollClass}>
          <table className="w-max min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {hasColumn("type") ? <th className={th()}>{columnHeaderLabel("type", false)}</th> : null}
                {hasColumn("credits") ? <th className={th()}>{columnHeaderLabel("credits", false)}</th> : null}
                {hasColumn("months") ? <th className={th()}>{columnHeaderLabel("months", false)}</th> : null}
                {hasColumn("account") ? <th className={th()}>{columnHeaderLabel("account", false)}</th> : null}
                {hasColumn("coverageStart") ? (
                  <th className={th()}>{columnHeaderLabel("coverageStart", false)}</th>
                ) : null}
                {hasColumn("coverageEnd") ? (
                  <th className={th()}>{columnHeaderLabel("coverageEnd", false)}</th>
                ) : null}
                {hasColumn("remarks") ? (
                  <th className={th("text-left")}>{columnHeaderLabel("remarks", false)}</th>
                ) : null}
                {hasColumn("timestamp") ? <th className={th()}>{columnHeaderLabel("timestamp", false)}</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, visibleColCount)} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No transactions match your search or filter.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
                      onClick={() => {
                        setQuery("");
                        setTypeFilter("ALL");
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : null}
              {filteredRows.length > 0
                ? pagedRows.map((r, i) => (
                    <tr
                      key={`${r.transaction}-${i}`}
                      className="border-b border-border/35 transition-[background-color] duration-150 ease-out odd:bg-background/[0.06] hover:bg-muted/30"
                    >
                      {hasColumn("type") ? (
                        <td className={tdClass}>
                          <TransactionTypeBadge type={r.type} size="sm" />
                        </td>
                      ) : null}
                      {hasColumn("credits") ? <td className={tdClass}>{creditsCell(r.periods)}</td> : null}
                      {hasColumn("months") ? (
                        <td className={cn(tdClass, "tabular-nums text-foreground")}>{monthsCell(r)}</td>
                      ) : null}
                      {hasColumn("account") ? (
                        <td className={cn(tdClass, "font-mono text-foreground")}>{dash(r.account)}</td>
                      ) : null}
                      {hasColumn("coverageStart") ? (
                        <td className={cn(tdClass, "tabular-nums text-foreground")}>
                          {(() => {
                            const label = formatCoverageDate(r.coverage_start);
                            if (!label) return <span className="text-muted-foreground">—</span>;
                            return <span className="whitespace-nowrap tabular-nums">{label}</span>;
                          })()}
                        </td>
                      ) : null}
                      {hasColumn("coverageEnd") ? (
                        <td className={cn(tdClass, "tabular-nums text-foreground")}>
                          {(() => {
                            const label = formatCoverageDate(r.coverage_end);
                            if (!label) return <span className="text-muted-foreground">—</span>;
                            return <span className="whitespace-nowrap tabular-nums">{label}</span>;
                          })()}
                        </td>
                      ) : null}
                      {hasColumn("remarks") ? (
                        <td
                          className={cn(tdClass, "min-w-0 max-w-[14rem] overflow-hidden text-left text-foreground")}
                          title={normalizeRemarks(r.remarks) || undefined}
                        >
                          <span className="block w-full min-w-0 truncate leading-tight">
                            {dash(normalizeRemarks(r.remarks))}
                          </span>
                        </td>
                      ) : null}
                      {hasColumn("timestamp") ? (
                        <td className={cn(tdClass, "tabular-nums text-foreground")}>
                          {(() => {
                            const dt = formatDateTime(r.timestamp);
                            if (typeof dt === "string") {
                              return <span className="whitespace-nowrap text-muted-foreground">{dt}</span>;
                            }
                            return (
                              <span className="flex flex-col items-center leading-tight" title={dt.compact}>
                                <span className="whitespace-nowrap tabular-nums">{dt.date}</span>
                                <span className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                                  {dt.time}
                                </span>
                              </span>
                            );
                          })()}
                        </td>
                      ) : null}
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      )}
      <div
        className={cn(
          "flex flex justify-between gap-1.5 rounded-lg border border-border/40 bg-muted/10 px-2 py-1.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-2.5",
          fillHeight && "shrink-0",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
          <span className={cn(tight && "text-[11px]")}>
            <span className="font-semibold tabular-nums text-foreground">{filteredRows.length === 0 ? 0 : pagedRows.length}</span>
            <span className="text-muted-foreground/80">/</span>
            <span className="font-semibold tabular-nums text-foreground">{filteredRows.length}</span>
            {!tight ? <span className="text-muted-foreground/90"> matching</span> : null}
          </span>
          <span className="hidden h-3 w-px bg-border/60 sm:inline" aria-hidden />
          {walletBalance != null && listActivityAgg != null ? (
            <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 tabular-nums", tight && "text-[11px]")}>
              <span className="text-emerald-600 dark:text-emerald-400" title={listActivityTitle}>
                +{formatLedgerInt(footerIn)}
                {!tight ? <span className="text-muted-foreground/80"> in</span> : null}
              </span>
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <span className="text-amber-600 dark:text-amber-300" title={listActivityTitle}>
                −{formatLedgerInt(footerOut)}
                {!tight ? <span className="text-muted-foreground/80"> out</span> : null}
              </span>
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <span
                className="font-mono font-semibold text-violet-600 dark:text-violet-300"
                title="Available credits (matches wallet)"
              >
                {!tight ? <span className="font-sans font-normal text-muted-foreground/90">Available </span> : null}
                {formatLedgerInt(footerAvailable)}
              </span>
            </span>
          ) : (
            <span
              className={cn("inline-flex items-center gap-1 tabular-nums", tight && "text-[11px]")}
              title={
                ledgerNetMode === "walletSigned"
                  ? "Sum of signed credits in the table (wallet in minus out)."
                  : "Debit rows add to the net; credit rows subtract. Can be zero or negative even when the account has activity."
              }
            >
              <span className="text-muted-foreground/90">{tight ? "Net" : "Net ledger"}</span>
              <span className="font-mono font-semibold text-foreground">
                {netLedgerPeriodsForRows(filteredRows, ledgerNetMode)}
              </span>
              {!tight ? <span className="text-muted-foreground/70">periods</span> : null}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:shrink-0 sm:gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || filteredRows.length === 0}
            className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-[background-color,opacity,box-shadow] duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tight ? "‹" : "Previous"}
          </button>
          <span className={cn("tabular-nums text-muted-foreground", tight && "text-[11px]")}>
            {tight ? (
              <>
                <span className="font-semibold text-foreground">{filteredRows.length === 0 ? 0 : currentPage}</span>
                <span className="text-muted-foreground/80">/</span>
                <span className="font-semibold text-foreground">{filteredRows.length === 0 ? 0 : totalPages}</span>
              </>
            ) : (
              <>
                Page <span className="font-semibold text-foreground">{filteredRows.length === 0 ? 0 : currentPage}</span>
                <span className="text-muted-foreground/80"> / </span>
                <span className="font-semibold text-foreground">{filteredRows.length === 0 ? 0 : totalPages}</span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || filteredRows.length === 0}
            className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-[background-color,opacity,box-shadow] duration-200 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tight ? "›" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
