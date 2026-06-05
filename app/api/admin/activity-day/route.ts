
import { getSession } from "@/lib/session";
import { apiJson } from "@/lib/dto/apiJson";
import {
  adminLocalYmd,
  getAdminSubscriberActivityByDayRange,
  listAdminAccountsCreatedOnDay,
  listAdminAccountsExpiredOnDay,
} from "@/lib/repos/billing";

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

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.type !== "ROOT") {
    return apiJson({ error: "forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const dateS = u.searchParams.get("date")?.trim() ?? "";
  const day = parseLocalYmd(dateS);
  if (!day) {
    return apiJson({ error: "bad_request" }, { status: 400 });
  }

  try {
    const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    if (ymd > adminLocalYmd(new Date())) {
      return apiJson({
        date: ymd,
        newCount: 0,
        expiredCount: 0,
        newUsers: [],
        expiredUsers: [],
      });
    }
    const [counts, newUsers, expiredUsers] = await Promise.all([
      getAdminSubscriberActivityByDayRange(day, day),
      listAdminAccountsCreatedOnDay(day),
      listAdminAccountsExpiredOnDay(day),
    ]);
    const c = counts[ymd] ?? { newCount: 0, expiredCount: 0 };
    return apiJson({
      date: ymd,
      newCount: c.newCount,
      expiredCount: c.expiredCount,
      newUsers,
      expiredUsers,
    });
  } catch {
    return apiJson({ error: "server_error" }, { status: 500 });
  }
}

