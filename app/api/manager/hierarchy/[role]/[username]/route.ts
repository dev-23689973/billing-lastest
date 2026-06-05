import { apiJson } from "@/lib/dto/apiJson";
import { toHierarchyProfileClientDto } from "@/lib/dto/staff";
import { getSession } from "@/lib/session";
import { getDealerByUsername, getResellerByUsername } from "@/lib/data";
import * as managerPortal from "@/lib/repos/managerPortal";

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
  if (!s || s.type !== "MNGR") return apiJson({ error: "forbidden" }, { status: 403 });

  const { role, username } = await params;
  const r = String(role ?? "").trim().toLowerCase();
  const u = decodeURIComponent(username ?? "").trim();
  if (!u || !["reseller", "dealer"].includes(r)) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  if (r === "reseller") {
    if (!(await managerPortal.managerOwnsReseller(s.username, u))) {
      return apiJson({ error: "forbidden" }, { status: 403 });
    }
    const row = await getResellerByUsername(u);
    if (!row) return apiJson({ error: "not_found" }, { status: 404 });
    return apiJson({
      ok: true,
      profile: toHierarchyProfileClientDto({
        role: "reseller" as const,
        username: row.username,
        name: row.name,
        password: row.password,
        status: row.status,
        manager: row.manager,
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

  if (!(await managerPortal.managerOwnsDealer(s.username, u))) {
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
