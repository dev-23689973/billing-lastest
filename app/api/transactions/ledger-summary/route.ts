import { apiJson } from "@/lib/dto/apiJson";
import { listTransactionsForLedgerSummary } from "@/lib/repos/transactionsTablePaged";
import { getSession } from "@/lib/session";

/** Wallet ledger panel — recent rows for period/category aggregates (not table filters). */
export async function GET() {
  const session = await getSession();
  if (!session?.username?.trim()) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  try {
    const rows = await listTransactionsForLedgerSummary(session.username.trim(), 2000);
    return apiJson(
      { rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("GET /api/transactions/ledger-summary failed:", error);
    return apiJson({ error: "db", detail: message }, { status: 500 });
  }
}
