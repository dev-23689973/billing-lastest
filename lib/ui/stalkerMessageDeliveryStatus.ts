/**
 * Stalker `send_msg` delivery state (`need_confirm`) — lifecycle only (emerald / amber).
 * Intentionally not purple/fuchsia so it never clashes with priority badges beside it.
 *
 * Delivered = `need_confirm === 0`. Queued = still awaiting device ack.
 */
export const STALKER_MSG_DELIVERY_HEX = {
  delivered: "#34d399",
  pending: "#fbbf24",
} as const;

/** Cyan accent for aggregate “delivery rate %” (HUD totals) — not the per-row status badge. */
export const STALKER_MSG_DELIVERY_RATE_HEX = "#22d3ee";

export function isStalkerMessageDelivered(needConfirm: number | null | undefined): boolean {
  return needConfirm === 0;
}

export function stalkerMessageDeliveryStatusLabel(
  needConfirm: number | null | undefined,
  opts?: { pendingLong?: boolean },
): string {
  if (isStalkerMessageDelivered(needConfirm)) return "Delivered";
  return opts?.pendingLong ? "Queued / pending" : "Queued";
}

/** Table / detail status pills. */
export function stalkerMessageDeliveryStatusPillClass(needConfirm: number | null | undefined): string {
  if (isStalkerMessageDelivered(needConfirm)) {
    return "border-emerald-700 bg-emerald-100 text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100";
  }
  return "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100";
}

/** Fixed height for messages KPI strip (matches legacy compact row). */
export const stalkerMessageDeliveryKpiStripCardClass = "flex h-[3.25rem] min-h-[3.25rem] items-stretch px-2 py-1.5";

/** Messages page KPI strip — total / aggregate column. */
export const stalkerMessageDeliveryKpiTotalShellClass =
  "rounded-md border border-cyan-500/20 bg-cyan-500/[0.05] transition-all duration-200 hover:bg-cyan-500/[0.08]";

export const stalkerMessageDeliveryKpiTotalLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80";

export const stalkerMessageDeliveryKpiTotalValueClass = "text-lg font-bold tabular-nums leading-none text-cyan-100";

/** Messages page KPI strip — delivered column. */
export const stalkerMessageDeliveryKpiDeliveredShellClass =
  "rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] transition-all duration-200 hover:bg-emerald-500/[0.1]";

export const stalkerMessageDeliveryKpiDeliveredLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90";

export const stalkerMessageDeliveryKpiDeliveredValueClass = "text-lg font-bold tabular-nums leading-none text-emerald-300";

/** Messages page KPI strip — pending / queued column. */
export const stalkerMessageDeliveryKpiPendingShellClass =
  "rounded-md border border-amber-500/25 bg-amber-500/[0.07] transition-all duration-200 hover:bg-amber-500/[0.1]";

export const stalkerMessageDeliveryKpiPendingLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-amber-200/90";

export const stalkerMessageDeliveryKpiPendingValueClass = "text-lg font-bold tabular-nums leading-none text-amber-300";

export const stalkerMessageDeliveryKpiTotalDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-cyan-100/80";

export const stalkerMessageDeliveryKpiTotalDetailSecondaryClass =
  "text-[10px] leading-tight text-cyan-200/55";

export const stalkerMessageDeliveryKpiDeliveredDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-emerald-100/85";

export const stalkerMessageDeliveryKpiDeliveredDetailSecondaryClass =
  "text-[10px] leading-tight text-emerald-200/60";

export const stalkerMessageDeliveryKpiPendingDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-amber-100/85";

export const stalkerMessageDeliveryKpiPendingDetailSecondaryClass =
  "text-[10px] leading-tight text-amber-200/60";

/** Delivery rate % card (cyan accent). */
export const stalkerMessageDeliveryKpiRateShellClass =
  "rounded-md border border-cyan-400/30 bg-cyan-500/[0.08] transition-all duration-200 hover:bg-cyan-500/[0.11]";

export const stalkerMessageDeliveryKpiRateLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-cyan-200/90";

export const stalkerMessageDeliveryKpiRateValueClass =
  "text-lg font-bold tabular-nums leading-none text-cyan-200";

export const stalkerMessageDeliveryKpiRateDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-cyan-100/85";

export const stalkerMessageDeliveryKpiRateDetailSecondaryClass =
  "text-[10px] leading-tight text-cyan-200/60";

/** Sends today (sky). */
export const stalkerMessageDeliveryKpiSendsTodayShellClass =
  "rounded-md border border-sky-500/25 bg-sky-500/[0.07] transition-all duration-200 hover:bg-sky-500/[0.1]";

export const stalkerMessageDeliveryKpiSendsTodayLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-sky-200/90";

export const stalkerMessageDeliveryKpiSendsTodayValueClass =
  "text-lg font-bold tabular-nums leading-none text-sky-200";

export const stalkerMessageDeliveryKpiSendsTodayDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-sky-100/85";

export const stalkerMessageDeliveryKpiSendsTodayDetailSecondaryClass =
  "text-[10px] leading-tight text-sky-200/60";

/** Portal staff KPI strip (indigo). */
export const portalStaffMessageKpiShellClass =
  "rounded-md border border-indigo-500/25 bg-indigo-500/[0.07] transition-all duration-200 hover:bg-indigo-500/[0.1]";

export const portalStaffMessageKpiLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-indigo-200/90";

export const portalStaffMessageKpiValueClass =
  "text-lg font-bold tabular-nums leading-none text-indigo-200";

export const portalStaffMessageKpiDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-indigo-100/85";

export const portalStaffMessageKpiDetailSecondaryClass =
  "text-[10px] leading-tight text-indigo-200/60";

/** HUD dot (e.g. recent activity). */
export function stalkerMessageDeliveryStatusDotClass(needConfirm: number | null | undefined): string {
  if (isStalkerMessageDelivered(needConfirm)) {
    return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]";
  }
  return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.45)]";
}
