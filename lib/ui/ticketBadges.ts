import { uiStatusPillClass } from "@/lib/ui/responsiveScale";

/**
 * Ticket table / detail pills — solid fills on light, translucent HUD on dark.
 * status_id: 1 = In progress, 2 = Fixed, 3 = Re-opened
 * priority_id: 1 = High, 2 = Normal, 3 = Low
 */

export function ticketStatusLabel(statusId: number): string {
  if (statusId === 1) return "In progress";
  if (statusId === 2) return "Fixed";
  if (statusId === 3) return "Re-opened";
  return String(statusId);
}

/** Compact status text for dense ticket tables (full label via `title`). */
export function ticketStatusTableLabel(statusId: number): string {
  if (statusId === 1) return "In prog.";
  if (statusId === 2) return "Fixed";
  if (statusId === 3) return "Re-open";
  return String(statusId);
}

export function ticketPriorityLabel(priorityId: number): string {
  if (priorityId === 1) return "High";
  if (priorityId === 2) return "Normal";
  if (priorityId === 3) return "Low";
  return String(priorityId);
}

export function ticketStatusBadgeClass(statusId: number): string {
  if (statusId === 1) {
    return "border-cyan-700 bg-cyan-100 text-cyan-900 dark:border-cyan-400/40 dark:bg-cyan-500/12 dark:text-cyan-300";
  }
  if (statusId === 2) {
    return "border-emerald-700 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/12 dark:text-emerald-300";
  }
  if (statusId === 3) {
    return "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/12 dark:text-amber-300";
  }
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

export function ticketPriorityBadgeClass(priorityId: number): string {
  if (priorityId === 1) {
    return "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/12 dark:text-amber-300";
  }
  if (priorityId === 2) {
    return "border-sky-700 bg-sky-100 text-sky-900 dark:border-cyan-400/40 dark:bg-cyan-500/12 dark:text-cyan-300";
  }
  if (priorityId === 3) {
    return "border-slate-600 bg-slate-100 text-slate-800 dark:border-emerald-400/40 dark:bg-emerald-500/12 dark:text-emerald-300";
  }
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

export function ticketStatusPillClass(statusId: number, className?: string) {
  return uiStatusPillClass(ticketStatusBadgeClass(statusId), className);
}

export function ticketPriorityPillClass(priorityId: number, className?: string) {
  return uiStatusPillClass(ticketPriorityBadgeClass(priorityId), className);
}

/** Ticket queue KPI header chips — same palette as {@link ticketStatusBadgeClass}. */
export type TicketKpiIntelChipTone = "queue" | "open" | "fixed" | "reopened";

export function ticketKpiIntelChipToneClass(tone: TicketKpiIntelChipTone): string {
  if (tone === "queue") {
    return "border-amber-600/50 bg-amber-50 text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/12 dark:text-amber-200";
  }
  if (tone === "open") return ticketStatusBadgeClass(1);
  if (tone === "fixed") return ticketStatusBadgeClass(2);
  if (tone === "reopened") return ticketStatusBadgeClass(3);
  return "border-border/70 bg-muted/30 text-muted-foreground";
}
