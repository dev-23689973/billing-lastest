import { SUBSCRIBER_TX_CREDIT, SUBSCRIBER_TX_DEBIT } from "@/lib/billing/subscriberTransactionTypes";

/** SQL `IN` list for transaction types that increase wallet balance (hierarchy + subscriber recover). */
export const TX_WALLET_CREDIT_TYPES_SQL = `'CRDT', '${SUBSCRIBER_TX_CREDIT}'`;

/** `SUM(…)` expression for PHP `get_credit_balance` parity. */
export const TX_WALLET_BALANCE_SUM_SQL = `COALESCE(SUM(CASE WHEN type IN (${TX_WALLET_CREDIT_TYPES_SQL}) THEN periods ELSE -periods END), 0)`;

/** Per-row wallet effect inside a `SUM()` (not wrapped in COALESCE). */
export const TX_WALLET_ROW_EFFECT_SQL = `CASE WHEN type IN (${TX_WALLET_CREDIT_TYPES_SQL}) THEN periods ELSE -periods END`;

/** Admin ledger: signed credit effect for display (CRDT/SUBCRDT positive in wallet terms). */
export const TX_ADMIN_PERIODS_SIGNED_SQL = TX_WALLET_ROW_EFFECT_SQL;

/** Admin list query: flip sign for table display convention. */
export const TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL = `CASE WHEN type IN (${TX_WALLET_CREDIT_TYPES_SQL}) THEN -periods ELSE periods END`;

/** Staff list subquery (`t.` alias). */
export const TX_WALLET_BALANCE_SUM_T_SQL = `COALESCE(SUM(CASE WHEN t.type IN (${TX_WALLET_CREDIT_TYPES_SQL}) THEN t.periods ELSE -t.periods END), 0)`;

export function isWalletCreditType(type: string | null | undefined): boolean {
  const t = String(type ?? "").trim().toUpperCase();
  return t === "CRDT" || t === SUBSCRIBER_TX_CREDIT;
}

export function isWalletDebitType(type: string | null | undefined): boolean {
  const t = String(type ?? "").trim().toUpperCase();
  return t === "DBIT" || t === SUBSCRIBER_TX_DEBIT;
}
