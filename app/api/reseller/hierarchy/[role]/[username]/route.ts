import { apiJson } from "@/lib/dto/apiJson";
import { toHierarchyProfileClientDto } from "@/lib/dto/staff";
import { getDealerByUsername } from "@/lib/data";
import { getSession } from "@/lib/session";
import * as resellerPortal from "@/lib/repos/resellerPortal";

type Params = { params: Promise<{ role: string; username: string }> };

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

  const { role, username } = await params;
  const r = String(role ?? "").trim().toLowerCase();
  const u = decodeURIComponent(username ?? "").trim();
  if (!u || r !== "dealer") {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  if (!(await resellerPortal.resellerOwnsDealer(s.username, u))) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }
  const row = await getDealerByUsername(u);
  if (!row) return apiJson({ error: "not_found" }, { status: 404 });
  return apiJson({
    ok: true,
    profile: toHierarchyProfileClientDto({
      role: "dealer" as const,
      username: row.username,
      name: row.name,
      password: row.passwordPlaceholder,
      status: row.status,
      reseller: row.reseller,
      ticketsManager: row.ticketsManager,
      comments: row.comments,
      credits: row.credits,
      transactionSummary: txSummary(row.transactions ?? []),
      recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
        type: t.type,
        periods: t.periods,
        timestamp: t.timestamp,
      })),
    }),
  });
}
