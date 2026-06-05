"use server";

import type { RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { operatorCopy } from "@/lib/operatorUiCopy";
import { parseAutoRenewPeriodSelection } from "@/lib/accountAutoRenew";
import { getBillingPool } from "@/lib/db/pool";
import * as repo from "@/lib/repos/billing";
import { validateBillingCreditLimitsValues } from "@/lib/billing/hierarchyCreditSettingsValidation";
import { parseHierarchyAddCreditApplyPromo } from "@/lib/constants/hierarchyCredits";
import { clearStalkerUserDeviceTokensByLogin } from "@/lib/repos/stalkerDevices";
import { loadBillingMacByAccount, rebootStalkerUserByLogin, resolveStalkerMessageTargetsByAccounts } from "@/lib/repos/stalkerEvents";
import { createEndUserAccount, type CreateEndUserInput } from "@/lib/repos/accountCreate";

/** Portal staff — require ≥1 debit-wallet credit before any subscriber create (trial included). */
const PORTAL_END_USER_CREATE_GUARD: Pick<CreateEndUserInput, "requirePositiveWalletBalance"> = {
  requirePositiveWalletBalance: true,
};
import {
  getStalkerCustomPackagePlanId,
  getStalkerUserDbIdByLogin,
  setStalkerUserPackageSubscriptions,
} from "@/lib/repos/stalkerUserPackages";
import * as ticketRepo from "@/lib/repos/tickets";
import * as managerPortal from "@/lib/repos/managerPortal";
import * as resellerPortal from "@/lib/repos/resellerPortal";
import * as checkMacRepo from "@/lib/repos/checkMac";
import { getSession, clearSession, homePathForUserType } from "@/lib/session";
import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import { safePortalUsersRedirectPath } from "@/lib/portalUsersRedirectPath";
import type { PromoTier } from "@/lib/promoBonus";
import { monthDeductionFromCreditsCharged, validateDeductionRules } from "@/lib/creditDeductions";
import {
  managerStaffCreateErrorQuery,
  resellerStaffCreateErrorQuery,
} from "@/lib/staff/staffCreateRedirect";
import {
  applyInitialCreditsAfterStaffCreate,
  rollbackStaffCreate,
} from "@/lib/staff/staffCreateWithCredits";
import { ticketDetailRedirect, ticketsListRedirect } from "@/lib/tickets/ticketsListRedirect";
import { isCreateOnlyValidityValue } from "@/lib/validityOptions";

function ticketPortalBase(base: string): "/admin" | "/manager" | "/reseller" | "/dealer" {
  if (base === "/manager" || base === "/reseller" || base === "/dealer") return base;
  return "/admin";
}

async function resolveEndUserEditPassword(account: string, passwordInput: string): Promise<string> {
  const trimmed = passwordInput.trim();
  if (trimmed) return trimmed;
  const cur = await repo.getUserForEdit(account);
  return cur?.password ?? "";
}

async function resolveEndUserEditParentPin(account: string, pinInput: string): Promise<string> {
  const trimmed = pinInput.trim();
  if (trimmed) return trimmed;
  const cur = await repo.getUserForEdit(account);
  const existing = cur?.parentPin?.trim();
  if (existing && /^\d{4}$/.test(existing)) return existing;
  return "9090";
}

async function requireRootSession() {
  const s = await getSession();
  if (!s) redirect("/login?error=forbidden");
  if (s.type !== "ROOT") {
    const home = homePathForUserType(s.type);
    redirect(home ?? "/login?error=forbidden");
  }
  return s;
}

async function requirePortalSession() {
  const s = await getSession();
  if (!s) redirect("/login?error=forbidden");
  return s;
}

/**
 * Portal renew debit wallet.
 * - **MNGR / SRSLR**: debit the subscriber owner's wallet (`accounts.username`) — i.e. the parent dealer/reseller login.
 * - **RSLR**: debit the logged-in dealer wallet (same as `accounts.username` for in-scope accounts).
 */
async function resolvePortalRenewDebitUsername(
  session: Awaited<ReturnType<typeof requirePortalSession>>,
  account: string,
): Promise<string | null> {
  if (session.type === "MNGR" || session.type === "SRSLR") {
    return repo.getSubscriberAccountOwnerUsername(account);
  }
  const u = session.username.trim();
  return u || null;
}

async function requireManagerSession() {
  const s = await requirePortalSession();
  if (s.type !== "MNGR") {
    redirect(portalBasePathByType(s.type));
  }
  return s;
}

async function requireResellerSession() {
  const s = await requirePortalSession();
  if (s.type !== "SRSLR") {
    redirect(portalBasePathByType(s.type));
  }
  return s;
}

async function requireDealerSession() {
  const s = await requirePortalSession();
  if (s.type !== "RSLR") {
    redirect(portalBasePathByType(s.type));
  }
  return s;
}

function redirectAfterMacLookup(base: "/manager" | "/reseller" | "/dealer", r: checkMacRepo.CheckMacLookupResult): never {
  switch (r.kind) {
    case "invalid":
      redirect(`${base}/check-mac?out=invalid`);
    case "available":
      redirect(`${base}/check-mac?out=available`);
    case "ambiguous":
      redirect(`${base}/check-mac?out=ambiguous`);
    case "exists": {
      const expQ = r.expires ? `&e=${encodeURIComponent(r.expires)}` : "";
      redirect(`${base}/check-mac?out=exists&expired=${r.expired ? 1 : 0}${expQ}`);
    }
  }
}

/** PHP `manager|reseller|dealer/Check_mac::index` */
export async function checkMacManagerAction(formData: FormData) {
  await requireManagerSession();
  const mac = String(formData.get("mac") ?? "").trim();
  if (!mac) redirect("/manager/check-mac?out=missing");
  redirectAfterMacLookup("/manager", await checkMacRepo.lookupAccountByMac(mac));
}

export async function checkMacResellerAction(formData: FormData) {
  await requireResellerSession();
  const mac = String(formData.get("mac") ?? "").trim();
  if (!mac) redirect("/reseller/check-mac?out=missing");
  redirectAfterMacLookup("/reseller", await checkMacRepo.lookupAccountByMac(mac));
}

export async function checkMacDealerAction(formData: FormData) {
  await requireDealerSession();
  const mac = String(formData.get("mac") ?? "").trim();
  if (!mac) redirect("/dealer/check-mac?out=missing");
  redirectAfterMacLookup("/dealer", await checkMacRepo.lookupAccountByMac(mac));
}

function portalBasePathByType(type: string): "/admin" | "/manager" | "/reseller" | "/dealer" {
  if (type === "MNGR") return "/manager";
  if (type === "SRSLR") return "/reseller";
  if (type === "RSLR") return "/dealer";
  return "/admin";
}

type RevalidateTarget = string | [string, "page" | "layout"];

function revalidateUnique(...targets: RevalidateTarget[]) {
  const seen = new Set<string>();
  for (const target of targets) {
    const [path, type] = Array.isArray(target) ? target : [target, undefined];
    const key = `${type ?? "page"}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  }
}

async function assertAccountAccessOrRedirect(session: Awaited<ReturnType<typeof requirePortalSession>>, account: string) {
  const ok = await repo.canAccessAccountByRole({
    ownerType: (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR" ? session.type : "ROOT") as
      | "ROOT"
      | "MNGR"
      | "SRSLR"
      | "RSLR",
    ownerUsername: session.username,
    account,
  });
  if (!ok) {
    redirect(`${portalBasePathByType(session.type)}/users`);
  }
}

function normUserStatus(v: string) {
  const u = v.toUpperCase();
  if (u === "S" || u === "INACTIVE") return "S";
  return "A";
}

const SETTINGS_TABS = new Set(["general", "announcement", "billing", "notifications", "security", "appearance"]);

function settingsTabQuery(formData: FormData): string {
  const raw = String(formData.get("active_tab") ?? "general").trim().toLowerCase();
  return SETTINGS_TABS.has(raw) ? raw : "general";
}

export async function saveSettingsAction(formData: FormData) {
  await requireRootSession();
  const tabQ = settingsTabQuery(formData);
  const tabSuffix = `&tab=${encodeURIComponent(tabQ)}`;

  const row = await repo.getSettings();
  if (!row.id) redirect(`/admin/settings?error=nosettings${tabSuffix}`);

  if (tabQ === "general") {
    const title = String(formData.get("title") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const pinDefault = String(formData.get("pin_default") ?? "").trim();
    const numberRetry = Number.parseInt(String(formData.get("number_retry_trial") ?? ""), 10);
    const isRetryTrial = formData.get("is_retry_trial") === "1";

    if (title.length < 3 || title.length > 50) redirect(`/admin/settings?error=validation${tabSuffix}`);
    if (!/^\d{4}$/.test(pinDefault)) redirect(`/admin/settings?error=validation${tabSuffix}`);
    if (!Number.isFinite(numberRetry) || numberRetry < 0) redirect(`/admin/settings?error=validation${tabSuffix}`);

    await repo.updateSettingsRow(row.id, title, email, row.announcement ?? "");
    await repo.upsertConfigByKey("pin_default", pinDefault);
    await repo.upsertConfigByKey("is_retry_trial", isRetryTrial ? "1" : "0");
    await repo.upsertConfigByKey("number_retry_trial", String(numberRetry));
    const portalTicketsCreateEnabled = formData.get("portal_tickets_create_enabled") === "1";
    await repo.upsertConfigByKey("portal_tickets_create_enabled", portalTicketsCreateEnabled ? "1" : "0");
  } else if (tabQ === "announcement") {
    const { normalizeAnnouncementHtmlForStorage } = await import("@/lib/announcement-body-format");
    const { parseAnnouncementFlashFormValue, serializeAnnouncementFlashHeading } = await import(
      "@/lib/announcement-flash"
    );
    const global_msg = normalizeAnnouncementHtmlForStorage(String(formData.get("global_msg") ?? ""));
    const flashRaw = String(formData.get("global_announcement_flash") ?? "");
    const flash = parseAnnouncementFlashFormValue(flashRaw);
    const slidesRaw = String(formData.get("global_announcement_slides") ?? "[]");
    const { parseAnnouncementSlidesJson, serializeAnnouncementSlides } = await import(
      "@/lib/global-announcement-data"
    );
    const { deleteOrphanAnnouncementSlides } = await import("@/lib/announcement-slides-fs.server");
    const previousSlides = row.announcementSlides ?? [];
    const nextSlides = parseAnnouncementSlidesJson(slidesRaw);
    await repo.updateSettingsAnnouncement(row.id, global_msg);
    await repo.upsertConfigByKey("global_announcement_slides", serializeAnnouncementSlides(nextSlides));
    await repo.upsertConfigByKey("global_announcement_flash", serializeAnnouncementFlashHeading(flash));
    await deleteOrphanAnnouncementSlides(previousSlides, nextSlides);
    const { revalidateGlobalAnnouncement } = await import("@/lib/global-announcement.server");
    revalidateGlobalAnnouncement();
  } else if (tabQ === "billing") {
    const limitReseller = Number.parseInt(String(formData.get("limit_reseller_credit") ?? ""), 10);
    const limitDealer = Number.parseInt(String(formData.get("limit_dealer_credit") ?? ""), 10);
    const limitManager = Number.parseInt(String(formData.get("limit_manager_credit") ?? ""), 10);
    const hierarchyAddMax = Number.parseInt(String(formData.get("hierarchy_add_credit_max") ?? ""), 10);
    if (!validateBillingCreditLimitsValues(hierarchyAddMax, limitManager, limitReseller, limitDealer)) {
      redirect(`/admin/settings?error=validation${tabSuffix}`);
    }
    await repo.upsertConfigByKey("limit_manager_credit", String(limitManager));
    await repo.upsertConfigByKey("hierarchy_add_credit_max", String(hierarchyAddMax));
    await repo.upsertConfigByKey("limit_reseller_credit", String(limitReseller));
    await repo.upsertConfigByKey("limit_dealer_credit", String(limitDealer));
    const { revalidateHierarchyCreditPaths } = await import("@/lib/server/revalidateHierarchyCreditPaths");
    revalidateHierarchyCreditPaths();
  } else if (tabQ === "notifications") {
    const notifyExpiringSubscriptions = formData.get("notify_expiring_subscriptions") === "1";
    const notifyLowCredit = formData.get("notify_low_credit") === "1";
    const notifyNewTickets = formData.get("notify_new_tickets") === "1";
    const notifyDeviceOffline = formData.get("notify_device_offline") === "1";
    await repo.upsertConfigByKey("notify_expiring_subscriptions", notifyExpiringSubscriptions ? "1" : "0");
    await repo.upsertConfigByKey("notify_low_credit", notifyLowCredit ? "1" : "0");
    await repo.upsertConfigByKey("notify_new_tickets", notifyNewTickets ? "1" : "0");
    await repo.upsertConfigByKey("notify_device_offline", notifyDeviceOffline ? "1" : "0");
  }

  revalidatePath("/admin/settings");
  if (tabQ === "general") {
    const { revalidatePanelTitle } = await import("@/lib/panel-title");
    revalidatePanelTitle();
  }
  redirect(`/admin/settings?ok=1${tabSuffix}`);
}

export async function saveDeductionsAction(formData: FormData) {
  await requireRootSession();
  const raw = String(formData.get("deduction_rules_json") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect(`/admin/deductions?error=${encodeURIComponent("Invalid rules payload.")}`);
  }
  if (!Array.isArray(parsed)) {
    redirect(`/admin/deductions?error=${encodeURIComponent("Invalid rules payload.")}`);
  }
  const validated = validateDeductionRules(
    parsed.map((r) => ({
      month: Number((r as { month?: unknown })?.month),
      creditsCharged: Number((r as { creditsCharged?: unknown })?.creditsCharged),
    })),
  );
  if (!validated.ok) {
    redirect(`/admin/deductions?error=${encodeURIComponent(validated.error)}`);
  }
  const rows = validated.rows.map((r) => ({
    month: r.month,
    month_deduction: monthDeductionFromCreditsCharged(r.month, r.creditsCharged),
  }));
  const monthFree = formData.get("one_month_free") === "1";
  const recoverBonus = formData.get("is_recover_bonus_credit") === "1";
  await repo.saveDeductions({ rows, monthFree, recoverBonus });
  revalidatePath("/admin/deductions");
  revalidatePath("/admin/users");
  redirect("/admin/deductions?ok=1");
}

export async function saveBonusPromoRulesAction(formData: FormData) {
  await requireRootSession();
  const p1Parse = parsePromoTiersPayloadStrict(String(formData.get("promo_p1_json") ?? "[]"), "Promo 1");
  if (!p1Parse.ok) {
    redirect(`/admin/bonus-rules?error=${encodeURIComponent(p1Parse.error)}`);
  }
  const p2Parse = parsePromoTiersPayloadStrict(String(formData.get("promo_p2_json") ?? "[]"), "Promo 2");
  if (!p2Parse.ok) {
    redirect(`/admin/bonus-rules?error=${encodeURIComponent(p2Parse.error)}`);
  }
  const p1 = p1Parse.tiers;
  const p2 = p2Parse.tiers;
  const r = await repo.savePromoBonusRules({ p1, p2 });
  if (!r.ok) {
    redirect(`/admin/bonus-rules?error=${encodeURIComponent(r.error)}`);
  }
  revalidatePath("/admin/bonus-rules");
  redirect("/admin/bonus-rules?ok=1");
}

function parsePromoTiersPayloadStrict(
  raw: string,
  label: string,
): { ok: true; tiers: PromoTier[] } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, tiers: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, error: `${label} payload is invalid JSON.` };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: `${label} payload must be a JSON array.` };
  }
  const tiers: PromoTier[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (row == null || typeof row !== "object") {
      return { ok: false, error: `${label} row ${i + 1} is invalid.` };
    }
    const o = row as Record<string, unknown>;
    const ge = Math.floor(Number(o.ge));
    const percentage = Number(o.percentage);
    const ltRaw = o.lt;
    const lt = ltRaw === null || ltRaw === undefined || String(ltRaw).trim() === "" ? null : Math.floor(Number(ltRaw));
    if (!Number.isFinite(ge) || ge < 0) {
      return { ok: false, error: `${label} row ${i + 1} has invalid GE.` };
    }
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return { ok: false, error: `${label} row ${i + 1} has invalid percentage.` };
    }
    if (lt != null && (!Number.isFinite(lt) || lt <= ge)) {
      return { ok: false, error: `${label} row ${i + 1} has LT less than or equal to GE.` };
    }
    tiers.push({ ge, lt, percentage });
  }
  return { ok: true, tiers };
}

const ADMIN_SUBSCRIBER_MESSAGE_AUDIENCES = new Set([
  "all",
  "active",
  "expired",
  "expiring",
  "inactive",
  "custom",
]);

const PORTAL_STAFF_MESSAGE_AUDIENCES = new Set([
  "all_staff",
  "managers",
  "resellers",
  "dealers",
  "custom",
]);

const OPERATOR_SUBSCRIBER_MESSAGE_AUDIENCES = new Set([
  "all",
  "active",
  "expired",
  "expiring",
  "inactive",
  "custom",
]);

export async function sendPortalStaffMessageAction(formData: FormData) {
  const session = await requireRootSession();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!title) redirect("/admin/message?tab=compose&channel=staff&error=empty_title");
  if (!message) redirect("/admin/message?tab=compose&channel=staff&error=empty");
  const rawAudience = String(formData.get("audience") ?? "").trim().toLowerCase();
  const audience = PORTAL_STAFF_MESSAGE_AUDIENCES.has(rawAudience) ? rawAudience : "all_staff";
  const pr = Number(formData.get("priority"));
  const priority = Number.isFinite(pr) && pr >= 1 && pr <= 3 ? Math.floor(pr) : 2;
  const sentBy = session.displayName?.trim() || session.username || "admin";
  const customUsernames =
    audience === "custom"
      ? [...new Set(formData.getAll("staff").map((v) => String(v ?? "").trim()).filter(Boolean))]
      : [];
  if (audience === "custom" && !customUsernames.length) {
    redirect("/admin/message?tab=compose&channel=staff&error=none_selected");
  }
  const { createPortalStaffMessage } = await import("@/lib/repos/portalStaffMessages");
  const { messageId, recipientCount } = await createPortalStaffMessage({
    title,
    body: message,
    audienceType: audience as import("@/lib/repos/portalStaffMessages").PortalStaffAudienceType,
    sentBy,
    priority,
    customUsernames,
  });
  if (!messageId || !recipientCount) {
    redirect("/admin/message?tab=compose&channel=staff&error=no_recipients");
  }
  revalidatePath("/admin/message");
  revalidatePath("/manager");
  revalidatePath("/manager/message");
  revalidatePath("/reseller");
  revalidatePath("/reseller/message");
  revalidatePath("/dealer");
  revalidatePath("/dealer/message");
  redirect(`/admin/message?ok=staff&n=${recipientCount}&channel=staff`);
}

/** Reserved for admin-only portal staff popups (`sendPortalStaffMessageAction`). Operators must not use this. */
export async function sendOperatorPortalStaffMessageAction() {
  const s = await requirePortalSession();
  const base = portalBasePathByType(s.type);
  redirect(`${base}/message?tab=compose&channel=subscribers&error=forbidden`);
}

export async function sendMessageAction(formData: FormData) {
  await requireRootSession();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/message?tab=compose&channel=subscribers&error=empty_title");
  const message = String(formData.get("message") ?? "").trim();
  if (!message) redirect("/admin/message?tab=compose&channel=subscribers&error=empty");
  const rawAudience = String(formData.get("audience") ?? "").trim().toLowerCase();
  const audience = ADMIN_SUBSCRIBER_MESSAGE_AUDIENCES.has(rawAudience) ? rawAudience : "all";
  const pr = Number(formData.get("priority"));
  const priority = Number.isFinite(pr) && pr >= 1 && pr <= 3 ? Math.floor(pr) : 2;

  if (audience === "all") {
    const n = await repo.broadcastStalkerMessageAdminSubscribers(message, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect("/admin/message?tab=compose&channel=subscribers&error=events_table");
      redirect("/admin/message?tab=compose&channel=subscribers&error=no_recipients");
    }
  } else if (audience === "custom") {
    const accounts = [...new Set(formData.getAll("accounts").map((v) => String(v ?? "").trim()).filter(Boolean))];
    if (!accounts.length) redirect("/admin/message?tab=compose&channel=subscribers&error=none_selected");
    const uids = await repo.resolveAdminAccountLoginsToStalkerUids(accounts);
    if (!uids.length) redirect("/admin/message?tab=compose&channel=subscribers&error=no_recipients");
    const n = await repo.sendStalkerMessageToUserIds(uids, message, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect("/admin/message?tab=compose&channel=subscribers&error=events_table");
      redirect("/admin/message?tab=compose&channel=subscribers&error=stalker");
    }
  } else {
    const { uids } = await repo.resolveAdminMessageStalkerUids(audience);
    if (!uids.length) redirect("/admin/message?tab=compose&channel=subscribers&error=no_recipients");
    const n = await repo.sendStalkerMessageToUserIds(uids, message, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect("/admin/message?tab=compose&channel=subscribers&error=events_table");
      redirect("/admin/message?tab=compose&channel=subscribers&error=stalker");
    }
  }
  revalidatePath("/admin/message");
  redirect("/admin/message?ok=stb");
}

/** Manager / reseller / dealer Message index: scoped audiences or custom Stalker ids in hierarchy. */
export async function sendOperatorPortalMessageAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const base = portalBasePathByType(s.type);
  const composeQs = "tab=compose&channel=subscribers";
  const { canOperatorSendSubscriberMessages } = await import("@/lib/repos/portalStaffMessages");
  if (!(await canOperatorSendSubscriberMessages(s.type, s.username))) {
    redirect(`${base}/message?${composeQs}&error=messaging_disabled`);
  }
  const message = String(formData.get("message") ?? "").trim();
  if (!message) redirect(`${base}/message?${composeQs}&error=empty`);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${base}/message?${composeQs}&error=empty_title`);
  const rawAudience = String(formData.get("audience") ?? "").trim().toLowerCase();
  const audience = OPERATOR_SUBSCRIBER_MESSAGE_AUDIENCES.has(rawAudience) ? rawAudience : "all";
  const owner = { ownerType: s.type as "MNGR" | "SRSLR" | "RSLR", ownerUsername: s.username };
  const pr = Number(formData.get("priority"));
  const priority = Number.isFinite(pr) && pr >= 1 && pr <= 3 ? Math.floor(pr) : 2;

  if (audience === "all") {
    const n = await repo.broadcastStalkerMessageScoped(message, owner, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect(`${base}/message?${composeQs}&error=events_table`);
      redirect(`${base}/message?${composeQs}&error=no_recipients`);
    }
  } else if (audience === "custom") {
    const raw = formData.getAll("users");
    const accounts = [...new Set(raw.map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean))];
    if (!accounts.length) redirect(`${base}/message?${composeQs}&error=none_selected`);
    const allowed: number[] = [];
    const seen = new Set<number>();
    for (const account of accounts) {
      const ok = await repo.canAccessAccountByRole({
        ownerType: owner.ownerType,
        ownerUsername: owner.ownerUsername,
        account,
      });
      if (!ok) continue;
      const uid = await getStalkerUserDbIdByLogin(account);
      if (uid != null && uid > 0 && !seen.has(uid)) {
        seen.add(uid);
        allowed.push(uid);
      }
    }
    if (!allowed.length) redirect(`${base}/message?${composeQs}&error=none_selected`);
    const n = await repo.sendStalkerMessageToUserIds(allowed, message, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect(`${base}/message?${composeQs}&error=events_table`);
      redirect(`${base}/message?${composeQs}&error=stalker`);
    }
  } else {
    const { uids } = await repo.resolveOperatorMessageStalkerUids(owner, audience);
    if (!uids.length) redirect(`${base}/message?${composeQs}&error=no_recipients`);
    const n = await repo.sendStalkerMessageToUserIds(uids, message, priority, title);
    if (n === 0) {
      const ready = await repo.stalkerEventsMessagingReady();
      if (ready === "no_events") redirect(`${base}/message?${composeQs}&error=events_table`);
      redirect(`${base}/message?${composeQs}&error=stalker`);
    }
  }
  revalidatePath(`${base}/message`);
  redirect(`${base}/message?ok=stb`);
}

export async function sendUserMessageAction(formData: FormData) {
  const s = await requirePortalSession();
  const base = portalBasePathByType(s.type);
  const account = String(formData.get("account") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!account) redirect(`${base}/users?error=missing`);
  await assertAccountAccessOrRedirect(s, account);
  if (!message) redirect(`${base}/users/${encodeURIComponent(account)}?error=msg_empty`);
  const r = await repo.sendStalkerMessageToAccount(account, message);
  if (!r.ok) {
    const q =
      r.code === "stalker"
        ? "msg_stalker"
        : r.code === "no_user"
          ? "msg_no_user"
          : r.code === "no_events"
            ? "msg_events"
            : "msg_db";
    redirect(`${base}/users/${encodeURIComponent(account)}?error=${q}`);
  }
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  redirect(`${base}/users/${encodeURIComponent(account)}?ok=msg`);
}

function ticketCheckboxOn(formData: FormData, key: string) {
  return formData.get(key) != null;
}

function safeAdminUsersRedirectPath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (s.startsWith("//") || s.includes("..")) return "/admin/users";
  if (s === "/admin/users" || s.startsWith("/admin/users?") || s.startsWith("/admin/users/")) return s;
  return "/admin/users";
}

function addSearchParamsToPath(path: string, updates: Record<string, string>): string {
  const idx = path.indexOf("?");
  const base = idx >= 0 ? path.slice(0, idx) : path;
  const sp = new URLSearchParams(idx >= 0 ? path.slice(idx + 1) : "");
  for (const [k, v] of Object.entries(updates)) sp.set(k, v);
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

/** Map `renewAccountByOperatorValidity` failure codes to `?error=renew_*` (after credits / recoverable branches). */
function renewFailureQueryError(code: string): string {
  switch (code) {
    case "no_summarize":
      return "renew_no_summarize";
    case "no_stalker":
      return "renew_no_stalker";
    case "no_stalker_user":
      return "renew_no_stalker_user";
    case "trial_used":
      return "renew_trial_used";
    case "trial_limit":
      return "renew_trial_limit";
    case "invalid":
      return "renew_invalid";
    case "recover_disabled":
      return "renew_recover_disabled";
    default:
      return "renew_db";
  }
}

/** Allow portal `/users` list or single-account `/users/:account` (for flashes after +1 / reset). */
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

function revalidatePortalUsersListCaches(base: "/manager" | "/reseller" | "/dealer", redirectPath: string) {
  revalidatePath(`${base}/users`);
  const pathOnly = (redirectPath.split(/[?#]/)[0] ?? "").trim();
  const prefix = `${base}/dealers/`;
  const suffix = "/users";
  if (pathOnly.startsWith(prefix) && pathOnly.endsWith(suffix)) {
    const mid = pathOnly.slice(prefix.length, pathOnly.length - suffix.length);
    if (mid.length > 0 && !mid.includes("/")) {
      revalidatePath(`${base}/dealers/${mid}/users`);
    }
  }
}

/** PHP `admin/Users::reset` — clear Stalker `users` device_id / device_id2 / access_token for billing account login. */
export async function resetAdminEndUserStalkerDevicesAction(formData: FormData) {
  await requireRootSession();
  const account = String(formData.get("account") ?? "").trim();
  const redirectPath = safeAdminUsersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "reset_invalid" }));

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: account });
  if (!rows.length) {
    redirect(addSearchParamsToPath(`/admin/users/${encodeURIComponent(account)}`, { error: "reset_no_account" }));
  }

  const r = await clearStalkerUserDeviceTokensByLogin(account);
  if (!r.ok && r.reason === "no_stalker_db") {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_no_stalker" }));
  }
  if (!r.ok && r.reason === "db_error") {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_db" }));
  }
  if (!r.ok) {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_no_row" }));
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: "reset" }));
}

export async function resetAccountDeviceBindingsAction(
  account: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "reset_invalid" | "reset_no_account" | "reset_no_stalker" | "reset_no_row" | "reset_db" }
> {
  await requireRootSession();
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "reset_invalid" };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "reset_no_account" };

  const r = await clearStalkerUserDeviceTokensByLogin(acc);
  if (!r.ok && r.reason === "no_stalker_db") return { ok: false, error: "reset_no_stalker" };
  if (!r.ok && r.reason === "db_error") return { ok: false, error: "reset_db" };
  if (!r.ok) return { ok: false, error: "reset_no_row" };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

/** PHP `manager|reseller|dealer/Users::reset` — same Stalker clear; account must be in portal scope. */
export async function resetOperatorEndUserStalkerDevicesAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const baseRaw = portalBasePathByType(s.type);
  if (baseRaw === "/admin") redirect("/login?error=forbidden");
  const base = baseRaw as "/manager" | "/reseller" | "/dealer";

  const account = String(formData.get("account") ?? "").trim();
  const redirectPath = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "reset_invalid" }));

  await assertAccountAccessOrRedirect(s, account);
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: account });
  if (!rows.length) {
    redirect(addSearchParamsToPath(`${base}/users/${encodeURIComponent(account)}`, { error: "reset_no_account" }));
  }

  const r = await clearStalkerUserDeviceTokensByLogin(account);
  if (!r.ok && r.reason === "no_stalker_db") {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_no_stalker" }));
  }
  if (!r.ok && r.reason === "db_error") {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_db" }));
  }
  if (!r.ok) {
    redirect(addSearchParamsToPath(redirectPath, { error: "reset_no_row" }));
  }

  revalidatePortalUsersListCaches(base, redirectPath);
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: "reset" }));
}

/** PHP `admin/Users::delete` / `Users_model::delete` — full remove (Stalker user then billing account). */
export async function deleteAdminEndUserAccountAction(formData: FormData) {
  await requireRootSession();
  const account = String(formData.get("account") ?? "").trim();
  const redirectPath = safeAdminUsersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "delete_invalid" }));
  const r = await repo.deleteAdminEndUserAccount(account);
  if (!r.ok) redirect(addSearchParamsToPath(redirectPath, { error: `delete_${r.code}` }));
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: "deleted_user" }));
}

/** PHP `admin/Managers::delete` */
export async function deleteAdminManagerAction(formData: FormData) {
  await requireRootSession();
  const username = String(formData.get("username") ?? "").trim();
  const redirectPath = safeAdminManagersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username) redirect(addSearchParamsToPath(redirectPath, { error: "delete_invalid" }));
  const ok = await repo.deleteAdminManager(username);
  if (!ok) redirect(addSearchParamsToPath(redirectPath, { error: "delete_forbidden" }));
  revalidatePath("/admin/managers");
  redirect(addSearchParamsToPath(redirectPath, { ok: "deleted_manager" }));
}

/** PHP `admin/Resellers::delete` */
export async function deleteAdminResellerAction(formData: FormData) {
  await requireRootSession();
  const username = String(formData.get("username") ?? "").trim();
  const redirectPath = safeAdminResellersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username) redirect(addSearchParamsToPath(redirectPath, { error: "delete_invalid" }));
  const ok = await repo.deleteAdminReseller(username);
  if (!ok) redirect(addSearchParamsToPath(redirectPath, { error: "delete_forbidden" }));
  revalidatePath("/admin/managers");
  redirect(addSearchParamsToPath(redirectPath, { ok: "deleted_reseller" }));
}

/** PHP `admin/Dealers::delete` */
export async function deleteAdminDealerAction(formData: FormData) {
  await requireRootSession();
  const username = String(formData.get("username") ?? "").trim();
  const redirectPath = safeAdminDealersRedirectPath(String(formData.get("redirect") ?? ""));
  if (!username) redirect(addSearchParamsToPath(redirectPath, { error: "delete_invalid" }));
  const ok = await repo.deleteAdminDealer(username);
  if (!ok) redirect(addSearchParamsToPath(redirectPath, { error: "delete_forbidden" }));
  revalidatePath("/admin/users");
  revalidatePath("/admin/managers");
  redirect(addSearchParamsToPath(redirectPath, { ok: "deleted_dealer" }));
}

/**
 * PHP `manager/Users::delete` (any expiry) vs `reseller|dealer/Users::delete` (expired only).
 * Same `Users_model::delete` — Stalker user then billing account; account must be in portal scope.
 */
export async function deleteOperatorEndUserAccountAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const baseRaw = portalBasePathByType(s.type);
  if (baseRaw === "/admin") redirect("/login?error=forbidden");
  const base = baseRaw as "/manager" | "/reseller" | "/dealer";

  const account = String(formData.get("account") ?? "").trim();
  const redirectPath = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "delete_invalid" }));

  await assertAccountAccessOrRedirect(s, account);

  if (s.type === "SRSLR" || s.type === "RSLR") {
    const pool = getBillingPool();
    const [accRows] = await pool.execute<RowDataPacket[]>(
      "SELECT expires FROM accounts WHERE account = :a LIMIT 1",
      { a: account },
    );
    if (!accRows.length) redirect(addSearchParamsToPath(redirectPath, { error: "delete_no_account" }));
    const exp = accRows[0].expires != null ? String(accRows[0].expires) : null;
    if (!isBillingAccountExpired(exp)) {
      redirect(addSearchParamsToPath(redirectPath, { error: "delete_active_portal" }));
    }
  }

  const r = await repo.deleteAdminEndUserAccount(account);
  if (!r.ok) redirect(addSearchParamsToPath(redirectPath, { error: `delete_${r.code}` }));
  revalidatePortalUsersListCaches(base, redirectPath);
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: "deleted_user" }));
}

function portalTicketsRole(type: string): ticketRepo.PortalTicketRole | null {
  if (type === "MNGR" || type === "SRSLR" || type === "RSLR") return type;
  return null;
}

async function requirePortalTicketsSession() {
  const s = await requirePortalSession();
  const role = portalTicketsRole(s.type);
  if (!role) redirect(portalBasePathByType(s.type));
  return { session: s, role };
}

async function assertPortalTicketAccessOrRedirect(
  username: string,
  role: ticketRepo.PortalTicketRole,
  ticketId: number,
  redirectOnDeny: string,
) {
  const ok = await ticketRepo.assertPortalTicketAccess(username, role, ticketId);
  if (!ok) redirect(redirectOnDeny);
}

/** Manager, reseller, and dealer tickets (PHP `manager/Tickets`, `dealer/Tickets`). */
export async function createPortalTicketAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const scope = await ticketRepo.getPortalTicketScope(s.username, role);
  const ticketBase = ticketPortalBase(base);
  if (!scope) redirect(ticketsListRedirect(ticketBase, { error: "db" }));
  if (!scope.canCreateTickets) redirect(ticketsListRedirect(ticketBase, { error: "create_disabled" }));

  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const priority = Number(formData.get("priority"));
  const category_id = Number(formData.get("category"));
  const channel_id = Number(formData.get("channel"));
  const channel_number = Number(String(formData.get("channel_number") ?? "").trim());
  if (!subject || !Number.isFinite(priority) || priority < 1 || priority > 3) {
    redirect(ticketsListRedirect(ticketBase, { error: "validation" }));
  }
  if (!Number.isFinite(category_id) || category_id <= 0 || !Number.isFinite(channel_id) || channel_id <= 0) {
    redirect(ticketsListRedirect(ticketBase, { error: "validation" }));
  }
  if (!Number.isFinite(channel_number) || channel_number <= 0) {
    redirect(ticketsListRedirect(ticketBase, { error: "validation" }));
  }
  try {
    await ticketRepo.insertTicket({
      subject,
      descriptionHtml: description,
      priority_id: priority,
      category_id,
      channels: [{ channel_id, channel_number }],
      flags: {
        no_audio: ticketCheckboxOn(formData, "no_audio"),
        no_video: ticketCheckboxOn(formData, "no_video"),
        stream_error: ticketCheckboxOn(formData, "stream_error"),
        no_epg: ticketCheckboxOn(formData, "no_epg"),
        catch_up_needed: ticketCheckboxOn(formData, "catch_up_needed"),
        epg_needed: ticketCheckboxOn(formData, "epg_needed"),
        file_missing: ticketCheckboxOn(formData, "file_missing"),
        wrong_channel_name: ticketCheckboxOn(formData, "wrong_channel_name"),
      },
      user_id: scope.billingUserId,
      actorUsername: s.username,
    });
  } catch {
    redirect(ticketsListRedirect(ticketBase, { error: "db" }));
  }
  revalidatePath(`${base}/tickets`);
  redirect(ticketsListRedirect(ticketBase, { ok: "created" }));
}

export async function markPortalTicketCompleteAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const ticketBase = ticketPortalBase(base);
  const id = Number(formData.get("ticket_id"));
  if (!Number.isFinite(id) || id <= 0) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  await assertPortalTicketAccessOrRedirect(s.username, role, id, ticketsListRedirect(ticketBase, { error: "ticket" }));
  const scope = await ticketRepo.getPortalTicketScope(s.username, role);
  if (!scope) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  await ticketRepo.markTicketCompleted(id, scope.billingUserId, s.username);
  revalidatePath(`${base}/tickets`);
  revalidatePath(`${base}/tickets/complete`);
  revalidatePath(`${base}/tickets/${id}`);
  redirect(ticketsListRedirect(ticketBase, { ok: "complete" }));
}

export async function addPortalTicketCommentAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const ticketBase = ticketPortalBase(base);
  const ticket_id = Number(formData.get("ticket_id"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!Number.isFinite(ticket_id) || ticket_id <= 0) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  if (!comment) redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "comment" }));
  await assertPortalTicketAccessOrRedirect(s.username, role, ticket_id, ticketsListRedirect(ticketBase, { error: "ticket" }));
  const ticket = await ticketRepo.getTicketById(ticket_id);
  if (!ticket || ticket.status_id === 2) redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "fixed" }));
  const scope = await ticketRepo.getPortalTicketScope(s.username, role);
  if (!scope) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  try {
    await ticketRepo.insertTicketComment(ticket_id, comment, scope.billingUserId, s.username);
  } catch {
    redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "db" }));
  }
  revalidatePath(`${base}/tickets/${ticket_id}`);
  revalidatePath(`${base}/tickets`);
  redirect(ticketDetailRedirect(ticketBase, ticket_id, { ok: "comment" }));
}

export async function reopenPortalTicketAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const ticketBase = ticketPortalBase(base);
  const ticket_id = Number(formData.get("ticket_id"));
  if (!Number.isFinite(ticket_id) || ticket_id <= 0) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  await assertPortalTicketAccessOrRedirect(s.username, role, ticket_id, ticketsListRedirect(ticketBase, { error: "ticket" }));
  const scope = await ticketRepo.getPortalTicketScope(s.username, role);
  if (!scope) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  await ticketRepo.reopenTicket(ticket_id, scope.billingUserId, s.username);
  revalidatePath(`${base}/tickets`);
  revalidatePath(`${base}/tickets/complete`);
  revalidatePath(`${base}/tickets/${ticket_id}`);
  redirect(ticketsListRedirect(ticketBase, { ok: "reopened" }));
}

export async function updatePortalTicketAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const ticketBase = ticketPortalBase(base);
  const ticket_id = Number(formData.get("ticket_id"));
  const priority = Number(formData.get("priority"));
  const status = Number(formData.get("status"));
  if (!Number.isFinite(ticket_id) || ticket_id <= 0) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  if (!Number.isFinite(priority) || priority < 1 || priority > 3) {
    redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "validation" }));
  }
  if (!Number.isFinite(status) || status < 1 || status > 3) {
    redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "validation" }));
  }
  await assertPortalTicketAccessOrRedirect(s.username, role, ticket_id, ticketsListRedirect(ticketBase, { error: "ticket" }));
  const scope = await ticketRepo.getPortalTicketScope(s.username, role);
  if (!scope) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  const ok = await ticketRepo.updateTicketPriorityAndStatus(
    ticket_id,
    priority,
    status,
    scope.billingUserId,
    s.username,
  );
  if (!ok) redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "db" }));
  revalidatePath(`${base}/tickets`);
  revalidatePath(`${base}/tickets/complete`);
  revalidatePath(`${base}/tickets/${ticket_id}`);
  redirect(ticketsListRedirect(ticketBase, { ok: "updated" }));
}

export async function deletePortalTicketAction(formData: FormData) {
  const { session: s, role } = await requirePortalTicketsSession();
  const base = portalBasePathByType(s.type);
  const ticketBase = ticketPortalBase(base);
  const ticket_id = Number(formData.get("ticket_id"));
  if (!Number.isFinite(ticket_id) || ticket_id <= 0) redirect(ticketsListRedirect(ticketBase, { error: "ticket" }));
  await assertPortalTicketAccessOrRedirect(s.username, role, ticket_id, ticketsListRedirect(ticketBase, { error: "ticket" }));
  const ok = await ticketRepo.deleteTicketById(ticket_id, s.username);
  if (!ok) redirect(ticketDetailRedirect(ticketBase, ticket_id, { error: "db" }));
  revalidatePath(`${base}/tickets`);
  revalidatePath(`${base}/tickets/complete`);
  redirect(ticketsListRedirect(ticketBase, { ok: "deleted" }));
}

export async function changePasswordAction(formData: FormData) {
  const s = await requireRootSession();
  const returnTo = String(formData.get("return_to") ?? "").trim().toLowerCase();
  const securityBase = "/admin/settings?tab=security";
  const failPath = (code: string) => (returnTo === "settings" ? `${securityBase}&error=${encodeURIComponent(code)}` : `/admin/profile?error=${encodeURIComponent(code)}`);
  const old_password = String(formData.get("old_password") ?? "");
  const new_password = String(formData.get("new_password") ?? "");
  const new_confirm_passsword = String(formData.get("new_confirm_passsword") ?? "");
  if (old_password.length < 3 || old_password.length > 100) {
    redirect(failPath("old_len"));
  }
  if (new_password.length < 4 || new_password.length > 12 || new_confirm_passsword.length < 4 || new_confirm_passsword.length > 12) {
    redirect(failPath("new_len"));
  }
  if (new_password !== new_confirm_passsword) {
    redirect(failPath("match"));
  }
  const ok = await repo.verifyUserPassword(s.username, old_password);
  if (!ok) redirect(failPath("old"));
  await repo.setUserPassword(s.username, new_confirm_passsword);
  await clearSession();
  redirect("/login?ok=password");
}

/** Manager / reseller / dealer profile: same flow as PHP `Profile` controllers (session cleared after change). */
export async function changeOperatorPasswordAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const base = portalBasePathByType(s.type);
  const old_password = String(formData.get("old_password") ?? "");
  const new_password = String(formData.get("new_password") ?? "");
  const new_confirm_passsword = String(formData.get("new_confirm_passsword") ?? "");

  if (old_password.length < 3 || old_password.length > 100) {
    redirect(`${base}/profile?error=old_len`);
  }
  if (new_password.length < 4 || new_password.length > 12 || new_confirm_passsword.length < 4 || new_confirm_passsword.length > 12) {
    redirect(`${base}/profile?error=new_len`);
  }
  if (new_password !== new_confirm_passsword) {
    redirect(`${base}/profile?error=match`);
  }
  const ok = await repo.verifyUserPassword(s.username, old_password);
  if (!ok) redirect(`${base}/profile?error=old`);
  await repo.setUserPassword(s.username, new_confirm_passsword);
  await clearSession();
  redirect("/login?ok=password");
}

function parseCreditOperation(raw: string): "ADD" | "RECOVER" | null {
  const v = raw.trim().toUpperCase();
  if (v === "ADD" || v === "CRDT") return "ADD";
  if (v === "RECOVER" || v === "DBIT") return "RECOVER";
  return null;
}

function parseGrantTxIdsFromForm(formData: FormData): number[] {
  const ids = new Set<number>();
  for (const v of formData.getAll("grant_tx_id")) {
    const n = Math.floor(Number.parseInt(String(v).trim(), 10));
    if (Number.isFinite(n) && n >= 1) ids.add(n);
  }
  return [...ids].sort((a, b) => a - b);
}

export async function resetStaffPasswordAction(formData: FormData) {
  await requireRootSession();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("password_confirm") ?? "");
  if (!username || !password || !confirmPassword) {
    redirect("/admin/managers?error=missing");
  }
  if (password !== confirmPassword) {
    redirect("/admin/managers?error=password_mismatch");
  }
  if (password.length < 4 || password.length > 12) {
    redirect("/admin/managers?error=new_len");
  }
  await repo.setUserPassword(username, password);
  revalidatePath("/admin/managers");
  redirect("/admin/managers?ok=password_reset");
}

/** Manager staff hub — reset password for an owned reseller or dealer. */
export async function resetManagerStaffPasswordAction(formData: FormData) {
  const s = await requireManagerSession();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("password_confirm") ?? "");
  const redirectPath = String(formData.get("redirect") ?? "").trim() || "/manager/resellers";
  if (!username || !password || !confirmPassword) {
    redirect(`${redirectPath}?error=missing`);
  }
  if (password !== confirmPassword) {
    redirect(`${redirectPath}?error=password_mismatch`);
  }
  if (password.length < 4 || password.length > 12) {
    redirect(`${redirectPath}?error=new_len`);
  }
  const [ownsReseller, ownsDealer] = await Promise.all([
    managerPortal.managerOwnsReseller(s.username, username),
    managerPortal.managerOwnsDealer(s.username, username),
  ]);
  if (!ownsReseller && !ownsDealer) {
    redirect(`${redirectPath}?error=forbidden`);
  }
  await repo.setUserPassword(username, password);
  revalidatePath("/manager/resellers");
  redirect(`${redirectPath}?ok=password_reset`);
}

/** Reseller dealers list — reset password for an owned dealer. */
export async function resetResellerStaffPasswordAction(formData: FormData) {
  const s = await requireResellerSession();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("password_confirm") ?? "");
  const redirectPath = String(formData.get("redirect") ?? "").trim() || "/reseller/dealers";
  if (!username || !password || !confirmPassword) {
    redirect(`${redirectPath}?error=missing`);
  }
  if (password !== confirmPassword) {
    redirect(`${redirectPath}?error=password_mismatch`);
  }
  if (password.length < 4 || password.length > 12) {
    redirect(`${redirectPath}?error=new_len`);
  }
  if (!(await resellerPortal.resellerOwnsDealer(s.username, username))) {
    redirect(`${redirectPath}?error=forbidden`);
  }
  await repo.setUserPassword(username, password);
  revalidatePath("/reseller/dealers");
  redirect(`${redirectPath}?ok=password_reset`);
}

export async function loadDealersForResellerAction(resellerUsername: string) {
  await requireRootSession();
  const r = resellerUsername.trim();
  if (!r) return [];
  return repo.listDealersForReseller(r);
}

/** Dealers under a reseller, only if that reseller is owned by the logged-in manager (portal “add user” UX). */
export async function loadDealersForManagerResellerAction(resellerUsername: string) {
  const s = await requireManagerSession();
  const r = resellerUsername.trim();
  if (!r) return [];
  if (!(await managerPortal.managerOwnsReseller(s.username, r))) return [];
  return repo.listDealersForReseller(r);
}

/** Reseller portal add-user modal — dealers owned by the logged-in reseller only. */
export async function loadDealersForResellerPortalAction(resellerUsername: string) {
  const s = await requireResellerSession();
  const r = resellerUsername.trim();
  if (r && r !== s.username) return [];
  return repo.listDealersForReseller(s.username);
}

/** Admin add-user modal — resellers owned by a chosen manager. */
export async function loadResellersForManagerAction(managerUsername: string) {
  await requireRootSession();
  const m = managerUsername.trim();
  if (!m) return [];
  const rows = await managerPortal.listResellersOwnedByManager(m);
  return rows.map((r) => ({ username: r.username, name: r.name }));
}

export type AddUserDebitWalletResult =
  | { ok: true; debitUsername: string; debitCredits: number }
  | { ok: false; error: string };

/**
 * Credits available on the wallet that will be debited when creating an end user
 * (`dealer` → else `reseller` → else `manager`). Session role fills implied ownership.
 */
export async function getAddUserDebitWalletCreditsAction(input: {
  manager?: string;
  reseller?: string;
  dealer?: string;
}): Promise<AddUserDebitWalletResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "forbidden" };

  let manager = (input.manager ?? "").trim();
  let reseller = (input.reseller ?? "").trim();
  let dealer = (input.dealer ?? "").trim();

  if (s.type === "MNGR") {
    manager = s.username;
    if (reseller && !(await managerPortal.managerOwnsReseller(s.username, reseller))) {
      return { ok: false, error: "forbidden" };
    }
    if (dealer) {
      if (!(await managerPortal.managerOwnsDealer(s.username, dealer))) {
        return { ok: false, error: "forbidden" };
      }
      if (reseller && !(await resellerPortal.resellerOwnsDealer(reseller, dealer))) {
        return { ok: false, error: "forbidden_dealer" };
      }
    }
  } else if (s.type === "SRSLR") {
    reseller = s.username;
    if (dealer && !(await resellerPortal.resellerOwnsDealer(s.username, dealer))) {
      return { ok: false, error: "forbidden" };
    }
  } else if (s.type === "RSLR") {
    dealer = s.username;
    reseller = (await repo.getResellerUsernameForDealer(s.username)) ?? "";
    if (!reseller) return { ok: false, error: "bad_owner" };
  } else if (s.type === "ROOT") {
    const debitUsername = dealer || reseller || manager;
    if (!debitUsername) return { ok: false, error: "missing_owner" };

    if (reseller) {
      const [[rs]] = await getBillingPool().execute<RowDataPacket[]>(
        "SELECT username_owner AS manager FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1",
        { u: reseller },
      );
      if (!rs) return { ok: false, error: "bad_owner" };
      if (manager && String(rs.manager ?? "") !== manager) return { ok: false, error: "bad_owner" };
      if (dealer) {
        const [[dl]] = await getBillingPool().execute<RowDataPacket[]>(
          "SELECT username FROM users WHERE type = 'RSLR' AND username = :d AND username_owner = :r LIMIT 1",
          { d: dealer, r: reseller },
        );
        if (!dl) return { ok: false, error: "bad_owner" };
      }
    } else if (dealer) {
      const [[dl]] = await getBillingPool().execute<RowDataPacket[]>(
        "SELECT username_owner AS reseller FROM users WHERE type = 'RSLR' AND username = :d LIMIT 1",
        { d: dealer },
      );
      if (!dl) return { ok: false, error: "bad_owner" };
      if (manager) {
        const [[rs]] = await getBillingPool().execute<RowDataPacket[]>(
          "SELECT username_owner AS manager FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1",
          { u: String(dl.reseller ?? "") },
        );
        if (!rs || String(rs.manager ?? "") !== manager) return { ok: false, error: "bad_owner" };
      }
    } else {
      const [[m]] = await getBillingPool().execute<RowDataPacket[]>(
        "SELECT username FROM users WHERE type = 'MNGR' AND username = :u LIMIT 1",
        { u: manager },
      );
      if (!m) return { ok: false, error: "bad_owner" };
    }
  } else {
    return { ok: false, error: "forbidden" };
  }

  const debitUsername = dealer || reseller || manager;
  if (!debitUsername) return { ok: false, error: "missing_owner" };

  const debitCredits = await repo.getCreditBalance(debitUsername);
  return { ok: true, debitUsername, debitCredits };
}

function addonPackIdsFromForm(formData: FormData): number[] {
  const out: number[] = [];
  for (const v of formData.getAll("packs")) {
    const n = Number.parseInt(String(v), 10);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

export async function createUserAction(formData: FormData) {
  await requireRootSession();
  const cfg = await repo.getDeductionsConfig();
  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const manager = String(formData.get("manager") ?? "").trim();
  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/admin/users") ? returnToRaw : "";
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  if (!manager) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "missing_manager" }));
    redirect("/admin/users/new?error=missing_manager");
  }

  const createInput: CreateEndUserInput = {
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    manager,
    reseller,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
  };
  const result = await createEndUserAccount(createInput);

  if (!result.ok) {
    if (returnTo) {
      if (result.code === "insufficient_credits") {
        redirect(
          addSearchParamsToPath(returnTo, {
            addUser: "1",
            error: "insufficient_credits",
            bal: String(result.balance ?? 0),
            req: String(result.required ?? 0),
          }),
        );
      }
      redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: result.code }));
    }
    if (result.code === "insufficient_credits") {
      redirect(
        `/admin/users/new?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    redirect(`/admin/users/new?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/admin/users", `/admin/users/${encodeURIComponent(result.account)}`);
  if (note.trim()) {
    await repo.updateAccountWithStalkerSync({
      account: result.account,
      full_name,
      mac,
      phone: "",
      note,
      status,
      password,
      tariff_plan_id: Number.isFinite(tariff_plan_id) && tariff_plan_id > 0 ? tariff_plan_id : undefined,
    });
  }
  if (returnTo) {
    redirect(addSearchParamsToPath(returnTo, { ok: "created" }));
  }
  redirect(`/admin/users/${encodeURIComponent(result.account)}?ok=1`);
}

/** Admin list modal create user — returns a result instead of redirecting (prevents URL flash + refresh-toasts). */
export async function createUserResultAction(formData: FormData): Promise<PortalAddUserResult> {
  await requireRootSession();
  const cfg = await repo.getDeductionsConfig();
  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const manager = String(formData.get("manager") ?? "").trim();
  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  if (!manager) return { ok: false, code: "missing_manager" };

  const createInput: CreateEndUserInput = {
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    manager,
    reseller,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
  };

  const result = await createEndUserAccount(createInput);
  if (!result.ok) return { ok: false, code: result.code, balance: result.balance, required: result.required };

  revalidateUnique("/admin/users", `/admin/users/${encodeURIComponent(result.account)}`);
  return { ok: true };
}

/** PHP `dealer/Users::add` — owner reseller + dealer come from session; debits dealer credits. */
export async function createDealerEndUserAction(formData: FormData) {
  const s = await requireDealerSession();
  const cfg = await repo.getDeductionsConfig();
  const reseller = await repo.getResellerUsernameForDealer(s.username);
  if (!reseller) redirect("/dealer/users/new?error=bad_owner");

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    reseller,
    dealer: s.username,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      redirect(
        `/dealer/users/new?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    redirect(`/dealer/users/new?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/dealer/users", `/dealer/users/${encodeURIComponent(result.account)}`);
  redirect("/dealer/users?ok=created");
}

/** PHP `reseller/Users::add` — `accounts.username` is the reseller; new users are active (PHP ignores status on add). */
export async function createResellerEndUserAction(formData: FormData) {
  const s = await requireResellerSession();
  const cfg = await repo.getDeductionsConfig();

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status: 0,
    reseller: s.username,
    dealer: "",
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      redirect(
        `/reseller/users/new?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    redirect(`/reseller/users/new?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/reseller/users", `/reseller/users/${encodeURIComponent(result.account)}`);
  redirect("/reseller/users?ok=created");
}

/** Reseller users list modal — dealer optional; credits debit dealer when set, else reseller. */
export async function createResellerEndUserFromListAction(formData: FormData) {
  const s = await requireResellerSession();
  const cfg = await repo.getDeductionsConfig();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/reseller/users") ? returnToRaw : "";
  const dealer = String(formData.get("dealer") ?? "").trim();
  if (dealer && !(await resellerPortal.resellerOwnsDealer(s.username, dealer))) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "forbidden" }));
    redirect("/reseller/users?error=forbidden");
  }

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status: 0,
    reseller: s.username,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      if (returnTo) {
        redirect(
          addSearchParamsToPath(returnTo, {
            addUser: "1",
            error: "insufficient_credits",
            bal: String(result.balance ?? 0),
            req: String(result.required ?? 0),
          }),
        );
      }
      redirect(
        `/reseller/users?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: result.code }));
    redirect(`/reseller/users?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/reseller/users", ["/reseller/dealers", "layout"], `/reseller/users/${encodeURIComponent(result.account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "created" }));
  redirect("/reseller/users?ok=created");
}

export type PortalAddUserResult =
  | { ok: true }
  | { ok: false; code: string; balance?: number; required?: number };

/** Same as `createResellerEndUserFromListAction`, but returns a result instead of redirecting (no modal blink). */
export async function createResellerEndUserFromListResultAction(formData: FormData): Promise<PortalAddUserResult> {
  const s = await requireResellerSession();
  const cfg = await repo.getDeductionsConfig();
  const dealer = String(formData.get("dealer") ?? "").trim();
  if (dealer && !(await resellerPortal.resellerOwnsDealer(s.username, dealer))) {
    return { ok: false, code: "forbidden" };
  }

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status: 0,
    reseller: s.username,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });
  if (!result.ok) return { ok: false, code: result.code, balance: result.balance, required: result.required };

  revalidateUnique("/reseller/users", ["/reseller/dealers", "layout"], `/reseller/users/${encodeURIComponent(result.account)}`);
  return { ok: true };
}

/**
 * PHP parity: end users owned by a dealer under this reseller (`accounts.username` = dealer).
 * Used from `/reseller/dealers/[dealer]/users/new` (not reseller-direct `/reseller/users/new`).
 */
export async function createResellerDealerEndUserAction(formData: FormData) {
  const s = await requireResellerSession();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const dealerSeg = encodeURIComponent(dealer);
  const newPath = `/reseller/dealers/${dealerSeg}/users/new`;
  if (!dealer) redirect(`${newPath}?error=missing_dealer`);
  if (!(await resellerPortal.resellerOwnsDealer(s.username, dealer))) {
    redirect("/reseller/dealers?error=forbidden");
  }

  const cfg = await repo.getDeductionsConfig();
  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status: 0,
    reseller: s.username,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      redirect(
        `${newPath}?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    redirect(`${newPath}?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique(
    `/reseller/dealers/${dealerSeg}/users`,
    "/reseller/dealers",
    `/reseller/dealers/${dealerSeg}`,
    `/reseller/users/${encodeURIComponent(result.account)}`,
  );
  redirect(`/reseller/dealers/${dealerSeg}/users?ok=created`);
}

/**
 * Manager portal create end-user: pick reseller (and optional dealer) in the manager’s tree.
 * Credits debit the dealer if set, otherwise the reseller (`createEndUserAccount`), matching the admin hierarchy model.
 */
export async function createManagerEndUserAction(formData: FormData) {
  const s = await requireManagerSession();
  const cfg = await repo.getDeductionsConfig();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/manager/users") ? returnToRaw : "";

  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  if (reseller) {
    if (!(await managerPortal.managerOwnsReseller(s.username, reseller))) {
      if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "forbidden" }));
      redirect("/manager/users/new?error=forbidden");
    }
    if (dealer) {
      if (!(await managerPortal.managerOwnsDealer(s.username, dealer))) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "forbidden" }));
        redirect("/manager/users/new?error=forbidden");
      }
      if (!(await resellerPortal.resellerOwnsDealer(reseller, dealer))) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "forbidden_dealer" }));
        redirect("/manager/users/new?error=forbidden_dealer");
      }
    }
  } else if (dealer) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "missing_hierarchy" }));
    redirect("/manager/users/new?error=missing_hierarchy");
  }

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const createInput: CreateEndUserInput = {
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    manager: s.username,
    reseller,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  };
  const result = await createEndUserAccount(createInput);

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      if (returnTo) {
        redirect(
          addSearchParamsToPath(returnTo, {
            addUser: "1",
            error: "insufficient_credits",
            bal: String(result.balance ?? 0),
            req: String(result.required ?? 0),
          }),
        );
      }
      redirect(
        `/manager/users/new?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: result.code }));
    redirect(`/manager/users/new?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/manager/users", `/manager/users/${encodeURIComponent(result.account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "created" }));
  redirect("/manager/users?ok=created");
}

/** Same as `createManagerEndUserAction`, but returns a result instead of redirecting (no modal blink). */
export async function createManagerEndUserFromListResultAction(formData: FormData): Promise<PortalAddUserResult> {
  const s = await requireManagerSession();
  const cfg = await repo.getDeductionsConfig();

  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  if (reseller) {
    if (!(await managerPortal.managerOwnsReseller(s.username, reseller))) return { ok: false, code: "forbidden" };
    if (dealer) {
      if (!(await managerPortal.managerOwnsDealer(s.username, dealer))) return { ok: false, code: "forbidden" };
      if (!(await resellerPortal.resellerOwnsDealer(reseller, dealer))) return { ok: false, code: "forbidden_dealer" };
    }
  } else if (dealer) {
    return { ok: false, code: "missing_hierarchy" };
  }

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const createInput: CreateEndUserInput = {
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    manager: s.username,
    reseller,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  };
  const result = await createEndUserAccount(createInput);
  if (!result.ok) return { ok: false, code: result.code, balance: result.balance, required: result.required };

  revalidateUnique("/manager/users", `/manager/users/${encodeURIComponent(result.account)}`);
  return { ok: true };
}

/** Manager portal: create end-user under a fixed dealer (PHP hierarchy; same as {@link createManagerEndUserAction} with known reseller). */
export async function createManagerDealerEndUserAction(formData: FormData) {
  const s = await requireManagerSession();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const dealerSeg = encodeURIComponent(dealer);
  const newPath = `/manager/dealers/${dealerSeg}/users/new`;
  if (!dealer) redirect(`${newPath}?error=missing_dealer`);
  if (!(await managerPortal.managerOwnsDealer(s.username, dealer))) {
    redirect("/manager/dealers?error=forbidden");
  }
  const reseller = await repo.getResellerUsernameForDealer(dealer);
  if (!reseller) redirect(`${newPath}?error=forbidden`);
  if (!(await managerPortal.managerOwnsReseller(s.username, reseller))) {
    redirect(`${newPath}?error=forbidden`);
  }
  if (!(await resellerPortal.resellerOwnsDealer(reseller, dealer))) {
    redirect(`${newPath}?error=forbidden_dealer`);
  }

  const cfg = await repo.getDeductionsConfig();
  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    reseller,
    dealer,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      redirect(
        `${newPath}?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    redirect(`${newPath}?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique(
    `/manager/dealers/${dealerSeg}/users`,
    "/manager/dealers",
    `/manager/dealers/${dealerSeg}`,
    "/manager/users",
    `/manager/users/${encodeURIComponent(result.account)}`,
  );
  redirect(`/manager/dealers/${dealerSeg}/users?ok=created`);
}

export async function bulkRenewAccountsAction(
  accounts: string[],
  validity: string,
): Promise<{ ok: true; results: repo.BulkRenewAccountResult[] } | { ok: false; error: string }> {
  await requireRootSession();
  if (!Array.isArray(accounts)) return { ok: false, error: "invalid_payload" };
  const ids = [...new Set(accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  if (!ids.length) return { ok: false, error: "no_accounts" };
  const v = String(validity ?? "").trim();
  if (!v) return { ok: false, error: "no_validity" };
  const results = await repo.bulkRenewAccountsByOperator({ accounts: ids, validity: v });
  revalidatePath("/admin/users");
  return { ok: true, results };
}

export async function recoverPortalAccountCreditsAction(
  account: string,
  creditMonths: number,
  bonusMonths = 0,
): Promise<{ ok: true } | { ok: false; error: string; balance?: number; required?: number }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const acc = String(account ?? "").trim();
  const cr = Math.floor(Number(creditMonths));
  const bonus = Math.floor(Number(bonusMonths));
  if (!acc) return { ok: false, error: "no_account" };
  if (
    (!Number.isFinite(cr) || cr < 0 || cr > 2000) ||
    (!Number.isFinite(bonus) || bonus < 0 || bonus > 2000) ||
    (cr < 1 && bonus < 1)
  ) {
    return { ok: false, error: "invalid" };
  }
  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden" };

  await repo.creditSummarizeBeforeUpdate(acc);
  const result = await repo.recoverAccountCreditsByOperator({
    account: acc,
    creditMonths: cr,
    bonusMonths: bonus,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.code,
      balance: result.balance,
      required: result.required,
    };
  }

  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  revalidatePath(`${base}/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function rebootAccountDeviceAction(
  account: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "reboot_invalid" | "reboot_no_account" | "reboot_no_stalker" | "reboot_no_row" | "reboot_no_events" | "reboot_db" }
> {
  await requireRootSession();
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "reboot_invalid" };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "reboot_no_account" };

  const r = await rebootStalkerUserByLogin(acc);
  if (!r.ok && r.reason === "no_stalker_db") return { ok: false, error: "reboot_no_stalker" };
  if (!r.ok && r.reason === "no_events") return { ok: false, error: "reboot_no_events" };
  if (!r.ok && r.reason === "db_error") return { ok: false, error: "reboot_db" };
  if (!r.ok) return { ok: false, error: "reboot_no_row" };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function rebootPortalAccountDeviceAction(
  account: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "reboot_invalid"
        | "reboot_no_account"
        | "reboot_no_stalker"
        | "reboot_no_row"
        | "reboot_no_events"
        | "reboot_db"
        | "forbidden";
    }
> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "reboot_invalid" };
  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden" };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "reboot_no_account" };

  const r = await rebootStalkerUserByLogin(acc);
  if (!r.ok && r.reason === "no_stalker_db") return { ok: false, error: "reboot_no_stalker" };
  if (!r.ok && r.reason === "no_events") return { ok: false, error: "reboot_no_events" };
  if (!r.ok && r.reason === "db_error") return { ok: false, error: "reboot_db" };
  if (!r.ok) return { ok: false, error: "reboot_no_row" };

  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  revalidatePath(`${base}/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function resetPortalAccountDeviceBindingsAction(
  account: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "reset_invalid" | "reset_no_account" | "reset_no_stalker" | "reset_no_row" | "reset_db" | "forbidden" }
> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "reset_invalid" };
  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden" };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "reset_no_account" };

  const r = await clearStalkerUserDeviceTokensByLogin(acc);
  if (!r.ok && r.reason === "no_stalker_db") return { ok: false, error: "reset_no_stalker" };
  if (!r.ok && r.reason === "db_error") return { ok: false, error: "reset_db" };
  if (!r.ok) return { ok: false, error: "reset_no_row" };

  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  revalidatePath(`${base}/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function recoverAccountCreditsAction(
  account: string,
  creditMonths: number,
  bonusMonths = 0,
): Promise<{ ok: true } | { ok: false; error: string; balance?: number; required?: number }> {
  await requireRootSession();
  const acc = String(account ?? "").trim();
  const cr = Math.floor(Number(creditMonths));
  const bonus = Math.floor(Number(bonusMonths));
  if (!acc) return { ok: false, error: "no_account" };
  if (
    (!Number.isFinite(cr) || cr < 0 || cr > 2000) ||
    (!Number.isFinite(bonus) || bonus < 0 || bonus > 2000) ||
    (cr < 1 && bonus < 1)
  ) {
    return { ok: false, error: "invalid" };
  }

  await repo.creditSummarizeBeforeUpdate(acc);
  const result = await repo.recoverAccountCreditsByOperator({
    account: acc,
    creditMonths: cr,
    bonusMonths: bonus,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.code,
      balance: result.balance,
      required: result.required,
    };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function getAccountRenewRecoveryAvailabilityAction(account: string): Promise<{
  ok: true;
  expiresAt: string | null;
  recoverPeriodStartAt: string | null;
  recoverableCredits: number | null;
  recoverableBonusMonths: number | null;
  debitUsername: string | null;
  debitCredits: number | null;
  autoRenewEnabled: boolean;
  autoRenewCyclesRemaining: number;
} | {
  ok: false;
  error: string;
}> {
  await requireRootSession();
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "no_account" };
  await repo.creditSummarizeBeforeUpdate(acc);
  const data = await repo.getAccountRenewRecoveryAvailability(acc);
  return { ok: true, ...data };
}

export async function getPortalOperatorWalletAction(): Promise<
  { ok: true; debitUsername: string; debitCredits: number } | { ok: false; error: string }
> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const debitCredits = await repo.getCreditBalance(s.username);
  return { ok: true, debitUsername: s.username, debitCredits };
}

export async function getPortalAccountRenewRecoveryAvailabilityAction(account: string): Promise<{
  ok: true;
  expiresAt: string | null;
  recoverPeriodStartAt: string | null;
  recoverableCredits: number | null;
  recoverableBonusMonths: number | null;
  debitUsername: string | null;
  debitCredits: number | null;
  autoRenewEnabled: boolean;
  autoRenewCyclesRemaining: number;
} | {
  ok: false;
  error: string;
}> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "no_account" };
  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden" };
  await repo.creditSummarizeBeforeUpdate(acc);
  const data = await repo.getAccountRenewRecoveryAvailability(acc);
  if (s.type === "MNGR" || s.type === "SRSLR") {
    // Debit wallet is the subscriber owner (`accounts.username`), already returned by `getAccountRenewRecoveryAvailability`.
    return { ok: true, ...data };
  }
  const operatorCredits = await repo.getCreditBalance(s.username);
  return { ok: true, ...data, debitUsername: s.username, debitCredits: operatorCredits };
}

export async function disableSubscriberAutoRenewAction(
  account: string,
): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  await requireRootSession();
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "no_account" };
  const r = await repo.disableSubscriberAutoRenew(acc);
  if (!r.ok) return { ok: false, error: r.code, message: "Could not disable auto renewal." };
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function disablePortalSubscriberAutoRenewAction(
  account: string,
): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const acc = String(account ?? "").trim();
  if (!acc) return { ok: false, error: "no_account" };
  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden" };
  const r = await repo.disableSubscriberAutoRenew(acc);
  if (!r.ok) return { ok: false, error: r.code, message: "Could not disable auto renewal." };
  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  return { ok: true };
}

export async function setSubscriberAutoRenewAction(input: {
  account: string;
  period: string;
}): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  await requireRootSession();
  const acc = String(input.account ?? "").trim();
  const period = String(input.period ?? "").trim();
  if (!acc) return { ok: false, error: "no_account", message: "Account is required." };
  if (!period) return { ok: false, error: "invalid", message: "Choose an auto renew period." };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "no_account", message: "Account not found." };

  const settings = parseAutoRenewPeriodSelection(period);
  const r = await repo.applySubscriberAutoRenewSettings(acc, settings);
  if (!r.ok) return { ok: false, error: "update_failed", message: "Could not update auto renewal." };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function setPortalSubscriberAutoRenewAction(input: {
  account: string;
  period: string;
}): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden", message: "That action is not allowed for your role." };
  }
  const acc = String(input.account ?? "").trim();
  const period = String(input.period ?? "").trim();
  if (!acc) return { ok: false, error: "no_account", message: "Account is required." };
  if (!period) return { ok: false, error: "invalid", message: "Choose an auto renew period." };

  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account: acc,
  });
  if (!inScope) return { ok: false, error: "forbidden", message: "That action is not allowed for your role." };

  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return { ok: false, error: "no_account", message: "Account not found." };

  const settings = parseAutoRenewPeriodSelection(period);
  const r = await repo.applySubscriberAutoRenewSettings(acc, settings);
  if (!r.ok) return { ok: false, error: "update_failed", message: "Could not update auto renewal." };

  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  revalidatePath(`${base}/users/${encodeURIComponent(acc)}`);
  return { ok: true };
}

export async function renewSubscriberAccountAction(input: {
  account: string;
  validity: string;
  autoRenewEnabled: boolean;
  autoRenewTotalCycles: number;
}): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  await requireRootSession();
  const account = String(input.account ?? "").trim();
  const validity = String(input.validity ?? "").trim();
  if (!account) return { ok: false, error: "no_account" };
  if (!validity) return { ok: false, error: "no_validity" };

  await repo.creditSummarizeBeforeUpdate(account);
  const r = await repo.renewSubscriberAccountWithAutoRenew({
    account,
    validity,
    autoRenew: {
      enabled: Boolean(input.autoRenewEnabled),
      totalCycles: input.autoRenewTotalCycles,
    },
  });
  if (!r.ok) {
    if (r.code === "insufficient_credits") {
      return {
        ok: false,
        error: "insufficient_credits",
        message: `Not enough credits (remaining: ${r.balance ?? 0}, required: ${r.required ?? "?"} charged).`,
      };
    }
    if (r.code === "auto_renew_failed") {
      return { ok: false, error: r.code, message: "Renewal succeeded but auto-renewal settings could not be saved." };
    }
    return { ok: false, error: r.code, message: "Renewal failed." };
  }
  revalidateUnique("/admin/users", `/admin/users/${encodeURIComponent(account)}`);
  return { ok: true };
}

export async function renewPortalSubscriberAccountAction(input: {
  account: string;
  validity: string;
  autoRenewEnabled: boolean;
  autoRenewTotalCycles: number;
}): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const account = String(input.account ?? "").trim();
  const validity = String(input.validity ?? "").trim();
  if (!account) return { ok: false, error: "no_account" };
  if (!validity) return { ok: false, error: "no_validity" };
  if (isCreateOnlyValidityValue(validity)) {
    return { ok: false, error: "invalid", message: "Free trial and free month are not available when renewing." };
  }

  const inScope = await repo.canAccessAccountByRole({
    ownerType: s.type,
    ownerUsername: s.username,
    account,
  });
  if (!inScope) return { ok: false, error: "forbidden" };

  await repo.creditSummarizeBeforeUpdate(account);
  const debitUsername = await resolvePortalRenewDebitUsername(s, account);
  if (!debitUsername) {
    return { ok: false, error: "no_owner", message: "Could not resolve debit wallet for this account." };
  }
  const r = await repo.renewSubscriberAccountWithAutoRenew({
    account,
    validity,
    debitUsername,
    autoRenew: {
      enabled: Boolean(input.autoRenewEnabled),
      totalCycles: input.autoRenewTotalCycles,
    },
  });
  if (!r.ok) {
    if (r.code === "insufficient_credits") {
      return {
        ok: false,
        error: "insufficient_credits",
        message: `Not enough credits (remaining: ${r.balance ?? 0}, required: ${r.required ?? "?"} charged).`,
      };
    }
    if (r.code === "auto_renew_failed") {
      return { ok: false, error: r.code, message: "Renewal succeeded but auto-renewal settings could not be saved." };
    }
    return { ok: false, error: r.code, message: "Renewal failed." };
  }
  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  if (base === "/manager" || base === "/reseller") {
    revalidatePath(`${base}/dealers`, "layout");
  }
  return { ok: true };
}

export async function bulkSendAccountsMessageAction(input: {
  accounts: string[];
  message: string;
  priority?: number;
}): Promise<{ ok: true; queued: number; unresolvedAccounts: string[] } | { ok: false; error: string }> {
  await requireRootSession();
  const accountsRaw = Array.isArray(input.accounts) ? input.accounts : [];
  const ids = [...new Set(accountsRaw.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 500);
  if (!ids.length) return { ok: false, error: "no_accounts" };
  const message = String(input.message ?? "").trim();
  if (!message) return { ok: false, error: "empty" };
  const pr = Number(input.priority);
  const priority = Number.isFinite(pr) && pr >= 1 && pr <= 3 ? Math.floor(pr) : 2;

  const uids: number[] = [];
  const unresolvedAccounts: string[] = [];
  const { uids: resolvedUids, skippedNoMac, skippedNoProfile } = await resolveStalkerMessageTargetsByAccounts(
    ids,
    loadBillingMacByAccount,
  );
  uids.push(...resolvedUids);
  unresolvedAccounts.push(...skippedNoMac, ...skippedNoProfile);
  if (!uids.length) return { ok: false, error: "no_recipients" };

  const queued = await repo.sendStalkerMessageToUserIds(uids, message, priority);
  if (queued === 0) {
    const ready = await repo.stalkerEventsMessagingReady();
    if (ready === "no_events") return { ok: false, error: "events_table" };
    return { ok: false, error: "stalker" };
  }

  revalidatePath("/admin/message");
  return { ok: true, queued, unresolvedAccounts };
}

/** Portal operators — scoped delete (manager may delete active; reseller/dealer expired only). */
export async function bulkDeletePortalAccountsAction(
  accounts: string[],
): Promise<{ ok: true; results: { account: string; ok: boolean; message: string }[] } | { ok: false; error: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  if (!Array.isArray(accounts)) return { ok: false, error: "invalid_payload" };
  const ids = [...new Set(accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  if (!ids.length) return { ok: false, error: "no_accounts" };

  const base = portalBasePathByType(s.type);
  const deleteFailureMessage = (code: string) => {
    switch (code) {
      case "invalid":
        return "Invalid account value.";
      case "no_account":
      case "no_account_del":
        return "Account not found in billing.";
      case "no_stalker":
        return operatorCopy.deleteNoDeviceService;
      case "no_stalker_user":
        return operatorCopy.deleteNoDeviceProfile;
      case "stalker_db":
        return operatorCopy.dbError;
      case "billing_db":
        return "Billing DB error while deleting account.";
      default:
        return `Delete failed (${code}).`;
    }
  };

  const pool = getBillingPool();
  const results: { account: string; ok: boolean; message: string }[] = [];

  for (const account of ids) {
    const inScope = await repo.canAccessAccountByRole({
      ownerType: s.type,
      ownerUsername: s.username,
      account,
    });
    if (!inScope) {
      results.push({ account, ok: false, message: `${account}: not allowed` });
      continue;
    }
    if (s.type === "SRSLR" || s.type === "RSLR") {
      const [accRows] = await pool.execute<RowDataPacket[]>(
        "SELECT expires FROM accounts WHERE account = :a LIMIT 1",
        { a: account },
      );
      if (!accRows.length) {
        results.push({ account, ok: false, message: `${account}: not found` });
        continue;
      }
      const exp = accRows[0].expires != null ? String(accRows[0].expires) : null;
      if (!isBillingAccountExpired(exp)) {
        results.push({ account, ok: false, message: `${account}: active accounts cannot be deleted` });
        continue;
      }
    }
    const r = await repo.deleteAdminEndUserAccount(account);
    if (r.ok) {
      results.push({ account, ok: true, message: `${account}: deleted` });
    } else {
      results.push({ account, ok: false, message: `${account}: ${deleteFailureMessage(r.code)}` });
    }
  }

  revalidatePath(`${base}/users`);
  return { ok: true, results };
}

export async function bulkSendPortalAccountsMessageAction(input: {
  accounts: string[];
  message: string;
  priority?: number;
}): Promise<{ ok: true; queued: number; unresolvedAccounts: string[] } | { ok: false; error: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  const accountsRaw = Array.isArray(input.accounts) ? input.accounts : [];
  const ids = [...new Set(accountsRaw.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 500);
  if (!ids.length) return { ok: false, error: "no_accounts" };
  const message = String(input.message ?? "").trim();
  if (!message) return { ok: false, error: "empty" };
  const pr = Number(input.priority);
  const priority = Number.isFinite(pr) && pr >= 1 && pr <= 3 ? Math.floor(pr) : 2;

  const uids: number[] = [];
  const unresolvedAccounts: string[] = [];
  const scopedAccounts: string[] = [];
  for (const account of ids) {
    const inScope = await repo.canAccessAccountByRole({
      ownerType: s.type,
      ownerUsername: s.username,
      account,
    });
    if (!inScope) {
      unresolvedAccounts.push(account);
      continue;
    }
    scopedAccounts.push(account);
  }
  const { uids: resolvedUids, skippedNoMac, skippedNoProfile } = await resolveStalkerMessageTargetsByAccounts(
    scopedAccounts,
    loadBillingMacByAccount,
  );
  uids.push(...resolvedUids);
  unresolvedAccounts.push(...skippedNoMac, ...skippedNoProfile);
  if (!uids.length) return { ok: false, error: "no_recipients" };

  const queued = await repo.sendStalkerMessageToUserIds(uids, message, priority);
  if (queued === 0) {
    const ready = await repo.stalkerEventsMessagingReady();
    if (ready === "no_events") return { ok: false, error: "events_table" };
    return { ok: false, error: "stalker" };
  }

  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/message`);
  return { ok: true, queued, unresolvedAccounts };
}

export async function bulkDeleteAccountsAction(
  accounts: string[],
): Promise<{ ok: true; results: { account: string; ok: boolean; message: string }[] } | { ok: false; error: string }> {
  await requireRootSession();
  if (!Array.isArray(accounts)) return { ok: false, error: "invalid_payload" };
  const ids = [...new Set(accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  if (!ids.length) return { ok: false, error: "no_accounts" };

  const results: { account: string; ok: boolean; message: string }[] = [];
  const deleteFailureMessage = (code: string) => {
    switch (code) {
      case "invalid":
        return "Invalid account value.";
      case "no_account":
      case "no_account_del":
        return "Account not found in billing.";
      case "no_stalker":
        return operatorCopy.deleteNoDeviceService;
      case "no_stalker_user":
        return operatorCopy.deleteNoDeviceProfile;
      case "stalker_db":
        return operatorCopy.dbError;
      case "billing_db":
        return "Billing DB error while deleting account.";
      default:
        return `Delete failed (${code}).`;
    }
  };

  for (const account of ids) {
    const r = await repo.deleteAdminEndUserAccount(account);
    if (r.ok) {
      results.push({ account, ok: true, message: `${account}: deleted` });
    } else {
      results.push({ account, ok: false, message: `${account}: ${deleteFailureMessage(r.code)}` });
    }
  }

  revalidatePath("/admin/users");
  return { ok: true, results };
}

/** PHP `manager|reseller|dealer/Users::renew_one_month_bulk` — scoped accounts, debit portal operator credits. */
export async function bulkRenewPortalAccountsAction(
  accounts: string[],
  validity: string,
): Promise<{ ok: true; results: repo.BulkRenewAccountResult[] } | { ok: false; error: string }> {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    return { ok: false, error: "forbidden" };
  }
  if (!Array.isArray(accounts)) return { ok: false, error: "invalid_payload" };
  const ids = [...new Set(accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  if (!ids.length) return { ok: false, error: "no_accounts" };
  const v = String(validity ?? "").trim();
  if (!v) return { ok: false, error: "no_validity" };
  const results = await repo.bulkRenewPortalAccountsByOperator({
    accounts: ids,
    validity: v,
    ownerType: s.type,
    ownerUsername: s.username,
  });
  const base = portalBasePathByType(s.type);
  revalidatePath(`${base}/users`);
  if (base === "/manager" || base === "/reseller") {
    revalidatePath(`${base}/dealers`, "layout");
  }
  return { ok: true, results };
}

export async function renewUserAction(formData: FormData) {
  await requireRootSession();
  const account = String(formData.get("account") ?? "").trim();
  const type = String(formData.get("type") ?? "RENEW").trim().toUpperCase();
  const validityRaw = String(formData.get("validity") ?? formData.get("months") ?? "").trim();
  const months = Number.parseInt(validityRaw, 10);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const credits = Number.parseInt(creditsRaw, 10);
  if (!account) redirect("/admin/users?error=missing");
  await repo.creditSummarizeBeforeUpdate(account);
  if (type !== "RCDT" && isCreateOnlyValidityValue(validityRaw)) {
    redirect(`/admin/users/${encodeURIComponent(account)}?error=renew_invalid`);
  }
  const r =
    type === "RCDT"
      ? await repo.recoverAccountCreditsByOperator({ account, credits })
      : await repo.renewAccountByOperatorValidity({ account, validity: validityRaw });
  if (!r.ok) {
    if (r.code === "insufficient_recoverable") {
      redirect(
        `/admin/users/${encodeURIComponent(account)}?error=renew_recover_credits&bal=${encodeURIComponent(String(r.balance ?? 0))}&req=${encodeURIComponent(String(r.required ?? credits))}`,
      );
    }
    if (r.code === "insufficient_credits") {
      redirect(
        `/admin/users/${encodeURIComponent(account)}?error=renew_credits&bal=${encodeURIComponent(String(r.balance ?? 0))}&req=${encodeURIComponent(String(r.required ?? months))}`,
      );
    }
    if (r.code === "recover_disabled") {
      redirect(`/admin/users/${encodeURIComponent(account)}?error=renew_recover_disabled`);
    }
    const err = renewFailureQueryError(r.code);
    const updates: Record<string, string> = { error: err };
    if (r.code === "no_stalker_user") updates.renew_acc = account;
    redirect(addSearchParamsToPath(`/admin/users/${encodeURIComponent(account)}`, updates));
  }
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(account)}`);
  redirect(
    `/admin/users/${encodeURIComponent(account)}?ok=${
      r.mode === "trial" ? "renew_trial" : r.mode === "recover" ? "renew_recover" : "renew"
    }`,
  );
}

/** Manager / reseller / dealer user detail renew/recover. Manager/reseller debits subscriber owner; dealer debits self. */
export async function renewOperatorUserAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const base = portalBasePathByType(s.type) as "/manager" | "/reseller" | "/dealer";
  const listRevalidate = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  const account = String(formData.get("account") ?? "").trim();
  const type = String(formData.get("type") ?? "RENEW").trim().toUpperCase();
  const validityRaw = String(formData.get("validity") ?? formData.get("months") ?? "").trim();
  const months = Number.parseInt(validityRaw, 10);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const credits = Number.parseInt(creditsRaw, 10);
  if (!account) redirect(`${base}/users?error=missing`);
  await assertAccountAccessOrRedirect(s, account);
  await repo.creditSummarizeBeforeUpdate(account);

  let r: repo.RenewAccountResult;
  if (type === "RCDT") {
    if (!Number.isFinite(credits) || credits < 1 || credits > 2000) {
      redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_invalid`);
    }
    const pre = await repo.portalOperatorRcdtPrecheckLikePhp({
      ownerType: s.type,
      account,
      credits,
    });
    if (!pre.ok) {
      if (pre.code === "reseller_months") {
        redirect(
          `${base}/users/${encodeURIComponent(account)}?error=renew_rcdt_reseller&max=${encodeURIComponent(String(pre.maxMonths))}&req=${encodeURIComponent(String(pre.required))}`,
        );
      }
      if (pre.code === "insufficient_recoverable") {
        redirect(
          `${base}/users/${encodeURIComponent(account)}?error=renew_recover_credits&bal=${encodeURIComponent(String(pre.balance))}&req=${encodeURIComponent(String(pre.required))}`,
        );
      }
      if (pre.code === "no_summarize") {
        redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_no_summarize`);
      }
      if (pre.code === "recover_disabled") {
        redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_recover_disabled`);
      }
      redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_invalid`);
    }
    r = await repo.recoverAccountCreditsByOperator({ account, credits });
  } else {
    if (!repo.operatorRenewValidityFormatLikePhp(validityRaw)) {
      redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_invalid`);
    }
    if (isCreateOnlyValidityValue(validityRaw)) {
      redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_invalid`);
    }
    const debitUsername = await resolvePortalRenewDebitUsername(s, account);
    if (!debitUsername) redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_invalid`);
    r = await repo.renewAccountByOperatorValidity({ account, validity: validityRaw, debitUsername });
  }
  if (!r.ok) {
    if (r.code === "insufficient_recoverable") {
      redirect(
        `${base}/users/${encodeURIComponent(account)}?error=renew_recover_credits&bal=${encodeURIComponent(String(r.balance ?? 0))}&req=${encodeURIComponent(String(r.required ?? credits))}`,
      );
    }
    if (r.code === "insufficient_credits") {
      redirect(
        `${base}/users/${encodeURIComponent(account)}?error=renew_credits&bal=${encodeURIComponent(String(r.balance ?? 0))}&req=${encodeURIComponent(String(r.required ?? months))}`,
      );
    }
    if (r.code === "recover_disabled") {
      redirect(`${base}/users/${encodeURIComponent(account)}?error=renew_recover_disabled`);
    }
    const err = renewFailureQueryError(r.code);
    const updates: Record<string, string> = { error: err };
    if (r.code === "no_stalker_user") updates.renew_acc = account;
    redirect(addSearchParamsToPath(`${base}/users/${encodeURIComponent(account)}`, updates));
  }
  revalidatePortalUsersListCaches(base, listRevalidate);
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  redirect(
    `${base}/users/${encodeURIComponent(account)}?ok=${
      r.mode === "trial" ? "renew_trial" : r.mode === "recover" ? "renew_recover" : "renew"
    }`,
  );
}

/** Portal grid +1 renew. Manager/reseller debits subscriber owner; dealer debits self. */
export async function renewOperatorUserQuickOneMonthAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const baseRaw = portalBasePathByType(s.type);
  if (baseRaw === "/admin") redirect("/login?error=forbidden");
  const base = baseRaw as "/manager" | "/reseller" | "/dealer";

  const account = String(formData.get("account") ?? "").trim();
  const redirectPath = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "renew_quick_invalid" }));

  await assertAccountAccessOrRedirect(s, account);
  await repo.creditSummarizeBeforeUpdate(account);
  const debitUsername = await resolvePortalRenewDebitUsername(s, account);
  if (!debitUsername) redirect(addSearchParamsToPath(redirectPath, { error: "renew_quick_invalid" }));
  const r = await repo.renewAccountByOperatorValidity({ account, validity: "1", debitUsername });
  if (!r.ok) {
    if (r.code === "insufficient_recoverable") {
      redirect(
        addSearchParamsToPath(redirectPath, {
          error: "renew_recover_credits",
          bal: String(r.balance ?? 0),
          req: String(r.required ?? 0),
        }),
      );
    }
    if (r.code === "insufficient_credits") {
      redirect(
        addSearchParamsToPath(redirectPath, {
          error: "renew_credits",
          bal: String(r.balance ?? 0),
          req: String(r.required ?? 1),
        }),
      );
    }
    const err = renewFailureQueryError(r.code);
    const updates: Record<string, string> = { error: err };
    if (r.code === "no_stalker_user") updates.renew_acc = account;
    redirect(addSearchParamsToPath(redirectPath, updates));
  }
  revalidatePortalUsersListCaches(base, redirectPath);
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  const okKey = r.mode === "trial" ? "renew_trial" : r.mode === "recover" ? "renew_recover" : "renew";
  redirect(addSearchParamsToPath(redirectPath, { ok: okKey }));
}

export async function saveUserAction(formData: FormData) {
  await requireRootSession();
  const account = String(formData.get("account") ?? "").trim();
  const full_name = String(formData.get("name") ?? "").trim();
  const mac = String(formData.get("mac") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const passwordInput = String(formData.get("password") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/admin/users") ? returnToRaw : "";
  const packageRaw = String(formData.get("package") ?? "").trim();
  const tariffParsed = Number.parseInt(packageRaw, 10);
  const parent_password = await resolveEndUserEditParentPin(account, String(formData.get("parent_password") ?? ""));
  const applyPacksRaw = formData.get("apply_packs");
  const applyPacks = applyPacksRaw == null ? true : String(applyPacksRaw) === "1";
  if (!account) redirect("/admin/users?error=missing");
  if (!/^\d{4}$/.test(parent_password)) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "pin", editAccount: account }));
    redirect(`/admin/users/${encodeURIComponent(account)}?error=pin`);
  }
  const password = await resolveEndUserEditPassword(account, passwordInput);
  if (!password) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "missing", editAccount: account }));
    redirect(`/admin/users/${encodeURIComponent(account)}?error=missing`);
  }
  const owner = await repo.resolveValidatedAccountOwner(reseller, dealer);
  if (!owner) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/admin/users/${encodeURIComponent(account)}?error=owner`);
  }
  const ok = await repo.updateAccountWithStalkerSync({
    account,
    full_name,
    mac,
    ip,
    phone,
    note,
    status,
    password,
    owner_username: owner,
    tariff_plan_id: Number.isFinite(tariffParsed) && tariffParsed > 0 ? tariffParsed : undefined,
    parent_password,
  });
  if (!ok) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "save", editAccount: account }));
    redirect(`/admin/users/${encodeURIComponent(account)}?error=save`);
  }

  const customPid = await getStalkerCustomPackagePlanId();
  if (applyPacks && customPid !== null && Number.isFinite(tariffParsed) && tariffParsed === customPid) {
    const uid = await getStalkerUserDbIdByLogin(account);
    if (uid) {
      const packs = formData
        .getAll("packs")
        .map((v) => Number(String(v)))
        .filter((n) => Number.isFinite(n) && n > 0);
      const okPacks = await setStalkerUserPackageSubscriptions(uid, packs);
      if (!okPacks) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "packages", editAccount: account }));
        redirect(`/admin/users/${encodeURIComponent(account)}?error=packages`);
      }
    }
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${encodeURIComponent(account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "user_saved" }));
  redirect(`/admin/users/${encodeURIComponent(account)}?ok=1`);
}

/** Manager users list modal — same fields as admin `saveUserAction`, scoped to manager tree. */
export async function saveManagerUserFromListAction(formData: FormData) {
  const s = await requireManagerSession();
  const account = String(formData.get("account") ?? "").trim();
  const full_name = String(formData.get("name") ?? "").trim();
  const mac = String(formData.get("mac") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const passwordInput = String(formData.get("password") ?? "");
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/manager/users") ? returnToRaw : "";
  const packageRaw = String(formData.get("package") ?? "").trim();
  const tariffParsed = Number.parseInt(packageRaw, 10);
  const parent_password = await resolveEndUserEditParentPin(account, String(formData.get("parent_password") ?? ""));
  const applyPacksRaw = formData.get("apply_packs");
  const applyPacks = applyPacksRaw == null ? true : String(applyPacksRaw) === "1";
  if (!account) redirect("/manager/users?error=missing");
  if (!/^\d{4}$/.test(parent_password)) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "pin", editAccount: account }));
    redirect(`/manager/users/${encodeURIComponent(account)}?error=pin`);
  }
  const password = await resolveEndUserEditPassword(account, passwordInput);
  if (!password) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "missing", editAccount: account }));
    redirect(`/manager/users/${encodeURIComponent(account)}?error=missing`);
  }
  if (!(await repo.canAccessAccountByRole({ ownerType: "MNGR", ownerUsername: s.username, account }))) {
    redirect("/manager/users?error=forbidden");
  }
  if (reseller && !(await managerPortal.managerOwnsReseller(s.username, reseller))) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/manager/users/${encodeURIComponent(account)}?error=owner`);
  }
  const owner = await repo.resolveValidatedAccountOwner(reseller, dealer);
  if (!owner) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/manager/users/${encodeURIComponent(account)}?error=owner`);
  }
  const ok = await repo.updateAccountWithStalkerSync({
    account,
    full_name,
    mac,
    ip,
    phone,
    note,
    status,
    password,
    owner_username: owner,
    tariff_plan_id: Number.isFinite(tariffParsed) && tariffParsed > 0 ? tariffParsed : undefined,
    parent_password,
  });
  if (!ok) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "save", editAccount: account }));
    redirect(`/manager/users/${encodeURIComponent(account)}?error=save`);
  }

  const customPid = await getStalkerCustomPackagePlanId();
  if (applyPacks && customPid !== null && Number.isFinite(tariffParsed) && tariffParsed === customPid) {
    const uid = await getStalkerUserDbIdByLogin(account);
    if (uid) {
      const packs = formData
        .getAll("packs")
        .map((v) => Number(String(v)))
        .filter((n) => Number.isFinite(n) && n > 0);
      const okPacks = await setStalkerUserPackageSubscriptions(uid, packs);
      if (!okPacks) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "packages", editAccount: account }));
        redirect(`/manager/users/${encodeURIComponent(account)}?error=packages`);
      }
    }
  }

  revalidateUnique("/manager/users", `/manager/users/${encodeURIComponent(account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "user_saved" }));
  redirect(`/manager/users/${encodeURIComponent(account)}?ok=1`);
}

/** Reseller users list modal — same fields as admin `saveUserAction`, scoped to reseller tree. */
export async function saveResellerUserFromListAction(formData: FormData) {
  const s = await requireResellerSession();
  const account = String(formData.get("account") ?? "").trim();
  const full_name = String(formData.get("name") ?? "").trim();
  const mac = String(formData.get("mac") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const passwordInput = String(formData.get("password") ?? "");
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const reseller = String(formData.get("reseller") ?? "").trim();
  const dealer = String(formData.get("dealer") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/reseller/users") ? returnToRaw : "";
  const packageRaw = String(formData.get("package") ?? "").trim();
  const tariffParsed = Number.parseInt(packageRaw, 10);
  const parent_password = await resolveEndUserEditParentPin(account, String(formData.get("parent_password") ?? ""));
  const applyPacksRaw = formData.get("apply_packs");
  const applyPacks = applyPacksRaw == null ? true : String(applyPacksRaw) === "1";
  if (!account) redirect("/reseller/users?error=missing");
  if (!/^\d{4}$/.test(parent_password)) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "pin", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=pin`);
  }
  const password = await resolveEndUserEditPassword(account, passwordInput);
  if (!password) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "missing", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=missing`);
  }
  if (!(await repo.canAccessAccountByRole({ ownerType: "SRSLR", ownerUsername: s.username, account }))) {
    redirect("/reseller/users?error=forbidden");
  }
  if (reseller && reseller !== s.username) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=owner`);
  }
  if (dealer && !(await resellerPortal.resellerOwnsDealer(s.username, dealer))) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=owner`);
  }
  const owner = await repo.resolveValidatedAccountOwner(s.username, dealer);
  if (!owner) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "owner", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=owner`);
  }
  const ok = await repo.updateAccountWithStalkerSync({
    account,
    full_name,
    mac,
    ip,
    phone,
    note,
    status,
    password,
    owner_username: owner,
    tariff_plan_id: Number.isFinite(tariffParsed) && tariffParsed > 0 ? tariffParsed : undefined,
    parent_password,
  });
  if (!ok) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "save", editAccount: account }));
    redirect(`/reseller/users/${encodeURIComponent(account)}?error=save`);
  }

  const customPid = await getStalkerCustomPackagePlanId();
  if (applyPacks && customPid !== null && Number.isFinite(tariffParsed) && tariffParsed === customPid) {
    const uid = await getStalkerUserDbIdByLogin(account);
    if (uid) {
      const packs = formData
        .getAll("packs")
        .map((v) => Number(String(v)))
        .filter((n) => Number.isFinite(n) && n > 0);
      const okPacks = await setStalkerUserPackageSubscriptions(uid, packs);
      if (!okPacks) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "packages", editAccount: account }));
        redirect(`/reseller/users/${encodeURIComponent(account)}?error=packages`);
      }
    }
  }

  revalidateUnique("/reseller/users", ["/reseller/dealers", "layout"], `/reseller/users/${encodeURIComponent(account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "user_saved" }));
  redirect(`/reseller/users/${encodeURIComponent(account)}?ok=1`);
}

/** Dealer users list modal — scoped to this dealer's subscribers only. */
export async function saveDealerUserFromListAction(formData: FormData) {
  const s = await requireDealerSession();
  const account = String(formData.get("account") ?? "").trim();
  const full_name = String(formData.get("name") ?? "").trim();
  const mac = String(formData.get("mac") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const passwordInput = String(formData.get("password") ?? "");
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/dealer/users") ? returnToRaw : "";
  const packageRaw = String(formData.get("package") ?? "").trim();
  const tariffParsed = Number.parseInt(packageRaw, 10);
  const parent_password = await resolveEndUserEditParentPin(account, String(formData.get("parent_password") ?? ""));
  const applyPacksRaw = formData.get("apply_packs");
  const applyPacks = applyPacksRaw == null ? true : String(applyPacksRaw) === "1";
  if (!account) redirect("/dealer/users?error=missing");
  if (!/^\d{4}$/.test(parent_password)) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "pin", editAccount: account }));
    redirect(`/dealer/users/${encodeURIComponent(account)}?error=pin`);
  }
  const password = await resolveEndUserEditPassword(account, passwordInput);
  if (!password) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "missing", editAccount: account }));
    redirect(`/dealer/users/${encodeURIComponent(account)}?error=missing`);
  }
  if (!(await repo.canAccessAccountByRole({ ownerType: "RSLR", ownerUsername: s.username, account }))) {
    redirect("/dealer/users?error=forbidden");
  }
  const ok = await repo.updateAccountWithStalkerSync({
    account,
    full_name,
    mac,
    ip,
    phone,
    note,
    status,
    password,
    owner_username: s.username,
    tariff_plan_id: Number.isFinite(tariffParsed) && tariffParsed > 0 ? tariffParsed : undefined,
    parent_password,
  });
  if (!ok) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "save", editAccount: account }));
    redirect(`/dealer/users/${encodeURIComponent(account)}?error=save`);
  }

  const customPid = await getStalkerCustomPackagePlanId();
  if (applyPacks && customPid !== null && Number.isFinite(tariffParsed) && tariffParsed === customPid) {
    const uid = await getStalkerUserDbIdByLogin(account);
    if (uid) {
      const packs = formData
        .getAll("packs")
        .map((v) => Number(String(v)))
        .filter((n) => Number.isFinite(n) && n > 0);
      const okPacks = await setStalkerUserPackageSubscriptions(uid, packs);
      if (!okPacks) {
        if (returnTo) redirect(addSearchParamsToPath(returnTo, { error: "packages", editAccount: account }));
        redirect(`/dealer/users/${encodeURIComponent(account)}?error=packages`);
      }
    }
  }

  revalidateUnique("/dealer/users", `/dealer/users/${encodeURIComponent(account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "user_saved" }));
  redirect(`/dealer/users/${encodeURIComponent(account)}?ok=1`);
}

/** Dealer users list modal — same as `createDealerEndUserAction`, returns to list with flash params. */
export async function createDealerEndUserFromListAction(formData: FormData) {
  const s = await requireDealerSession();
  const cfg = await repo.getDeductionsConfig();
  const returnToRaw = String(formData.get("returnTo") ?? "").trim();
  const returnTo = returnToRaw.startsWith("/dealer/users") ? returnToRaw : "";
  const reseller = await repo.getResellerUsernameForDealer(s.username);
  if (!reseller) {
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: "bad_owner" }));
    redirect("/dealer/users?error=bad_owner");
  }

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    reseller,
    dealer: s.username,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });

  if (!result.ok) {
    if (result.code === "insufficient_credits") {
      if (returnTo) {
        redirect(
          addSearchParamsToPath(returnTo, {
            addUser: "1",
            error: "insufficient_credits",
            bal: String(result.balance ?? 0),
            req: String(result.required ?? 0),
          }),
        );
      }
      redirect(
        `/dealer/users?error=insufficient_credits&bal=${encodeURIComponent(String(result.balance ?? 0))}&req=${encodeURIComponent(String(result.required ?? 0))}`,
      );
    }
    if (returnTo) redirect(addSearchParamsToPath(returnTo, { addUser: "1", error: result.code }));
    redirect(`/dealer/users?error=${encodeURIComponent(result.code)}`);
  }
  revalidateUnique("/dealer/users", `/dealer/users/${encodeURIComponent(result.account)}`);
  if (returnTo) redirect(addSearchParamsToPath(returnTo, { ok: "created" }));
  redirect("/dealer/users?ok=created");
}

/** Same as `createDealerEndUserFromListAction`, but returns a result instead of redirecting (no modal blink). */
export async function createDealerEndUserFromListResultAction(formData: FormData): Promise<PortalAddUserResult> {
  const s = await requireDealerSession();
  const cfg = await repo.getDeductionsConfig();
  const reseller = await repo.getResellerUsernameForDealer(s.username);
  if (!reseller) return { ok: false, code: "bad_owner" };

  const full_name = String(formData.get("name") ?? "").trim();
  const account = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const mac = String(formData.get("mac") ?? "").trim();
  const validity = String(formData.get("validity") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  const packageRaw = String(formData.get("package") ?? "0");
  const tariff_plan_id = Number.parseInt(packageRaw, 10);

  const result = await createEndUserAccount({
    full_name,
    account,
    password,
    mac,
    validity,
    status,
    reseller,
    dealer: s.username,
    tariff_plan_id,
    monthFreeEnabled: cfg.monthFree,
    recoverBonusEnabled: cfg.recoverBonus,
    addonPackageIds: addonPackIdsFromForm(formData),
    ...PORTAL_END_USER_CREATE_GUARD,
  });
  if (!result.ok) return { ok: false, code: result.code, balance: result.balance, required: result.required };

  revalidateUnique("/dealer/users", `/dealer/users/${encodeURIComponent(result.account)}`);
  return { ok: true };
}

export async function saveOperatorUserAction(formData: FormData) {
  const s = await requirePortalSession();
  if (!(s.type === "MNGR" || s.type === "SRSLR" || s.type === "RSLR")) {
    redirect("/login?error=forbidden");
  }
  const base = portalBasePathByType(s.type) as "/manager" | "/reseller" | "/dealer";
  const listRevalidate = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  const account = String(formData.get("account") ?? "").trim();
  const full_name = String(formData.get("name") ?? "").trim();
  const mac = String(formData.get("mac") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");
  const passwordInput = String(formData.get("password") ?? "");
  const statusRaw = String(formData.get("status") ?? "0");
  const status = statusRaw === "1" ? 1 : 0;
  if (!account) redirect(`${base}/users?error=missing`);
  await assertAccountAccessOrRedirect(s, account);
  const password = await resolveEndUserEditPassword(account, passwordInput);
  if (!password) redirect(`${base}/users/${encodeURIComponent(account)}?error=save`);
  const ok = await repo.updateAccountWithStalkerSync({
    account,
    full_name,
    mac,
    phone,
    note,
    status,
    password,
  });
  if (!ok) redirect(`${base}/users/${encodeURIComponent(account)}?error=save`);
  revalidatePortalUsersListCaches(base, listRevalidate);
  revalidatePath(`${base}/users/${encodeURIComponent(account)}`);
  redirect(`${base}/users/${encodeURIComponent(account)}?ok=1`);
}

/** PHP `manager/Users::activate` and `manager/Users::block` quick actions from user detail. */
export async function setManagerUserStatusQuickAction(formData: FormData) {
  const s = await requireManagerSession();
  const base = "/manager" as const;
  const account = String(formData.get("account") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim().toLowerCase();
  const redirectPath = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "status_invalid" }));
  if (mode !== "activate" && mode !== "block") {
    redirect(addSearchParamsToPath(redirectPath, { error: "status_invalid" }));
  }

  await assertAccountAccessOrRedirect(s, account);
  const r = await repo.setManagerEndUserStatusLikePhp({
    account,
    mode: mode as "activate" | "block",
  });
  if (!r.ok) {
    const q =
      r.code === "expired_activate"
        ? "activate_expired"
        : r.code === "expired_change"
          ? "block_expired"
          : r.code === "already_active"
            ? "activate_already"
            : r.code === "already_blocked"
              ? "block_already"
              : r.code === "no_account"
                ? "status_no_account"
                : r.code === "no_stalker"
                  ? "status_no_stalker"
                  : r.code === "no_stalker_user"
                    ? "status_no_stalker_user"
                    : "status_db";
    redirect(addSearchParamsToPath(redirectPath, { error: q }));
  }

  revalidatePortalUsersListCaches(base, redirectPath);
  revalidatePath(`/manager/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: mode === "activate" ? "activated" : "blocked" }));
}

/** PHP `reseller/Dealers_users::activate` / `::block` — list-level quick toggle (reseller portal). */
export async function setResellerEndUserStatusQuickAction(formData: FormData) {
  const s = await requireResellerSession();
  const base = "/reseller" as const;
  const account = String(formData.get("account") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim().toLowerCase();
  const redirectPath = safePortalUsersRedirectPath(String(formData.get("redirect") ?? ""), base);
  if (!account) redirect(addSearchParamsToPath(redirectPath, { error: "status_invalid" }));
  if (mode !== "activate" && mode !== "block") {
    redirect(addSearchParamsToPath(redirectPath, { error: "status_invalid" }));
  }

  await assertAccountAccessOrRedirect(s, account);
  const r = await repo.setManagerEndUserStatusLikePhp({
    account,
    mode: mode as "activate" | "block",
  });
  if (!r.ok) {
    const q =
      r.code === "expired_activate"
        ? "activate_expired"
        : r.code === "expired_change"
          ? "block_expired"
          : r.code === "already_active"
            ? "activate_already"
            : r.code === "already_blocked"
              ? "block_already"
              : r.code === "no_account"
                ? "status_no_account"
                : r.code === "no_stalker"
                  ? "status_no_stalker"
                  : r.code === "no_stalker_user"
                    ? "status_no_stalker_user"
                    : "status_db";
    redirect(addSearchParamsToPath(redirectPath, { error: q }));
  }

  revalidatePortalUsersListCaches(base, redirectPath);
  revalidatePath(`/reseller/users/${encodeURIComponent(account)}`);
  redirect(addSearchParamsToPath(redirectPath, { ok: mode === "activate" ? "activated" : "blocked" }));
}

function validManagerPortalUsername(u: string) {
  return /^[a-zA-Z0-9]{3,50}$/.test(u);
}

function redirectManagerStaffCreateMissing(_formData: FormData, role: "reseller" | "dealer") {
  redirect(`/manager/resellers?error=missing&staff_new=${role}`);
}

function redirectManagerStaffCreatePasswordMismatch(_formData: FormData, role: "reseller" | "dealer") {
  redirect(`/manager/resellers?error=password_mismatch&staff_new=${role}`);
}

function redirectManagerStaffCreateFieldError(_formData: FormData, role: "reseller" | "dealer", code: string) {
  redirect(`/manager/resellers?error=${code}&staff_new=${role}`);
}

/** PHP `manager/Resellers::add` — requires manager credit balance ≥ 1. */
export async function createManagerResellerAction(formData: FormData) {
  const s = await requireManagerSession();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  if (!name || !username || !password) redirectManagerStaffCreateMissing(formData, "reseller");
  if (passwordConfirm && password !== passwordConfirm) redirectManagerStaffCreatePasswordMismatch(formData, "reseller");
  if (!validManagerPortalUsername(username)) redirectManagerStaffCreateFieldError(formData, "reseller", "username");
  if (password.length < 3 || password.length > 50) redirectManagerStaffCreateFieldError(formData, "reseller", "password");
  if (await managerPortal.usernameExistsInUsers(username)) redirectManagerStaffCreateFieldError(formData, "reseller", "taken");
  const ok = await repo.insertReseller({ name, username, password, manager: s.username });
  if (!ok) redirectManagerStaffCreateFieldError(formData, "reseller", "db");
  const creditsResult = await applyInitialCreditsAfterStaffCreate({
    portal: "manager",
    kind: "reseller",
    targetUsername: username,
    operatorUsername: s.username,
    formData,
  });
  if (!creditsResult.ok) {
    await rollbackStaffCreate({
      portal: "manager",
      kind: "reseller",
      targetUsername: username,
      ownerUsername: s.username,
    });
    redirect(`/manager/resellers?${managerStaffCreateErrorQuery("reseller", creditsResult.code, creditsResult.balance, creditsResult.required)}`);
  }
  revalidatePath("/manager/resellers");
  redirect("/manager/resellers?ok=created_reseller");
}

export async function deleteManagerResellerAction(formData: FormData) {
  const s = await requireManagerSession();
  const username = String(formData.get("username") ?? "").trim();
  if (!username) redirect("/manager/resellers?error=missing");
  const ok = await managerPortal.deleteResellerOwnedByManager(s.username, username);
  if (!ok) redirect("/manager/resellers?error=delete");
  revalidatePath("/manager/resellers");
  redirect("/manager/resellers?ok=deleted");
}

export async function deleteManagerDealerAction(formData: FormData) {
  const s = await requireManagerSession();
  const username = String(formData.get("username") ?? "").trim();
  if (!username) redirect("/manager/dealers?error=missing");
  const ok = await managerPortal.deleteDealerOwnedByManager(s.username, username);
  if (!ok) redirect("/manager/dealers?error=delete");
  revalidatePath("/manager/dealers");
  redirect("/manager/dealers?ok=deleted");
}

/** PHP `manager/Dealers::add` — parent reseller must belong to this manager. */
export async function createManagerDealerAction(formData: FormData) {
  const s = await requireManagerSession();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const reseller = String(formData.get("reseller") ?? "").trim();
  if (!name || !username || !password || !reseller) redirectManagerStaffCreateMissing(formData, "dealer");
  if (passwordConfirm && password !== passwordConfirm) redirectManagerStaffCreatePasswordMismatch(formData, "dealer");
  if (!validManagerPortalUsername(username)) redirectManagerStaffCreateFieldError(formData, "dealer", "username");
  if (password.length < 3 || password.length > 50) redirectManagerStaffCreateFieldError(formData, "dealer", "password");
  if (!(await managerPortal.managerOwnsReseller(s.username, reseller))) redirectManagerStaffCreateFieldError(formData, "dealer", "reseller");
  if (await managerPortal.usernameExistsInUsers(username)) redirectManagerStaffCreateFieldError(formData, "dealer", "taken");
  const ok = await repo.insertDealer({
    name,
    username,
    password,
    username_owner: reseller,
    tickets_enable: 0,
  });
  if (!ok) redirectManagerStaffCreateFieldError(formData, "dealer", "db");
  const creditsResult = await applyInitialCreditsAfterStaffCreate({
    portal: "manager",
    kind: "dealer",
    targetUsername: username,
    operatorUsername: s.username,
    formData,
  });
  if (!creditsResult.ok) {
    await rollbackStaffCreate({
      portal: "manager",
      kind: "dealer",
      targetUsername: username,
      ownerUsername: s.username,
    });
    redirect(`/manager/resellers?${managerStaffCreateErrorQuery("dealer", creditsResult.code, creditsResult.balance, creditsResult.required)}`);
  }
  revalidatePath("/manager/resellers");
  redirect("/manager/resellers?ok=created_dealer");
}

function validPortalHierarchyUsername(u: string) {
  return /^[a-zA-Z0-9]{3,50}$/.test(u);
}

/** PHP `reseller/Dealers::add` */
export async function createResellerDealerAction(formData: FormData) {
  const s = await requireResellerSession();
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  if (!name || !username || !password) redirect("/reseller/dealers?error=missing");
  if (passwordConfirm && password !== passwordConfirm) redirect("/reseller/dealers?error=password_mismatch");
  if (!validPortalHierarchyUsername(username)) redirect("/reseller/dealers?error=username");
  if (password.length < 3 || password.length > 50) redirect("/reseller/dealers?error=password");
  if (await managerPortal.usernameExistsInUsers(username)) redirect("/reseller/dealers?error=taken");
  const ok = await repo.insertDealer({
    name,
    username,
    password,
    username_owner: s.username,
    tickets_enable: 0,
  });
  if (!ok) redirect("/reseller/dealers?error=db");
  const creditsResult = await applyInitialCreditsAfterStaffCreate({
    portal: "reseller",
    kind: "dealer",
    targetUsername: username,
    operatorUsername: s.username,
    formData,
  });
  if (!creditsResult.ok) {
    await rollbackStaffCreate({
      portal: "reseller",
      kind: "dealer",
      targetUsername: username,
      ownerUsername: s.username,
    });
    redirect(`/reseller/dealers?${resellerStaffCreateErrorQuery(creditsResult.code, creditsResult.balance, creditsResult.required)}`);
  }
  revalidatePath("/reseller/dealers");
  redirect("/reseller/dealers?ok=created");
}

export async function deleteResellerDealerAction(formData: FormData) {
  const s = await requireResellerSession();
  const username = String(formData.get("username") ?? "").trim();
  if (!username) redirect("/reseller/dealers?error=missing");
  const ok = await resellerPortal.deleteDealerOwnedByReseller(s.username, username);
  if (!ok) redirect("/reseller/dealers?error=delete");
  revalidatePath("/reseller/dealers");
  redirect("/reseller/dealers?ok=deleted");
}

