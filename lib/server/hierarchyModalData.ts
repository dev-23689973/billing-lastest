import { getDealerByUsername, getManagerById, getResellerByUsername } from "@/lib/data";
import { toHierarchyProfileClientDto } from "@/lib/dto/staff";
import * as managerPortal from "@/lib/repos/managerPortal";
import * as resellerPortal from "@/lib/repos/resellerPortal";
import type { SessionPayload } from "@/lib/session";
import { txSummary } from "@/lib/server/txSummary";
import type { EndUserModalScope } from "@/lib/server/endUserModalData";

type ModalFail = { ok: false; error: string; status: number };

function fail(error: string, status: number): ModalFail {
  return { ok: false, error, status };
}

export async function loadHierarchyProfileForModal(
  scope: EndUserModalScope,
  role: "manager" | "reseller" | "dealer",
  username: string,
  session: SessionPayload,
) {
  const u = decodeURIComponent(username).trim();
  if (!u) return fail("bad_request", 400);

  if (scope === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
    if (role === "manager") {
      const row = await getManagerById(u);
      if (!row) return fail("not_found", 404);
      return {
        ok: true as const,
        profile: toHierarchyProfileClientDto({
          role: "manager" as const,
          username: row.username,
          name: row.name,
          password: row.password,
          status: row.status,
          comments: row.comments,
          credits: row.credits,
          transactionSummary: txSummary(row.transactions ?? []),
          recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
            type: t.type,
            periods: t.periods,
            timestamp: t.timestamp,
          })),
        }),
      };
    }
    if (role === "reseller") {
      const row = await getResellerByUsername(u);
      if (!row) return fail("not_found", 404);
      return {
        ok: true as const,
        profile: toHierarchyProfileClientDto({
          role: "reseller" as const,
          username: row.username,
          name: row.name,
          password: row.password,
          status: row.status,
          manager: row.manager,
          comments: row.comments,
          credits: row.credits,
          transactionSummary: txSummary(row.transactions ?? []),
          recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
            type: t.type,
            periods: t.periods,
            timestamp: t.timestamp,
          })),
        }),
      };
    }
    const row = await getDealerByUsername(u);
    if (!row) return fail("not_found", 404);
    return {
      ok: true as const,
      profile: toHierarchyProfileClientDto({
        role: "dealer" as const,
        username: row.username,
        name: row.name,
        password: row.passwordPlaceholder,
        status: row.status,
        manager: row.manager,
        reseller: row.reseller,
        ticketsManager: row.ticketsManager,
        comments: row.comments,
        credits: row.credits,
        transactionSummary: txSummary(row.transactions ?? []),
        recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
          type: t.type,
          periods: t.periods,
          timestamp: t.timestamp,
        })),
      }),
    };
  }

  if (scope === "manager") {
    if (session.type !== "MNGR") return fail("forbidden", 403);
    if (role === "reseller") {
      if (!(await managerPortal.managerOwnsReseller(session.username, u))) return fail("forbidden", 403);
      const row = await getResellerByUsername(u);
      if (!row) return fail("not_found", 404);
      return {
        ok: true as const,
        profile: toHierarchyProfileClientDto({
          role: "reseller" as const,
          username: row.username,
          name: row.name,
          password: row.password,
          status: row.status,
          manager: row.manager,
          comments: row.comments,
          credits: row.credits,
          transactionSummary: txSummary(row.transactions ?? []),
          recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
            type: t.type,
            periods: t.periods,
            timestamp: t.timestamp,
          })),
        }),
      };
    }
    if (role === "dealer") {
      if (!(await managerPortal.managerOwnsDealer(session.username, u))) return fail("forbidden", 403);
      const row = await getDealerByUsername(u);
      if (!row) return fail("not_found", 404);
      return {
        ok: true as const,
        profile: toHierarchyProfileClientDto({
          role: "dealer" as const,
          username: row.username,
          name: row.name,
          password: row.passwordPlaceholder,
          status: row.status,
          manager: row.manager,
          reseller: row.reseller,
          ticketsManager: row.ticketsManager,
          comments: row.comments,
          credits: row.credits,
          transactionSummary: txSummary(row.transactions ?? []),
          recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
            type: t.type,
            periods: t.periods,
            timestamp: t.timestamp,
          })),
        }),
      };
    }
    return fail("bad_request", 400);
  }

  if (scope === "reseller") {
    if (session.type !== "SRSLR") return fail("forbidden", 403);
    if (role !== "dealer") return fail("bad_request", 400);
    if (!(await resellerPortal.resellerOwnsDealer(session.username, u))) return fail("forbidden", 403);
    const row = await getDealerByUsername(u);
    if (!row) return fail("not_found", 404);
    return {
      ok: true as const,
      profile: toHierarchyProfileClientDto({
        role: "dealer" as const,
        username: row.username,
        name: row.name,
        password: row.passwordPlaceholder,
        status: row.status,
        manager: row.manager,
        reseller: row.reseller,
        ticketsManager: row.ticketsManager,
        comments: row.comments,
        credits: row.credits,
        transactionSummary: txSummary(row.transactions ?? []),
        recentTransactions: (row.transactions ?? []).slice(0, 5).map((t) => ({
          type: t.type,
          periods: t.periods,
          timestamp: t.timestamp,
        })),
      }),
    };
  }

  return fail("forbidden", 403);
}
