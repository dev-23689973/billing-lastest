import { apiJson } from "@/lib/dto/apiJson";
import { toEndUserEditClientDto } from "@/lib/dto/subscribers";
import { getUserByIdScoped } from "@/lib/data";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ account: string }> };

function txSummary(transactions: Array<{ type: string; periods: number; timestamp: string | null }>) {
  const creditRows = transactions.filter((t) => String(t.type).toUpperCase() === "CRDT");
  const debitRows = transactions.filter((t) => String(t.type).toUpperCase() === "DBIT");
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

export async function GET(_: Request, { params }: Params) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") return apiJson({ error: "forbidden" }, { status: 403 });

  const { account } = await params;
  const decoded = decodeURIComponent(account ?? "").trim();
  if (!decoded) return apiJson({ error: "bad_request" }, { status: 400 });

  const u = await getUserByIdScoped({ ownerType: "SRSLR", ownerUsername: s.username, id: decoded });
  if (!u) return apiJson({ error: "not_found" }, { status: 404 });

  return apiJson({
    ok: true,
    user: {
      ...toEndUserEditClientDto(u),
      transactionSummary: txSummary(u.transactions ?? []),
      recentTransactions: (u.transactions ?? []).slice(0, 5).map((t) => ({
        type: t.type,
        periods: t.periods,
        timestamp: t.timestamp,
      })),
    },
  });
}
