"use client";

import { useMemo } from "react";

import { IntelGuideBadge } from "@/components/dashboard/IntelGuideBadge";
import { useDashboardIntel } from "@/components/dashboard/DashboardIntelContext";
import { useLivingCount } from "@/components/dashboard/useLivingCount";
import { useOptionalDashboardPeriod } from "@/components/dashboard/hud/DashboardPeriodContext";
import {
  hudDashChartTitle,
  hudDashMutedCaption,
  hudDashSectionLabel,
  hudDashShell,
  hudDashWalletLabel,
  hudDashWalletPanel,
  hudDashWalletValue,
  hudDashWalletValueAccent,
  hudDashProgressTrack,
  creditFlowAnalysisGrid,
} from "@/components/dashboard/hud/hudDashboardLayout";
import { FitTabularText } from "@/components/dashboard/hud/FitTabularText";
import { HudCreditFlowMirroredChart } from "@/components/dashboard/hud/HudCreditFlowMirroredChart";
import { HUD_PERIOD_OPTIONS } from "@/components/dashboard/hud/HudPeriodStrip";
import { buildCreditFlowSeriesForPeriod } from "@/lib/dashboardPeriodSlice";
import type { DashboardDayCreditPoint } from "@/lib/dashboard/types";
import { cn } from "@/lib/cn";

function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

const ribbonClip = {
  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), 50% 100%, 0 calc(100% - 8px))",
} as const;

function CreditRibbonCard({
  tilt,
  gradientClass,
  insetHighlight,
  livingValue,
  fitValue,
  caption,
}: {
  tilt: "left" | "right";
  gradientClass: string;
  insetHighlight: string;
  livingValue: number;
  /** Final total used to size the numeral (stable during count-up). */
  fitValue: number;
  caption: string;
}) {
  const tiltAnim =
    tilt === "left" ? "dark:animate-living-credit-ribbon-3d-left" : "dark:animate-living-credit-ribbon-3d-right";

  return (
    <div className="perspective-[1100px] h-full [contain:paint] dark:perspective-[1100px]">
      <div className={cn("h-full transform-gpu", tiltAnim)}>
        <div
          className={cn(
            "relative flex h-full min-h-[6.5rem] flex-col items-center justify-center overflow-hidden px-2 pb-6 pt-5 text-center lg:min-h-[7.25rem] sm:px-2.5 sm:pb-7 sm:pt-5",
            "shadow-[0_8px_20px_rgb(15_23_42/0.1)] dark:animate-living-credit-ribbon-glow",
            gradientClass,
            insetHighlight,
          )}
          style={ribbonClip}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 mix-blend-overlay dark:animate-living-credit-ribbon-sheen dark:via-white/35 dark:opacity-100"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-80" aria-hidden />
          <FitTabularText
            text={fmtInt(livingValue)}
            fitText={fmtInt(fitValue)}
            maxPx={28}
            minPx={9}
            className="text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.4)]"
          />
          <p className="relative z-[1] mt-1.5 max-w-[9rem] font-mono text-[7px] font-semibold uppercase leading-tight tracking-[0.12em] text-white/90 sm:max-w-none sm:text-[8px]">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminCreditFlowAnalysisSection({
  creditFlowFull,
  walletCreditsTotal,
  promoPoolCredits,
  layout = "full",
  className,
}: {
  creditFlowFull: DashboardDayCreditPoint[];
  walletCreditsTotal: number;
  promoPoolCredits: number;
  layout?: "full" | "summary" | "chart";
  className?: string;
}) {
  const { tips, devicesOnlineCount, scope, scopeSubtitle } = useDashboardIntel();
  const periodCtx = useOptionalDashboardPeriod();

  const series = useMemo(() => {
    if (!periodCtx) return creditFlowFull.slice(-14);
    return buildCreditFlowSeriesForPeriod(creditFlowFull, periodCtx.period);
  }, [creditFlowFull, periodCtx]);

  const totals = useMemo(() => {
    const crdt = series.reduce((s, p) => s + p.creditIn, 0);
    const dbit = series.reduce((s, p) => s + p.creditOut, 0);
    return { crdt, dbit };
  }, [series]);

  const periodBanner = periodCtx ? HUD_PERIOD_OPTIONS.find((o) => o.id === periodCtx.period)?.label ?? "" : "";

  const livingCrdt = useLivingCount(Math.round(totals.crdt));
  const livingDbit = useLivingCount(Math.round(totals.dbit));
  const livingWallet = useLivingCount(Math.round(walletCreditsTotal));
  const livingPromo = useLivingCount(Math.round(promoPoolCredits));
  const livingDevicesOnline = useLivingCount(
    devicesOnlineCount != null ? Math.round(devicesOnlineCount) : 0,
  );

  const promoBarPct = useMemo(() => {
    const sys = Math.max(0, walletCreditsTotal);
    const promo = Math.max(0, promoPoolCredits);
    const sum = sys + promo;
    return sum > 0 ? (promo / sum) * 100 : 0;
  }, [walletCreditsTotal, promoPoolCredits]);

  const windowPhrase = periodBanner ? `${periodBanner} window` : "selected window";

  const summaryColumn = (
        <div
          className={cn(
            hudDashShell,
            "flex min-h-[18rem] flex-1 flex-col p-2.5 sm:min-h-[20rem] sm:p-3 min-[1280px]:h-full min-[1280px]:min-h-0",
          )}
        >
          <div className="relative z-[1] flex h-full min-h-0 flex-col gap-3">
            {/* Transactions summary — grows to balance chart column */}
            <div className="flex min-h-0 flex-1 flex-col perspective-[1200px]">
              <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-px w-3 shrink-0 bg-slate-300 dark:bg-white/35" aria-hidden />
                  <h3 className={cn("truncate text-[10px] tracking-[0.18em]", hudDashSectionLabel)}>
                    Transactions summary
                  </h3>
                </div>
                <IntelGuideBadge size="sm" className="shrink-0" tip={tips.creditFlowTransactions} />
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 sm:gap-2">
                <CreditRibbonCard
                  tilt="left"
                  gradientClass="bg-gradient-to-b from-purple-600/75 via-violet-800/55 to-slate-950/85"
                  insetHighlight="shadow-[inset_0_1px_0_rgba(244,114,182,0.18)]"
                  livingValue={livingCrdt}
                  fitValue={Math.round(totals.crdt)}
                  caption={`Total credits in during ${windowPhrase}`}
                />
                <CreditRibbonCard
                  tilt="right"
                  gradientClass="bg-gradient-to-b from-indigo-600/72 via-purple-900/52 to-slate-950/85"
                  insetHighlight="shadow-[inset_0_1px_0_rgba(167,139,250,0.16)]"
                  livingValue={livingDbit}
                  fitValue={Math.round(totals.dbit)}
                  caption={`Total credits out during ${windowPhrase}`}
                />
              </div>
            </div>

            {/* Wallet balances — fills remaining left column height */}
            <div className="flex min-h-0 flex-1 flex-col w-full min-w-0 dark:perspective-[900px]">
              <div
                className={cn(
                  hudDashWalletPanel,
                  "flex h-full min-h-0 w-full min-w-0 flex-col justify-between px-2.5 py-2.5 sm:px-3 sm:py-3 dark:animate-living-wallet-panel-breathe",
                )}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-px w-3 shrink-0 bg-primary/40 dark:bg-cyan-400/55" aria-hidden />
                  <h3 className={cn(hudDashChartTitle, "text-[10px] tracking-[0.16em]")}>Wallet balances</h3>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className={cn(hudDashWalletLabel, "text-[8px]")}>
                      {scope === "manager" ? "Your network" : "Total system"}
                    </p>
                    <p
                      className={cn(
                        hudDashWalletValue,
                        "truncate text-base tabular-nums sm:text-lg",
                      )}
                      title={fmtInt(livingWallet)}
                    >
                      {fmtInt(livingWallet)}
                    </p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className={cn(hudDashWalletLabel, "text-[8px]")}>Promo pool</p>
                    <p
                      className={cn(
                        hudDashWalletValueAccent,
                        "truncate text-base tabular-nums sm:text-lg",
                      )}
                      title={fmtInt(livingPromo)}
                    >
                      {fmtInt(livingPromo)}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(hudDashProgressTrack, "mt-2 h-1")}
                  role="progressbar"
                  aria-valuenow={Math.round(promoBarPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Promo pool as a share of promo pool plus positive wallet balances (both from transactions)"
                >
                  {promoBarPct > 0 ? (
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-primary/85 transition-[width] duration-300 dark:bg-cyan-400/90"
                      style={{ width: `${promoBarPct}%` }}
                    />
                  ) : null}
                </div>
                <p className="mt-1.5 font-mono text-[8px] italic leading-snug text-slate-500 dark:text-slate-400">
                  Promo pool = lifetime P1+P2 on add-credit. Bar = promo ÷ (promo +{" "}
                  {scope === "manager" ? "network" : "system"} wallet).
                </p>
              </div>
            </div>

            {devicesOnlineCount != null ? (
              <div className="shrink-0 rounded-lg border border-border/60 px-2.5 py-2.5 dark:border-slate-700/45 dark:bg-slate-950/35 sm:px-3 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400/90">
                      Devices online
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums leading-none text-emerald-800 dark:text-emerald-300/95">
                      {fmtInt(livingDevicesOnline)}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[8px] text-slate-500 dark:text-slate-400">
                      {scopeSubtitle} · recent device check-in
                    </p>
                  </div>
                  <IntelGuideBadge size="sm" className="shrink-0" tip={tips.devicesOnline} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
  );

  const chartColumn = (
        <div
          className={cn(
            hudDashShell,
            "flex min-h-[18rem] w-full min-w-0 flex-1 flex-col p-2.5 sm:min-h-[20rem] sm:p-3 min-[1280px]:h-full min-[1280px]:min-h-0",
          )}
        >
          <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col gap-1.5">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <div className="min-w-0 flex-1">
                <h2
                  id="admin-credit-flow-analysis-title"
                  className="font-mono text-sm font-bold leading-tight tracking-tight text-slate-900 sm:text-base dark:text-slate-50"
                >
                  Credit flow analysis
                </h2>
                <p className="mt-0.5 font-mono text-[9px] font-semibold uppercase leading-snug tracking-[0.16em] text-primary dark:text-cyan-500/75">
                  Credits in vs out ({scopeSubtitle.toLowerCase()})
                  {periodBanner ? ` · ${periodBanner}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-200/95">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0891b2] dark:bg-[#22d3ee]" />
                  Inflow
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-pink-200/95">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#db2777] dark:bg-[#f472b6]" />
                  Reversals
                </span>
                <IntelGuideBadge size="sm" className="shrink-0" tip={tips.creditFlowChart} />
              </div>
            </div>
            <div className="flex min-h-[11rem] w-full flex-1 flex-col sm:min-h-[12rem]">
              <HudCreditFlowMirroredChart
                rows={series}
                chartKey={periodCtx ? `credit-flow-${periodCtx.period}` : "credit-flow"}
                compactMargins
                heightClass="h-full min-h-0 w-full flex-1"
              />
            </div>
          </div>
        </div>
  );

  if (layout === "summary") {
    return (
      <div className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col", className)} aria-label="Transactions summary">
        {summaryColumn}
      </div>
    );
  }

  if (layout === "chart") {
    return (
      <div
        className={cn(
          "mb-2 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col min-[1280px]:mb-0 min-[1280px]:w-full",
          className,
        )}
        aria-labelledby="admin-credit-flow-analysis-title"
      >
        {chartColumn}
      </div>
    );
  }

  return (
    <section
      className={cn("mb-2 w-full min-w-0 lg:mb-4", className)}
      aria-labelledby="admin-credit-flow-analysis-title"
    >
      <div className={creditFlowAnalysisGrid}>
        {summaryColumn}
        {chartColumn}
      </div>
    </section>
  );
}
