import { cn } from "@/lib/cn";
import { livingGlassInset, livingGlassPanel } from "@/components/theme/digital-classes";

/** Calendar + chart — one column on mobile/tablet; calendar sidebar + chart from `lg`. */
export const hudOverviewTwoColumnGrid =
  "grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:gap-8";

/** Credit flow — stacked below 1280px; ≥1280 narrow summary + chart fills remaining width. */
export const creditFlowAnalysisGrid =
  "grid w-full min-w-0 grid-cols-1 gap-4 sm:gap-5 min-[1280px]:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] min-[1280px]:items-stretch min-[1280px]:gap-6 xl:gap-8";

/** Lifecycle + recent-activity feed cards — two per row from `md` up (~1700px friendly). */
export const dashboardFeedsTwoColumnGrid =
  "grid min-w-0 gap-4 md:grid-cols-2 md:items-stretch lg:mb-4 lg:gap-5 xl:gap-6";

/** Branch pulse + subscriber gauges — vertical gap when stacked; equal-height side-by-side at 1666px+. */
export const dashboardHudTopRowLayout =
  "flex w-full min-w-0 flex-col items-stretch gap-y-4 sm:gap-y-5 min-[1666px]:flex-row min-[1666px]:items-stretch min-[1666px]:justify-center min-[1666px]:gap-5 min-[1666px]:gap-y-0 xl:gap-8";

/** Branch pulse · user status — two columns from 1280px; calendar joins as third column from 1600px. */
export const dashboardHudTopPulseGaugesLayout =
  "grid w-full min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 min-[1280px]:grid-cols-2 min-[1280px]:gap-6 min-[1600px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(240px,300px)] min-[1600px]:gap-x-8";

/** User activity chart · calendar — side-by-side 1280–1599px; chart only (full width) below 1280 and from 1600px. */
export const dashboardActivityOverviewCalendarRow =
  "grid w-full min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 max-[1279px]:grid-cols-1 min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] min-[1280px]:gap-6 min-[1600px]:grid-cols-1";

/** Calendar beside the activity chart (1280–1599px only). */
export const dashboardCalendarBesideActivityClass =
  "hidden min-h-0 min-w-0 flex-col min-[1280px]:flex min-[1280px]:min-h-[280px] min-[1600px]:hidden";

/** Calendar in the top HUD row (1600px+). */
export const dashboardCalendarTopRowClass =
  "hidden min-h-0 min-w-0 flex-col min-[1600px]:flex min-[1600px]:min-h-[280px]";

/** Ticket lifecycle rings + message traffic — stacked below 1280px; side-by-side from 1280px. */
export const dashboardTicketMessageTrafficGrid =
  "grid min-w-0 grid-cols-1 items-stretch gap-3 sm:gap-4 min-[1280px]:grid-cols-[minmax(0,min(100%,28rem))_minmax(0,1fr)] min-[1280px]:gap-4 xl:gap-5";

/** Credit-flow grid — layout in globals.css `.dashboard-credit-flow-*` (768–1279 side-by-side). */
export const dashboardCreditFlowResponsiveLayout = "dashboard-credit-flow-grid sm:gap-5 xl:gap-8";

/** Calendar beside transactions summary (768–1279px); hidden ≥1280 via CSS. */
export const dashboardCreditFlowCalendarCell =
  "dashboard-credit-flow-calendar flex h-full min-h-[16rem] min-w-0 flex-col self-stretch sm:min-h-[18rem]";

export const dashboardCreditFlowSummaryCell =
  "dashboard-credit-flow-summary flex h-full min-h-0 min-w-0 w-full flex-col self-stretch";

export const dashboardCreditFlowChartCell =
  "dashboard-credit-flow-chart flex h-full min-h-0 w-full min-w-0 flex-col";

/** Ticket lifecycle rings — always one row (4 columns). */
export const dashboardTicketLifecycleRingsGrid =
  "grid w-full min-w-0 grid-cols-4 grid-rows-1 items-end gap-x-1.5 py-0.5 sm:gap-x-2.5 sm:py-1 min-[1280px]:gap-x-3.5 min-[1280px]:py-1.5";

/** Communication relay + package distribution — stacked below 1440px; side-by-side from 1440px (always visible). */
export const dashboardRelayPackageGrid =
  "grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 min-[1440px]:grid-cols-2 min-[1440px]:items-start min-[1440px]:gap-5 xl:gap-6";

/** Uniform horizontal gap for HUD feed tables. */
export const hudFeedTableGap = "gap-x-2.5 sm:gap-x-3 md:gap-x-4";

/** Lifecycle feed tables — column visibility follows card width (`@container/lifecycle`). */
export const hudFeedLifecycleTableContainer = "@container/lifecycle";

/**
 * Recent users grid — 1→5 columns as the card widens (hide rightmost first when narrow).
 * user · hierarchy · created · expires · state
 */
export const hudFeedGridRecentUsers = cn(
  "grid w-full min-w-0",
  hudFeedTableGap,
  "grid-cols-[minmax(0,1fr)]",
  "@[18rem]/lifecycle:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
  "@[22rem]/lifecycle:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(5rem,auto)]",
  "@[26rem]/lifecycle:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(5rem,auto)_minmax(5rem,auto)]",
  "@[30rem]/lifecycle:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(5rem,auto)_minmax(5rem,auto)_minmax(5.5rem,auto)]",
  "@[36rem]/lifecycle:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(5.25rem,auto)_minmax(5.25rem,auto)_minmax(5.5rem,auto)]",
  "@[42rem]/lifecycle:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(5.5rem,auto)_minmax(5.5rem,auto)_minmax(5.75rem,auto)]",
);

/** Show when container is wide enough (pair with grid track breakpoints above). */
export const hudFeedRecentColHierarchy = "hidden @[18rem]/lifecycle:block";
export const hudFeedRecentColCreated = "hidden @[22rem]/lifecycle:block";
export const hudFeedRecentColExpires = "hidden @[26rem]/lifecycle:block";
export const hudFeedRecentColState = "hidden @[30rem]/lifecycle:block";

/** Compact expiry/status under username when Expires + State columns are hidden. */
export const hudFeedRecentMobileMeta =
  "mt-0.5 block truncate font-sans text-sm font-normal text-slate-500 @[26rem]/lifecycle:hidden";

export const hudFeedTableScrollShell = cn(
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
  hudFeedLifecycleTableContainer,
);

/** Unified compact feed-table typography (sans, 12px, normal weight). */
export const hudFeedTableText = "font-sans text-xs font-normal leading-tight";

export const hudFeedTablePad = "px-2.5 sm:px-3";

export const hudFeedTableRow = "col-span-full grid w-full grid-cols-subgrid items-stretch";

export const hudFeedTableHeaderRow = cn(
  hudFeedTableRow,
  "border-b border-slate-200/60 dark:border-slate-700/35",
);

export const hudFeedTableBodyRow = cn(
  hudFeedTableRow,
  "border-t border-slate-200/45 dark:border-slate-800/40",
);

export const hudFeedTableCell = "block min-w-0 w-full max-w-full truncate py-0.5 justify-self-stretch";

export const hudFeedTableHeaderCell = cn(hudFeedTableText, hudFeedTableCell, "text-slate-500 dark:text-slate-400");

export const hudFeedTableBodyCell = cn(hudFeedTableText, hudFeedTableCell, "text-slate-800 dark:text-slate-200");

export const hudFeedTableCellRight = cn(hudFeedTableText, hudFeedTableCell, "text-right tabular-nums");

export const hudFeedTableInnerShell = "min-w-0 overflow-hidden rounded-lg bg-slate-50/40 dark:bg-slate-950/20";

export const hudFeedGridExpiredUsers = cn(
  "grid w-full min-w-0",
  hudFeedTableGap,
  "grid-cols-[minmax(0,1fr)]",
  "@[18rem]/lifecycle:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
  "@[24rem]/lifecycle:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(5.5rem,auto)]",
);

export const hudFeedExpiredColHierarchy = "hidden @[18rem]/lifecycle:block";
export const hudFeedExpiredColExpires = "hidden @[24rem]/lifecycle:block";

/** Expiring subscriptions — hide rightmost columns first as the card narrows. */
export const hudFeedExpiringTableContainer = "@container/expiring";

export const hudFeedExpiringScrollShell = cn(
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
  hudFeedExpiringTableContainer,
);

export const hudFeedGridExpiring = cn(
  "grid w-full min-w-0 items-stretch",
  hudFeedTableGap,
  "grid-cols-[minmax(0,1fr)]",
  "@[14rem]/expiring:grid-cols-[minmax(0,1fr)_minmax(3.25rem,auto)]",
  "@[18rem]/expiring:grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_minmax(3.25rem,auto)]",
  "@[22rem]/expiring:grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_minmax(3.25rem,auto)_minmax(4rem,auto)]",
  "@[28rem]/expiring:grid-cols-[minmax(0,1fr)_minmax(3.25rem,auto)_minmax(3.25rem,auto)_minmax(4.25rem,auto)_minmax(5.75rem,auto)]",
);

export const hudFeedExpiringColCount = "hidden @[14rem]/expiring:block";
export const hudFeedExpiringColShare = "hidden @[18rem]/expiring:block";
export const hudFeedExpiringColAtRisk = "hidden @[22rem]/expiring:block";
export const hudFeedExpiringColRisk = "hidden @[28rem]/expiring:block";

/** Summary under period only while Count and other columns are still hidden. */
export const hudFeedExpiringMobileMeta =
  "mt-0.5 block truncate font-sans text-sm font-normal text-slate-500 @[14rem]/expiring:hidden";

export const hudFeedGridTransactions =
  `grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)_minmax(3.5rem,auto)_minmax(4.5rem,auto)] items-stretch ${hudFeedTableGap}`;

export const hudFeedGridTickets =
  `grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem_minmax(4.25rem,auto)] items-stretch ${hudFeedTableGap}`;

export const hudFeedGridMessages =
  `grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_1.75rem_minmax(4.25rem,auto)] items-stretch ${hudFeedTableGap}`;

/** Top dealers / resellers / managers — name · subs · revenue */
export const hudTopOperatorsTableGrid = cn(
  "grid w-full min-w-0 items-stretch",
  `grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)_minmax(5rem,auto)] ${hudFeedTableGap}`,
);

/** Dashboard feed cards — shared shell + table typography (matches Top Operators). */
export const hudFeedCardTableText = "font-sans text-sm font-normal leading-normal";

export const hudDashTableEmpty = cn(hudFeedCardTableText, "col-span-full py-3 text-center italic text-slate-500");

export const hudFeedCardTablePad = "w-full min-w-0 px-1.5 sm:px-2";

export const hudFeedCardHeaderCell = cn(
  hudFeedCardTableText,
  "block min-w-0 w-full max-w-full truncate py-1 justify-self-stretch text-slate-500 dark:text-slate-400",
);

export const hudFeedCardBodyCell = cn(
  hudFeedCardTableText,
  "block min-w-0 w-full max-w-full truncate py-2 justify-self-stretch text-slate-800 dark:text-slate-200",
);

/** Period label — no ellipsis; hide other columns first when narrow. */
export const hudFeedCardPeriodCell = cn(
  hudFeedCardTableText,
  "block min-w-0 w-full max-w-full whitespace-nowrap py-2 justify-self-stretch text-slate-800 dark:text-slate-200",
);

export const hudFeedCardCellRight = cn(hudFeedCardBodyCell, "text-right tabular-nums");

export const hudFeedCardCellCenter = cn(
  hudFeedCardTableText,
  "flex min-h-[1.625rem] min-w-0 w-full max-w-full items-center justify-center self-stretch py-2",
);

/** Pill column — stretches to the full grid track so header + badge align on the right. */
export const hudFeedCardPillHeaderCell = cn(hudFeedCardHeaderCell, "text-right");

/** Pill body cell — block + text-right so badges line up with right-aligned headers in subgrid. */
export const hudFeedCardPillCell = cn(
  hudFeedCardTableText,
  "block min-h-[1.625rem] min-w-0 w-full max-w-full justify-self-stretch py-2 text-right text-slate-800 dark:text-slate-200",
);

/** Plain-text risk when the Risk column is collapsed (not a pill). */
export const hudFeedExpiringRiskInline =
  "shrink-0 font-normal text-slate-500 @[28rem]/expiring:hidden";

export const hudFeedCardBody = "flex min-h-0 flex-1 flex-col gap-2 p-2.5 sm:p-3";

export const hudFeedCardHeader = "flex items-start justify-between gap-2";

export const hudFeedTablePill = cn(
  hudFeedCardTableText,
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 leading-none ring-1",
);

/** Single-line cell: `primary · secondary` (same font size throughout). */
export function hudFeedCellLine(primary: string, secondary?: string | null): string {
  const main = primary.trim() || "—";
  const sub = secondary?.trim();
  return sub ? `${main} · ${sub}` : main;
}

/** Outer HUD panel — glass border; living backdrop visible in both themes. */
export const hudDashShell = cn(
  livingGlassPanel,
  "relative min-w-0 overflow-hidden rounded-2xl",
  "dark:shadow-none",
);

/** Soft layered shadow for compact HUD chips (staff ribbons, gauge cards, etc.). */
export const hudElevationSoft = cn(
  "shadow-[0_1px_2px_rgb(15_23_42/0.05),0_4px_16px_-2px_rgb(15_23_42/0.08),0_12px_28px_-8px_rgb(15_23_42/0.06)]",
  "dark:shadow-[0_4px_18px_-2px_rgb(0_0_0/0.32)]",
);

export const hudElevationSoftHover = cn(
  "transition-[box-shadow,border-color] duration-200",
  "hover:shadow-[0_2px_4px_rgb(15_23_42/0.06),0_8px_24px_-4px_rgb(15_23_42/0.1),0_16px_36px_-8px_rgb(15_23_42/0.08)]",
);

/** @deprecated Alias — use `hudDashShell`. */
export const hudMutedOuterShell = hudDashShell;

export const hudDashTitle = cn(
  "font-mono text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-50",
);

export const hudDashTitleCaps = cn(
  "font-mono text-base font-bold uppercase tracking-[0.16em] text-slate-900 sm:text-lg dark:text-slate-50",
);

export const hudDashEyebrow = cn(
  "mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary dark:text-cyan-500/75",
);

/** Tighter subtitle under leaderboard titles (less vertical gap than default eyebrow). */
export const hudDashEyebrowTight = cn(
  hudDashEyebrow,
  "mt-0 leading-snug",
);

export const hudDashLegend = cn(
  "font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400",
);

export const hudDashTableShell = cn(
  "min-w-0 overflow-hidden rounded-lg border border-border/60 bg-transparent",
  "dark:border-slate-700/40 dark:bg-slate-950/40",
);

export const hudDashTableHead = cn(
  "border-b border-border/70 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600",
  "dark:border-slate-700/40 dark:text-slate-400",
);

export const hudDashTableDivide = "divide-y divide-border/60 dark:divide-slate-800/60";

export const hudDashTableCell = "text-slate-800 dark:text-slate-800 dark:text-slate-200";

export const hudDashTableCellMuted = "text-slate-600 dark:text-slate-400";

export const hudDashInset = livingGlassInset;

export const hudDashWalletPanel = cn(
  "flex flex-1 flex-col rounded-xl border border-border/60 px-3 py-3 shadow-sm",
  "bg-transparent sm:px-3.5 sm:py-3.5",
  "dark:border-slate-700/45 dark:shadow-[inset_0_1px_0_rgb(34_211_238/0.06)]",
);

export const hudDashWalletLabel = cn(
  "font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-primary dark:text-cyan-400/95",
);

export const hudDashWalletValue = cn(
  "mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl dark:text-slate-50",
);

export const hudDashWalletValueAccent = cn(
  "mt-1 font-mono text-xl font-semibold tabular-nums text-cyan-700 sm:text-2xl dark:text-cyan-300",
);

export const hudDashProgressTrack = "relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/75";

export const hudDashSectionLabel = cn(
  "font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-100",
);

export const hudDashChartTitle = cn(
  "font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary dark:text-cyan-400/90",
);

export const hudDashMutedCaption = cn(
  "font-mono text-[9px] leading-relaxed text-slate-500 dark:text-slate-500/90",
);
