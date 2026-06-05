import { CHART_HISTORY_DAYS } from "@/lib/chart-history-days";
import { stripClientPayload } from "@/lib/dto/redact";
import { getCreditFlowByDayForUsername } from "@/lib/repos/billing";
import { aggregateLedgerRows } from "@/lib/transactionLedgerAnalytics";
import type { LedgerAggregate } from "@/lib/transactionLedgerAnalytics";
import { listTransactionsForLedgerSummary, listTransactionsTablePaged } from "@/lib/repos/transactionsTablePaged";
import type { SessionPayload } from "@/lib/session";

type Fail = { ok: false; error: string; status: number };

function fail(error: string, status: number): Fail {
  return { ok: false, error, status };
}

export async function loadTransactionsCreditFlowForClient(session: SessionPayload, daysRaw?: number) {
  if (!session.username?.trim()) return fail("forbidden", 403);

  const days = Math.min(
    366,
    Math.max(1, Math.floor(Number(daysRaw) || CHART_HISTORY_DAYS)),
  );

  const creditFlow = await getCreditFlowByDayForUsername(session.username.trim(), days).catch(() => []);
  return stripClientPayload({ ok: true as const, creditFlow });
}

export async function loadTransactionsLedgerSummaryForClient(session: SessionPayload) {
  if (!session.username?.trim()) return fail("forbidden", 403);

  try {
    const rows = await listTransactionsForLedgerSummary(session.username.trim(), 2000);
    return stripClientPayload({ ok: true as const, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("loadTransactionsLedgerSummaryForClient failed:", error);
    return fail(message, 500);
  }
}

type TableSuccess = {
  ok: true;
  rows: Awaited<ReturnType<typeof listTransactionsTablePaged>>["rows"];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  txnCount7d: number;
  filteredAgg?: LedgerAggregate;
};

export async function loadTransactionsTableForClient(
  session: SessionPayload,
  input: {
    q?: string;
    type?: string;
    ledgerPreset?: string;
    page?: number;
    pageSize?: number;
    export?: boolean;
    includeAgg?: boolean;
  },
): Promise<TableSuccess | Fail> {
  if (!session.username?.trim()) return fail("forbidden", 403);

  const username = session.username.trim();
  const isExport = input.export === true;

  try {
    const result = await listTransactionsTablePaged({
      username,
      q: input.q,
      type: input.type,
      ledgerPreset: input.ledgerPreset,
      page: isExport ? 1 : (input.page ?? 1),
      pageSize: isExport ? 5000 : (input.pageSize ?? 25),
      exportMax: isExport ? 5000 : undefined,
    });

    if (isExport) {
      return stripClientPayload({
        ok: true as const,
        rows: result.rows,
        total: result.total,
        page: 1,
        pageSize: result.rows.length,
        totalPages: 1,
        txnCount7d: 0,
      });
    }

    let filteredAgg: LedgerAggregate | undefined;
    if (input.includeAgg) {
      const aggRows = await listTransactionsTablePaged({
        username,
        q: input.q,
        type: input.type,
        ledgerPreset: input.ledgerPreset,
        exportMax: 5000,
      });
      filteredAgg = aggregateLedgerRows(aggRows.rows);
    }

    return stripClientPayload({ ok: true as const, ...result, filteredAgg });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("loadTransactionsTableForClient failed:", error);
    return fail(message, 500);
  }
}
