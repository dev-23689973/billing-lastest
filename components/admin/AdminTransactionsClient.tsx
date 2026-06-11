"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { TransactionLedgerExpandableRow } from "@/components/admin/TransactionLedgerExpandableRow";
import { TransactionLedgerRowDetailsPanel } from "@/components/admin/TransactionLedgerRowDetailsPanel";
import { TransactionLedgerTableScrollShell } from "@/components/admin/TransactionLedgerTableScrollShell";
import {
  TRANSACTION_LEDGER_COLUMN_IDS,
  TRANSACTION_LEDGER_TABLE_COLUMNS,
  renderLedgerColumnCell,
  type TransactionLedgerColumnKey,
} from "@/components/admin/transactionLedgerTableCells";
import {
  transactionLedgerActionsHeaderCell,
  transactionLedgerDataCell,
  transactionLedgerHeaderCell,
} from "@/components/admin/transactionLedgerTableUi";
import { TRANSACTION_LEDGER_RESPONSIVE_TABLE_CLASS } from "@/lib/ui/transactionLedgerResponsiveTable";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Filter,
  Info,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadTransactionsCreditFlowAction,
  loadTransactionsLedgerSummaryAction,
  loadTransactionsTableAction,
} from "@/actions/clientData";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import type { DashboardDayCreditPoint } from "@/lib/repos/billing";
import { formatTransactionRemarksForDisplay } from "@/lib/formatTransactionRemarks";
import { AdminTransactionsLedgerPanel } from "@/components/admin/AdminTransactionsLedgerPanel";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { INTEL_TIPS } from "@/components/dashboard/intelGuideTips";
import {
  adminDataPanelShellClass,
  adminSegmentedTabActiveClass,
  adminSegmentedTabIdleClass,
  managersToolbarDropdownPanelClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import {
  aggregateLedgerRows,
  filterRowsByPeriod,
  formatInsightsDayOverDayPct,
  formatLedgerTrendPct,
  inLastNDays,
  parseRowDate,
  parseTransactionMeta,
  resolveLedgerDisplayTotals,
  type LedgerAggregate,
  type LedgerPeriodId,
} from "@/lib/transactionLedgerAnalytics";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LEDGER_TYPE_COLUMN_TIP,
  TRANSACTION_TYPE_FILTER_OPTIONS,
  getTransactionTypeLabel,
  normalizeTransactionType,
  TRANSACTION_TYPE_UI_COLORS,
} from "@/lib/transactionTypeDisplay";
import { ResellersTablePagination } from "@/components/admin/ResellersTablePagination";
import { useRechartsEntranceMotion } from "@/components/dashboard/useLivingCount";
import { CHART_HISTORY_DAYS } from "@/lib/chart-history-days";
import { cn } from "@/lib/cn";
import {
  adminEmbeddedListRowClass,
  adminEmbeddedListTableClass,
  adminEmbeddedListTdClass,
  adminEmbeddedListTh,
} from "@/lib/ui/adminEmbeddedListTable";
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEDGER_PAGE_SIZE = 25;

const CREDIT_RANGE_TABS = [
  { id: "1d", take: 1 },
  { id: "1w", take: 7 },
  { id: "1m", take: 30 },
  { id: "1y", take: CHART_HISTORY_DAYS },
] as const;

const AXIS_TICK_LIGHT = { fill: "hsl(215 16% 42%)", fontSize: 11, fontWeight: 500 as const };
const AXIS_TICK_DARK = { fill: "hsl(215 16% 52%)", fontSize: 11, fontWeight: 500 as const };

function CreditFlowTooltip({
  active,
  payload,
  label,
  isLight,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  isLight: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={
        isLight
          ? "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          : "rounded-lg border border-slate-600/50 bg-slate-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      }
    >
      <p
        className={
          isLight
            ? "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            : "mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400"
        }
      >
        {label != null ? String(label) : ""}
      </p>
      <div className="space-y-1 font-mono tabular-nums">
        {payload.map((entry) => (
          <div
            key={String(entry.name)}
            className="flex justify-between gap-6"
            style={{ color: entry.color }}
          >
            <span className={isLight ? "text-slate-600" : undefined}>{entry.name}</span>
            <span className={isLight ? "font-semibold text-slate-900" : "font-semibold text-slate-50"}>
              {Number(entry.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Compact Y ticks so labels stay inside the axis gutter (avoids clipping under overflow-hidden cards). */
function formatCreditFlowAxisTick(value: number, peak: number) {
  const n = Math.round(Number(value));
  const absPeak = Math.max(peak, 1);
  if (absPeak >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (absPeak >= 5000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

function creditFlowYAxisWidth(peak: number) {
  if (peak >= 1_000_000) return 52;
  if (peak >= 100_000) return 48;
  if (peak >= 10_000) return 44;
  return 40;
}

function padTxnId(raw: string) {
  return raw.padStart(8, "0");
}

const ledgerTh = (extra?: string) => adminEmbeddedListTh(cn("text-center", extra));

const LEDGER_TD = cn(adminEmbeddedListTdClass, "text-center overflow-hidden");

const LEDGER_TABLE_COLUMN_IDS = TRANSACTION_LEDGER_COLUMN_IDS;
const LEDGER_LAST_COL_ID: TransactionLedgerColumnKey = "note";

function formatFlowDayCell(row: { key: string; label: string; tick?: string }): string {
  if (row.tick) return row.tick;
  if (/^\d{4}-\d{2}-\d{2}$/.test(row.key)) {
    const [, mm, dd] = row.key.split("-");
    return `${mm}/${dd}`;
  }
  return row.label;
}

function seriesStats(values: number[]) {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return { total: 0, avg: 0, peak: 0, low: 0 };
  const total = v.reduce((a, b) => a + b, 0);
  return { total, avg: total / v.length, peak: Math.max(...v), low: Math.min(...v) };
}

function TabBar({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            value === t.id ? adminSegmentedTabActiveClass : adminSegmentedTabIdleClass,
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FlowStatLeaderRow({
  label,
  value,
  valueClassName,
  dotClassName,
}: {
  label: string;
  value: number;
  valueClassName: string;
  dotClassName?: string;
}) {
  const display = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <span
        className={cn("mb-[0.2rem] min-w-[0.75rem] flex-1 self-end border-b border-dotted", dotClassName)}
        aria-hidden
      />
      <dd className={cn("shrink-0 font-medium tabular-nums", valueClassName)}>{display}</dd>
    </div>
  );
}

function FlowFooterStats({
  added,
  spent,
  compact = false,
}: {
  added: ReturnType<typeof seriesStats>;
  spent: ReturnType<typeof seriesStats>;
  compact?: boolean;
}) {
  const rows: [string, number, number][] = [
    ["Total", added.total, spent.total],
    ["Avg", added.avg, spent.avg],
    ["Peak", added.peak, spent.peak],
    ["Low", added.low, spent.low],
  ];
  return (
    <div
      className={cn(
        "grid gap-6 border-t border-border/60 pt-3 sm:grid-cols-2 sm:gap-10 sm:pt-4",
        !compact && "mt-4",
      )}
    >
      <div>
        <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", TRANSACTION_TYPE_UI_COLORS.CRDT.text)}>Credits in</p>
        <dl className="space-y-1.5 text-xs">
          {rows.map(([k, a]) => (
            <FlowStatLeaderRow
              key={`a-${k}`}
              label={k}
              value={a}
              valueClassName={TRANSACTION_TYPE_UI_COLORS.CRDT.text}
              dotClassName="border-emerald-400/30 dark:border-emerald-300/25"
            />
          ))}
        </dl>
      </div>
      <div>
        <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", TRANSACTION_TYPE_UI_COLORS.DBIT.text)}>Credits out</p>
        <dl className="space-y-1.5 text-xs">
          {rows.map(([k, , b]) => (
            <FlowStatLeaderRow
              key={`s-${k}`}
              label={k}
              value={b}
              valueClassName={TRANSACTION_TYPE_UI_COLORS.DBIT.text}
              dotClassName="border-amber-400/30 dark:border-amber-300/25"
            />
          ))}
        </dl>
      </div>
    </div>
  );
}

function InsightsBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 font-semibold text-foreground">Insights</p>
        {children}
      </div>
    </div>
  );
}

const LEDGER_CATEGORY_COLUMN_TIP =
  "What happened: hierarchy transfers, subscriber renewals, promo grants, recoveries, and more. The Type column shows Credit, Debit, or Bonus.";

const LEDGER_AMOUNT_COLUMN_TIP =
  "Principal credits moved (what left or entered the wallet before promo subsidy). On received loads this is the base amount, not principal + bonus.";
const LEDGER_BONUS_COLUMN_TIP =
  "Promo credits on loads/sends (admin subsidy) or promo voided on recover. Shown separately from the main Amt column.";
const LEDGER_TOTAL_COLUMN_TIP =
  "Full package or recover event size (principal + promo on loads/sends; headline wallet debit on recover). May differ from Amt when promo is subsidized or voided.";

function ledgerColumnHeaderLabel(key: TransactionLedgerColumnKey): string {
  return TRANSACTION_LEDGER_TABLE_COLUMNS.find((c) => c.key === key)?.label ?? key;
}

function renderLedgerTableHeaderCell(col: TransactionLedgerColumnKey) {
  if (col === "type") {
    return (
      <th
        key={col}
        className={transactionLedgerHeaderCell(col, "text-center normal-case tracking-normal")}
      >
        <span className="inline-flex max-w-full items-center justify-center gap-0.5">
          <span>{ledgerColumnHeaderLabel(col)}</span>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground/75 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            aria-label="About Type column"
            title={LEDGER_TYPE_COLUMN_TIP}
          >
            <Info className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </th>
    );
  }
  if (col === "category") {
    return (
      <th
        key={col}
        className={transactionLedgerHeaderCell(col, "text-center normal-case tracking-normal")}
      >
        <span className="inline-flex max-w-full items-center justify-center gap-0.5">
          <span>{ledgerColumnHeaderLabel(col)}</span>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground/75 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            aria-label="About Cat column"
            title={LEDGER_CATEGORY_COLUMN_TIP}
          >
            <Info className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </th>
    );
  }
  if (col === "amount") {
    return (
      <th key={col} className={transactionLedgerHeaderCell(col, "text-center normal-case tracking-normal")}>
        <span className="inline-flex max-w-full items-center justify-center gap-0.5">
          <span>{ledgerColumnHeaderLabel(col)}</span>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground/75 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            aria-label="About Amt column"
            title={LEDGER_AMOUNT_COLUMN_TIP}
          >
            <Info className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </th>
    );
  }
  if (col === "bonusAmt" || col === "totalAmt") {
    const tip = col === "bonusAmt" ? LEDGER_BONUS_COLUMN_TIP : LEDGER_TOTAL_COLUMN_TIP;
    const label = col === "bonusAmt" ? "Bonus" : "Total";
    return (
      <th key={col} className={transactionLedgerHeaderCell(col, "text-center normal-case tracking-normal")}>
        <span className="inline-flex max-w-full items-center justify-center gap-0.5">
          <span>{ledgerColumnHeaderLabel(col)}</span>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground/75 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            aria-label={`About ${label} column`}
            title={tip}
          >
            <Info className="h-3 w-3" aria-hidden />
          </button>
        </span>
      </th>
    );
  }
  if (col === "note") {
    return (
      <th
        key={col}
        className={transactionLedgerHeaderCell(col, "text-left normal-case tracking-normal", true)}
      >
        {ledgerColumnHeaderLabel(col)}
      </th>
    );
  }
  return (
    <th
      key={col}
      className={transactionLedgerHeaderCell(
        col,
        col === "timestamp" ? "text-center text-muted-foreground" : "text-center",
      )}
    >
      {ledgerColumnHeaderLabel(col)}
    </th>
  );
}

/** Admin ledger rows that correspond to admin ↔ manager hierarchy credit grants / recovers (PHP parity wording). */
function isAdminManagerHierarchyLedgerRow(r: AdminTransactionRow): boolean {
  const rm = (r.remarks ?? "").toLowerCase();
  const t = normalizeTransactionType(r.type);
  const ac = (r.account ?? "").trim();
  if (t === "DBIT" && ac && /\breceived\s+\d+\s+credits/.test(rm)) return true;
  if (t === "CRDT" && /\brecovered\s+from\b/.test(rm)) return true;
  return false;
}

function exportCsv(rows: AdminTransactionRow[], filename: string) {
  const headers = [
    "Transaction ID",
    "Timestamp",
    "Username",
    "Subscriber",
    "Type",
    "Category",
    "Amount (raw)",
    "Periods",
    "Coverage start",
    "Coverage end",
    "Remarks",
  ];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `TXN-${padTxnId(r.transaction)}`,
        r.timestamp ?? "",
        r.created_by ?? r.username,
        r.account ?? "",
        getTransactionTypeLabel(r.type),
        parseTransactionMeta(r).categoryLabel,
        r.amount ?? "",
        String(r.periods),
        r.coverage_start ?? "",
        r.coverage_end ?? "",
        formatTransactionRemarksForDisplay(r.remarks) ?? "",
      ]
        .map((x) => esc(String(x)))
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTransactionsCsvWithToast(rows: AdminTransactionRow[]) {
  const filename = `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`;
  try {
    exportCsv(rows, filename);
    const n = rows.length;
    if (n === 0) {
      toast.info("CSV downloaded (headers only).", {
        description: "No transactions matched your filters.",
      });
    } else {
      toast.success(`Exported ${n} transaction${n === 1 ? "" : "s"}.`, { description: filename });
    }
  } catch {
    toast.error("Could not generate the export.");
  }
}

type TransactionTableApiResponse = {
  rows: AdminTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  txnCount7d: number;
  filteredAgg?: LedgerAggregate;
  error?: string;
};

export function AdminTransactionsClient({
  rows: rowsProp,
  creditFlow: creditFlowProp,
  walletBalance,
  ledgerUsername,
  ledgerDisplayName,
  isAdminLedger = false,
  deferCreditFlow = false,
  fetchLedgerFromApi = false,
}: {
  rows?: AdminTransactionRow[];
  creditFlow: DashboardDayCreditPoint[];
  walletBalance: number;
  ledgerUsername: string;
  ledgerDisplayName?: string | null;
  /** ROOT admin — ledger uses period flow, not personal wallet balance. */
  isAdminLedger?: boolean;
  /** Load 90-day chart after paint (remote DB). */
  deferCreditFlow?: boolean;
  /** Paginated ledger + summary via server actions. */
  fetchLedgerFromApi?: boolean;
}) {
  const useApiLedger = fetchLedgerFromApi || rowsProp == null;
  const [creditFlowDeferred, setCreditFlowDeferred] = useState<DashboardDayCreditPoint[]>([]);
  const [creditFlowLoading, setCreditFlowLoading] = useState(deferCreditFlow);

  useEffect(() => {
    if (!deferCreditFlow || !ledgerUsername.trim()) {
      setCreditFlowLoading(false);
      return;
    }
    let cancelled = false;
    setCreditFlowLoading(true);
    loadTransactionsCreditFlowAction(CHART_HISTORY_DAYS)
      .then((data) => {
        if (!data.ok) throw new Error("credit_flow_failed");
        if (!cancelled) setCreditFlowDeferred(data.creditFlow ?? []);
      })
      .catch(() => {
        if (!cancelled) setCreditFlowDeferred([]);
      })
      .finally(() => {
        if (!cancelled) setCreditFlowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deferCreditFlow, ledgerUsername]);

  const creditFlow = deferCreditFlow ? creditFlowDeferred : creditFlowProp;
  const { theme } = useTheme();
  const isLight = theme === "light";
  const entranceMotion = useRechartsEntranceMotion(1400);
  const motion = isLight
    ? { isAnimationActive: false as const, animationDuration: 0, animationEasing: "ease-out" as const }
    : entranceMotion;
  const axisTick = isLight ? AXIS_TICK_LIGHT : AXIS_TICK_DARK;
  const uid = useId().replace(/:/g, "");
  const gradIn = `txIn-${uid}`;
  const gradOut = `txOut-${uid}`;
  const ledgerSearchId = `tx-ledger-search-${uid}`;

  const [range, setRange] = useState("1w");
  const [showFlowTable, setShowFlowTable] = useState(false);
  const flowTableToggleLockRef = useRef(0);
  const toggleFlowTable = () => {
    const now = Date.now();
    if (now - flowTableToggleLockRef.current < 320) return;
    flowTableToggleLockRef.current = now;
    setShowFlowTable((v) => !v);
  };
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [ledgerPreset, setLedgerPreset] = useState<"ALL" | "ADMIN_MANAGER">("ALL");
  const [q, setQ] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [apiRows, setApiRows] = useState<AdminTransactionRow[]>([]);
  const [ledgerSummaryRows, setLedgerSummaryRows] = useState<AdminTransactionRow[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [apiTxnCount7d, setApiTxnCount7d] = useState(0);
  const [apiFilteredAgg, setApiFilteredAgg] = useState<LedgerAggregate | null>(null);
  const [tableLoading, setTableLoading] = useState(useApiLedger);
  const [tableError, setTableError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(useApiLedger);
  const [ledgerPeriod, setLedgerPeriod] = useState<LedgerPeriodId>("7d");

  const rows = useApiLedger ? apiRows : (rowsProp ?? []);
  const allLedgerRows = useApiLedger ? ledgerSummaryRows : rows;
  const rowsInLedgerPeriod = useMemo(
    () => filterRowsByPeriod(allLedgerRows, ledgerPeriod),
    [allLedgerRows, ledgerPeriod],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const reloadLedgerTable = useCallback(
    async (opts?: { includeAgg?: boolean; pageOverride?: number }) => {
      if (!useApiLedger || !ledgerUsername.trim()) return;
      setTableLoading(true);
      setTableError("");
      try {
        const data = await loadTransactionsTableAction({
          q: debouncedQ || undefined,
          type: typeFilter !== "ALL" ? typeFilter : undefined,
          ledgerPreset: ledgerPreset !== "ALL" ? ledgerPreset : undefined,
          page: opts?.pageOverride ?? ledgerPage,
          pageSize: LEDGER_PAGE_SIZE,
          includeAgg: opts?.includeAgg,
        });
        if (!data.ok) {
          setTableError("Could not load transactions.");
          setApiRows([]);
          setApiTotal(0);
          setApiTotalPages(1);
          return;
        }
        setApiRows(Array.isArray(data.rows) ? data.rows : []);
        setApiTotal(Number(data.total ?? 0));
        setApiTotalPages(Math.max(1, Number(data.totalPages ?? 1)));
        setApiTxnCount7d(Number(data.txnCount7d ?? 0));
        if (typeof data.page === "number" && data.page >= 1 && data.page !== ledgerPage) {
          setLedgerPage(data.page);
        }
        if (data.filteredAgg) setApiFilteredAgg(data.filteredAgg);
      } catch {
        setTableError("Could not load transactions.");
        setApiRows([]);
      } finally {
        setTableLoading(false);
      }
    },
    [useApiLedger, ledgerUsername, debouncedQ, typeFilter, ledgerPreset, ledgerPage],
  );

  useEffect(() => {
    if (!useApiLedger || !ledgerUsername.trim()) return;
    void reloadLedgerTable({ includeAgg: true });
  }, [useApiLedger, ledgerUsername, debouncedQ, typeFilter, ledgerPreset, ledgerPage, reloadLedgerTable]);

  useEffect(() => {
    if (!useApiLedger || !ledgerUsername.trim()) return;
    let cancelled = false;
    setSummaryLoading(true);
    loadTransactionsLedgerSummaryAction()
      .then((data) => {
        if (!data.ok) throw new Error("summary_failed");
        if (!cancelled) setLedgerSummaryRows(Array.isArray(data.rows) ? data.rows : []);
      })
      .catch(() => {
        if (!cancelled) setLedgerSummaryRows([]);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useApiLedger, ledgerUsername]);

  const creditVisible = useMemo(() => {
    const take = CREDIT_RANGE_TABS.find((x) => x.id === range)?.take ?? 7;
    const full = creditFlow.length ? creditFlow : [];
    if (!full.length) return [];
    return full.slice(-take);
  }, [creditFlow, range]);

  const inStats = useMemo(() => seriesStats(creditVisible.map((d) => d.creditIn)), [creditVisible]);
  const outStats = useMemo(() => seriesStats(creditVisible.map((d) => d.creditOut)), [creditVisible]);

  const flowChartData = useMemo(
    () =>
      creditVisible.map((d) => ({
        ...d,
        tick: new Date(d.key + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    [creditVisible],
  );

  const flowChartPeak = useMemo(() => {
    let peak = 1;
    for (const d of flowChartData) {
      peak = Math.max(peak, d.creditIn, d.creditOut);
    }
    return peak;
  }, [flowChartData]);

  const flowYAxisWidth = creditFlowYAxisWidth(flowChartPeak);

  const last7 = useMemo(() => (creditFlow.length >= 7 ? creditFlow.slice(-7) : creditFlow), [creditFlow]);
  const prev7 = useMemo(() => {
    if (creditFlow.length < 14) return [];
    return creditFlow.slice(-14, -7);
  }, [creditFlow]);

  const sumIn = (chunk: DashboardDayCreditPoint[]) => chunk.reduce((s, d) => s + d.creditIn, 0);
  const sumOut = (chunk: DashboardDayCreditPoint[]) => chunk.reduce((s, d) => s + d.creditOut, 0);

  const kpiThisIn = sumIn(last7);
  const kpiThisOut = sumOut(last7);
  const kpiPrevIn = sumIn(prev7);
  const kpiPrevOut = sumOut(prev7);
  const inTrend = formatLedgerTrendPct(kpiThisIn, kpiPrevIn);

  const txCount7d = useMemo(() => {
    if (useApiLedger) return apiTxnCount7d;
    return rows.filter((r) => inLastNDays(parseRowDate(r.timestamp), 7)).length;
  }, [rows, useApiLedger, apiTxnCount7d]);

  const lastDay = creditVisible[creditVisible.length - 1];
  const prevDay = creditVisible.length >= 2 ? creditVisible[creditVisible.length - 2] : null;
  const addedMomLabel =
    lastDay && prevDay
      ? formatInsightsDayOverDayPct(lastDay.creditIn, prevDay.creditIn)
      : "0.0";
  const spentMomLabel =
    lastDay && prevDay
      ? formatInsightsDayOverDayPct(lastDay.creditOut, prevDay.creditOut)
      : "0.0";

  const filteredRows = useMemo(() => {
    if (useApiLedger) return filterRowsByPeriod(apiRows, ledgerPeriod);
    const needle = q.trim().toLowerCase();
    return rowsInLedgerPeriod.filter((r) => {
      if (typeFilter !== "ALL" && normalizeTransactionType(r.type) !== typeFilter) return false;
      if (ledgerPreset === "ADMIN_MANAGER" && !isAdminManagerHierarchyLedgerRow(r)) return false;
      if (!needle) return true;
      const hay = [
        r.transaction,
        r.username,
        r.created_by ?? "",
        r.account ?? "",
        r.type,
        r.remarks ?? "",
        r.timestamp ?? "",
        String(r.periods),
        r.amount ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rowsInLedgerPeriod, typeFilter, ledgerPreset, q, useApiLedger, apiRows, ledgerPeriod]);

  useEffect(() => {
    setLedgerPage(1);
  }, [typeFilter, ledgerPreset, debouncedQ, ledgerPeriod]);

  const ledgerTotalPages = useApiLedger
    ? apiTotalPages
    : Math.max(1, Math.ceil(filteredRows.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(Math.max(1, ledgerPage), ledgerTotalPages);

  useEffect(() => {
    if (!useApiLedger && ledgerPage !== safeLedgerPage) setLedgerPage(safeLedgerPage);
  }, [ledgerPage, safeLedgerPage, useApiLedger]);

  const pagedLedgerRowsClient = useMemo(() => {
    const start = (safeLedgerPage - 1) * LEDGER_PAGE_SIZE;
    return filteredRows.slice(start, start + LEDGER_PAGE_SIZE);
  }, [filteredRows, safeLedgerPage]);

  const pagedLedgerRows = useApiLedger ? filteredRows : pagedLedgerRowsClient;

  const filteredCount = useApiLedger ? apiTotal : filteredRows.length;
  const ledgerPageStart = filteredCount === 0 ? 0 : (safeLedgerPage - 1) * LEDGER_PAGE_SIZE + 1;
  const ledgerPageEnd =
    filteredCount === 0 ? 0 : Math.min(safeLedgerPage * LEDGER_PAGE_SIZE, filteredCount);

  const filteredAgg = useMemo(
    () => (useApiLedger && apiFilteredAgg ? apiFilteredAgg : aggregateLedgerRows(filteredRows)),
    [filteredRows, useApiLedger, apiFilteredAgg],
  );

  async function exportFilteredCsv() {
    if (!useApiLedger) {
      exportTransactionsCsvWithToast(filteredRows);
      return;
    }
    try {
      const data = await loadTransactionsTableAction({
        q: debouncedQ || undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        ledgerPreset: ledgerPreset !== "ALL" ? ledgerPreset : undefined,
        export: true,
      });
      if (!data.ok) throw new Error("export_failed");
      exportTransactionsCsvWithToast(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      toast.error("Could not export transactions.");
    }
  }
  const hasLedgerFilters = typeFilter !== "ALL" || ledgerPreset !== "ALL" || debouncedQ.length > 0;
  const footerTotals = resolveLedgerDisplayTotals(
    filteredAgg,
    walletBalance,
    !hasLedgerFilters && ledgerPeriod === "all",
    isAdminLedger,
    ledgerPeriod === "7d" ? "7 days" : ledgerPeriod === "30d" ? "30 days" : "all loaded",
  );
  const footerIn = footerTotals.creditsIn;
  const footerOut = footerTotals.creditsOut;
  const footerAvailable = footerTotals.available;
  const listActivityTitle = footerTotals.showUnlimitedAccess
    ? "Credits in and out on filtered rows · admin has unlimited access"
    : footerTotals.reconciled
      ? "In minus out equals your available credits"
      : "Credits in and out on filtered rows only";

  return (
    <div className="space-y-4.5">
      <AdminTransactionsLedgerPanel
        rows={rowsInLedgerPeriod}
        comparisonRows={allLedgerRows}
        allRowCount={allLedgerRows.length}
        walletBalance={walletBalance}
        ledgerUsername={ledgerUsername}
        ledgerDisplayName={ledgerDisplayName}
        isAdminLedger={isAdminLedger}
        period={ledgerPeriod}
        onPeriodChange={setLedgerPeriod}
      />
      {summaryLoading && useApiLedger ? (
        <p className="text-center text-xs text-muted-foreground" role="status">
          Loading wallet summary…
        </p>
      ) : null}

      <div className={cn(adminDataPanelShellClass, "p-4.5 sm:p-5")}>
        <div>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Credit activity</h2>
            <p className="text-xs text-muted-foreground">
              Daily credits in vs out · 7d in {formatInt(kpiThisIn)} / out {formatInt(kpiThisOut)} ·{" "}
              {txCount7d} txns · {inTrend ?? "—"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <IntelGuideBadge size="sm" className="shrink-0" tip={INTEL_TIPS.transactionsCreditActivity} />
            <TabBar
              tabs={CREDIT_RANGE_TABS.map((x) => ({ id: x.id, label: x.id.toUpperCase() }))}
              value={range}
              onChange={setRange}
            />
            <button
              type="button"
              onClick={toggleFlowTable}
              aria-expanded={showFlowTable}
              aria-controls="credit-flow-daily-table"
              className="rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/70 dark:hover:bg-muted/50"
            >
              {showFlowTable ? "Hide table" : "Show table"}
            </button>
            <button
              type="button"
              onClick={() => void exportFilteredCsv()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/70 dark:hover:bg-muted/50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export
            </button>
          </div>
        </div>

        <div
          className={cn(
            "relative mt-4 h-[300px] w-full min-h-[300px] min-w-0 shrink-0 pl-0.5",
            creditFlowLoading && "animate-pulse",
          )}
          aria-busy={creditFlowLoading || undefined}
        >
          {creditFlowLoading ? (
            <div
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/15 px-6 py-10 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-muted-foreground">Loading credit activity chart…</p>
            </div>
          ) : flowChartData.length === 0 ? (
            <div
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center"
              role="status"
              aria-live="polite"
            >
              <Layers className="mb-3 h-9 w-9 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium text-foreground">No credit activity in this range</p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Try a longer window (1M / 1Y) or confirm this account has recent credit activity.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300} debounce={32} initialDimension={{ width: 640, height: 300 }}>
              <ComposedChart
                data={flowChartData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradIn} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TRANSACTION_TYPE_UI_COLORS.CRDT.stroke} stopOpacity={0.38} />
                    <stop offset="100%" stopColor={TRANSACTION_TYPE_UI_COLORS.CRDT.stroke} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={gradOut} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TRANSACTION_TYPE_UI_COLORS.DBIT.stroke} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={TRANSACTION_TYPE_UI_COLORS.DBIT.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke={isLight ? "hsl(214 20% 88%)" : "hsl(217 19% 27%)"}
                  strokeOpacity={isLight ? 0.9 : 0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="tick"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{
                    stroke: isLight ? "hsl(214 20% 82%)" : "hsl(217 19% 30%)",
                    strokeOpacity: 0.9,
                  }}
                  interval="preserveStartEnd"
                  minTickGap={8}
                />
                <YAxis
                  width={flowYAxisWidth}
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  allowDecimals={false}
                  tickFormatter={(v) => formatCreditFlowAxisTick(Number(v), flowChartPeak)}
                />
                <Tooltip
                  cursor={{
                    fill: isLight ? "rgba(148,163,184,0.08)" : "rgb(148 163 184 / 0.05)",
                    stroke: "transparent",
                  }}
                  content={<CreditFlowTooltip isLight={isLight} />}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
                <Area
                  type="monotone"
                  dataKey="creditIn"
                  name="Credits in"
                  stroke={TRANSACTION_TYPE_UI_COLORS.CRDT.stroke}
                  strokeWidth={2.2}
                  fill={`url(#${gradIn})`}
                  dot={false}
                  {...motion}
                />
                <Line
                  type="monotone"
                  dataKey="creditOut"
                  name="Credits out"
                  stroke={TRANSACTION_TYPE_UI_COLORS.DBIT.stroke}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  {...motion}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {showFlowTable ? (
          <div id="credit-flow-daily-table" className="mt-3 space-y-4">
          {flowChartData.length === 0 ? (
            <div
              className="relative rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center sm:px-6"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-foreground">No daily rows for this range</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Same data as the chart above — widen the date range if you expected movements here.
              </p>
            </div>
          ) : (
            <div className="relative max-h-[min(40vh,22rem)] overflow-auto thin-scrollbar rounded-lg border border-border/60">
              <table className={cn(adminEmbeddedListTableClass, "w-full table-fixed sm:w-max sm:table-auto")}>
                <colgroup>
                  <col className="w-[46%] sm:w-auto" />
                  <col className="w-[27%] sm:w-auto" />
                  <col className="w-[27%] sm:w-auto" />
                </colgroup>
                <thead>
                  <tr>
                  <th className={ledgerTh("text-left")}>Day</th>
                  <th className={ledgerTh()}>In</th>
                  <th className={ledgerTh()}>Out</th>
                  </tr>
                </thead>
                <tbody>
                  {flowChartData.map((row) => (
                    <tr key={row.key} className={adminEmbeddedListRowClass}>
                      <td className={cn(LEDGER_TD, "text-left text-foreground")} title={row.label}>
                        {formatFlowDayCell(row)}
                      </td>
                      <td className={cn(LEDGER_TD, "font-medium", TRANSACTION_TYPE_UI_COLORS.CRDT.text)}>
                        {formatInt(row.creditIn)}
                      </td>
                      <td className={cn(LEDGER_TD, "font-medium", TRANSACTION_TYPE_UI_COLORS.DBIT.text)}>
                        {formatInt(row.creditOut)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <FlowFooterStats added={inStats} spent={outStats} compact />
          </div>
        ) : null}

        <InsightsBox>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Credits added moved{" "}
              <span className={cn("font-medium", TRANSACTION_TYPE_UI_COLORS.CRDT.text)}>
                {addedMomLabel === "new activity" ? addedMomLabel : `${addedMomLabel}%`}
              </span>{" "}
              day over day at the end of this range (single-day step).
            </li>
            <li>
              Credits spent moved{" "}
              <span className={cn("font-medium", TRANSACTION_TYPE_UI_COLORS.DBIT.text)}>
                {spentMomLabel === "new activity" ? spentMomLabel : `${spentMomLabel}%`}
              </span>{" "}
              day over day at the end of this range.
            </li>
          </ul>
        </InsightsBox>
        </div>
      </div>

      <div className={cn(adminDataPanelShellClass, "p-3.5 sm:p-4")}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Transaction ledger</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {useApiLedger
                ? "Server-paginated ledger · category & promo parsed from remarks"
                : "Up to 500 newest rows · category & promo parsed from remarks"}
            </p>
          </div>
          <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2.5">
            <div className="order-1 flex min-w-0 w-full items-center gap-2 sm:order-2 sm:max-w-md sm:flex-1 sm:justify-end">
              <label htmlFor={ledgerSearchId} className="sr-only">
                Search transactions
              </label>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80 sm:left-2.5"
                  aria-hidden
                />
                <input
                  id={ledgerSearchId}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search ID, account, notes…"
                  autoComplete="off"
                  className={cn(managersToolbarSearchInputClass, "h-9 w-full")}
                />
              </div>
              <button
                type="button"
                onClick={() => void exportFilteredCsv()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                aria-label="Export CSV"
              >
                <Download className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="order-2 grid min-w-0 w-full grid-cols-2 gap-2 sm:order-1 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5">
              <SelectRoot value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger
                  className={cn(
                    managersToolbarSelectTriggerClass,
                    "h-9 w-full min-w-0 max-w-full justify-between gap-1.5 px-2 sm:!w-max sm:max-w-none sm:shrink-0",
                  )}
                  aria-label="Filter by type"
                >
                  <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent position="popper" hudCorners className={cn(managersToolbarDropdownPanelClass, "z-[200]")}>
                  {TRANSACTION_TYPE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} showCheck={false} className={managersToolbarSelectItemClass}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
              <SelectRoot
                value={ledgerPreset}
                onValueChange={(v) => {
                  if (v === "ALL" || v === "ADMIN_MANAGER") setLedgerPreset(v);
                }}
              >
                <SelectTrigger
                  className={cn(
                    managersToolbarSelectTriggerClass,
                    "h-9 w-full min-w-0 max-w-full justify-between gap-1.5 px-2 sm:!w-max sm:max-w-none sm:shrink-0",
                  )}
                  aria-label="Ledger focus"
                >
                  <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
                  <SelectValue placeholder="All activity" />
                </SelectTrigger>
                <SelectContent position="popper" hudCorners className={cn(managersToolbarDropdownPanelClass, "z-[200]")}>
                  <SelectItem value="ALL" showCheck={false} className={managersToolbarSelectItemClass}>
                    All activity
                  </SelectItem>
                  <SelectItem value="ADMIN_MANAGER" showCheck={false} className={managersToolbarSelectItemClass}>
                    Admin ↔ managers
                  </SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
          </div>
        </div>

        {tableError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-8 text-center text-sm text-destructive">
            {tableError}
          </div>
        ) : null}
        {!tableError && tableLoading && filteredRows.length === 0 ? (
          <div
            className="rounded-lg border border-border/60 bg-muted/15 px-6 py-12 text-center text-sm text-muted-foreground"
            role="status"
          >
            Loading transactions…
          </div>
        ) : null}
        {!tableError && !tableLoading && filteredCount === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-foreground">No transactions match your filters</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Clear the search box, set the type filter to <span className="font-medium text-foreground/80">All types</span>, or set focus to{" "}
              <span className="font-medium text-foreground/80">All activity</span>, then try again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-lg border border-border/60">
            <TransactionLedgerTableScrollShell
              columnIds={LEDGER_TABLE_COLUMN_IDS}
              className="app-data-table-scroll min-h-0 [--app-data-table-max-h:min(58vh,640px)]"
            >
              <table className={TRANSACTION_LEDGER_RESPONSIVE_TABLE_CLASS}>
                <thead>
                  <tr>
                    {LEDGER_TABLE_COLUMN_IDS.map((col) => renderLedgerTableHeaderCell(col))}
                    <th className={transactionLedgerActionsHeaderCell("text-center")}>
                      <span className="sr-only">Row details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLedgerRows.map((r, i) => (
                    <TransactionLedgerExpandableRow
                      key={`${r.transaction}-${i}`}
                      colSpan={LEDGER_TABLE_COLUMN_IDS.length + 1}
                      expandPersistId={`ledger:${r.transaction}:${i}`}
                      details={
                        <TransactionLedgerRowDetailsPanel row={r} tableColumnIds={LEDGER_TABLE_COLUMN_IDS} />
                      }
                    >
                      {LEDGER_TABLE_COLUMN_IDS.map((col) => (
                        <td
                          key={col}
                          className={cn(
                            LEDGER_TD,
                            transactionLedgerDataCell(
                              col,
                              col === "note" ? "min-w-0 whitespace-normal text-left" : undefined,
                              col === LEDGER_LAST_COL_ID,
                            ),
                          )}
                        >
                          <div
                            className={cn(
                              "min-w-0",
                              col === "type" || col === "category" ? "flex justify-center overflow-hidden" : undefined,
                              col === "promo" ? "overflow-x-auto overflow-y-hidden" : undefined,
                              col === "note" ? "max-w-full" : undefined,
                            )}
                          >
                            {col === "note" ? (
                              <span className="block w-full min-w-0 truncate leading-tight">
                                {renderLedgerColumnCell(col, r)}
                              </span>
                            ) : (
                              renderLedgerColumnCell(col, r)
                            )}
                          </div>
                        </td>
                      ))}
                    </TransactionLedgerExpandableRow>
                  ))}
                </tbody>
              </table>
            </TransactionLedgerTableScrollShell>
            <div
              className="shrink-0 border-t border-border/50 px-3 py-2.5"
              role="status"
              aria-live="polite"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-2 text-xs font-medium sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:grid-rows-1 sm:items-center sm:gap-x-3">
                <span className="col-start-1 row-start-2 min-w-0 truncate text-muted-foreground tabular-nums sm:col-start-1 sm:row-start-1">
                    {filteredCount === 0 ? (
                      <>0 rows</>
                    ) : (
                      <>
                        <span className="sm:hidden">
                          {ledgerPageStart}–{ledgerPageEnd}/{filteredCount}
                        </span>
                        <span className="hidden sm:inline">
                          {ledgerPageStart}–{ledgerPageEnd} of {filteredCount}
                        </span>
                      </>
                    )}
                    <span className="hidden text-muted-foreground sm:inline">
                      {" · "}
                      P1 {formatInt(filteredAgg.promo1Total)} · P2 {formatInt(filteredAgg.promo2Total)} · B{" "}
                      {formatInt(filteredAgg.baseCreditsTotal)}
                    </span>
                </span>
                <div className="col-span-2 row-start-1 flex justify-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <ResellersTablePagination
                    totalPages={ledgerTotalPages}
                    currentPage={safeLedgerPage}
                    onPageChange={setLedgerPage}
                    ariaLabel="Transaction ledger pages"
                    className="shrink-0"
                  />
                </div>
                <span className="col-start-2 row-start-2 min-w-0 truncate whitespace-nowrap text-right tabular-nums sm:col-start-3 sm:row-start-1 sm:justify-self-end">
                    <span className="text-emerald-400" title={listActivityTitle}>
                      +{formatInt(footerIn)}
                      <span className="hidden text-muted-foreground/90 sm:inline"> in</span>
                    </span>
                    <span className="mx-1.5 text-muted-foreground sm:mx-2">·</span>
                    <span className="text-amber-300" title={listActivityTitle}>
                      −{formatInt(footerOut)}
                      <span className="hidden text-muted-foreground/90 sm:inline"> out</span>
                    </span>
                    <span className="mx-1.5 text-muted-foreground sm:mx-2">·</span>
                    {footerTotals.showUnlimitedAccess ? (
                      <span className="font-semibold text-cyan-400" title="Unlimited platform access">
                        ∞ unlimited
                      </span>
                    ) : (
                      <span
                        className={cn(footerAvailable >= 0 ? "text-violet-300" : "text-rose-400")}
                        title="Available credits (matches wallet)"
                      >
                        <span className="hidden sm:inline">Available </span>
                        {formatInt(footerAvailable)}
                      </span>
                    )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
