/** `YYYY-MM` in local time — matches `DashboardTrendPoint.key`. */
export function hudMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** `DD_MON` (e.g. `07_MAY`) for HUD calendar / daily activity headers. */
export function formatHudDayMonthLabel(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString(undefined, { month: "short" }).toUpperCase();
  return `${day}_${mon}`;
}

/** Local calendar day `YYYY-MM-DD` (matches admin activity API keys). */
export function hudLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** True when `d` is strictly after today's local calendar date (no time-of-day). */
export function hudIsFutureLocalDay(d: Date, now: Date = new Date()) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return a > b;
}

/** Inclusive start/end of the 42-cell Sunday grid for `viewMonth`. */
export function hudCalendarGridRange(viewMonth: Date): { start: Date; end: Date } {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const start = new Date(y, m, 1 - lead);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return { start, end };
}
