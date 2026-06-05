import {
  adminLocalYmd,
  getAdminSubscriberActivityByDayRange,
  listAdminAccountsCreatedOnDay,
  listAdminAccountsExpiredOnDay,
  type AdminDayActivityAccountRow,
  type AdminDayActivityCounts,
} from "@/lib/repos/billing";
import {
  getDealerSubscriberActivityByDayRange,
  getManagerSubscriberActivityByDayRange,
  getResellerSubscriberActivityByDayRange,
  listDealerAccountsCreatedOnDay,
  listDealerAccountsExpiredOnDay,
  listManagerAccountsCreatedOnDay,
  listManagerAccountsExpiredOnDay,
  listResellerAccountsCreatedOnDay,
  listResellerAccountsExpiredOnDay,
} from "@/lib/repos/managerDashboard";
import type { EndUserModalScope } from "@/lib/modalScope";
import type { SessionPayload } from "@/lib/session";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

type ModalFail = { ok: false; error: string; status: number };

function fail(error: string, status: number): ModalFail {
  return { ok: false, error, status };
}

export function parseActivityLocalYmd(s: string): Date | null {
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

function assertScopeSession(scope: EndUserModalScope, session: SessionPayload): ModalFail | null {
  if (scope === "admin" && session.type !== "ROOT") return fail("forbidden", 403);
  if (scope === "manager" && session.type !== "MNGR") return fail("forbidden", 403);
  if (scope === "reseller" && session.type !== "SRSLR") return fail("forbidden", 403);
  if (scope === "dealer" && session.type !== "RSLR") return fail("forbidden", 403);
  return null;
}

export async function loadActivityCalendarForScope(
  scope: EndUserModalScope,
  session: SessionPayload,
  fromKey: string,
  toKey: string,
): Promise<{ ok: true; days: Record<string, AdminDayActivityCounts> } | ModalFail> {
  const authErr = assertScopeSession(scope, session);
  if (authErr) return authErr;

  const from = parseActivityLocalYmd(fromKey);
  const to = parseActivityLocalYmd(toKey);
  if (!from || !to || from > to) return fail("bad_request", 400);
  if (daySpan(from, to) > 120) return fail("range_too_large", 400);

  try {
    let days: Record<string, AdminDayActivityCounts>;
    if (scope === "admin") {
      days = await getAdminSubscriberActivityByDayRange(from, to);
    } else if (scope === "manager") {
      days = await getManagerSubscriberActivityByDayRange(session.username, from, to);
    } else if (scope === "reseller") {
      days = await getResellerSubscriberActivityByDayRange(session.username, from, to);
    } else {
      days = await getDealerSubscriberActivityByDayRange(session.username, from, to);
    }
    return { ok: true, days };
  } catch {
    return fail("server_error", 500);
  }
}

export type ActivityDayDetailPayload = {
  date: string;
  newCount: number;
  expiredCount: number;
  newUsers: AdminDayActivityAccountRow[];
  expiredUsers: AdminDayActivityAccountRow[];
};

export async function loadActivityDayDetailForScope(
  scope: EndUserModalScope,
  session: SessionPayload,
  dateKey: string,
): Promise<{ ok: true; data: ActivityDayDetailPayload } | ModalFail> {
  const authErr = assertScopeSession(scope, session);
  if (authErr) return authErr;

  const day = parseActivityLocalYmd(dateKey);
  if (!day) return fail("bad_request", 400);

  const ymd = adminLocalYmd(day);
  if (ymd > adminLocalYmd(new Date())) {
    return {
      ok: true,
      data: { date: ymd, newCount: 0, expiredCount: 0, newUsers: [], expiredUsers: [] },
    };
  }

  try {
    let counts: Record<string, AdminDayActivityCounts>;
    let newUsers: AdminDayActivityAccountRow[];
    let expiredUsers: AdminDayActivityAccountRow[];

    if (scope === "admin") {
      [counts, newUsers, expiredUsers] = await Promise.all([
        getAdminSubscriberActivityByDayRange(day, day),
        listAdminAccountsCreatedOnDay(day),
        listAdminAccountsExpiredOnDay(day),
      ]);
    } else if (scope === "manager") {
      [counts, newUsers, expiredUsers] = await Promise.all([
        getManagerSubscriberActivityByDayRange(session.username, day, day),
        listManagerAccountsCreatedOnDay(session.username, day),
        listManagerAccountsExpiredOnDay(session.username, day),
      ]);
    } else if (scope === "reseller") {
      [counts, newUsers, expiredUsers] = await Promise.all([
        getResellerSubscriberActivityByDayRange(session.username, day, day),
        listResellerAccountsCreatedOnDay(session.username, day),
        listResellerAccountsExpiredOnDay(session.username, day),
      ]);
    } else {
      [counts, newUsers, expiredUsers] = await Promise.all([
        getDealerSubscriberActivityByDayRange(session.username, day, day),
        listDealerAccountsCreatedOnDay(session.username, day),
        listDealerAccountsExpiredOnDay(session.username, day),
      ]);
    }

    const c = counts[ymd] ?? { newCount: 0, expiredCount: 0 };
    return {
      ok: true,
      data: {
        date: ymd,
        newCount: c.newCount,
        expiredCount: c.expiredCount,
        newUsers,
        expiredUsers,
      },
    };
  } catch {
    return fail("server_error", 500);
  }
}
