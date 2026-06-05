import { apiJson } from "@/lib/dto/apiJson";
import { getOperatorTransactions } from "@/lib/repos/billing";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const { username: raw } = await ctx.params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username) {
    return apiJson({ rows: [] });
  }

  const rows = await getOperatorTransactions(username).catch(() => []);
  return apiJson({ rows });
}
