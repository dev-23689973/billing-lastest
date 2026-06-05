import { pickTierPercentage, type PromoTier } from "@/lib/promoBonus";

export type ActivityRank = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export const ACTIVITY_RANK_SLOT_COUNT = 5;

/** Show bell nudge when active clients are within this many of the next Promo 2 tier. */
export const ACTIVITY_NUDGE_WITHIN_CLIENTS = 50;

export type ActivityNudge = {
  clientsAway: number;
  targetActiveClients: number;
  nextTierIndex: number;
  nextRank: ActivityRank;
  nextLitCount: number;
  nextPromo2Pct: number;
  /** Stable id for client dismiss (next tier GE threshold). */
  dismissKey: string;
};

export type ActivityBadge = {
  rank: ActivityRank;
  /** Lit icons within the current rank band (1–5), from Promo 2 row index. */
  count: number;
  /** 1-based Promo 2 row index. */
  tierIndex: number;
  totalTiers: number;
  activeClients: number;
  promo2Pct: number;
  /** Active clients needed for the next Promo 2 row; null when already on the last tier. */
  clientsToNextTier: number | null;
  nextRank: ActivityRank | null;
  nextLitCount: number | null;
};

export const ACTIVITY_RANKS: ActivityRank[] = ["bronze", "silver", "gold", "platinum", "diamond"];

export const ACTIVITY_RANK_LABEL: Record<ActivityRank, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

export const ACTIVITY_RANK_ICON: Record<ActivityRank, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "💠",
};

/** Half-open Promo 2 tier match; returns 1-based row index or null. */
export function pickPromo2TierIndex(activeClients: number, tiers: PromoTier[]): number | null {
  if (!Number.isFinite(activeClients) || activeClients < 0 || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.ge - b.ge);
  const c = Math.floor(activeClients);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (c < t.ge) continue;
    if (t.lt != null && c >= t.lt) continue;
    return i + 1;
  }
  return null;
}

/**
 * Promo 2 row → rank band (every 5 rows):
 * 1–5 Bronze, 6–10 Silver, 11–15 Gold, 16–20 Platinum, 21+ Diamond.
 */
export function activityRankFromTierIndex(tierIndex: number, _totalTiers?: number): ActivityRank | null {
  if (!Number.isFinite(tierIndex) || tierIndex < 1) return null;
  const bandIndex = Math.min(
    ACTIVITY_RANKS.length - 1,
    Math.floor((tierIndex - 1) / ACTIVITY_RANK_SLOT_COUNT),
  );
  return ACTIVITY_RANKS[bandIndex] ?? null;
}

/** Lit count = position within the current 5-row band (1–5). */
export function activityRankLevelFromTierIndex(
  tierIndex: number,
  totalTiers: number,
): { rank: ActivityRank; count: number } | null {
  void totalTiers;
  const rank = activityRankFromTierIndex(tierIndex);
  if (!rank) return null;
  const count = ((tierIndex - 1) % ACTIVITY_RANK_SLOT_COUNT) + 1;
  return { rank, count };
}

export function resolveActivityBadge(activeClients: number, tiers: PromoTier[]): ActivityBadge | null {
  const sorted = [...tiers].sort((a, b) => a.ge - b.ge);
  const tierIndex = pickPromo2TierIndex(activeClients, sorted);
  if (tierIndex == null) return null;
  const level = activityRankLevelFromTierIndex(tierIndex, sorted.length);
  if (!level) return null;
  const clients = Math.floor(activeClients);

  const nextTierIndex = tierIndex + 1;
  const hasNextTier = nextTierIndex <= sorted.length;
  const nextTier = hasNextTier ? sorted[nextTierIndex - 1] : null;
  const nextLevel = hasNextTier ? activityRankLevelFromTierIndex(nextTierIndex, sorted.length) : null;
  const clientsToNextTier =
    nextTier && clients < nextTier.ge ? Math.max(0, nextTier.ge - clients) : null;

  return {
    rank: level.rank,
    count: level.count,
    tierIndex,
    totalTiers: sorted.length,
    activeClients: clients,
    promo2Pct: pickTierPercentage(clients, sorted),
    clientsToNextTier,
    nextRank: nextLevel?.rank ?? null,
    nextLitCount: nextLevel?.count ?? null,
  };
}

export function sanitizeBadgeLitCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(ACTIVITY_RANK_SLOT_COUNT, n);
}

export function activityBadgeAriaLabel(badge: Pick<ActivityBadge, "rank" | "count">): string {
  return `${badge.count} of ${ACTIVITY_RANK_SLOT_COUNT} ${ACTIVITY_RANK_LABEL[badge.rank]} badges`;
}

export function activityBadgeTitle(badge: ActivityBadge): string {
  const clients = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(badge.activeClients);
  return `${ACTIVITY_RANK_ICON[badge.rank]} ${ACTIVITY_RANK_LABEL[badge.rank]} ${badge.count}/${ACTIVITY_RANK_SLOT_COUNT} · Promo 2 tier ${badge.tierIndex}/${badge.totalTiers} · ${clients} active clients · ${badge.promo2Pct}%`;
}

export function activityBadgeHoverText(
  badge: Pick<
    ActivityBadge,
    "rank" | "count" | "activeClients" | "clientsToNextTier" | "nextRank" | "nextLitCount"
  >,
): { statusLine: string; remainLine: string | null } {
  const statusLine = `${ACTIVITY_RANK_LABEL[badge.rank]} ${badge.count}/${ACTIVITY_RANK_SLOT_COUNT} · ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(badge.activeClients)} active clients`;

  if (
    badge.clientsToNextTier == null ||
    badge.nextRank == null ||
    badge.nextLitCount == null ||
    badge.clientsToNextTier <= 0
  ) {
    return { statusLine, remainLine: "Top tier reached" };
  }

  const n = badge.clientsToNextTier;
  const nextLabel = `${ACTIVITY_RANK_LABEL[badge.nextRank]} ${badge.nextLitCount}/${ACTIVITY_RANK_SLOT_COUNT}`;
  return {
    statusLine,
    remainLine: `${n} client${n === 1 ? "" : "s"} to ${nextLabel}`,
  };
}

/** Next Promo 2 row threshold when user is within `withinClients` active clients. */
export function resolveActivityNudge(
  activeClients: number,
  tiers: PromoTier[],
  withinClients = ACTIVITY_NUDGE_WITHIN_CLIENTS,
): ActivityNudge | null {
  if (!Number.isFinite(withinClients) || withinClients < 1) return null;
  const sorted = [...tiers].sort((a, b) => a.ge - b.ge);
  if (sorted.length === 0) return null;

  const tierIndex = pickPromo2TierIndex(activeClients, sorted);
  if (tierIndex == null) return null;

  const nextTierIndex = tierIndex + 1;
  if (nextTierIndex > sorted.length) return null;

  const nextTier = sorted[nextTierIndex - 1];
  const clientsAway = nextTier.ge - Math.floor(activeClients);
  if (clientsAway <= 0 || clientsAway > withinClients) return null;

  const nextLevel = activityRankLevelFromTierIndex(nextTierIndex, sorted.length);
  if (!nextLevel) return null;

  return {
    clientsAway,
    targetActiveClients: nextTier.ge,
    nextTierIndex,
    nextRank: nextLevel.rank,
    nextLitCount: nextLevel.count,
    nextPromo2Pct: nextTier.percentage,
    dismissKey: String(nextTier.ge),
  };
}

export function activityNudgeTitle(nudge: Pick<ActivityNudge, "clientsAway" | "nextRank" | "nextLitCount">): string {
  const label = ACTIVITY_RANK_LABEL[nudge.nextRank];
  const icon = ACTIVITY_RANK_ICON[nudge.nextRank];
  const n = nudge.clientsAway;
  return `${n} client${n === 1 ? "" : "s"} to ${nudge.nextLitCount} ${label} ${icon}`;
}

export function activityNudgeMeta(nudge: Pick<ActivityNudge, "nextPromo2Pct">): string {
  const pct = Number.isInteger(nudge.nextPromo2Pct)
    ? String(nudge.nextPromo2Pct)
    : String(nudge.nextPromo2Pct).replace(/\.?0+$/, "");
  return `Promo 2 bonus rises to ${pct}% on credit orders.`;
}
