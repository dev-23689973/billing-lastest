/** View-users modal — GET existing subscribers API (faster than server actions). */

export type SubscribersModalPageResult =
  | {
      ok: true;
      rows: unknown[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: string };

export async function fetchSubscribersModalPage(input: {
  apiBaseUrl: string;
  page: number;
  pageSize: number;
  query?: string;
  status?: "active" | "inactive" | "expired" | "expiring";
}): Promise<SubscribersModalPageResult> {
  const url = new URL(input.apiBaseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("pageSize", String(input.pageSize));
  if (input.query) url.searchParams.set("query", input.query);
  if (input.status) url.searchParams.set("status", input.status);

  const res = await fetch(url.toString(), { credentials: "same-origin", cache: "no-store" });
  if (res.status === 403) return { ok: false, error: "forbidden" };
  if (!res.ok) return { ok: false, error: "request_failed" };

  const data = (await res.json()) as {
    rows?: unknown[];
    total?: number;
    page?: number;
    pageSize?: number;
    error?: string;
  };

  if (data.error) return { ok: false, error: data.error };

  return {
    ok: true,
    rows: Array.isArray(data.rows) ? data.rows : [],
    total: Number(data.total) || 0,
    page: Number(data.page) || input.page,
    pageSize: Number(data.pageSize) || input.pageSize,
  };
}
