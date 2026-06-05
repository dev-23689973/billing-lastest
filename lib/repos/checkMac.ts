import type { RowDataPacket } from "mysql2";
import { getBillingPool } from "@/lib/db/pool";
import { isValidMacFormat, normalizeMacForLookup } from "@/lib/mac/macFormat";
import { isBillingExpiresInPast } from "@/lib/repos/resellerPortal";

export { isValidMacFormat, normalizeMacForLookup } from "@/lib/mac/macFormat";

export type CheckMacLookupResult =
  | { kind: "invalid" }
  | { kind: "available" }
  | { kind: "ambiguous" }
  | { kind: "exists"; expires: string | null; expired: boolean };

/**
 * PHP `Check_mac::index` — `accounts.mac` exact match; PHP only treats exactly one row as "in use".
 * Tries a few common stored shapes (colon / hyphen, case).
 */
export async function lookupAccountByMac(rawMac: string): Promise<CheckMacLookupResult> {
  if (!isValidMacFormat(rawMac)) return { kind: "invalid" };
  const canon = normalizeMacForLookup(rawMac);
  const hyphen = canon.replace(/:/g, "-");
  const variants = [...new Set([canon, hyphen, canon.toLowerCase(), hyphen.toLowerCase()])];
  const pool = getBillingPool();
  const ph = variants.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT expires FROM accounts WHERE mac IN (${ph}) LIMIT 2`,
    variants,
  );
  if (rows.length === 0) return { kind: "available" };
  if (rows.length > 1) return { kind: "ambiguous" };
  const exp = rows[0].expires != null ? String(rows[0].expires) : null;
  const expired = isBillingExpiresInPast(exp);
  return { kind: "exists", expires: exp, expired };
}
