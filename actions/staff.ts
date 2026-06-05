"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "@/lib/repos/billing";
import { getDealerById, getManagerById, getResellerById } from "@/lib/data";
import {
  adminStaffCreateErrorQuery,
} from "@/lib/staff/staffCreateRedirect";
import {
  applyInitialCreditsAfterStaffCreate,
  rollbackStaffCreate,
} from "@/lib/staff/staffCreateWithCredits";
import { getSession, homePathForUserType } from "@/lib/session";

async function requireRootSession() {
  const s = await getSession();
  if (!s) redirect("/login?error=forbidden");
  if (s.type !== "ROOT") {
    const home = homePathForUserType(s.type);
    redirect(home ?? "/login?error=forbidden");
  }
  return s;
}

function normUserStatus(v: string) {
  const u = v.toUpperCase();
  if (u === "S" || u === "INACTIVE") return "S";
  return "A";
}

function addSearchParamsToPath(path: string, updates: Record<string, string>): string {
  const idx = path.indexOf("?");
  const base = idx >= 0 ? path.slice(0, idx) : path;
  const sp = new URLSearchParams(idx >= 0 ? path.slice(idx + 1) : "");
  for (const [k, v] of Object.entries(updates)) sp.set(k, v);
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

function safeAdminManagersRedirectPath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("//") || s.includes("..")) return "/admin/managers";
  if (s === "/admin/managers" || s.startsWith("/admin/managers?")) return s;
  return "/admin/managers";
}

function safeAdminResellersRedirectPath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("//") || s.includes("..")) return "/admin/managers";
  if (s === "/admin/managers" || s.startsWith("/admin/managers?")) return s;
  return "/admin/managers";
}

function safeAdminDealersRedirectPath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("//") || s.includes("..")) return "/admin/managers";
  if (s === "/admin/managers" || s.startsWith("/admin/managers?")) return s;
  return "/admin/managers";
}

function redirectStaffCreateMissing(_formData: FormData, role: "manager" | "reseller" | "dealer") {
  redirect(`/admin/managers?error=missing&staff_new=${role}`);
}

function redirectStaffCreatePasswordMismatch(_formData: FormData, role: "manager" | "reseller" | "dealer") {
  redirect(`/admin/managers?error=password_mismatch&staff_new=${role}`);
}

async function finalizeAdminStaffCreate(input: {
  kind: "manager" | "reseller" | "dealer";
  username: string;
  ownerUsername: string;
  formData: FormData;
  operatorUsername: string;
}) {
  const creditsResult = await applyInitialCreditsAfterStaffCreate({
    portal: "admin",
    kind: input.kind,
    targetUsername: input.username,
    operatorUsername: input.operatorUsername,
    adminUsername: input.operatorUsername,
    formData: input.formData,
  });
  if (!creditsResult.ok) {
    await rollbackStaffCreate({
      portal: "admin",
      kind: input.kind,
      targetUsername: input.username,
      ownerUsername: input.ownerUsername,
    });
    redirect(`/admin/managers?${adminStaffCreateErrorQuery(input.kind, creditsResult.code, creditsResult.balance, creditsResult.required)}`);
  }
}

export async function saveManagerAction(formData: FormData) {
  const s = await requireRootSession();
  const intent = String(formData.get("_intent") ?? "edit");
  if (intent === "new") {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("password_confirm") ?? "");
    if (!name || !username || !password) redirectStaffCreateMissing(formData, "manager");
    if (password !== passwordConfirm) redirectStaffCreatePasswordMismatch(formData, "manager");
    const inserted = await repo.insertManager({ name, username, password });
    if (!inserted) redirect(`/admin/managers?error=db&staff_new=manager`);
    await finalizeAdminStaffCreate({
      kind: "manager",
      username,
      ownerUsername: username,
      formData,
      operatorUsername: s.username,
    });
    revalidatePath("/admin/managers");
    redirect("/admin/managers?ok=created_manager");
  }
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const passwordInput = String(formData.get("password") ?? "").trim();
  const status = normUserStatus(String(formData.get("status") ?? "A"));
  const comments = String(formData.get("comments") ?? "");
  const redirectPath = safeAdminManagersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username) redirect("/admin/managers?error=missing");
  const existing = passwordInput ? null : await getManagerById(username);
  const password = passwordInput || existing?.password || "";
  if (!password) redirect(`/admin/managers?error=missing&credit_user=${encodeURIComponent(username)}`);
  await repo.updateManager({ username, name, password, status, comments });
  revalidatePath("/admin/managers");
  if (redirectPath) {
    redirect(addSearchParamsToPath(redirectPath, { ok: "1" }));
  }
  redirect(`/admin/managers?ok=1&credit_user=${encodeURIComponent(username)}`);
}

export async function saveResellerAction(formData: FormData) {
  const s = await requireRootSession();
  const intent = String(formData.get("_intent") ?? "edit");
  if (intent === "new") {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("password_confirm") ?? "");
    const manager = String(formData.get("manager") ?? "").trim();
    if (!name || !username || !password || !manager) redirectStaffCreateMissing(formData, "reseller");
    if (password !== passwordConfirm) redirectStaffCreatePasswordMismatch(formData, "reseller");
    const inserted = await repo.insertReseller({ name, username, password, manager });
    if (!inserted) redirect(`/admin/managers?error=db&staff_new=reseller`);
    await finalizeAdminStaffCreate({
      kind: "reseller",
      username,
      ownerUsername: manager,
      formData,
      operatorUsername: s.username,
    });
    revalidatePath("/admin/managers");
    redirect("/admin/managers?ok=created_reseller");
  }
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const passwordInput = String(formData.get("password") ?? "").trim();
  const status = normUserStatus(String(formData.get("status") ?? "A"));
  const manager = String(formData.get("manager") ?? "").trim();
  const comments = String(formData.get("comments") ?? "");
  const redirectPath = safeAdminResellersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username || !manager) {
    redirect(`/admin/managers?error=missing&credit_user=${encodeURIComponent(username)}`);
  }
  const existing = passwordInput ? null : await getResellerById(username);
  const password = passwordInput || existing?.password || "";
  if (!password) {
    redirect(`/admin/managers?error=missing&credit_user=${encodeURIComponent(username)}`);
  }
  await repo.updateReseller({ username, name, password, status, manager, comments });
  revalidatePath("/admin/managers");
  if (redirectPath) {
    redirect(addSearchParamsToPath(redirectPath, { ok: "1" }));
  }
  redirect(`/admin/managers?ok=1&credit_user=${encodeURIComponent(username)}`);
}

export async function saveDealerAction(formData: FormData) {
  const s = await requireRootSession();
  const intent = String(formData.get("_intent") ?? "edit");
  const ticketsRaw = String(formData.get("tickets_manager") ?? "No");
  const tickets = ticketsRaw === "Yes" || ticketsRaw === "1" ? 1 : 0;
  if (intent === "new") {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("password_confirm") ?? "");
    const username_owner = String(formData.get("username_owner") ?? "").trim();
    if (!name || !username || !password || !username_owner) redirectStaffCreateMissing(formData, "dealer");
    if (password !== passwordConfirm) redirectStaffCreatePasswordMismatch(formData, "dealer");
    const inserted = await repo.insertDealer({ name, username, password, username_owner, tickets_enable: tickets });
    if (!inserted) redirect(`/admin/managers?error=db&staff_new=dealer`);
    await finalizeAdminStaffCreate({
      kind: "dealer",
      username,
      ownerUsername: username_owner,
      formData,
      operatorUsername: s.username,
    });
    revalidatePath("/admin/managers");
    redirect("/admin/managers?ok=created_dealer");
  }
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const passwordInput = String(formData.get("password") ?? "").trim();
  const status = normUserStatus(String(formData.get("status") ?? "A"));
  const username_owner = String(formData.get("username_owner") ?? "").trim();
  const comments = String(formData.get("comments") ?? "");
  const redirectPath = safeAdminDealersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username || !username_owner) {
    redirect(`/admin/managers?error=missing&credit_user=${encodeURIComponent(username)}`);
  }
  const existing = passwordInput ? null : await getDealerById(username);
  const password = passwordInput || existing?.passwordPlaceholder || "";
  if (!password) {
    redirect(`/admin/managers?error=missing&credit_user=${encodeURIComponent(username)}`);
  }
  await repo.updateDealer({
    username,
    name,
    password,
    status,
    username_owner,
    tickets_enable: tickets,
    comments,
  });
  revalidatePath("/admin/managers");
  if (redirectPath) {
    redirect(addSearchParamsToPath(redirectPath, { ok: "1" }));
  }
  redirect(`/admin/managers?ok=1&credit_user=${encodeURIComponent(username)}`);
}
