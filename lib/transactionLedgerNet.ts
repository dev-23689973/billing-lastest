import { isWalletCreditType } from "@/lib/billing/transactionWalletSql";

export type TransactionLedgerNetMode = "subscriberRaw" | "walletSigned";

/**
 * Footer net for transaction modals.
 * - `subscriberRaw`: periods from `listTransactionsByAccount` (PHP users/view) — debits positive, credits subtract.
 * - `walletSigned`: periods from `getOperatorTransactions` (admin signed SQL) — sum displayed values = wallet movement.
 */
export function netLedgerPeriodsForRows(
  rows: ReadonlyArray<{ type: string; periods: number }>,
  mode: TransactionLedgerNetMode,
): number {
  if (mode === "walletSigned") {
    return rows.reduce((sum, r) => sum + (Number(r.periods) || 0), 0);
  }
  return rows.reduce((sum, r) => sum + (isWalletCreditType(r.type) ? -(Number(r.periods) || 0) : Number(r.periods) || 0), 0);
}
