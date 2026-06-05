import type {
  AdminDayActivityCounts,
  AdminMessageTrafficDayStack,
  DashboardDayCreditPoint,
  DashboardTrendPoint,
} from "@/lib/dashboard/types";
import type { HudDualSeriesPoint } from "@/components/dashboard/hud/HudDualSeriesAreaChart";
import type { HudPeriodId } from "@/components/dashboard/hud/HudPeriodStrip";
import { hudMonthKey } from "@/components/dashboard/hud/hudMonthKey";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function trendWindow(trend: DashboardTrendPoint[], endMonth: Date, count: number) {
  const end = hudMonthKey(endMonth);
  const asc = [...trend].sort((a, b) => a.key.localeCompare(b.key));
  const upto = asc.filter((t) => t.key <= end);
  return upto.slice(-count);
}

/** Chart uses one row per calendar day (1w only). */
export function chartUsesDailyGranularity(period: HudPeriodId): boolean {
  return period === "1w";
}

/** 1m / 3m / 6m: roll daily data into multi-day buckets (~4–14 bars, same as message traffic). */
export function chartUsesBucketedDaily(period: HudPeriodId): boolean {
  return period === "1m" || period === "3m" || period === "6m";
}

export function monthlyCountForPeriod(period: HudPeriodId): number {
  switch (period) {
    case "3m":
      return 3;
    case "6m":
      return 6;
    case "1y":
      return 12;
    default:
      return 6;
  }
}

/** Calendar-day span aligned with server daily rollup (last N days inclusive). */
export function dailyCountForPeriod(period: HudPeriodId): number {
  switch (period) {
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 92;
    case "6m":
      return 183;
    default:
      return 7;
  }
}

/** One row per local calendar day from `from` through `to` (inclusive). */
export function buildHudDailyPointsFromActivityMap(
  byDay: Record<string, AdminDayActivityCounts>,
  from: Date,
  to: Date,
): HudDualSeriesPoint[] {
  const out: HudDualSeriesPoint[] = [];
  const c = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (c <= end) {
    const y = c.getFullYear();
    const m = String(c.getMonth() + 1).padStart(2, "0");
    const d = String(c.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const row = byDay[key];
    out.push({
      id: key,
      x: c.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      a: row?.newCount ?? 0,
      b: row?.expiredCount ?? 0,
    });
    c.setDate(c.getDate() + 1);
  }
  return out;
}

/** Sum every `bucketSizeDays` consecutive days into one step (labels show date span). */
export function aggregateDailyIntoDayBuckets(points: HudDualSeriesPoint[], bucketSizeDays: number): HudDualSeriesPoint[] {
  if (points.length === 0) return [];
  if (bucketSizeDays <= 1) return points;
  const out: HudDualSeriesPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSizeDays) {
    const chunk = points.slice(i, i + bucketSizeDays);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const sumA = chunk.reduce((s, p) => s + p.a, 0);
    const sumB = chunk.reduce((s, p) => s + p.b, 0);
    out.push({
      id: `${first.id}_${last.id}`,
      x: formatDayBucketRangeLabel(first.id, last.id),
      a: sumA,
      b: sumB,
    });
  }
  return out;
}

function parseLocalYmd(id: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(id.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function formatDayBucketRangeLabel(firstId: string, lastId: string): string {
  const a = parseLocalYmd(firstId);
  const b = parseLocalYmd(lastId);
  if (!a || !b) return firstId;
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const left = a.toLocaleDateString("en-US", a.getFullYear() !== b.getFullYear() ? { ...o, year: "numeric" } : o);
  const right = b.toLocaleDateString("en-US", o);
  return `${left}–${right}`;
}

/** ~1 week buckets for 3-month window. */
const HUD_3M_BUCKET_DAYS = 7;

/** ~2 week buckets for 6-month window (same ~13 bars, wider span). */
const HUD_6M_BUCKET_DAYS = 14;

function activityBucketDaysForPeriod(period: HudPeriodId): number {
  if (period === "6m") return HUD_6M_BUCKET_DAYS;
  if (period === "3m") return HUD_3M_BUCKET_DAYS;
  if (period === "1m") return HUD_3M_BUCKET_DAYS;
  return HUD_3M_BUCKET_DAYS;
}

function creditFlowBucketDaysForPeriod(period: HudPeriodId): number {
  if (period === "6m") return HUD_6M_BUCKET_DAYS;
  if (period === "3m") return HUD_3M_BUCKET_DAYS;
  if (period === "1m") return HUD_3M_BUCKET_DAYS;
  return 1;
}

export function buildActivityChartPoints(
  trend: DashboardTrendPoint[],
  dailyFull: HudDualSeriesPoint[],
  period: HudPeriodId,
): HudDualSeriesPoint[] {
  const endMonth = startOfMonth(new Date());
  if (chartUsesBucketedDaily(period)) {
    const n = dailyCountForPeriod(period);
    const slice = dailyFull.slice(-n);
    return aggregateDailyIntoDayBuckets(slice, activityBucketDaysForPeriod(period));
  }
  if (chartUsesDailyGranularity(period)) {
    const n = dailyCountForPeriod(period);
    return dailyFull.slice(-n);
  }
  const months = monthlyCountForPeriod(period);
  const slice = trendWindow(trend, endMonth, months);
  return slice.map((t) => ({
    id: t.key,
    x: t.label,
    a: t.newAccounts,
    b: t.expired,
  }));
}

export function growthStatsForPeriod(
  trend: DashboardTrendPoint[],
  dailyFull: HudDualSeriesPoint[],
  period: HudPeriodId,
): { lastNew: number; maxNew: number } {
  if (chartUsesBucketedDaily(period)) {
    const slice = dailyFull.slice(-dailyCountForPeriod(period));
    const pts = aggregateDailyIntoDayBuckets(slice, activityBucketDaysForPeriod(period));
    const lastNew = pts.length ? pts[pts.length - 1].a : 0;
    const maxNew = pts.length ? Math.max(0, ...pts.map((p) => p.a)) : 0;
    return { lastNew, maxNew };
  }
  if (chartUsesDailyGranularity(period)) {
    const pts = dailyFull.slice(-dailyCountForPeriod(period));
    const lastNew = pts.length ? pts[pts.length - 1].a : 0;
    const maxNew = pts.length ? Math.max(0, ...pts.map((p) => p.a)) : 0;
    return { lastNew, maxNew };
  }
  const months = monthlyCountForPeriod(period);
  const slice = trendWindow(trend, startOfMonth(new Date()), months);
  const lastNew = slice.length ? slice[slice.length - 1].newAccounts : 0;
  const maxNew = slice.length ? Math.max(0, ...slice.map((p) => p.newAccounts)) : 0;
  return { lastNew, maxNew };
}

export function creditFlowDayCountForPeriod(period: HudPeriodId): number {
  switch (period) {
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 92;
    case "6m":
      return 183;
    case "1y":
      return 366;
    default:
      return 14;
  }
}

export function aggregateCreditFlowIntoDayBuckets(
  points: DashboardDayCreditPoint[],
  bucketSizeDays: number,
): DashboardDayCreditPoint[] {
  if (points.length === 0) return [];
  if (bucketSizeDays <= 1) return points;
  const out: DashboardDayCreditPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSizeDays) {
    const chunk = points.slice(i, i + bucketSizeDays);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const creditIn = chunk.reduce((s, p) => s + p.creditIn, 0);
    const creditOut = chunk.reduce((s, p) => s + p.creditOut, 0);
    out.push({
      key: `${first.key}_${last.key}`,
      label: formatDayBucketRangeLabel(first.key, last.key),
      creditIn,
      creditOut,
    });
  }
  return out;
}

/** Rows for the credit flow chart (daily for 1w; weekly+ buckets for longer windows). */
export function buildCreditFlowSeriesForPeriod(full: DashboardDayCreditPoint[], period: HudPeriodId): DashboardDayCreditPoint[] {
  const n = creditFlowDayCountForPeriod(period);
  const slice = full.slice(-n);
  if (period === "1w") {
    return slice;
  }
  if (period === "1y") {
    return aggregateCreditFlowIntoDayBuckets(slice, 30);
  }
  if (chartUsesBucketedDaily(period)) {
    return aggregateCreditFlowIntoDayBuckets(slice, creditFlowBucketDaysForPeriod(period));
  }
  return slice;
}

/** Sum stacked send_msg buckets across consecutive days (same bucketing as credit flow / activity HUD). */
export function aggregateMessageTrafficIntoDayBuckets(
  points: AdminMessageTrafficDayStack[],
  bucketSizeDays: number,
): AdminMessageTrafficDayStack[] {
  if (points.length === 0) return [];
  if (bucketSizeDays <= 1) return points;
  const out: AdminMessageTrafficDayStack[] = [];
  for (let i = 0; i < points.length; i += bucketSizeDays) {
    const chunk = points.slice(i, i + bucketSizeDays);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    let delivered = 0;
    let highPending = 0;
    let normalPending = 0;
    let lowPending = 0;
    let otherPending = 0;
    for (const p of chunk) {
      delivered += p.delivered;
      highPending += p.highPending;
      normalPending += p.normalPending;
      lowPending += p.lowPending;
      otherPending += p.otherPending;
    }
    out.push({
      dayKey: `${first.dayKey}_${last.dayKey}`,
      dayLabel: formatDayBucketRangeLabel(first.dayKey, last.dayKey),
      delivered,
      highPending,
      normalPending,
      lowPending,
      otherPending,
    });
  }
  return out;
}

/**
 * Message traffic: each bucket renders five side-by-side bars, so the chart must fit in the card width
 * without scrolling at every breakpoint. Bucket sizes are picked so every period yields ≤ ~7 groups.
 *   1w  → daily         (7 groups)
 *   1m  → weekly        (~5 groups)
 *   3m  → bi-weekly     (~7 groups)
 *   6m  → ~monthly      (~6 groups)
 *   1y  → ~bi-monthly   (~6 groups)
 */
export function buildMessageTrafficSeriesForPeriod(
  full: AdminMessageTrafficDayStack[],
  period: HudPeriodId,
): AdminMessageTrafficDayStack[] {
  const n = creditFlowDayCountForPeriod(period);
  const slice = full.slice(-n);
  switch (period) {
    case "1w":
      return slice;
    case "1m":
      return aggregateMessageTrafficIntoDayBuckets(slice, HUD_3M_BUCKET_DAYS);
    case "3m":
      return aggregateMessageTrafficIntoDayBuckets(slice, 14);
    case "6m":
      return aggregateMessageTrafficIntoDayBuckets(slice, 30);
    case "1y":
      return aggregateMessageTrafficIntoDayBuckets(slice, 60);
    default:
      return slice;
  }
}
