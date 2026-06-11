const PROMO_RANK_ICON_BASE = "/images/promo-ranks/icons";

/** Display size for one lit rank slot in the sidebar badge row. */
export const PROMO_RANK_SLOT_DISPLAY_PX = 20;

/** Crowned diamond art for VIP only (Bronze–Diamond use emoji in the badge). */
export const VIP_RANK_IMAGE = `${PROMO_RANK_ICON_BASE}/vip.png`;
export const VIP_RANK_IMAGE_2X = `${PROMO_RANK_ICON_BASE}/vip@2x.png`;

/** Wide 3D admin crest from `_originals/admin.png` — regenerate: `node scripts/generate-admin-rank-icon.mjs` */
export const ADMIN_RANK_IMAGE = `${PROMO_RANK_ICON_BASE}/admin.png`;
export const ADMIN_RANK_IMAGE_2X = `${PROMO_RANK_ICON_BASE}/admin@2x.png`;
/** Expanded on-screen size so all seven rank icons in the crest stay legible. */
export const ADMIN_RANK_DISPLAY_WIDTH_PX = 176;
export const ADMIN_RANK_DISPLAY_HEIGHT_PX = 35;
