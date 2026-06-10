import type { AdminTransactionRow } from "@/lib/repos/billing";
import { resolveHierarchyGrantAmounts } from "@/lib/hierarchyGrantRemark";
import { parseHierarchyRecoverRemark } from "@/lib/hierarchyRecoverRemark";
import { ledgerBonusAmount } from "@/lib/transactionLedgerBonusAmount";

function signedMagnitude(sign: number, magnitude: number): number {
  if (magnitude < 1) return 0;
  return sign < 0 ? -magnitude : magnitude;
}

function rowSign(row: AdminTransactionRow): number {
  const signed = Number(row.periods) || 0;
  if (signed < 0) return -1;
  if (signed > 0) return 1;
  const type = row.type.toUpperCase();
  return type === "DBIT" ? -1 : 1;
}

/**
 * Principal/base credits for the ledger Amt column (excludes admin promo subsidy / promo void).
 * Wallet rows store principal-only on send (DBIT) and principal+promo on receive (CRDT).
 */
export function ledgerPrincipalAmount(row: AdminTransactionRow): number {
  const signed = Number(row.periods) || 0;
  if (signed === 0) return 0;

  const recover = parseHierarchyRecoverRemark(row.remarks);
  if (recover) {
    return signedMagnitude(rowSign(row), recover.payerRefund);
  }

  const grant = resolveHierarchyGrantAmounts(row.remarks, Math.abs(signed), row.account);
  if (grant && grant.base < grant.total) {
    return signed < 0 ? -grant.base : grant.base;
  }
  return signed;
}

/**
 * Full package / event size for the ledger Total column.
 * - Receive loads: principal + promo credited to wallet.
 * - Promo sends: principal + promo package to child (sender wallet debits principal only).
 * - Recover: headline wallet debit (matches note), not parent refund-only row amount.
 */
export function ledgerTotalAmount(row: AdminTransactionRow): number {
  const signed = Number(row.periods) || 0;
  if (signed === 0) return 0;

  const recover = parseHierarchyRecoverRemark(row.remarks);
  if (recover) {
    return signedMagnitude(rowSign(row), recover.walletDebit);
  }

  const grant = resolveHierarchyGrantAmounts(row.remarks, Math.abs(signed), row.account);
  if (grant && grant.base < grant.total) {
    return signed;
  }

  const bonus = ledgerBonusAmount(row);
  if (bonus != null && bonus > 0) {
    const principal = Math.abs(ledgerPrincipalAmount(row));
    if (principal > 0) {
      return signedMagnitude(rowSign(row), principal + bonus);
    }
  }

  return signed;
}
