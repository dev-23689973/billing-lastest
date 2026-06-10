import { describe, expect, it } from "vitest";
import {
  ACTIVITY_RANK_LABEL,
  activityNudgeTitle,
  activityBadgeHoverText,
  activityRankFromTierIndex,
  activityRankLevelFromTierIndex,
  pickPromo2TierIndex,
  PROMO2_MAX_TIERS,
  resolveActivityBadge,
  resolveActivityNudge,
  sanitizeBadgeLitCount,
  validatePromo2TierLimit,
} from "./promoActivityBadge";
import type { PromoTier } from "./promoBonus";

const SAMPLE_P2: PromoTier[] = [
  { ge: 0, lt: 500, percentage: 1 },
  { ge: 500, lt: 1000, percentage: 1.5 },
  { ge: 1000, lt: 1500, percentage: 2 },
  { ge: 1500, lt: 2000, percentage: 2.5 },
  { ge: 2000, lt: 2500, percentage: 3 },
  { ge: 2500, lt: 3000, percentage: 3.5 },
  { ge: 3000, lt: null, percentage: 4 },
];

describe("pickPromo2TierIndex", () => {
  it("returns 1-based row index for half-open ranges", () => {
    expect(pickPromo2TierIndex(0, SAMPLE_P2)).toBe(1);
    expect(pickPromo2TierIndex(2500, SAMPLE_P2)).toBe(6);
    expect(pickPromo2TierIndex(3000, SAMPLE_P2)).toBe(7);
  });
});

describe("activityRankFromTierIndex", () => {
  it("maps every five Promo 2 rows to the next rank band", () => {
    expect(activityRankFromTierIndex(1)).toBe("bronze");
    expect(activityRankFromTierIndex(5)).toBe("bronze");
    expect(activityRankFromTierIndex(6)).toBe("silver");
    expect(activityRankFromTierIndex(10)).toBe("silver");
    expect(activityRankFromTierIndex(11)).toBe("gold");
    expect(activityRankFromTierIndex(15)).toBe("gold");
    expect(activityRankFromTierIndex(16)).toBe("platinum");
    expect(activityRankFromTierIndex(20)).toBe("platinum");
    expect(activityRankFromTierIndex(21)).toBe("diamond");
    expect(activityRankFromTierIndex(25)).toBe("diamond");
    expect(activityRankFromTierIndex(26)).toBe("vip");
    expect(activityRankFromTierIndex(30)).toBe("vip");
  });
});

describe("validatePromo2TierLimit", () => {
  it("allows up to 30 tiers and rejects more", () => {
    expect(validatePromo2TierLimit(new Array(PROMO2_MAX_TIERS))).toBeNull();
    expect(validatePromo2TierLimit(new Array(PROMO2_MAX_TIERS + 1))).toMatch(/30 tiers/);
  });
});

describe("activityRankLevelFromTierIndex", () => {
  it("returns lit icon count as position within the 5-row band", () => {
    expect(activityRankLevelFromTierIndex(1, 15)).toEqual({ rank: "bronze", count: 1 });
    expect(activityRankLevelFromTierIndex(4, 15)).toEqual({ rank: "bronze", count: 4 });
    expect(activityRankLevelFromTierIndex(6, 15)).toEqual({ rank: "silver", count: 1 });
    expect(activityRankLevelFromTierIndex(7, 15)).toEqual({ rank: "silver", count: 2 });
    expect(activityRankLevelFromTierIndex(11, 15)).toEqual({ rank: "gold", count: 1 });
    expect(activityRankLevelFromTierIndex(25, 25)).toEqual({ rank: "diamond", count: 5 });
    expect(activityRankLevelFromTierIndex(26, 30)).toEqual({ rank: "vip", count: 1 });
    expect(activityRankLevelFromTierIndex(30, 30)).toEqual({ rank: "vip", count: 5 });
  });
});

describe("sanitizeBadgeLitCount", () => {
  it("clamps lit icons to 1–5 and rejects client totals", () => {
    expect(sanitizeBadgeLitCount(2)).toBe(2);
    expect(sanitizeBadgeLitCount(5)).toBe(5);
    expect(sanitizeBadgeLitCount(1900)).toBe(5);
    expect(sanitizeBadgeLitCount(0)).toBe(0);
    expect(sanitizeBadgeLitCount(undefined)).toBe(0);
  });
});

describe("resolveActivityNudge", () => {
  it("returns nudge when within 50 clients of next Promo 2 tier", () => {
    const tiers: PromoTier[] = [
      { ge: 0, lt: 5000, percentage: 4 },
      { ge: 5000, lt: null, percentage: 5.5 },
    ];
    expect(resolveActivityNudge(4975, tiers)).toMatchObject({
      clientsAway: 25,
      targetActiveClients: 5000,
      nextTierIndex: 2,
      nextRank: "bronze",
      nextLitCount: 2,
      nextPromo2Pct: 5.5,
      dismissKey: "5000",
    });
  });

  it("returns null when more than 50 clients away", () => {
    const tiers: PromoTier[] = [
      { ge: 0, lt: 5000, percentage: 4 },
      { ge: 5000, lt: null, percentage: 5.5 },
    ];
    expect(resolveActivityNudge(4949, tiers)).toBeNull();
  });

  it("returns null on the final tier", () => {
    expect(resolveActivityNudge(9000, SAMPLE_P2)).toBeNull();
  });
});

describe("activityNudgeTitle", () => {
  it("formats a short bell headline", () => {
    expect(
      activityNudgeTitle({ clientsAway: 25, nextRank: "diamond", nextLitCount: 1 }),
    ).toBe("25 clients to 1 Diamond 💠");
  });
});

describe("activityBadgeHoverText", () => {
  it("includes status and clients remaining to the next badge level", () => {
    expect(
      activityBadgeHoverText({
        rank: "bronze",
        count: 3,
        activeClients: 1180,
        clientsToNextTier: 20,
        nextRank: "bronze",
        nextLitCount: 4,
      }),
    ).toEqual({
      statusLine: "Bronze 3/5 · 1,180 active clients",
      remainLine: "20 clients to Bronze 4/5",
    });
  });

  it("shows top tier message when there is no next Promo 2 row", () => {
    expect(
      activityBadgeHoverText({
        rank: "vip",
        count: 5,
        activeClients: 9000,
        clientsToNextTier: null,
        nextRank: null,
        nextLitCount: null,
      }),
    ).toEqual({
      statusLine: "VIP 5/5 · 9,000 active clients",
      remainLine: "Top tier reached",
    });
  });
});

describe("resolveActivityBadge", () => {
  it("maps Promo 2 tier row to rank band and lit count", () => {
    expect(resolveActivityBadge(499, SAMPLE_P2)).toMatchObject({
      rank: "bronze",
      count: 1,
      tierIndex: 1,
    });
    expect(resolveActivityBadge(2200, SAMPLE_P2)).toMatchObject({
      rank: "bronze",
      count: 5,
      tierIndex: 5,
    });
    expect(resolveActivityBadge(2500, SAMPLE_P2)).toMatchObject({
      rank: "silver",
      count: 1,
      tierIndex: 6,
      clientsToNextTier: 500,
      nextRank: "silver",
      nextLitCount: 2,
    });
    expect(resolveActivityBadge(3000, SAMPLE_P2)).toMatchObject({
      rank: "silver",
      count: 2,
      tierIndex: 7,
    });
  });

  it("resolves fifteen-tier ladder bands", () => {
    const tiers = fullFifteenTierP2();
    expect(resolveActivityBadge(1900, tiers)).toMatchObject({
      rank: "bronze",
      count: 4,
      tierIndex: 4,
    });
    expect(resolveActivityBadge(5000, tiers)).toMatchObject({
      rank: "gold",
      count: 1,
      tierIndex: 11,
    });
    expect(resolveActivityBadge(25000, tiers)).toMatchObject({
      rank: "gold",
      count: 5,
      tierIndex: 15,
    });
    expect(ACTIVITY_RANK_LABEL[resolveActivityBadge(25000, tiers)!.rank]).toBe("Gold");
  });
});

function fullFifteenTierP2(): PromoTier[] {
  const steps = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 10000, 15000, 20000, 25000];
  return steps.map((ge, i) => ({
    ge,
    lt: i === steps.length - 1 ? null : steps[i + 1],
    percentage: 1 + i * 0.5,
  }));
}
