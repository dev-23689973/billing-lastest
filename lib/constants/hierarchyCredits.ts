import { HIERARCHY_GLOBAL_ADD_CREDIT_MAX } from "@/lib/billing/hierarchyCreditSettingsValidation";

/** Hard system ceiling (wallet / numeric safety). Settings UI caps at {@link HIERARCHY_GLOBAL_ADD_CREDIT_MAX}. */
export const HIERARCHY_ADD_CREDITS_MAX = 9_999_999;

export { HIERARCHY_GLOBAL_ADD_CREDIT_MAX };
export const HIERARCHY_RECOVER_CREDITS_MAX = 999_999;

/** Synthetic recover row when wallet balance > 0 but no grant CRDT is linked (not a DB transaction id). */
export const WALLET_BALANCE_RECOVER_GRANT_TX_ID = 0;

export function isWalletBalanceRecoverGrantId(id: number): boolean {
  return Math.floor(Number(id)) === WALLET_BALANCE_RECOVER_GRANT_TX_ID;
}

export function parseRecoverGrantTxIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((x) => Math.floor(Number(x)))
        .filter((n) => Number.isFinite(n) && (isWalletBalanceRecoverGrantId(n) || n >= 1)),
    ),
  ].sort((a, b) => a - b);
}

/** Max principal allowed on ADD: settings cap, extended up to payer wallet when balance is finite (client-safe). */
export function hierarchyAddCreditsSubmitMax(policyMax: number, payerBal?: number): number {
  const policy = Math.max(1, Math.floor(policyMax));
  if (payerBal == null || !Number.isFinite(payerBal) || payerBal >= Number.MAX_SAFE_INTEGER / 4) {
    return policy;
  }
  const wallet = Math.max(1, Math.floor(payerBal));
  return Math.min(HIERARCHY_ADD_CREDITS_MAX, Math.max(policy, wallet));
}

/** `apply_promo=0` / false → additional-credit add (principal only). Omitted or `1` → Promo 1 + Promo 2 apply. */
export function parseHierarchyAddCreditApplyPromo(raw: unknown): boolean {
  if (raw === "0" || raw === 0 || raw === false) return false;
  return true;
}
