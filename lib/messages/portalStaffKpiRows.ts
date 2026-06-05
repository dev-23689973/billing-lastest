import { CheckCircle2, Clock, Gauge, Layers, Send } from "lucide-react";

import { beltWidthPct } from "@/components/ui/StatusChevronBelts";
import type { MessageKpiBeltRow } from "@/lib/messages/messageKpiBeltTypes";
import type { MessageKpiBeltDetailLine } from "@/lib/messages/messageKpiBeltTypes";
import type {
  AdminPortalStaffMessageDashboardStats,
  PortalStaffAudiencePreviewCounts,
  PortalStaffRoleMessageStatus,
} from "@/lib/repos/portalStaffMessages";

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pct(count: number, denom: number) {
  if (denom <= 0 || count <= 0) return 0;
  return Math.min(100, Math.round((count / denom) * 100));
}

/** Recipient rows used for dismiss % — never 0 when pending/dismissed rows exist. */
function portalActivityDenom(stats: AdminPortalStaffMessageDashboardStats): number {
  return Math.max(
    stats.recipientRows,
    stats.dismissed + stats.pendingDismiss,
    1,
  );
}

function shareHeadline(count: number, denom: number): string {
  if (count <= 0) return "None";
  if (denom <= 0) return formatInt(count);
  return `${pct(count, denom)}% · ${formatInt(count)}`;
}

/** Layered ring keys (outside → in) — match REACHABLE / MESSAGES SENT / DISMISSED / PENDING belts. */
export type PortalStaffChartLayerKey = "reachable" | "sent" | "dismissed" | "pending";

export const PORTAL_STAFF_CHART_LAYER_COLORS: Record<
  PortalStaffChartLayerKey,
  { fill: string; em: number }
> = {
  reachable: { fill: "#f59e0b", em: 0.15 },
  sent: { fill: "#818cf8", em: 0.14 },
  dismissed: { fill: "#22c55e", em: 0.13 },
  pending: { fill: "#f97316", em: 0.12 },
};

export type PortalStaffChartLayer = {
  key: PortalStaffChartLayerKey;
  count: number;
  fillPct: number;
  innerR: number;
  outerR: number;
  height: number;
};

/** Radial band ~0.14–0.16 per ring (outer “reachable” was 0.50 — visually too thick). */
const PORTAL_STAFF_RING_THICKNESS = 0.15;

const PORTAL_STAFF_CHART_LAYER_GEOMETRY: Record<
  PortalStaffChartLayerKey,
  { innerR: number; outerR: number; height: number }
> = {
  reachable: {
    innerR: 0.88,
    outerR: 0.88 + PORTAL_STAFF_RING_THICKNESS,
    height: 0.42,
  },
  sent: { innerR: 0.72, outerR: 0.86, height: 0.42 },
  dismissed: { innerR: 0.56, outerR: 0.7, height: 0.38 },
  pending: { innerR: 0.4, outerR: 0.54, height: 0.34 },
};

export function buildPortalStaffChartLayers(
  staffStats: AdminPortalStaffMessageDashboardStats,
  staffAudience: PortalStaffAudiencePreviewCounts,
): PortalStaffChartLayer[] {
  const reachable = Math.max(0, staffAudience.all_staff);
  const activityDenom = portalActivityDenom(staffStats);
  const sentDenom = Math.max(1, activityDenom || reachable);

  const layers: Array<{ key: PortalStaffChartLayerKey; count: number; fillPct: number }> = [
    {
      key: "reachable",
      count: reachable,
      fillPct: reachable > 0 ? 100 : 0,
    },
    {
      key: "sent",
      count: Math.max(0, staffStats.messagesSent),
      fillPct: beltWidthPct(staffStats.messagesSent, sentDenom, false),
    },
    {
      key: "dismissed",
      count: Math.max(0, staffStats.dismissed),
      fillPct: beltWidthPct(staffStats.dismissed, activityDenom, false),
    },
    {
      key: "pending",
      count: Math.max(0, staffStats.pendingDismiss),
      fillPct: beltWidthPct(staffStats.pendingDismiss, activityDenom, false),
    },
  ];

  return layers
    .filter((l) => l.count > 0 && l.fillPct > 0)
    .map((l) => ({
      ...l,
      ...PORTAL_STAFF_CHART_LAYER_GEOMETRY[l.key],
    }));
}

function roleCountLines(
  byRole: PortalStaffRoleMessageStatus[],
  countFor: (row: PortalStaffRoleMessageStatus) => number,
  unit: string,
): MessageKpiBeltDetailLine[] {
  return byRole.map((row) => ({
    label: row.roleLabel,
    value: `${formatInt(countFor(row))} ${unit}`,
  }));
}

function roleDeliveryRateLines(byRole: PortalStaffRoleMessageStatus[]): MessageKpiBeltDetailLine[] {
  return byRole.map((row) => {
    const denom = Math.max(row.recipientRows, row.dismissed + row.pendingDismiss, 1);
    if (row.recipientRows <= 0) {
      return { label: row.roleLabel, value: "—" };
    }
    const rate = pct(row.dismissed, denom);
    return {
      label: row.roleLabel,
      value: `${rate}% · ${formatInt(row.dismissed)} dismissed`,
    };
  });
}

function reachableByRole(audience: PortalStaffAudiencePreviewCounts): MessageKpiBeltDetailLine[] {
  return [
    { label: "Managers", value: `${formatInt(audience.managers)} staff` },
    { label: "Resellers", value: `${formatInt(audience.resellers)} staff` },
    { label: "Dealers", value: `${formatInt(audience.dealers)} staff` },
  ];
}

export function buildPortalStaffBeltRows(
  staffStats: AdminPortalStaffMessageDashboardStats,
  staffAudience: PortalStaffAudiencePreviewCounts,
  messageByRole: PortalStaffRoleMessageStatus[],
): MessageKpiBeltRow[] {
  const reachable = Math.max(0, staffAudience.all_staff);
  const activityDenom = portalActivityDenom(staffStats);
  const dismissed = Math.max(0, staffStats.dismissed);
  const pending = Math.max(0, staffStats.pendingDismiss);
  const dismissRatePct = pct(dismissed, activityDenom);
  const dismissPending = pending > 0;

  return [
    {
      key: "total",
      label: "REACHABLE",
      headline: `${formatInt(reachable)} staff`,
      subline: formatInt(reachable),
      widthPct: beltWidthPct(reachable, reachable, true),
      gradient: "from-amber-400 via-amber-500 to-yellow-700",
      Icon: Layers,
      iconClass: "text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: reachableByRole(staffAudience),
    },
    {
      key: "sent",
      label: "MESSAGES SENT",
      headline:
        staffStats.messagesSent > 0
          ? `${formatInt(staffStats.messagesSent)} campaigns`
          : "No campaigns yet",
      subline: formatInt(staffStats.messagesSent),
      widthPct: beltWidthPct(staffStats.messagesSent, Math.max(1, activityDenom || reachable), false),
      gradient: "from-violet-400 via-indigo-500 to-indigo-800",
      Icon: Send,
      iconClass: "text-violet-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: roleCountLines(messageByRole, (r) => r.recipientRows, "inbox rows"),
    },
    {
      key: "dismissed",
      label: "DISMISSED",
      headline: shareHeadline(dismissed, activityDenom),
      subline: shareHeadline(dismissed, activityDenom),
      widthPct: beltWidthPct(dismissed, activityDenom, false),
      gradient: "from-emerald-400 to-emerald-700",
      Icon: CheckCircle2,
      iconClass: "text-emerald-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: roleCountLines(messageByRole, (r) => r.dismissed, "messages"),
    },
    {
      key: "pending",
      label: "PENDING DISMISS",
      headline: shareHeadline(pending, activityDenom),
      subline: shareHeadline(pending, activityDenom),
      widthPct: beltWidthPct(pending, activityDenom, false),
      gradient: "from-orange-400 to-orange-700",
      Icon: Clock,
      iconClass: "text-orange-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      details: roleCountLines(messageByRole, (r) => r.pendingDismiss, "messages"),
    },
    {
      key: "rate",
      label: "DELIVERY RATE",
      headline:
        activityDenom <= 0 && dismissed <= 0 && pending <= 0
          ? "—"
          : `${dismissRatePct}% · ${dismissPending ? "awaiting dismiss" : "cleared"}`,
      subline: `${dismissRatePct}% · ${dismissPending ? "awaiting dismiss" : "cleared"}`,
      widthPct: beltWidthPct(dismissRatePct, 100, false),
      gradient: "from-sky-400 via-sky-500 to-blue-800",
      Icon: Gauge,
      iconClass: "text-sky-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]",
      muted: activityDenom <= 0 && dismissed <= 0 && pending <= 0,
      details: roleDeliveryRateLines(messageByRole),
    },
  ];
}
