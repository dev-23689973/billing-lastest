"use client";

import { useMemo } from "react";
import { Gift, Layers, Sparkles, Tv, Wallet } from "lucide-react";
import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { INTEL_TIPS } from "@/components/dashboard/intelGuideTips";
import {
  adminDataPanelShellClass,
  adminSegmentedTabActiveClass,
  adminSegmentedTabIdleClass,
} from "@/components/admin/managers-toolbar-icon-button";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import {
  aggregateLedgerRows,
  formatLedgerTrendPct,
  reconcileLedgerTotals,
  type LedgerPeriodId,
  type ReconciledLedgerTotals,
} from "@/lib/transactionLedgerAnalytics";
import { HexPrismMetricBar } from "@/components/admin/HexPrismMetricBar";
import { cn } from "@/lib/cn";

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

const PERIOD_TABS: { id: LedgerPeriodId; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All loaded" },
];

const PERIOD_LABELS: Record<LedgerPeriodId, string> = {
  "7d": "7 days",
  "30d": "30 days",
  all: "all loaded",
};

function LedgerPeriodTabBar({
  period,
  onPeriodChange,
}: {
  period: LedgerPeriodId;
  onPeriodChange: (next: LedgerPeriodId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Ledger time period"
      className="relative z-20 grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-border/60 bg-muted/30 p-1"
    >
      {PERIOD_TABS.map((t) => {
        const selected = period === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onPeriodChange(t.id)}
            className={cn(
              "relative z-10 min-h-9 cursor-pointer rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:px-3 sm:text-[11px]",
              selected ? adminSegmentedTabActiveClass : adminSegmentedTabIdleClass,
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function HudStatCard({
  title,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  tone: "cyan" | "emerald" | "violet" | "amber" | "rose" | "slate";
}) {
  const toneClass = {
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    slate: "border-slate-500/35 bg-slate-500/10 text-slate-300",
  }[tone];

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
          {sub ? <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{sub}</p> : null}
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function IntegratedWalletSummary({
  totals,
  rowCount,
  allRowCount,
  periodLabel,
  inTrend,
  outTrend,
}: {
  totals: ReconciledLedgerTotals;
  rowCount: number;
  allRowCount?: number;
  periodLabel: string;
  inTrend?: string;
  outTrend?: string;
}) {
  return (
    <div className="rounded-lg border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-card/90 to-cyan-500/[0.06] p-4 shadow-sm ring-1 ring-violet-500/15 dark:from-violet-500/10 dark:to-cyan-500/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            Available credits
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {formatInt(totals.available)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {totals.reconciled ? (
              <>In minus out equals your available balance ({periodLabel}).</>
            ) : (
              <>
                All-time available{" "}
                <span className="font-semibold tabular-nums text-foreground">{formatInt(totals.available)}</span>.
                Period ({periodLabel}) net{" "}
                <span className="font-semibold tabular-nums text-foreground">{formatInt(totals.net)}</span>.
              </>
            )}
          </p>
        </div>
        <div className="grid min-w-0 shrink-0 grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/90 dark:text-emerald-300/90">
              Credits in
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              +{formatInt(totals.creditsIn)}
            </p>
            {inTrend ? <p className="mt-1 text-[10px] text-muted-foreground">{inTrend}</p> : null}
          </div>
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/90 dark:text-amber-300/90">
              Credits out
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-800 dark:text-amber-300">
              −{formatInt(totals.creditsOut)}
            </p>
            {outTrend ? <p className="mt-1 text-[10px] text-muted-foreground">{outTrend}</p> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/50 pt-3 text-[11px] tabular-nums text-muted-foreground">
        <span>
          <span className="text-emerald-600 dark:text-emerald-400">+{formatInt(totals.creditsIn)}</span>
          <span className="mx-1 text-muted-foreground/70">in</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="text-amber-700 dark:text-amber-300">−{formatInt(totals.creditsOut)}</span>
          <span className="mx-1 text-muted-foreground/70">out</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-semibold text-violet-600 dark:text-violet-300">{formatInt(totals.available)}</span>
          <span className="ml-1 text-muted-foreground/70">available</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          {rowCount} row{rowCount === 1 ? "" : "s"}
          {allRowCount != null && allRowCount !== rowCount ? (
            <>
              {" "}
              of {allRowCount}
            </>
          ) : null}{" "}
          · {periodLabel}
        </span>
      </div>
    </div>
  );
}

const CATEGORY_BAR_COLORS: Record<string, { fill: string; shade: string }> = {
  promo_grant: { fill: "#a78bfa", shade: "#6d28d9" },
  hierarchy_credit: { fill: "#34d399", shade: "#047857" },
  hierarchy_send: { fill: "#fbbf24", shade: "#b45309" },
  recover: { fill: "#fb7185", shade: "#be123c" },
  subscriber: { fill: "#fbbf24", shade: "#b45309" },
  bonus: { fill: "#e879f9", shade: "#a21caf" },
  other: { fill: "#94a3b8", shade: "#475569" },
};

function CategoryBar({
  label,
  count,
  credits,
  maxCredits,
  categoryKey,
  staggerIndex = 0,
}: {
  label: string;
  count: number;
  credits: number;
  maxCredits: number;
  categoryKey: string;
  staggerIndex?: number;
}) {
  const pct = maxCredits > 0 ? Math.min(100, (credits / maxCredits) * 100) : 0;
  const colors = CATEGORY_BAR_COLORS[categoryKey] ?? CATEGORY_BAR_COLORS.other;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
            style={{ backgroundColor: colors.fill }}
            aria-hidden
          />
          <span className="truncate font-medium text-foreground">{label}</span>
        </span>
        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
          {count} · {formatInt(credits)} cr
        </span>
      </div>
      <HexPrismMetricBar
        fillPercent={pct}
        fillColor={colors.fill}
        shadeColor={colors.shade}
        staggerIndex={staggerIndex}
        ariaLabel={`${label}: ${formatInt(credits)} credits, ${Math.round(pct)}% of largest category`}
      />
    </div>
  );
}

export function AdminTransactionsLedgerPanel({
  rows,
  comparisonRows,
  allRowCount,
  walletBalance,
  ledgerUsername,
  period,
  onPeriodChange,
}: {
  /** Rows already filtered to the selected ledger period. */
  rows: AdminTransactionRow[];
  /** Full row set for prior-period trend comparison. */
  comparisonRows?: AdminTransactionRow[];
  /** Total rows before period filter (for “12 of 71 rows”). */
  allRowCount?: number;
  walletBalance: number;
  ledgerUsername: string;
  period: LedgerPeriodId;
  onPeriodChange: (next: LedgerPeriodId) => void;
}) {
  const stats = useMemo(() => aggregateLedgerRows(rows), [rows]);

  const displayTotals = useMemo(
    () => reconcileLedgerTotals(stats, walletBalance, period === "all"),
    [stats, walletBalance, period],
  );

  const prevPeriodRows = useMemo(() => {
    if (period === "all") return [];
    const days = period === "7d" ? 7 : 30;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - days);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const pool = comparisonRows ?? rows;
    return pool.filter((r) => {
      const d = r.timestamp ? new Date(r.timestamp.replace(" ", "T")) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
    });
  }, [comparisonRows, rows, period]);

  const prevStats = useMemo(() => aggregateLedgerRows(prevPeriodRows), [prevPeriodRows]);
  const inTrend = formatLedgerTrendPct(displayTotals.creditsIn, prevStats.creditsIn);
  const outTrend = formatLedgerTrendPct(displayTotals.creditsOut, prevStats.creditsOut);
  const periodLabel = PERIOD_LABELS[period];

  const categoryBars = useMemo(() => {
    const entries = Object.entries(stats.byCategory).filter(([, v]) => v.count > 0);
    const max = Math.max(1, ...entries.map(([, v]) => v.credits));
    const labels: Record<string, string> = {
      promo_grant: "Promo grants",
      hierarchy_credit: "Credits in (hierarchy)",
      hierarchy_send: "Credits out (hierarchy)",
      recover: "Recover / reversal",
      subscriber: "Subscriber debits",
      bonus: "Bonus",
      other: "Other",
    };
    return entries
      .sort((a, b) => b[1].credits - a[1].credits)
      .map(([key, v]) => ({
        key,
        label: labels[key] ?? key,
        count: v.count,
        credits: v.credits,
        max,
      }));
  }, [stats.byCategory]);

  return (
    <section className={cn(adminDataPanelShellClass, "p-4 sm:p-5")} aria-labelledby="ledger-command-title">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Ledger command
            </p>
            <h2 id="ledger-command-title" className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
              Wallet & credit intelligence
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Live totals from billing <span className="font-mono text-foreground/90">transactions</span> for{" "}
              <span className="font-semibold text-foreground">{ledgerUsername || "—"}</span>. Promo lines parse{" "}
              <span className="font-mono text-[10px]">[promo_grant:…]</span> and{" "}
              <span className="font-mono text-[10px]">[grant_meta:…]</span> tags in remarks.
            </p>
          </div>
          <LedgerPeriodTabBar period={period} onPeriodChange={onPeriodChange} />
        </div>

        <IntegratedWalletSummary
          totals={displayTotals}
          rowCount={stats.rowCount}
          allRowCount={allRowCount}
          periodLabel={periodLabel}
          inTrend={inTrend}
          outTrend={outTrend}
        />

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <HudStatCard
            title="Promo 1 (P1)"
            value={formatInt(stats.promo1Total)}
            sub={`${stats.grantCount} grant line${stats.grantCount === 1 ? "" : "s"}`}
            icon={Gift}
            tone="amber"
          />
          <HudStatCard
            title="Promo 2 (P2)"
            value={formatInt(stats.promo2Total)}
            sub={`Combined bonus ${formatInt(stats.promoCombinedTotal)} cr`}
            icon={Sparkles}
            tone="violet"
          />
          <HudStatCard
            title="Base principal"
            value={formatInt(stats.baseCreditsTotal)}
            sub="From (base N) in remarks"
            icon={Layers}
            tone="slate"
          />
          <HudStatCard
            title="Subscriber spends"
            value={formatInt(stats.subscriberDebitCount)}
            sub={`${stats.recoverCount} recover / reversal`}
            icon={Tv}
            tone="rose"
          />
        </div>

        {categoryBars.length > 0 ? (
          <div className="rounded-lg border border-border/60 bg-card/80 p-3.5 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Activity mix</p>
              <IntelGuideBadge size="sm" className="shrink-0" tip={INTEL_TIPS.transactionsLedgerActivityMix} />
            </div>
            <div className="space-y-3">
              {categoryBars.map((b, i) => (
                <CategoryBar
                  key={b.key}
                  label={b.label}
                  count={b.count}
                  credits={b.credits}
                  maxCredits={b.max}
                  categoryKey={b.key}
                  staggerIndex={i}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
