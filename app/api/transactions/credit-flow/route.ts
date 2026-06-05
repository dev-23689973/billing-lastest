import { apiJson } from "@/lib/dto/apiJson";
import { CHART_HISTORY_DAYS } from "@/lib/chart-history-days";
import { getCreditFlowByDayForUsername } from "@/lib/repos/billing";
import { getSession } from "@/lib/session";

/** Signed-in operator credit flow by day (deferred Transactions chart). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.username?.trim()) {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const daysRaw = new URL(request.url).searchParams.get("days");
  const days = Math.min(
    366,
    Math.max(1, Math.floor(Number(daysRaw) || CHART_HISTORY_DAYS)),
  );

  const creditFlow = await getCreditFlowByDayForUsername(session.username.trim(), days).catch(() => []);
  return apiJson(
    { creditFlow },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
