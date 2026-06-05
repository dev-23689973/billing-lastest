import { getUserById, getUserByIdScoped } from "@/lib/data";
import { toEndUserEditClientDto } from "@/lib/dto/subscribers";
import { canAccessAccountByRole, getTransactionsForAccount } from "@/lib/repos/billing";
import type { SessionPayload } from "@/lib/session";
import { txSummary } from "@/lib/server/txSummary";

import type { EndUserModalScope } from "@/lib/modalScope";

export type { EndUserModalScope };

type ModalFail = { ok: false; error: string; status: number };

function fail(error: string, status: number): ModalFail {
  return { ok: false, error, status };
}

async function loadScopedUser(scope: EndUserModalScope, account: string, session: SessionPayload) {
  const decoded = account.trim();
  if (!decoded) return { error: fail("bad_request", 400) as ModalFail, user: null };

  if (scope === "admin") {
    if (session.type !== "ROOT") return { error: fail("forbidden", 403) as ModalFail, user: null };
    const u = await getUserById(decoded);
    if (!u) return { error: fail("not_found", 404) as ModalFail, user: null };
    return { error: null, user: u };
  }

  const ownerType = scope === "manager" ? "MNGR" : scope === "reseller" ? "SRSLR" : "RSLR";
  if (session.type !== ownerType) return { error: fail("forbidden", 403) as ModalFail, user: null };

  const u = await getUserByIdScoped({ ownerType, ownerUsername: session.username, id: decoded });
  if (!u) return { error: fail("not_found", 404) as ModalFail, user: null };
  return { error: null, user: u };
}

export async function loadEndUserDetailsForModal(scope: EndUserModalScope, account: string, session: SessionPayload) {
  const { error, user } = await loadScopedUser(scope, account, session);
  if (error || !user) return error ?? fail("not_found", 404);

  return {
    ok: true as const,
    user: {
      ...toEndUserEditClientDto(user),
      transactionSummary: txSummary(user.transactions ?? []),
      recentTransactions: (user.transactions ?? []).slice(0, 5).map((t) => ({
        type: t.type,
        periods: t.periods,
        timestamp: t.timestamp,
      })),
    },
  };
}

export async function loadEndUserTransactionsForModal(scope: EndUserModalScope, account: string, session: SessionPayload) {
  const decoded = account.trim();
  if (!decoded) return fail("bad_request", 400);

  if (scope === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
  } else {
    const ownerType = scope === "manager" ? "MNGR" : scope === "reseller" ? "SRSLR" : "RSLR";
    if (session.type !== ownerType) return fail("forbidden", 403);
    const inScope = await canAccessAccountByRole({ ownerType, ownerUsername: session.username, account: decoded });
    if (!inScope) return fail("forbidden", 403);
  }

  const rows = await getTransactionsForAccount(decoded);
  return { ok: true as const, rows };
}
