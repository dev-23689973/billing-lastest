import { isWalletCreditType, isWalletDebitType } from "@/lib/billing/transactionWalletSql";

export function txSummary(transactions: Array<{ type: string; periods: number; timestamp: string | null }>) {
  const creditRows = transactions.filter((t) => isWalletCreditType(t.type));
  const debitRows = transactions.filter((t) => isWalletDebitType(t.type));
  return {
    total: transactions.length,
    creditCount: creditRows.length,
    debitCount: debitRows.length,
    netPeriods: transactions.reduce((acc, t) => acc + (Number(t.periods) || 0), 0),
    creditPeriods: creditRows.reduce((acc, t) => acc + Math.abs(Number(t.periods) || 0), 0),
    debitPeriods: debitRows.reduce((acc, t) => acc + Math.abs(Number(t.periods) || 0), 0),
    lastTransactionAt: transactions[0]?.timestamp ?? null,
  };
}
