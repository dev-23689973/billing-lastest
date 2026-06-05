import {
  getDealerById,
  getManagerById,
  getResellerById,
  getSettings,
  listManagersForSelect,
  listResellersForSelect,
} from "@/lib/data";
import { HIERARCHY_ADD_CREDITS_MAX } from "@/lib/constants/hierarchyCredits";
import { formatHierarchySelectLabel } from "@/lib/formatHierarchySelectLabel";
import { toStaffEditorClientDto } from "@/lib/dto/staff";
import * as repo from "@/lib/repos/billing";
import { listResellersOwnedByManager, managerOwnsDealer, managerOwnsReseller } from "@/lib/repos/managerPortal";
import { resellerOwnsDealer } from "@/lib/repos/resellerPortal";
import type { SessionPayload } from "@/lib/session";

export type StaffEditorPortal = "admin" | "manager" | "reseller";
export type StaffEditorSection = "profile" | "credits" | "all";
export type StaffEditorCreditsMode = "add" | "recover" | "both";
export type StaffEditorType = "MANAGER" | "RESELLER" | "DEALER";

const EMPTY_ADD_CREDIT_LADDERS = { promoRungs: [], additionalRungs: [] };

function includeAddCreditLadders(creditsMode?: StaffEditorCreditsMode): boolean {
  return creditsMode !== "recover";
}

function includePromoPreview(creditsMode?: StaffEditorCreditsMode): boolean {
  return creditsMode !== "recover";
}

async function safeGetCreditBalance(username: string): Promise<number> {
  const u = username.trim();
  if (!u) return 0;
  try {
    return await repo.getCreditBalance(u);
  } catch (err) {
    console.error("[getCreditBalance]", u, err);
    return 0;
  }
}

async function safeListReversibleHierarchyGrants(username: string) {
  return repo.listReversibleHierarchyGrants(username);
}

type ModalFail = { ok: false; error: string; status: number };

function fail(error: string, status: number): ModalFail {
  return { ok: false, error, status };
}

async function promoPreviewPayload(type: "MANAGER" | "RESELLER" | "DEALER", username: string) {
  const rules = await repo.getPromoBonusRules();
  const kind = type === "MANAGER" ? "MNGR" : type === "RESELLER" ? "SRSLR" : "RSLR";
  const activeClientsForPromo2 = await repo.countActiveClientsForPromo2({ kind, username });
  return { promoP1: rules.p1, promoP2: rules.p2, activeClientsForPromo2 };
}

function parseSection(raw: StaffEditorSection): { includeProfile: boolean; includeCredits: boolean } {
  return {
    includeProfile: raw === "all" || raw === "profile",
    includeCredits: raw === "all" || raw === "credits",
  };
}

export async function loadStaffEditorForModal(input: {
  portal: StaffEditorPortal;
  session: SessionPayload;
  type: StaffEditorType;
  username: string;
  section: StaffEditorSection;
  /** Recover-only modals skip promo ladder (large payload / slow). */
  creditsMode?: StaffEditorCreditsMode;
}) {
  try {
    return await loadStaffEditorForModalInner(input);
  } catch (err) {
    console.error("[loadStaffEditorForModal]", input.username, err);
    return fail("load_error", 500);
  }
}

async function loadStaffEditorForModalInner(input: {
  portal: StaffEditorPortal;
  session: SessionPayload;
  type: StaffEditorType;
  username: string;
  section: StaffEditorSection;
  creditsMode?: StaffEditorCreditsMode;
}) {
  const username = input.username.trim();
  const creditsMode = input.creditsMode ?? "both";
  const { includeProfile, includeCredits } = parseSection(input.section);
  if (!username) return fail("invalid_request", 400);

  const settings = includeCredits || includeProfile ? await getSettings().catch(() => null) : null;
  const hierarchyAddMaxRaw = settings?.hierarchyAddCreditMax ?? String(HIERARCHY_ADD_CREDITS_MAX);
  const hierarchyAddMax = Math.min(
    HIERARCHY_ADD_CREDITS_MAX,
    Math.max(1, Number.parseInt(String(hierarchyAddMaxRaw).trim(), 10) || HIERARCHY_ADD_CREDITS_MAX),
  );

  if (input.portal === "admin") {
    if (input.session.type !== "ROOT") return fail("forbidden", 403);
    const managerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_manager", settings) : 1;
    const resellerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_reseller", settings) : 1;
    const dealerAddMin = settings ? repo.hierarchyAddCreditsMin("admin_dealer", settings) : 1;

    if (input.type === "MANAGER") {
      const profileRow = includeProfile ? await getManagerById(username) : null;
      const creditsSlice =
        includeCredits && !includeProfile ? await repo.getManagerCreditsEditorSlice(username) : null;
      if (includeProfile && !profileRow) return fail("not_found", 404);
      if (includeCredits && !includeProfile && !creditsSlice) return fail("not_found", 404);
      const row = profileRow ?? creditsSlice;
      if (!row) return fail("not_found", 404);
      const promo =
        includeCredits && includePromoPreview(creditsMode) ? await promoPreviewPayload("MANAGER", row.username) : {};
      const addCreditLadders =
        includeCredits && settings != null && includeAddCreditLadders(creditsMode)
          ? await repo.buildHierarchyAddCreditRungs({
              portal: "admin_manager",
              targetUsername: row.username,
              payerUsername: input.session.username,
              settings,
            })
          : undefined;
      const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : undefined;
      return {
        ok: true as const,
        data: toStaffEditorClientDto({
          ...(includeProfile && profileRow
            ? {
                type: input.type,
                username: profileRow.username,
                name: profileRow.name ?? "",
                password: profileRow.password ?? "",
                status: profileRow.status ?? "A",
                comments: profileRow.comments ?? "",
                credits: Number(profileRow.credits ?? 0),
                hierarchyAddMax,
                hierarchyAddMin: managerAddMin,
                payerCredits: null,
                tickets_manager: profileRow.ticketsManager === "Yes" ? "Yes" : "No",
              }
            : {}),
          ...(includeCredits
            ? {
                type: input.type,
                username: row.username,
                credits: Number(profileRow?.credits ?? creditsSlice?.credits ?? 0),
                hierarchyAddMax,
                hierarchyAddMin: managerAddMin,
                payerCredits: null,
                addCreditLadders: addCreditLadders ?? EMPTY_ADD_CREDIT_LADDERS,
                reversibleGrants: reversibleGrants ?? [],
                ...promo,
              }
            : {}),
        }),
      };
    }

    if (input.type === "RESELLER") {
      const profileRow = includeProfile ? await getResellerById(username) : null;
      const creditsSlice =
        includeCredits && !includeProfile ? await repo.getResellerCreditsEditorSlice(username) : null;
      if (includeProfile && !profileRow) return fail("not_found", 404);
      if (includeCredits && !includeProfile && !creditsSlice) return fail("not_found", 404);
      const row = profileRow ?? creditsSlice;
      if (!row) return fail("not_found", 404);
      const managers = includeProfile ? await listManagersForSelect() : [];
      const promo =
        includeCredits && includePromoPreview(creditsMode) ? await promoPreviewPayload("RESELLER", row.username) : {};
      const payer = (profileRow?.manager ?? creditsSlice?.manager ?? "").trim();
      const payerCredits =
        payer && (includeProfile || includeCredits) ? await safeGetCreditBalance(payer) : payer ? 0 : 0;
      const addCreditLadders =
        includeCredits && settings != null && payer && includeAddCreditLadders(creditsMode)
          ? await repo.buildHierarchyAddCreditRungs({
              portal: "admin_reseller",
              targetUsername: row.username,
              payerUsername: payer,
              settings,
            })
          : undefined;
      const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : undefined;
      return {
        ok: true as const,
        data: toStaffEditorClientDto({
          ...(includeProfile && profileRow
            ? {
                type: input.type,
                username: profileRow.username,
                name: profileRow.name ?? "",
                password: profileRow.password ?? "",
                status: profileRow.status ?? "ACTIVE",
                comments: profileRow.comments ?? "",
                credits: Number(profileRow.credits ?? 0),
                hierarchyAddMax,
                hierarchyAddMin: resellerAddMin,
                manager: profileRow.manager ?? "",
                managerOptions: managers.map((m) => ({ value: m.username, label: formatHierarchySelectLabel(m.username, m.name) })),
                payerCredits,
                tickets_manager: profileRow.ticketsManager === "Yes" ? "Yes" : "No",
              }
            : {}),
          ...(includeCredits
            ? {
                type: input.type,
                username: row.username,
                credits: Number(profileRow?.credits ?? creditsSlice?.credits ?? 0),
                hierarchyAddMax,
                hierarchyAddMin: resellerAddMin,
                payerCredits,
                addCreditLadders: addCreditLadders ?? EMPTY_ADD_CREDIT_LADDERS,
                reversibleGrants: reversibleGrants ?? [],
                ...promo,
              }
            : {}),
        }),
      };
    }

    if (input.type !== "DEALER") return fail("invalid_request", 400);
    const profileRow = includeProfile ? await getDealerById(username) : null;
    const creditsSlice =
      includeCredits && !includeProfile ? await repo.getDealerCreditsEditorSlice(username) : null;
    if (includeProfile && !profileRow) return fail("not_found", 404);
    if (includeCredits && !includeProfile && !creditsSlice) return fail("not_found", 404);
    const row = profileRow ?? creditsSlice;
    if (!row) return fail("not_found", 404);
    const resellers = includeProfile ? await listResellersForSelect() : [];
    const promo =
      includeCredits && includePromoPreview(creditsMode) ? await promoPreviewPayload("DEALER", row.username) : {};
    const payer = (profileRow?.reseller ?? creditsSlice?.reseller ?? "").trim();
    const payerCredits = payer && (includeProfile || includeCredits) ? await safeGetCreditBalance(payer) : 0;
    const addCreditLadders =
      includeCredits && settings != null && payer && includeAddCreditLadders(creditsMode)
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "admin_dealer",
            targetUsername: row.username,
            payerUsername: payer,
            settings,
          })
        : undefined;
    const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : undefined;
    return {
      ok: true as const,
      data: toStaffEditorClientDto({
        ...(includeProfile && profileRow
          ? {
              type: input.type,
              username: profileRow.username,
              name: profileRow.name ?? "",
              password: profileRow.passwordPlaceholder ?? "",
              status: profileRow.status ?? "ACTIVE",
              comments: profileRow.comments ?? "",
              credits: Number(profileRow.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: dealerAddMin,
              username_owner: profileRow.reseller ?? "",
              tickets_manager: profileRow.ticketsManager === "Yes" ? "Yes" : "No",
              resellerOptions: resellers.map((r) => ({ value: r.username, label: formatHierarchySelectLabel(r.username, r.name) })),
              payerCredits,
            }
          : {}),
        ...(includeCredits
          ? {
              type: input.type,
              username: row.username,
              credits: Number(profileRow?.credits ?? creditsSlice?.credits ?? 0),
              hierarchyAddMax,
              hierarchyAddMin: dealerAddMin,
              payerCredits,
              addCreditLadders: addCreditLadders ?? EMPTY_ADD_CREDIT_LADDERS,
              reversibleGrants: reversibleGrants ?? [],
              ...promo,
            }
          : {}),
      }),
    };
  }

  if (input.portal === "manager") {
    if (input.session.type !== "MNGR") return fail("forbidden", 403);
    const mgr = input.session.username.trim();
    const resellerAddMin = settings ? repo.hierarchyAddCreditsMin("manager_reseller", settings) : 1;
    const dealerAddMin = settings ? repo.hierarchyAddCreditsMin("manager_dealer", settings) : 1;

    if (input.type === "RESELLER") {
      if (!(await managerOwnsReseller(mgr, username))) return fail("forbidden", 403);
      const row = await getResellerById(username);
      if (!row) return fail("not_found", 404);
      const promo =
        includeCredits && includePromoPreview(creditsMode) ? await promoPreviewPayload("RESELLER", row.username) : {};
      const payerCredits = await safeGetCreditBalance(mgr);
      const addCreditLadders =
        includeCredits && settings != null && includeAddCreditLadders(creditsMode)
          ? await repo.buildHierarchyAddCreditRungs({
              portal: "manager_reseller",
              targetUsername: row.username,
              payerUsername: mgr,
              settings,
            })
          : { promoRungs: [], additionalRungs: [] };
      const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : [];
      return {
        ok: true as const,
        data: toStaffEditorClientDto({
          type: input.type,
          username: row.username,
          name: row.name ?? "",
          password: row.password ?? "",
          status: row.status ?? "A",
          comments: row.comments ?? "",
          credits: Number(row.credits ?? 0),
          hierarchyAddMax,
          hierarchyAddMin: resellerAddMin,
          manager: mgr,
          payerCredits,
          addCreditLadders,
          reversibleGrants,
          ...promo,
        }),
      };
    }

    if (input.type !== "DEALER") return fail("invalid_request", 400);
    if (!(await managerOwnsDealer(mgr, username))) return fail("forbidden", 403);
    const row = await getDealerById(username);
    if (!row) return fail("not_found", 404);
    const ownedResellers = await listResellersOwnedByManager(mgr);
    const promo =
      includeCredits && includePromoPreview(creditsMode) ? await promoPreviewPayload("DEALER", row.username) : {};
    const payer = (row.reseller ?? "").trim();
    const payerCredits = payer ? await safeGetCreditBalance(payer) : 0;
    const addCreditLadders =
      includeCredits && settings != null && payer && includeAddCreditLadders(creditsMode)
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "manager_dealer",
            targetUsername: row.username,
            payerUsername: payer,
            settings,
          })
        : { promoRungs: [], additionalRungs: [] };
    const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : [];
    return {
      ok: true as const,
      data: toStaffEditorClientDto({
        type: input.type,
        username: row.username,
        name: row.name ?? "",
        password: row.passwordPlaceholder ?? "",
        status: row.status ?? "ACTIVE",
        comments: row.comments ?? "",
        credits: Number(row.credits ?? 0),
        hierarchyAddMax,
        hierarchyAddMin: dealerAddMin,
        username_owner: row.reseller ?? "",
        tickets_manager: row.ticketsManager === "Yes" ? "Yes" : "No",
        resellerOptions: ownedResellers.map((r) => ({
          value: r.username,
          label: formatHierarchySelectLabel(r.username, r.name),
        })),
        payerCredits,
        addCreditLadders,
        reversibleGrants,
        ...promo,
      }),
    };
  }

  if (input.portal === "reseller") {
    if (input.session.type !== "SRSLR") return fail("forbidden", 403);
    if (input.type !== "DEALER") return fail("invalid_request", 400);
    const reseller = input.session.username.trim();
    if (!(await resellerOwnsDealer(reseller, username))) return fail("forbidden", 403);
    const row = await getDealerById(username);
    if (!row) return fail("not_found", 404);
    const dealerAddMin = settings ? repo.hierarchyAddCreditsMin("reseller_dealer", settings) : 1;
    const promo =
      includeCredits && includePromoPreview(creditsMode)
        ? await promoPreviewPayload("DEALER", row.username)
        : {};
    const payerCredits = await safeGetCreditBalance(reseller);
    const addCreditLadders =
      includeCredits && settings != null && includeAddCreditLadders(creditsMode)
        ? await repo.buildHierarchyAddCreditRungs({
            portal: "reseller_dealer",
            targetUsername: row.username,
            payerUsername: reseller,
            settings,
          })
        : { promoRungs: [], additionalRungs: [] };
    const reversibleGrants = includeCredits ? await safeListReversibleHierarchyGrants(row.username) : [];
    return {
      ok: true as const,
      data: toStaffEditorClientDto({
        type: "DEALER",
        username: row.username,
        name: row.name ?? "",
        password: row.passwordPlaceholder ?? "",
        status: row.status ?? "ACTIVE",
        comments: row.comments ?? "",
        credits: Number(row.credits ?? 0),
        hierarchyAddMax,
        hierarchyAddMin: dealerAddMin,
        username_owner: reseller,
        payerCredits,
        addCreditLadders,
        reversibleGrants,
        ...promo,
      }),
    };
  }

  return fail("forbidden", 403);
}
