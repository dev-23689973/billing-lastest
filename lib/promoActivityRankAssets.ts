import type { ActivityRank } from "@/lib/promoActivityBadge";

const PROMO_RANK_ICON_BASE = "/images/promo-ranks/icons";

/** UI badge art (48×48) generated from `public/images/promo-ranks/_originals`. */
export const ACTIVITY_RANK_IMAGE: Record<ActivityRank, string> = {
  bronze: `${PROMO_RANK_ICON_BASE}/bronze.png`,
  silver: `${PROMO_RANK_ICON_BASE}/silver.png`,
  gold: `${PROMO_RANK_ICON_BASE}/gold.png`,
  platinum: `${PROMO_RANK_ICON_BASE}/platinum.png`,
  diamond: `${PROMO_RANK_ICON_BASE}/diamond.png`,
  vip: `${PROMO_RANK_ICON_BASE}/vip.png`,
};

export const ADMIN_RANK_IMAGE = `${PROMO_RANK_ICON_BASE}/admin.png`;
