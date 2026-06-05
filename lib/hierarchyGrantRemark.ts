import { formatTransactionRemarksForDisplay } from "@/lib/formatTransactionRemarks";

/** Matches admin/hierarchy CRDT lines: `… (base 123)`. */
const HIERARCHY_GRANT_BASE_RE = /\(base (\d+)\)/;

const GRANT_META_RE = /\[grant_meta:p1=(\d+)\|p2=(\d+)\]/;

const LEGACY_LEADING_TOTAL_RE = /^(\d+)\s+credits\s+received\b/i;

/** SQL fragment: hierarchy credit-load CRDT rows (account filter applied in {@link isHierarchyGrantRemarks}). */
export const HIERARCHY_GRANT_CRDT_WHERE_SQL = `username = :u AND type = 'CRDT'
     AND (
       remarks LIKE '%(base %'
       OR remarks LIKE '%credits received%'
       OR remarks LIKE '%received % credits%'
       OR remarks LIKE '%Credit%From%'
       OR remarks LIKE '%credit%from%'
       OR remarks LIKE '%<strong>From%'
       OR remarks LIKE '%[grant_meta:%'
       OR remarks LIKE '%[promo_grant:%'
       OR remarks LIKE '%credit%added%'
       OR remarks LIKE '%credits%added%'
       OR remarks LIKE '%credit%load%'
     )`;

/** Subscriber renewal CRDT (not an upstream hierarchy load). */
export function isSubscriberBeneficiaryCrdt(
  remarks: string | null | undefined,
  account?: string | null,
): boolean {
  const ac = (account ?? "").trim();
  if (!ac) return false;
  const rm = stripHierarchyGrantRemarks(remarks ?? "").toLowerCase();
  if (/\brenew\b/.test(rm) || /\brenewed\b/.test(rm)) return true;
  if (/\baccount\s+\d+/.test(rm)) return true;
  return false;
}

export function stripHierarchyGrantRemarks(raw: string | null | undefined): string {
  return formatTransactionRemarksForDisplay(raw);
}

export function isHierarchyBeneficiaryCrdtAccount(account: string | null | undefined): boolean {
  return account == null || String(account).trim() === "";
}

function hierarchyGrantRemarkLooksLikeLoad(rm: string): boolean {
  if (!rm) return false;
  return (
    /\(base \d+\)/.test(rm) ||
    /\bcredits\s+received\b/.test(rm) ||
    /^credit\s+from:/.test(rm) ||
    /credit\s+from:/.test(rm) ||
    /\breceived\s+\d+\s+credits\b/.test(rm) ||
    /\bcredits?\s+(?:added|loaded|transferred)\b/.test(rm) ||
    /\b\d+\s+credits?\s+added\b/.test(rm) ||
    /\bcredit\s+load\b/.test(rm) ||
    /\[grant_meta:/.test(rm) ||
    /\[promo_grant:/.test(rm)
  );
}

/** True when this CRDT is an upstream credit load (not a subscriber renewal on an account). */
export function isHierarchyGrantRemarks(
  remarks: string | null | undefined,
  account?: string | null,
): boolean {
  const rm = stripHierarchyGrantRemarks(remarks ?? "").toLowerCase();
  if (!rm) return false;
  if (!hierarchyGrantRemarkLooksLikeLoad(rm)) return false;
  if (isHierarchyBeneficiaryCrdtAccount(account)) {
    if (/\brenew\b/.test(rm) && !/\bcredits\s+received\b/.test(rm) && !/\(base \d+\)/.test(rm) && !/^credit\s+from:/.test(rm)) {
      return false;
    }
    return true;
  }
  // Legacy PHP sometimes stored beneficiary CRDT with `account` set — still a recoverable load.
  if (/\brenew\b/.test(rm) && !/\bcredits\s+received\b/.test(rm) && !/\(base \d+\)/.test(rm)) {
    return false;
  }
  return true;
}

export function parseHierarchyGrantBaseCredits(remarks: string | null | undefined): number | null {
  if (remarks == null || String(remarks).trim() === "") return null;
  const m = String(remarks).match(HIERARCHY_GRANT_BASE_RE);
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Principal + credited total for a hierarchy grant row (new tagged rows and legacy PHP/plain). */
export function resolveHierarchyGrantAmounts(
  remarks: string | null | undefined,
  periods: number,
  account?: string | null,
): { base: number; total: number } | null {
  const total = Math.floor(Number(periods));
  if (!Number.isFinite(total) || total < 1) return null;
  if (!isHierarchyGrantRemarks(remarks, account)) return null;

  const baseTagged = parseHierarchyGrantBaseCredits(remarks);
  if (baseTagged != null) return { base: baseTagged, total };

  const stripped = stripHierarchyGrantRemarks(remarks ?? "");
  const leading = stripped.match(LEGACY_LEADING_TOTAL_RE);
  if (leading) {
    const n = Math.floor(Number(leading[1]));
    if (Number.isFinite(n) && n >= 1) return { base: Math.min(n, total), total };
  }

  return { base: total, total };
}

/**
 * Wallet CRDT that increases hierarchy balance but may use a legacy remark shape
 * (used when strict grant SQL finds nothing while balance > 0).
 */
export function resolveLooseWalletCrdtAmounts(
  remarks: string | null | undefined,
  periods: number,
  account?: string | null,
): { base: number; total: number } | null {
  if (isSubscriberBeneficiaryCrdt(remarks, account)) return null;
  const strict = resolveHierarchyGrantAmounts(remarks, periods, account);
  if (strict) return strict;
  const total = Math.floor(Number(periods));
  if (!Number.isFinite(total) || total < 1) return null;
  const rm = stripHierarchyGrantRemarks(remarks ?? "").toLowerCase();
  if (rm && hierarchyGrantRemarkLooksLikeLoad(rm)) return { base: total, total };
  if (isHierarchyBeneficiaryCrdtAccount(account) && (!rm || rm.length < 1)) return { base: total, total };
  return null;
}

/** Promo split stored on beneficiary CRDT line (new rows); legacy rows omit this. */
export function parseHierarchyGrantMetaPromos(remarks: string | null | undefined): { p1: number; p2: number } | null {
  if (remarks == null || String(remarks).trim() === "") return null;
  const m = String(remarks).match(GRANT_META_RE);
  if (!m) return null;
  const p1 = Math.floor(Number(m[1]));
  const p2 = Math.floor(Number(m[2]));
  if (!Number.isFinite(p1) || !Number.isFinite(p2) || p1 < 0 || p2 < 0) return null;
  return { p1, p2 };
}
