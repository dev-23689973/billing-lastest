"use server";

import { stripClientPayload } from "@/lib/dto/redact";
import { loadActivityCalendarForScope, loadActivityDayDetailForScope } from "@/lib/server/activityCalendarData";
import type { EndUserModalScope } from "@/lib/modalScope";
import { getSession } from "@/lib/session";

export async function loadActivityCalendarAction(input: {
  scope: EndUserModalScope;
  from: string;
  to: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadActivityCalendarForScope(input.scope, session, input.from, input.to));
}

export async function loadActivityDayDetailAction(input: { scope: EndUserModalScope; date: string }) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "forbidden", status: 403 };
  return stripClientPayload(await loadActivityDayDetailForScope(input.scope, session, input.date));
}
