import { SUBSCRIBER_TX_CREDIT, SUBSCRIBER_TX_DEBIT } from "@/lib/billing/subscriberTransactionTypes";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import { parseHierarchyGrantBaseCredits } from "@/lib/hierarchyGrantRemark";
import { parseHierarchyRecoverRemark } from "@/lib/hierarchyRecoverRemark";
import { parseTransactionMeta } from "@/lib/transactionLedgerAnalytics";

/** Admin-subsidized bonus credits/months for ledger display (not wallet debits). */
export function ledgerBonusAmount(row: AdminTransactionRow): number | null {
  const recover = parseHierarchyRecoverRemark(row.remarks);
  if (recover && recover.bonusVoid > 0) return recover.bonusVoid;

  const type = row.type.toUpperCase();
  const freeMonth = row.free_month != null && row.free_month > 0 ? Math.floor(row.free_month) : 0;

  if (type === "BONUS" && freeMonth > 0) return freeMonth;
  if (
    freeMonth > 0 &&
    (type === "DBIT" || type === "CRDT" || type === SUBSCRIBER_TX_DEBIT || type === SUBSCRIBER_TX_CREDIT)
  ) {
    return freeMonth;
  }

  const meta = parseTransactionMeta(row);
  const promo = Math.max(0, meta.promo1) + Math.max(0, meta.promo2);
  if (promo > 0) return promo;

  const base = parseHierarchyGrantBaseCredits(row.remarks);
  const mag = Math.abs(Math.floor(row.periods));
  if (base != null && mag > base) return mag - base;

  return null;
}
