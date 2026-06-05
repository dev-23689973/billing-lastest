import { apiJson } from "@/lib/dto/apiJson";
import { getOperatorTransactions } from "@/lib/repos/billing";
import { managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "MNGR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const { username: raw } = await ctx.params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username) {
    return apiJson({ rows: [] });
  }

  const mgr = session.username.trim();
  const [ownsReseller, ownsDealer] = await Promise.all([
    managerOwnsReseller(mgr, username),
    managerOwnsDealer(mgr, username),
  ]);
  if (!ownsReseller && !ownsDealer) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const rows = await getOperatorTransactions(username).catch(() => []);
  return apiJson({ rows });
}
