import { getHierarchyCreditPreviewBundle, getSettings } from "@/lib/data";
import { hierarchyAddCreditsSubmitMax } from "@/lib/constants/hierarchyCredits";
import type { HierarchyAddCreditLadders } from "@/lib/repos/billing";
import * as repo from "@/lib/repos/billing";
import type { HierarchyCreditsPortal } from "@/lib/repos/billing";
import type { SessionPayload } from "@/lib/session";
import type { PromoTier } from "@/lib/promoBonus";

export type StaffCreatePortal = "admin" | "manager" | "reseller";
export type StaffCreateKind = "manager" | "reseller" | "dealer";

export type StaffCreateCreditPresets = {
  addMin: number;
  addMax: number;
  addCreditLadders: HierarchyAddCreditLadders;
  payerCredits: number | null;
  promoP1: PromoTier[];
  promoP2: PromoTier[];
  activeClientsForPromo2: number;
  needsPayer: boolean;
  payerReady: boolean;
};

export function hierarchyPortalForStaffCreate(portal: StaffCreatePortal, kind: StaffCreateKind): HierarchyCreditsPortal {
  if (portal === "admin") {
    if (kind === "manager") return "admin_manager";
    if (kind === "reseller") return "admin_reseller";
    return "admin_dealer";
  }
  if (portal === "manager") {
    return kind === "reseller" ? "manager_reseller" : "manager_dealer";
  }
  return "reseller_dealer";
}

function promoKindForStaffCreate(kind: StaffCreateKind): "MNGR" | "SRSLR" | "RSLR" {
  if (kind === "manager") return "MNGR";
  if (kind === "reseller") return "SRSLR";
  return "RSLR";
}

function needsParentPayer(portal: StaffCreatePortal, kind: StaffCreateKind): boolean {
  if (kind === "manager") return false;
  if (portal === "reseller") return false;
  if (portal === "manager" && kind === "reseller") return false;
  return true;
}

function resolvePayerUsername(
  portal: StaffCreatePortal,
  kind: StaffCreateKind,
  session: SessionPayload,
  payerUsername?: string,
): string {
  if (kind === "manager") return session.username.trim();
  if (portal === "manager" && kind === "reseller") return session.username.trim();
  if (portal === "reseller") return session.username.trim();
  return String(payerUsername ?? "").trim();
}

export async function loadStaffCreateCreditPresets(input: {
  portal: StaffCreatePortal;
  session: SessionPayload;
  kind: StaffCreateKind;
  payerUsername?: string;
  draftUsername?: string;
}): Promise<StaffCreateCreditPresets | { error: string }> {
  const settings = await getSettings();
  const hierarchyPortal = hierarchyPortalForStaffCreate(input.portal, input.kind);
  const addMin = repo.hierarchyAddCreditsMin(hierarchyPortal, settings);
  const policyMax = repo.hierarchyAddCreditsMax(settings);
  const needsPayer = needsParentPayer(input.portal, input.kind);
  const payer = resolvePayerUsername(input.portal, input.kind, input.session, input.payerUsername);
  const payerReady = !needsPayer || payer.length > 0;

  if (!payerReady) {
    return {
      addMin,
      addMax: policyMax,
      addCreditLadders: { promoRungs: [], additionalRungs: [] },
      payerCredits: null,
      promoP1: [],
      promoP2: [],
      activeClientsForPromo2: 0,
      needsPayer: true,
      payerReady: false,
    };
  }

  const target = String(input.draftUsername ?? "").trim();
  const addCreditLadders = await repo.buildHierarchyAddCreditRungs({
    portal: hierarchyPortal,
    targetUsername: target,
    payerUsername: payer,
    settings,
  });

  const promoKind = promoKindForStaffCreate(input.kind);
  const { p1, p2, activeClients } = await getHierarchyCreditPreviewBundle(promoKind, target);

  const payerCredits =
    hierarchyPortal === "admin_manager" ? null : await repo.getCreditBalance(payer);
  const addMax = hierarchyAddCreditsSubmitMax(policyMax, payerCredits ?? undefined);

  return {
    addMin,
    addMax,
    addCreditLadders,
    payerCredits,
    promoP1: p1,
    promoP2: p2,
    activeClientsForPromo2: activeClients,
    needsPayer,
    payerReady: true,
  };
}
