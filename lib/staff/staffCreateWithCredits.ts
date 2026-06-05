import { parseHierarchyAddCreditApplyPromo } from "@/lib/constants/hierarchyCredits";
import * as repo from "@/lib/repos/billing";
import {
  hierarchyPortalForStaffCreate,
  type StaffCreateKind,
  type StaffCreatePortal,
} from "@/lib/server/staffCreateCreditPresets";
import * as managerPortal from "@/lib/repos/managerPortal";
import * as resellerPortal from "@/lib/repos/resellerPortal";

export type InitialCreditsApplyResult =
  | { ok: true }
  | { ok: false; code: string; balance?: number; required?: number };

export function parseRequiredInitialCredits(formData: FormData): number | null {
  const credits = Number.parseInt(String(formData.get("credits") ?? "").trim(), 10);
  if (!Number.isFinite(credits) || credits < 1) return null;
  return credits;
}

export async function applyInitialCreditsAfterStaffCreate(input: {
  portal: StaffCreatePortal;
  kind: StaffCreateKind;
  targetUsername: string;
  operatorUsername: string;
  adminUsername?: string;
  formData: FormData;
}): Promise<InitialCreditsApplyResult> {
  const credits = parseRequiredInitialCredits(input.formData);
  if (credits == null) return { ok: false, code: "credits_required" };

  const applyPromo = parseHierarchyAddCreditApplyPromo(input.formData.get("apply_promo"));
  const hierarchyPortal = hierarchyPortalForStaffCreate(input.portal, input.kind);

  if (input.kind === "manager" && input.portal === "admin") {
    const r = await repo.adjustManagerCredits({
      adminUsername: input.adminUsername ?? input.operatorUsername,
      managerUsername: input.targetUsername,
      operation: "ADD",
      credits,
      operatorUsername: input.operatorUsername,
      applyPromo,
    });
    if (!r.ok) {
      return {
        ok: false,
        code: r.code ?? "credits_error",
        balance: r.balance,
        required: r.required,
      };
    }
    return { ok: true };
  }

  const targetType = input.kind === "reseller" ? "SRSLR" : "RSLR";
  const r = await repo.adjustHierarchyCredits({
    targetUsername: input.targetUsername,
    targetType,
    operation: "ADD",
    credits,
    operatorUsername: input.operatorUsername,
    portal: hierarchyPortal,
    applyPromo,
  });
  if (!r.ok) {
    return {
      ok: false,
      code: r.code ?? "credits_error",
      balance: r.balance,
      required: r.required,
    };
  }
  return { ok: true };
}

export async function rollbackStaffCreate(input: {
  portal: StaffCreatePortal;
  kind: StaffCreateKind;
  targetUsername: string;
  ownerUsername: string;
}): Promise<void> {
  const username = input.targetUsername.trim();
  if (!username) return;

  if (input.portal === "admin") {
    if (input.kind === "manager") await repo.deleteAdminManager(username);
    else if (input.kind === "reseller") await repo.deleteAdminReseller(username);
    else await repo.deleteAdminDealer(username);
    return;
  }

  if (input.portal === "manager") {
    const mgr = input.ownerUsername.trim();
    if (!mgr) return;
    if (input.kind === "reseller") await managerPortal.deleteResellerOwnedByManager(mgr, username);
    else await managerPortal.deleteDealerOwnedByManager(mgr, username);
    return;
  }

  const reseller = input.ownerUsername.trim();
  if (reseller) await resellerPortal.deleteDealerOwnedByReseller(reseller, username);
}
