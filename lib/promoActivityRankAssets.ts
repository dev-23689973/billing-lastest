import { ACTIVITY_RANK_SLOT_COUNT, type ActivityRank } from "@/lib/promoActivityBadge";

const PROMO_RANK_ICON_BASE = "/images/promo-ranks/icons";

/** Display size for one lit rank slot in the sidebar badge row. */
export const PROMO_RANK_SLOT_DISPLAY_PX = 20;

/** Admin crest uses a 5× footprint at 125% scale for legibility. */
export const ADMIN_RANK_SLOT_DISPLAY_PX = 25;

/** Source art for rank slots (48×48) generated from `public/images/promo-ranks/_originals`. */
export const ACTIVITY_RANK_IMAGE: Record<ActivityRank, string> = {
  bronze: `${PROMO_RANK_ICON_BASE}/bronze.png`,
  silver: `${PROMO_RANK_ICON_BASE}/silver.png`,
  gold: `${PROMO_RANK_ICON_BASE}/gold.png`,
  platinum: `${PROMO_RANK_ICON_BASE}/platinum.png`,
  diamond: `${PROMO_RANK_ICON_BASE}/diamond.png`,
  vip: `${PROMO_RANK_ICON_BASE}/vip.png`,
};

/** Wide 3D admin crest (5× slot width, same height) from `_originals/admin.png`. */
export const ADMIN_RANK_IMAGE = `${PROMO_RANK_ICON_BASE}/admin.png`;
export const ADMIN_RANK_IMAGE_2X = `${PROMO_RANK_ICON_BASE}/admin@2x.png`;
export const ADMIN_RANK_DISPLAY_WIDTH_PX = ADMIN_RANK_SLOT_DISPLAY_PX * ACTIVITY_RANK_SLOT_COUNT;
export const ADMIN_RANK_DISPLAY_HEIGHT_PX = ADMIN_RANK_SLOT_DISPLAY_PX;
