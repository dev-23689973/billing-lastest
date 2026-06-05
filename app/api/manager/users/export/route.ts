import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import { listAccountsPagedScoped } from "@/lib/repos/billing";
import type { AccountListRow } from "@/lib/repos/billing";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

const ACCOUNT_OFF = 1;

function csvCell(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowStatusLabel(r: AccountListRow): string {
  if (r.status === ACCOUNT_OFF) return "Inactive";
  if (isBillingAccountExpired(r.expires)) return "Expired";
  if (r.expires) {
    const exp = new Date(String(r.expires).replace(" ", "T"));
    if (!Number.isNaN(exp.getTime()) && exp.getTime() > Date.now() && exp.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000) {
      return "Expiring soon";
    }
  }
  return "Active";
}

function rowOnlineLabel(r: AccountListRow): string {
  if (r.receiverOnline === true) return "Online";
  if (r.receiverOnline === false) return "Offline";
  return "";
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const raw = u.searchParams.get("status")?.toLowerCase() ?? "";
  const status =
    raw === "active" ||
    raw === "expired" ||
    raw === "inactive" ||
    raw === "expiring" ||
    raw === "expiry" ||
    raw === "activity"
      ? raw
      : undefined;
  const query = u.searchParams.get("query")?.trim() || undefined;
  const resellerLogin = u.searchParams.get("reseller")?.trim() || undefined;
  const dealerLogin = u.searchParams.get("dealer")?.trim() || undefined;
  const autoRenew = u.searchParams.get("autoRenew")?.trim() || undefined;

  const collected: AccountListRow[] = [];
  let page = 1;
  const pageSize = 500;
  for (;;) {
    const chunk = await listAccountsPagedScoped({
      ownerType: "MNGR",
      ownerUsername: s.username,
      resellerUsername: resellerLogin,
      dealerUsername: dealerLogin,
      status,
      search: query,
      autoRenew: autoRenew || undefined,
      page,
      pageSize,
      sort: "account",
      dir: "asc",
    });
    collected.push(...chunk.rows);
    if (chunk.rows.length < pageSize || collected.length >= chunk.total) break;
    page += 1;
    if (page > 400) break;
  }

  const header = ["Account", "Subscriber", "Reseller", "Dealer", "Package", "MAC", "Status", "Expiry", "Device online"];
  const lines = [
    header.map(csvCell).join(","),
    ...collected.map((r) =>
      [
        csvCell(r.account),
        csvCell(r.full_name ?? ""),
        csvCell(r.reseller ?? ""),
        csvCell(r.dealer ?? ""),
        csvCell(r.packageName ?? ""),
        csvCell(r.mac ?? ""),
        csvCell(rowStatusLabel(r)),
        csvCell(r.expires ? String(r.expires).slice(0, 10) : ""),
        csvCell(rowOnlineLabel(r)),
      ].join(","),
    ),
  ];
  const body = lines.join("\r\n");
  const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

