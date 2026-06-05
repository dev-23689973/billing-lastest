import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import { listAccountsPaged, listAccountsPagedScoped } from "@/lib/repos/billing";
import type { AccountListRow } from "@/lib/repos/billing";
import type { SessionPayload } from "@/lib/session";

export type SubscribersExportScope = "admin" | "manager" | "reseller" | "dealer";

export type SubscribersExportFilters = {
  status?: string;
  query?: string;
  manager?: string;
  reseller?: string;
  dealer?: string;
  autoRenew?: string;
};

const ACCOUNT_OFF = 1;

function csvCell(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeStatus(raw?: string) {
  const v = raw?.toLowerCase() ?? "";
  if (v === "active" || v === "expired" || v === "inactive" || v === "expiring" || v === "expiry" || v === "activity") {
    return v;
  }
  return undefined;
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

function rowOwner(r: AccountListRow) {
  return r.dealer?.trim() || r.reseller?.trim() || r.manager?.trim() || "";
}

async function collectRows(
  loadPage: (page: number, pageSize: number) => Promise<{ rows: AccountListRow[]; total: number }>,
) {
  const collected: AccountListRow[] = [];
  let page = 1;
  const pageSize = 500;
  for (;;) {
    const chunk = await loadPage(page, pageSize);
    collected.push(...chunk.rows);
    if (chunk.rows.length < pageSize || collected.length >= chunk.total) break;
    page += 1;
    if (page > 400) break;
  }
  return collected;
}

function buildCsv(header: string[], rows: AccountListRow[], mapRow: (r: AccountListRow) => string[]) {
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) => mapRow(r).map(csvCell).join(",")),
  ];
  return {
    csv: lines.join("\r\n"),
    filename: `subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function exportSubscribersCsvForClient(
  scope: SubscribersExportScope,
  session: SessionPayload,
  filters: SubscribersExportFilters,
) {
  const status = normalizeStatus(filters.status);
  const query = filters.query?.trim() || undefined;
  const autoRenew = filters.autoRenew?.trim() || undefined;

  if (scope === "admin") {
    if (session.type !== "ROOT") return { ok: false as const, error: "forbidden", status: 403 };
    const rows = await collectRows((page, pageSize) =>
      listAccountsPaged({
        status,
        search: query,
        managerLogin: filters.manager?.trim() || undefined,
        resellerLogin: filters.reseller?.trim() || undefined,
        dealerLogin: filters.dealer?.trim() || undefined,
        page,
        pageSize,
        sort: "account",
        dir: "asc",
      }),
    );
    const { csv, filename } = buildCsv(
      ["User ID", "Username", "Subscriber", "Owner", "Package", "MAC", "Status", "Expiry", "Device online"],
      rows,
      (r) => [
        r.stalkerUserId != null && r.stalkerUserId > 0 ? String(r.stalkerUserId) : "",
        r.account,
        r.full_name ?? "",
        rowOwner(r),
        r.packageName ?? "",
        r.mac ?? "",
        rowStatusLabel(r),
        r.expires ? String(r.expires).slice(0, 10) : "",
        rowOnlineLabel(r),
      ],
    );
    return { ok: true as const, csv, filename };
  }

  if (scope === "manager") {
    if (session.type !== "MNGR") return { ok: false as const, error: "forbidden", status: 403 };
    const rows = await collectRows((page, pageSize) =>
      listAccountsPagedScoped({
        ownerType: "MNGR",
        ownerUsername: session.username,
        resellerUsername: filters.reseller?.trim() || undefined,
        dealerUsername: filters.dealer?.trim() || undefined,
        status,
        search: query,
        autoRenew,
        page,
        pageSize,
        sort: "account",
        dir: "asc",
      }),
    );
    const { csv, filename } = buildCsv(
      ["Account", "Subscriber", "Reseller", "Dealer", "Package", "MAC", "Status", "Expiry", "Device online"],
      rows,
      (r) => [
        r.account,
        r.full_name ?? "",
        r.reseller ?? "",
        r.dealer ?? "",
        r.packageName ?? "",
        r.mac ?? "",
        rowStatusLabel(r),
        r.expires ? String(r.expires).slice(0, 10) : "",
        rowOnlineLabel(r),
      ],
    );
    return { ok: true as const, csv, filename };
  }

  if (scope === "reseller") {
    if (session.type !== "SRSLR") return { ok: false as const, error: "forbidden", status: 403 };
    const rows = await collectRows((page, pageSize) =>
      listAccountsPagedScoped({
        ownerType: "SRSLR",
        ownerUsername: session.username,
        dealerUsername: filters.dealer?.trim() || undefined,
        status,
        search: query,
        autoRenew,
        page,
        pageSize,
        sort: "account",
        dir: "asc",
      }),
    );
    const { csv, filename } = buildCsv(
      ["Account", "Subscriber", "Dealer", "Package", "MAC", "Status", "Expiry", "Device online"],
      rows,
      (r) => [
        r.account,
        r.full_name ?? "",
        r.dealer ?? "",
        r.packageName ?? "",
        r.mac ?? "",
        rowStatusLabel(r),
        r.expires ? String(r.expires).slice(0, 10) : "",
        rowOnlineLabel(r),
      ],
    );
    return { ok: true as const, csv, filename };
  }

  if (session.type !== "RSLR") return { ok: false as const, error: "forbidden", status: 403 };
  const rows = await collectRows((page, pageSize) =>
    listAccountsPagedScoped({
      ownerType: "RSLR",
      ownerUsername: session.username,
      status,
      search: query,
      autoRenew,
      page,
      pageSize,
      sort: "account",
      dir: "asc",
    }),
  );
  const { csv, filename } = buildCsv(
    ["Account", "Subscriber", "Package", "MAC", "Status", "Expiry", "Device online"],
    rows,
    (r) => [
      r.account,
      r.full_name ?? "",
      r.packageName ?? "",
      r.mac ?? "",
      rowStatusLabel(r),
      r.expires ? String(r.expires).slice(0, 10) : "",
      rowOnlineLabel(r),
    ],
  );
  return { ok: true as const, csv, filename };
}
