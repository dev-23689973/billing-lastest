/** Transaction payloads safe for client components and server actions. */

export type TransactionTableClientRow = {
  id: number;
  type: string;
  periods: number;
  timestamp: string | null;
  username: string;
  account: string | null;
  full_name: string | null;
  note: string | null;
};

export type TransactionCreditFlowClientPoint = {
  day: string;
  credit: number;
  debit: number;
};

export function toTransactionTableClientRows(
  rows: Array<{
    id: number;
    type: string;
    periods: number;
    timestamp: string | null;
    username: string;
    account?: string | null;
    full_name?: string | null;
    note?: string | null;
  }>,
): TransactionTableClientRow[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    periods: r.periods,
    timestamp: r.timestamp,
    username: r.username,
    account: r.account ?? null,
    full_name: r.full_name ?? null,
    note: r.note ?? null,
  }));
}
