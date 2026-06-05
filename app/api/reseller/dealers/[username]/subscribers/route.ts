import { apiJson } from "@/lib/dto/apiJson";
import { toSubscriberListClientRows } from "@/lib/dto/subscribers";
import { listAccountsPagedScoped } from "@/lib/repos/billing";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
import { getSession } from "@/lib/session";

export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  try {
    const s = await getSession();
    if (!s || s.type !== "SRSLR") {
      return apiJson({ error: "forbidden" }, { status: 403 });
    }

    const reseller = s.username.trim();
    const { username: rawParam } = await ctx.params;
    const dealerLogin = decodeURIComponent(rawParam ?? "").trim();
    if (!dealerLogin) {
      return apiJson({ error: "invalid" }, { status: 400 });
    }
    if (!(await resellerOwnsDealer(reseller, dealerLogin))) {
      return apiJson({ error: "forbidden" }, { status: 403 });
    }

    const u = new URL(req.url);
    const page = Math.max(1, Number.parseInt(u.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(5, Number.parseInt(u.searchParams.get("pageSize") ?? "25", 10) || 25));
    const query = u.searchParams.get("query")?.trim() || undefined;
    const statusRaw = u.searchParams.get("status")?.toLowerCase() ?? "";
    const status =
      statusRaw === "active" || statusRaw === "expired" || statusRaw === "inactive" || statusRaw === "expiring"
        ? statusRaw
        : undefined;

    const { rows, total } = await listAccountsPagedScoped({
      ownerType: "SRSLR",
      ownerUsername: reseller,
      dealerUsername: dealerLogin,
      status,
      search: query,
      page,
      pageSize,
      sort: "account",
      dir: "asc",
    });

    return apiJson({ rows: toSubscriberListClientRows(rows), total, page, pageSize, dealerLogin });
  } catch {
    return apiJson({ error: "server_error" }, { status: 500 });
  }
}
