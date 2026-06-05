/**
 * SQL helpers for summing P1+P2 promo bonus amounts from transaction remarks.
 * Hierarchy add-credit writes `[promo_grant:…|p1=…|p2=…]` on the sender **DBIT** row;
 * the matching recipient **CRDT** uses `[grant_meta:p1=…|p2=…]` only.
 */

/** Use inside `SELECT … AS t` — parses p1= and p2= tags from remarks. */
export const PROMO_BONUS_REMARKS_SUM_EXPR = `COALESCE(SUM(
  IFNULL(CAST(NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(remarks, ''), 'p1=', -1), '|', 1)), '') AS UNSIGNED), 0) +
  IFNULL(CAST(NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(remarks, ''), 'p2=', -1), '|', 1)), '') AS UNSIGNED), 0)
), 0)`;

/** Issuer-side promo grants (admin/manager/reseller debits when bonus tiers apply). */
export const PROMO_GRANT_ISSUER_WHERE = `UPPER(type) = 'DBIT' AND remarks LIKE '%[promo_grant:%'`;

/** Recipient-side promo metadata on hierarchy CRDT rows. */
export const PROMO_GRANT_RECIPIENT_WHERE = `UPPER(type) = 'CRDT' AND remarks LIKE '%[grant_meta:%'`;
