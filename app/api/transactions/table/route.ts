import { apiJson } from "@/lib/dto/apiJson";
import { aggregateLedgerRows } from "@/lib/transactionLedgerAnalytics";
import { listTransactionsTablePaged } from "@/lib/repos/transactionsTablePaged";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.username?.trim()) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const username = session.username.trim();
  const q = url.searchParams.get("q") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const ledgerPreset = url.searchParams.get("ledgerPreset") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
  const isExport = url.searchParams.get("export") === "1";
  const includeAgg = url.searchParams.get("includeAgg") === "1";

  try {
    const result = await listTransactionsTablePaged({
      username,
      q,
      type,
      ledgerPreset,
      page: isExport ? 1 : page,
      pageSize: isExport ? 5000 : pageSize,
      exportMax: isExport ? 5000 : undefined,
    });

    if (isExport) {
      return apiJson({ rows: result.rows, total: result.total });
    }

    let filteredAgg = undefined;
    if (includeAgg) {
      const aggRows = await listTransactionsTablePaged({
        username,
        q,
        type,
        ledgerPreset,
        exportMax: 5000,
      });
      filteredAgg = aggregateLedgerRows(aggRows.rows);
    }

    return apiJson({ ...result, filteredAgg });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("GET /api/transactions/table failed:", error);
    return apiJson({ error: "db", detail: message }, { status: 500 });
  }
}
