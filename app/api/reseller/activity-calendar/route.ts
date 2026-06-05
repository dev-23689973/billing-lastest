
import { getResellerSubscriberActivityByDayRange } from "@/lib/repos/managerDashboard";
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalYmd(s: string): Date | null {
  const m = YMD.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

function daySpan(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const fromS = u.searchParams.get("from")?.trim() ?? "";
  const toS = u.searchParams.get("to")?.trim() ?? "";
  const from = parseLocalYmd(fromS);
  const to = parseLocalYmd(toS);
  if (!from || !to || from > to) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }
  if (daySpan(from, to) > 120) {
    return apiJson({ error: "range_too_large" }, { status: 400 });
  }

  try {
    const days = await getResellerSubscriberActivityByDayRange(s.username, from, to);
    return apiJson({ days });
  } catch {
    return apiJson({ error: "server_error" }, { status: 500 });
  }
}

