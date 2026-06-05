import { CheckCircle2, Clock, Gauge, Layers, ListOrdered } from "lucide-react";

import { beltWidthPct } from "@/components/ui/StatusChevronBelts";
import type { MessageKpiBeltRow } from "@/lib/messages/messageKpiBeltTypes";
import type { AdminStalkerMessageDashboardStats } from "@/lib/repos/billing";

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pct(count: number, denom: number) {
  if (denom <= 0) return 0;
  return Math.min(100, Math.round((count / denom) * 100));
}

export type StalkerChartLayerKey = "total" | "delivered" | "queued";

export const STALKER_CHART_LAYER_COLORS: Record<StalkerChartLayerKey, { fill: string; em: number }> = {
  total: { fill: "#06b6d4", em: 0.15 },
  delivered: { fill: "#22c55e", em: 0.14 },
  queued: { fill: "#f59e0b", em: 0.13 },
};

export type StalkerChartLayer = {
  key: StalkerChartLayerKey;
  count: number;
  fillPct: number;
  innerR: number;
  outerR: number;
  height: number;
};

/** Radial band ~0.15 per ring (outer total band was 0.50 — visually too thick). */
const STALKER_RING_THICKNESS = 0.15;

const STALKER_CHART_LAYER_GEOMETRY: Record<
  StalkerChartLayerKey,
  { innerR: number; outerR: number; height: number }
> = {
  total: { innerR: 0.88, outerR: 0.88 + STALKER_RING_THICKNESS, height: 0.42 },
  delivered: { innerR: 0.72, outerR: 0.86, height: 0.42 },
  queued: { innerR: 0.56, outerR: 0.7, height: 0.38 },
};

/** Concentric rings: total → delivered → queued (delivery rate / priority stay on belts only). */
export function buildStalkerChartLayers(stats: AdminStalkerMessageDashboardStats): StalkerChartLayer[] {
  const total = Math.max(0, stats.recipients30d);
  const delivered = Math.max(0, stats.delivered);
  const queued = Math.max(0, total - delivered);
  const totalDenom = Math.max(1, total);

  const layers: Array<{ key: StalkerChartLayerKey; count: number; fillPct: number }> = [
    { key: "total", count: total, fillPct: total > 0 ? 100 : 0 },
    { key: "delivered", count: delivered, fillPct: beltWidthPct(delivered, totalDenom, false) },
    { key: "queued", count: queued, fillPct: beltWidthPct(queued, totalDenom, false) },
  ];

  return layers
    .filter((l) => l.count > 0 && l.fillPct > 0)
    .map((l) => ({
      ...l,
      ...STALKER_CHART_LAYER_GEOMETRY[l.key],
    }));
}

export function buildStalkerMessageBeltRows(
  stats: AdminStalkerMessageDashboardStats,
  subscriberReach: number,
): MessageKpiBeltRow[] {
  const total = Math.max(0, stats.recipients30d);
  const delivered = Math.max(0, stats.delivered);
  const queued = Math.max(0, total - delivered);
  const deliveredPct = pct(delivered, total);
  const queuedPct = pct(queued, total);
  const ratePct = stats.deliveryPct ?? deliveredPct;
  const rateText =
    stats.deliveryPct != null ? `${stats.deliveryPct}%` : total === 0 ? "—" : `${deliveredPct}%`;
  const prioSum = Math.max(
    1,
    stats.pendingHigh + stats.pendingNormal + stats.pendingLow + stats.pendingOther,
  );

  const subs = Math.max(0, subscriberReach);

  return [
    {
      key: "total",
      label: "STB QUEUE",
      headline: `${formatInt(total)} rows · ${formatInt(subs)} subs`,
      subline: `${formatInt(total)} messages · ${formatInt(subs)} subs`,
      widthPct: beltWidthPct(total, total, true),
      gradient: "from-cyan-400 via-cyan-500 to-teal-800",
      Icon: Layers,
      iconClass: "text-cyan-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: [
        { label: "Device messages (your scope)", value: formatInt(total) },
        { label: "Mapped subscribers", value: formatInt(Math.max(0, subscriberReach)) },
        { label: "Sends today", value: formatInt(stats.sendsToday) },
      ],
    },
    {
      key: "delivered",
      label: "DELIVERED",
      headline: delivered > 0 ? `${deliveredPct}% · ${formatInt(delivered)}` : "None",
      subline: `${deliveredPct}% (${formatInt(delivered)})`,
      widthPct: beltWidthPct(delivered, Math.max(1, total), false),
      gradient: "from-emerald-400 to-emerald-700",
      Icon: CheckCircle2,
      iconClass: "text-emerald-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: [
        { label: "Acknowledged (need_confirm = 0)", value: formatInt(delivered) },
        { label: "Share of rows", value: total > 0 ? `${deliveredPct}%` : "—" },
        { label: "Still queued", value: formatInt(queued) },
      ],
    },
    {
      key: "queued",
      label: "QUEUED",
      headline: queued > 0 ? `${queuedPct}% · ${formatInt(queued)}` : "None",
      subline: `${queuedPct}% (${formatInt(queued)})`,
      widthPct: beltWidthPct(queued, Math.max(1, total), false),
      gradient: "from-amber-400 to-amber-700",
      Icon: Clock,
      iconClass: "text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: [
        { label: "Awaiting device ack", value: formatInt(queued) },
        { label: "Share of rows", value: total > 0 ? `${queuedPct}%` : "—" },
        { label: "Already delivered", value: formatInt(delivered) },
      ],
    },
    {
      key: "rate",
      label: "DELIVERY RATE",
      headline: total === 0 ? "—" : `${rateText} · ${stats.deliveryPending ? "awaiting ack" : "cleared"}`,
      subline: `${rateText} · ${stats.deliveryPending ? "awaiting ack" : "cleared"}`,
      widthPct: beltWidthPct(ratePct, 100, false),
      gradient: "from-sky-400 via-sky-500 to-blue-800",
      Icon: Gauge,
      iconClass: "text-sky-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      muted: total === 0,
      details: [
        { label: "Delivery rate", value: rateText },
        { label: "Ack status", value: stats.deliveryPending ? "Awaiting ack" : "Cleared" },
        { label: "Sends today", value: formatInt(stats.sendsToday) },
        { label: "Delivered rows", value: formatInt(delivered) },
      ],
    },
    {
      key: "prio",
      label: "BY PRIORITY",
      headline: `${formatInt(stats.pendingHigh)} hi · ${formatInt(stats.pendingNormal)} norm · ${formatInt(stats.pendingLow)} low`,
      subline: `${formatInt(stats.pendingHigh)} hi · ${formatInt(stats.pendingNormal)} norm · ${formatInt(stats.pendingLow)} low`,
      widthPct: beltWidthPct(stats.pendingHigh + stats.pendingNormal, prioSum, false),
      gradient: "from-slate-400 to-slate-700",
      Icon: ListOrdered,
      iconClass: "text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: [
        { label: "High priority queue", value: formatInt(stats.pendingHigh) },
        { label: "Normal priority queue", value: formatInt(stats.pendingNormal) },
        { label: "Low priority queue", value: formatInt(stats.pendingLow) },
        { label: "Other / unset priority", value: formatInt(stats.pendingOther) },
      ],
    },
  ];
}

/** Caption under TOTAL ROWS belt (mapped subscribers). */
