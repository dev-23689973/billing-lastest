import { CHART_HISTORY_DAYS } from "@/lib/chart-history-days";
import type { AdminTransactionRow, DashboardDayCreditPoint } from "@/lib/repos/billing";
import { getCreditFlowByDayForUsername } from "@/lib/repos/billing";
import { getCreditBalance } from "@/lib/repos/creditBalance";
import { listTransactionsTablePaged } from "@/lib/repos/transactionsTablePaged";

/** Max rows loaded once on the server for client-side ledger filter/pagination. */
export const OPERATOR_LEDGER_SERVER_MAX = 5000;

export type OperatorTransactionsPageData = {
  walletBalance: number;
  creditFlow: DashboardDayCreditPoint[];
  rows: AdminTransactionRow[];
};

export async function loadOperatorTransactionsPageData(username: string): Promise<OperatorTransactionsPageData> {
  const u = username.trim();
  if (!u) {
    return { walletBalance: 0, creditFlow: [], rows: [] };
  }

  const [walletBalance, creditFlow, ledger] = await Promise.all([
    getCreditBalance(u).catch(() => 0),
    getCreditFlowByDayForUsername(u, CHART_HISTORY_DAYS).catch(() => []),
    listTransactionsTablePaged({
      username: u,
      page: 1,
      pageSize: OPERATOR_LEDGER_SERVER_MAX,
      exportMax: OPERATOR_LEDGER_SERVER_MAX,
    }).catch(() => ({
      rows: [] as AdminTransactionRow[],
      total: 0,
      page: 1,
      pageSize: OPERATOR_LEDGER_SERVER_MAX,
      totalPages: 1,
      txnCount7d: 0,
    })),
  ]);

  return {
    walletBalance,
    creditFlow,
    rows: ledger.rows,
  };
}
