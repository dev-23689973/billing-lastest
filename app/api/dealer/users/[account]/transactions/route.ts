import { apiJson } from "@/lib/dto/apiJson";
import { canAccessAccountByRole, getTransactionsForAccount } from "@/lib/repos/billing";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ account: string }> };

export async function GET(_: Request, { params }: Params) {
  const s = await getSession();
  if (!s || s.type !== "RSLR") return apiJson({ error: "forbidden" }, { status: 403 });

  const { account } = await params;
  const decoded = decodeURIComponent(account ?? "").trim();
  if (!decoded) return apiJson({ error: "bad_request" }, { status: 400 });

  const inScope = await canAccessAccountByRole({
    ownerType: "RSLR",
    ownerUsername: s.username,
    account: decoded,
  });
  if (!inScope) return apiJson({ error: "forbidden" }, { status: 403 });

  const rows = await getTransactionsForAccount(decoded);
  return apiJson({ ok: true, rows });
}
