import { toSubscriberListClientRows } from "@/lib/dto/subscribers";
import { getOperatorTransactions, listAccountsPaged, listAccountsPagedScoped } from "@/lib/repos/billing";
import { listDealersPagedAdmin, listDealersPagedForManager, listResellersPagedForManager } from "@/lib/repos/staffListPaged";
import { managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
import type { SessionPayload } from "@/lib/session";
import { clearSession, createSession } from "@/lib/session";
import * as repo from "@/lib/repos/billing";

export type StaffTransactionsScope = "admin" | "manager" | "reseller";
export type StaffBranchesPortal = "admin" | "manager";

type ModalFail = { ok: false; error: string; status: number };

function fail(error: string, status: number): ModalFail {
  return { ok: false, error, status };
}

function roleLabel(type: string): string {
  switch (type) {
    case "ROOT":
      return "Administrator";
    case "MNGR":
      return "Manager";
    case "SRSLR":
      return "Reseller";
    case "RSLR":
      return "Dealer";
    default:
      return type;
  }
}

function statusLabel(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "S" || s === "INACTIVE") return "Suspended";
  return "Active";
}

function normalizeBranchStatus(v: string) {
  const s = String(v ?? "").toUpperCase();
  return s === "A" || s === "ACTIVE" ? "Active" : "Inactive";
}

export type StaffBranchesModalQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "" | "active" | "inactive";
  sort?: string;
  dir?: "asc" | "desc";
};

function branchesRepoSort(sort: string | undefined, rowKind: "reseller" | "dealer"): string {
  switch (sort) {
    case "name":
      return "name";
    case "status":
      return "status";
    case "parent":
      return rowKind === "dealer" ? "reseller" : "username";
    case "username":
    default:
      return "username";
  }
}

export async function loadStaffTransactionsForModal(
  scope: StaffTransactionsScope,
  username: string,
  session: SessionPayload,
) {
  const un = decodeURIComponent(username).trim();
  if (!un) return { ok: true as const, rows: [] };

  if (scope === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
  } else if (scope === "manager") {
    if (session.type !== "MNGR") return fail("forbidden", 403);
    const mgr = session.username.trim();
    const [ownsReseller, ownsDealer] = await Promise.all([
      managerOwnsReseller(mgr, un),
      managerOwnsDealer(mgr, un),
    ]);
    if (!ownsReseller && !ownsDealer) return fail("forbidden", 403);
  } else {
    if (session.type !== "SRSLR") return fail("forbidden", 403);
    if (!(await resellerOwnsDealer(session.username.trim(), un))) return fail("forbidden", 403);
  }

  const [rows, walletBalance] = await Promise.all([
    getOperatorTransactions(un).catch(() => [] as Awaited<ReturnType<typeof getOperatorTransactions>>),
    repo.getCreditBalance(un).catch(() => 0),
  ]);
  return { ok: true as const, rows, walletBalance };
}

export async function loadStaffBranchesForModal(
  portal: StaffBranchesPortal,
  rowType: "MANAGER" | "RESELLER",
  username: string,
  session: SessionPayload,
  input: StaffBranchesModalQuery,
) {
  const un = username.trim();
  if (!un) return fail("invalid_request", 400);

  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(5, input.pageSize));
  const search = input.search?.trim() || undefined;
  const status = input.status;
  const dir = input.dir === "desc" ? "desc" : "asc";
  const sort = branchesRepoSort(input.sort, rowType === "MANAGER" ? "reseller" : "dealer");

  if (portal === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
    if (rowType === "MANAGER") {
      const { rows: resellers, total } = await listResellersPagedForManager({
        managerUsername: un,
        page,
        pageSize,
        search,
        status,
        sort,
        dir,
      });
      return {
        ok: true as const,
        title: "Resellers",
        subtitle: un,
        total,
        page,
        pageSize,
        rows: resellers.map((r) => ({
          type: "RESELLER" as const,
          username: r.username,
          name: r.name ?? "",
          parent: un,
          status: normalizeBranchStatus(r.status),
          stateCurrentLogin: r.currentLoginTime ?? "",
          stateLastLogin: r.lastLoginTime ?? "",
          branchCount: Number(r.dealerCount ?? 0),
          activeUsers: Number(r.activeUserCount ?? 0),
          expiredUsers: Number(r.expiredUserCount ?? 0),
          totalUsers: Number(r.userCount ?? 0),
          credits: Number(r.credits ?? 0),
        })),
      };
    }
    if (rowType !== "RESELLER") return fail("invalid_request", 400);
    const { rows: dealers, total } = await listDealersPagedAdmin({
      resellerUsername: un,
      page,
      pageSize,
      search,
      status,
      sort,
      dir,
    });
    return {
      ok: true as const,
      title: "Dealers",
      subtitle: un,
      total,
      page,
      pageSize,
      rows: dealers.map((d) => ({
        type: "DEALER" as const,
        username: d.username,
        name: d.name ?? "",
        parent: d.reseller ?? "—",
        status: normalizeBranchStatus(d.status),
        stateCurrentLogin: d.currentLoginTime ?? "",
        stateLastLogin: d.lastLoginTime ?? "",
        branchCount: 0,
        activeUsers: Number(d.activeUserCount ?? 0),
        expiredUsers: Number(d.expiredUserCount ?? 0),
        totalUsers: Number(d.userCount ?? 0),
        credits: Number(d.credits ?? 0),
      })),
    };
  }

  if (session.type !== "MNGR") return fail("forbidden", 403);
  if (rowType !== "RESELLER") return fail("invalid_request", 400);
  const mgr = session.username.trim();
  if (!(await managerOwnsReseller(mgr, un))) return fail("forbidden", 403);
  const { rows: dealers, total } = await listDealersPagedForManager({
    managerUsername: mgr,
    resellerUsername: un,
    page,
    pageSize,
    search,
    status,
    sort,
    dir,
  });
  return {
    ok: true as const,
    title: "Dealers",
    subtitle: un,
    total,
    page,
    pageSize,
    rows: dealers.map((d) => ({
      type: "DEALER" as const,
      username: d.username,
      name: d.name ?? "",
      parent: d.resellerUsername ?? "—",
      status: normalizeBranchStatus(d.status),
      stateCurrentLogin: d.currentLoginTime ?? "",
      stateLastLogin: d.lastLoginTime ?? "",
      branchCount: 0,
      activeUsers: Number(d.activeUserCount ?? 0),
      expiredUsers: Number(d.expiredUserCount ?? 0),
      totalUsers: Number(d.userCount ?? 0),
      credits: Number(d.credits ?? 0),
    })),
  };
}

export async function loadAccountProfileForModal(session: SessionPayload) {
  const profile = await repo.getSessionUserProfile(session.username);
  if (!profile) return fail("not_found", 404);
  return {
    ok: true as const,
    profile: {
      username: profile.username,
      name: profile.name,
      type: profile.type,
      status: profile.status,
      comments: profile.comments,
      usernameOwner: profile.usernameOwner,
      lastLoginTime: profile.lastLoginTime,
      currentLoginTime: profile.currentLoginTime,
      credits: profile.credits,
      ticketsEnabled: profile.ticketsEnabled,
      roleLabel: roleLabel(profile.type),
      statusLabel: statusLabel(profile.status),
    },
  };
}

export async function saveAccountProfileFromModal(
  session: SessionPayload,
  input: {
    name: string;
    comments: string;
    oldPassword: string;
    newPassword: string;
    newConfirm: string;
  },
) {
  const name = input.name.trim();
  const comments = input.comments;
  const newPassword = input.newPassword;
  const oldPassword = input.oldPassword;
  const newConfirm = input.newConfirm;

  if (!name) return { ok: false as const, error: "missing_name" };

  const updated = await repo.updateSessionUserProfile({
    username: session.username,
    name,
    comments,
  });
  if (!updated) return { ok: false as const, error: "save_failed" };

  if (newPassword.trim()) {
    if (oldPassword.length < 3 || oldPassword.length > 100) return { ok: false as const, error: "old_len" };
    if (newPassword.length < 4 || newPassword.length > 12 || newConfirm.length < 4 || newConfirm.length > 12) {
      return { ok: false as const, error: "new_len" };
    }
    if (newPassword !== newConfirm) return { ok: false as const, error: "match" };
    const ok = await repo.verifyUserPassword(session.username, oldPassword);
    if (!ok) return { ok: false as const, error: "old" };
    await repo.setUserPassword(session.username, newPassword);
    await clearSession();
    return { ok: true as const, passwordChanged: true };
  }

  await createSession({
    userid: session.userid,
    displayName: name || session.username,
    username: session.username,
    type: session.type,
    owner: session.owner,
    lastLogin: session.lastLogin,
  });

  return { ok: true as const, passwordChanged: false };
}

type SubscribersListStatus = "active" | "inactive" | "expired" | "expiring";

function parseSubscribersApiBase(apiBaseUrl: string) {
  const m = apiBaseUrl.match(/^\/api\/(admin|manager|reseller)\/(managers|resellers|dealers)\/([^/]+)\/subscribers$/);
  if (!m) return null;
  return {
    portal: m[1] as "admin" | "manager" | "reseller",
    entityType: m[2] as "managers" | "resellers" | "dealers",
    entityLogin: decodeURIComponent(m[3]),
  };
}

export async function loadSubscribersFetchModalPage(
  session: SessionPayload,
  apiBaseUrl: string,
  input: {
    page: number;
    pageSize: number;
    query?: string;
    status?: SubscribersListStatus;
    fixedStatus?: SubscribersListStatus;
  },
) {
  const parsed = parseSubscribersApiBase(apiBaseUrl.trim());
  if (!parsed) return fail("invalid_request", 400);

  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(5, input.pageSize));
  const query = input.query?.trim() || undefined;
  const status = input.fixedStatus ?? input.status;

  const { portal, entityType, entityLogin } = parsed;

  try {
    if (portal === "admin") {
      if (session.type !== "ROOT") return fail("forbidden", 403);
      const scope =
        entityType === "managers"
          ? { managerLogin: entityLogin }
          : entityType === "resellers"
            ? { resellerLogin: entityLogin }
            : { dealerLogin: entityLogin };
      const { rows, total } = await listAccountsPaged({
        ...scope,
        status,
        search: query,
        page,
        pageSize,
        sort: "account",
        dir: "asc",
      });
      return { ok: true as const, rows: toSubscriberListClientRows(rows), total, page, pageSize };
    }

    if (portal === "manager") {
      if (session.type !== "MNGR") return fail("forbidden", 403);
      const mgr = session.username.trim();
      if (entityType === "resellers") {
        if (!(await managerOwnsReseller(mgr, entityLogin))) return fail("forbidden", 403);
        const { rows, total } = await listAccountsPagedScoped({
          ownerType: "MNGR",
          ownerUsername: mgr,
          resellerUsername: entityLogin,
          status,
          search: query,
          page,
          pageSize,
          sort: "account",
          dir: "asc",
        });
        return { ok: true as const, rows: toSubscriberListClientRows(rows), total, page, pageSize };
      }
      if (entityType === "dealers") {
        if (!(await managerOwnsDealer(mgr, entityLogin))) return fail("forbidden", 403);
        const { rows, total } = await listAccountsPagedScoped({
          ownerType: "MNGR",
          ownerUsername: mgr,
          dealerUsername: entityLogin,
          status,
          search: query,
          page,
          pageSize,
          sort: "account",
          dir: "asc",
        });
        return { ok: true as const, rows: toSubscriberListClientRows(rows), total, page, pageSize };
      }
      return fail("invalid_request", 400);
    }

    if (session.type !== "SRSLR") return fail("forbidden", 403);
    if (entityType !== "dealers") return fail("invalid_request", 400);
    if (!(await resellerOwnsDealer(session.username.trim(), entityLogin))) return fail("forbidden", 403);
    const { rows, total } = await listAccountsPagedScoped({
      ownerType: "SRSLR",
      ownerUsername: session.username.trim(),
      dealerUsername: entityLogin,
      status,
      search: query,
      page,
      pageSize,
      sort: "account",
      dir: "asc",
    });
    return { ok: true as const, rows: toSubscriberListClientRows(rows), total, page, pageSize };
  } catch {
    return fail("server_error", 500);
  }
}
