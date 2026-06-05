import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getBillingPool } from "@/lib/db/pool";
import {
  canAccessAccountByRole,
  getDealerByUsername,
  getManagerByUsername,
  getResellerByUsername,
  getUserForInlineEdit,
  updateAccountWithStalkerSync,
  updateDealer,
  updateDealerName,
  updateDealerStatus,
  updateManager,
  updateManagerName,
  updateManagerStatus,
  updateReseller,
  updateResellerName,
  updateResellerStatus,
} from "@/lib/repos/billing";
import { managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
import type { SessionPayload } from "@/lib/session";

type Fail = { ok: false; error: string; status: number };
type StaffType = "MANAGER" | "RESELLER" | "DEALER";
type StaffField = "name" | "password" | "status";
type UserField = "user" | "password" | "mac" | "ip" | "status";

export type InlineStaffPortal = "admin" | "manager" | "reseller";
export type InlineUserPortal = "admin" | "manager" | "reseller" | "dealer";

function fail(error: string, status = 400): Fail {
  return { ok: false, error, status };
}

function isStaffType(v: string): v is StaffType {
  return v === "MANAGER" || v === "RESELLER" || v === "DEALER";
}

function isStaffField(v: string): v is StaffField {
  return v === "name" || v === "password" || v === "status";
}

function isUserField(v: string): v is UserField {
  return v === "user" || v === "password" || v === "mac" || v === "ip" || v === "status";
}

function revalidateStaffHubPaths(
  portal: InlineStaffPortal,
  rowType: StaffType,
  field: StaffField,
  username: string,
) {
  if (field === "status") return;

  if (portal === "admin") {
    revalidatePath("/admin/managers");
    if (rowType === "RESELLER" || rowType === "DEALER") revalidatePath("/admin/managers");
    return;
  }
  if (portal === "manager") {
    revalidatePath("/manager/resellers");
    return;
  }
  revalidatePath("/reseller/dealers");
  revalidatePath(`/reseller/dealers/${encodeURIComponent(username)}`);
}

function toCanonicalMac(raw: string): string | null {
  const hexOnly = raw.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hexOnly.length !== 12) return null;
  const parts = hexOnly.match(/.{1,2}/g);
  if (!parts || parts.length !== 6) return null;
  return parts.join(":");
}

export function parseStaffInlinePortal(path: string): InlineStaffPortal | null {
  if (path === "/api/admin/staff-inline") return "admin";
  if (path === "/api/manager/staff-inline") return "manager";
  if (path === "/api/reseller/staff-inline") return "reseller";
  return null;
}

export function parseUserInlinePortal(path: string): InlineUserPortal | null {
  if (path === "/api/admin/users-inline") return "admin";
  if (path === "/api/manager/users-inline") return "manager";
  if (path === "/api/reseller/users-inline") return "reseller";
  if (path === "/api/dealer/users-inline") return "dealer";
  return null;
}

export async function updateStaffInlineForClient(
  portal: InlineStaffPortal,
  session: SessionPayload,
  input: { rowType: string; username: string; field: string; value: string },
) {
  const rowType = String(input.rowType ?? "");
  const username = String(input.username ?? "").trim();
  const field = String(input.field ?? "");
  const value = String(input.value ?? "").trim();

  if (!isStaffField(field) || !username || !value) return fail("bad_request");
  if (field === "status" && value !== "A" && value !== "S") return fail("bad_request");

  if (portal === "admin") {
    if (session.type !== "ROOT") return fail("forbidden", 403);
    if (!isStaffType(rowType)) return fail("bad_request");

    if (rowType === "MANAGER") {
      if (field === "status") {
        const ok = await updateManagerStatus(username, value as "A" | "S");
        if (!ok) return fail("not_found", 404);
      } else if (field === "name") {
        const ok = await updateManagerName(username, value);
        if (!ok) return fail("not_found", 404);
      } else {
      const cur = await getManagerByUsername(username);
      if (!cur) return fail("not_found", 404);
      await updateManager({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        comments: cur.comments ?? "",
      });
      }
    } else if (rowType === "RESELLER") {
      if (field === "status") {
        const ok = await updateResellerStatus(username, value as "A" | "S");
        if (!ok) return fail("not_found", 404);
      } else if (field === "name") {
        const ok = await updateResellerName(username, value);
        if (!ok) return fail("not_found", 404);
      } else {
      const cur = await getResellerByUsername(username);
      if (!cur) return fail("not_found", 404);
      await updateReseller({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        manager: cur.manager,
        comments: cur.comments ?? "",
      });
      }
    } else {
      if (field === "status") {
        const ok = await updateDealerStatus(username, value as "A" | "S");
        if (!ok) return fail("not_found", 404);
      } else if (field === "name") {
        const ok = await updateDealerName(username, value);
        if (!ok) return fail("not_found", 404);
      } else {
      const cur = await getDealerByUsername(username);
      if (!cur) return fail("not_found", 404);
      await updateDealer({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        username_owner: cur.reseller,
        tickets_enable: cur.tickets_enable,
        comments: cur.comments ?? "",
      });
      }
    }

    revalidateStaffHubPaths("admin", rowType, field, username);
    return { ok: true as const };
  }

  if (portal === "manager") {
    if (session.type !== "MNGR") return fail("forbidden", 403);
    const mgr = session.username.trim();
    if (rowType !== "RESELLER" && rowType !== "DEALER") return fail("bad_request");

    if (rowType === "RESELLER") {
      if (!(await managerOwnsReseller(mgr, username))) return fail("forbidden", 403);
      if (field === "status") {
        const ok = await updateResellerStatus(username, value as "A" | "S");
        if (!ok) return fail("not_found", 404);
      } else if (field === "name") {
        const ok = await updateResellerName(username, value);
        if (!ok) return fail("not_found", 404);
      } else {
      const cur = await getResellerByUsername(username);
      if (!cur) return fail("not_found", 404);
      await updateReseller({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        manager: cur.manager,
        comments: cur.comments ?? "",
      });
      }
    } else {
      if (!(await managerOwnsDealer(mgr, username))) return fail("forbidden", 403);
      if (field === "status") {
        const ok = await updateDealerStatus(username, value as "A" | "S");
        if (!ok) return fail("not_found", 404);
      } else if (field === "name") {
        const ok = await updateDealerName(username, value);
        if (!ok) return fail("not_found", 404);
      } else {
      const cur = await getDealerByUsername(username);
      if (!cur) return fail("not_found", 404);
      await updateDealer({
        username,
        name: cur.name,
        password: value,
        status: cur.status,
        username_owner: cur.reseller,
        tickets_enable: cur.tickets_enable,
        comments: cur.comments ?? "",
      });
      }
    }

    revalidateStaffHubPaths("manager", rowType, field, username);
    return { ok: true as const };
  }

  if (session.type !== "SRSLR") return fail("forbidden", 403);
  if (rowType !== "DEALER") return fail("bad_request");
  const reseller = session.username.trim();
  if (!(await resellerOwnsDealer(reseller, username))) return fail("forbidden", 403);
  if (field === "status") {
    const ok = await updateDealerStatus(username, value as "A" | "S");
    if (!ok) return fail("not_found", 404);
  } else if (field === "name") {
    const ok = await updateDealerName(username, value);
    if (!ok) return fail("not_found", 404);
  } else {
    const cur = await getDealerByUsername(username);
    if (!cur) return fail("not_found", 404);
    await updateDealer({
      username,
      name: cur.name,
      password: value,
      status: cur.status,
      username_owner: reseller,
      tickets_enable: cur.tickets_enable,
      comments: cur.comments ?? "",
    });
  }
  revalidateStaffHubPaths("reseller", "DEALER", field, username);
  return { ok: true as const };
}

export async function updateUserInlineForClient(
  portal: InlineUserPortal,
  session: SessionPayload,
  input: { account: string; field: string; value: string },
) {
  const account = String(input.account ?? "").trim();
  const field = String(input.field ?? "");
  const value = String(input.value ?? "").trim();
  if (!account || !isUserField(field)) return fail("bad_request");
  if (field !== "ip" && !value) return fail("bad_request");
  if (field === "status" && value !== "0" && value !== "1") return fail("bad_request");

  const ownerType =
    portal === "admin"
      ? "ROOT"
      : portal === "manager"
        ? "MNGR"
        : portal === "reseller"
          ? "SRSLR"
          : "RSLR";

  if (portal === "admin" && session.type !== "ROOT") return fail("forbidden", 403);
  if (portal === "manager" && session.type !== "MNGR") return fail("forbidden", 403);
  if (portal === "reseller" && session.type !== "SRSLR") return fail("forbidden", 403);
  if (portal === "dealer" && session.type !== "RSLR") return fail("forbidden", 403);

  if (portal !== "admin") {
    const inScope = await canAccessAccountByRole({
      ownerType: ownerType as "MNGR" | "SRSLR" | "RSLR",
      ownerUsername: session.username,
      account,
    });
    if (!inScope) return fail("forbidden", 403);
  }

  const macValue = field === "mac" ? toCanonicalMac(value) : null;
  if (field === "mac" && !macValue) return fail("invalid_mac");

  const cur = await getUserForInlineEdit(account);
  if (!cur) return fail("not_found", 404);

  if (field === "mac" && macValue) {
    const pool = getBillingPool();
    const [dupRows] = await pool.execute<RowDataPacket[]>(
      `SELECT account
       FROM accounts
       WHERE UPPER(REPLACE(TRIM(COALESCE(mac, '')), '-', ':')) = :m
         AND account <> :a
       LIMIT 1`,
      { m: macValue, a: account },
    );
    if (dupRows.length) return fail("duplicate_mac", 409);
  }

  const status = field === "status" ? Number(value) : cur.statusCode;
  const ok = await updateAccountWithStalkerSync({
    account,
    full_name: field === "user" ? value : cur.name,
    password: field === "password" ? value : cur.password,
    mac: field === "mac" ? (macValue as string) : cur.mac,
    ip: field === "ip" ? value : cur.ip,
    phone: cur.phone,
    note: cur.comments,
    status,
  });

  if (!ok) return fail("update_failed", 500);

  return { ok: true as const };
}
