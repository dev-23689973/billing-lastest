/** Ledger types for reseller/dealer → end-user subscription moves (distinct from hierarchy DBIT/CRDT). */
export const SUBSCRIBER_TX_DEBIT = "SUBDBIT" as const;
export const SUBSCRIBER_TX_CREDIT = "SUBCRDT" as const;

export type SubscriberTransactionType = typeof SUBSCRIBER_TX_DEBIT | typeof SUBSCRIBER_TX_CREDIT;

export function isSubscriberDebitType(type: string | null | undefined): boolean {
  const t = String(type ?? "").trim().toUpperCase();
  return t === SUBSCRIBER_TX_DEBIT || t === "DBIT";
}

export function isSubscriberCreditType(type: string | null | undefined): boolean {
  const t = String(type ?? "").trim().toUpperCase();
  return t === SUBSCRIBER_TX_CREDIT;
}

export function isSubscriberLedgerType(type: string | null | undefined): boolean {
  return isSubscriberDebitType(type) || isSubscriberCreditType(type);
}
