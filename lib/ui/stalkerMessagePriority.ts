/**
 * Stalker `send_msg.priority` — urgency only (rose → violet → slate).
 * Kept separate from delivery status (green / amber) so table badges are easy to tell apart.
 */
export const STALKER_MSG_PRIORITY_HEX = {
  high: "#fb7185",
  normal: "#a78bfa",
  low: "#94a3b8",
} as const;

export type StalkerMessagePriorityLevel = 1 | 2 | 3;

export function normalizeStalkerMessagePriority(p: number | null | undefined): StalkerMessagePriorityLevel {
  const v = p ?? 2;
  if (v <= 1) return 1;
  if (v >= 3) return 3;
  return 2;
}

export function stalkerMessagePriorityLabel(p: number | null | undefined): string {
  const level = normalizeStalkerMessagePriority(p);
  if (level === 1) return "High";
  if (level === 3) return "Low";
  return "Normal";
}

/** Table / detail pill badges (admin + portal messages). */
export function stalkerMessagePriorityPillClass(p: number | null | undefined): string {
  const level = normalizeStalkerMessagePriority(p);
  if (level === 1) {
    return "border-rose-700 bg-rose-100 text-rose-900 dark:border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-100";
  }
  if (level === 3) {
    return "border-slate-600 bg-slate-100 text-slate-800 dark:border-slate-400/45 dark:bg-slate-500/15 dark:text-slate-200";
  }
  return "border-violet-700 bg-violet-100 text-violet-900 dark:border-violet-400/50 dark:bg-violet-500/15 dark:text-violet-100";
}

/** Messages KPI strip — queued rows by priority (pending only). */
export const stalkerMessagePriorityKpiHighShellClass =
  "rounded-md border border-rose-500/25 bg-rose-500/[0.07] transition-all duration-200 hover:bg-rose-500/[0.1]";

export const stalkerMessagePriorityKpiHighLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-rose-200/90";

export const stalkerMessagePriorityKpiHighValueClass = "text-lg font-bold tabular-nums leading-none text-rose-300";

export const stalkerMessagePriorityKpiHighDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-rose-100/85";

export const stalkerMessagePriorityKpiHighDetailSecondaryClass =
  "text-[10px] leading-tight text-rose-200/60";

export const stalkerMessagePriorityKpiNormalShellClass =
  "rounded-md border border-violet-500/25 bg-violet-500/[0.07] transition-all duration-200 hover:bg-violet-500/[0.1]";

export const stalkerMessagePriorityKpiNormalLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-violet-200/90";

export const stalkerMessagePriorityKpiNormalValueClass = "text-lg font-bold tabular-nums leading-none text-violet-300";

export const stalkerMessagePriorityKpiNormalDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-violet-100/85";

export const stalkerMessagePriorityKpiNormalDetailSecondaryClass =
  "text-[10px] leading-tight text-violet-200/60";

export const stalkerMessagePriorityKpiLowShellClass =
  "rounded-md border border-slate-500/25 bg-slate-500/[0.08] transition-all duration-200 hover:bg-slate-500/[0.12]";

export const stalkerMessagePriorityKpiLowLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-slate-300/90";

export const stalkerMessagePriorityKpiLowValueClass = "text-lg font-bold tabular-nums leading-none text-slate-200";

export const stalkerMessagePriorityKpiLowDetailPrimaryClass =
  "text-[10px] font-medium leading-tight text-slate-100/80";

export const stalkerMessagePriorityKpiLowDetailSecondaryClass =
  "text-[10px] leading-tight text-slate-300/55";

/** Small HUD dots (dashboard recent messages, tooltips). */
export function stalkerMessagePriorityDotClass(p: number | null | undefined): string {
  const level = normalizeStalkerMessagePriority(p);
  if (level === 1) return "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.45)]";
  if (level === 3) return "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]";
  return "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.45)]";
}
