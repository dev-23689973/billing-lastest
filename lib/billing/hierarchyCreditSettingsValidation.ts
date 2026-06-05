/** Configurable global add-credit ceiling (Settings → Billing). */
export const HIERARCHY_GLOBAL_ADD_CREDIT_MAX = 1_000_000;

export type BillingCreditLimitsValidation =
  | {
      ok: true;
      globalMax: number;
      managerMin: number;
      resellerMin: number;
      dealerMin: number;
    }
  | { ok: false; fieldId: string; message: string };

function parseLimit(raw: FormDataEntryValue | null): number {
  return Math.floor(Number.parseInt(String(raw ?? "").trim(), 10));
}

export function validateBillingCreditLimitsForm(form: HTMLFormElement): BillingCreditLimitsValidation {
  const fd = new FormData(form);
  const globalMax = parseLimit(fd.get("hierarchy_add_credit_max"));
  if (!Number.isFinite(globalMax) || globalMax < 1 || globalMax > HIERARCHY_GLOBAL_ADD_CREDIT_MAX) {
    return {
      ok: false,
      fieldId: "hierarchy_add_credit_max",
      message: `Enter a whole number from 1 to ${HIERARCHY_GLOBAL_ADD_CREDIT_MAX.toLocaleString("en-US")}.`,
    };
  }

  const managerMin = parseLimit(fd.get("limit_manager_credit"));
  if (!Number.isFinite(managerMin) || managerMin < 1 || managerMin > globalMax) {
    return {
      ok: false,
      fieldId: "limit_manager_credit",
      message: `Manager minimum must be from 1 to ${globalMax.toLocaleString("en-US")}.`,
    };
  }

  const resellerMin = parseLimit(fd.get("limit_reseller_credit"));
  if (!Number.isFinite(resellerMin) || resellerMin < 1 || resellerMin > globalMax) {
    return {
      ok: false,
      fieldId: "limit_reseller_credit",
      message: `Reseller minimum must be from 1 to ${globalMax.toLocaleString("en-US")}.`,
    };
  }

  const dealerMin = parseLimit(fd.get("limit_dealer_credit"));
  if (!Number.isFinite(dealerMin) || dealerMin < 1 || dealerMin > globalMax) {
    return {
      ok: false,
      fieldId: "limit_dealer_credit",
      message: `Dealer minimum must be from 1 to ${globalMax.toLocaleString("en-US")}.`,
    };
  }

  return { ok: true, globalMax, managerMin, resellerMin, dealerMin };
}

export function validateBillingCreditLimitsValues(
  hierarchyAddMax: number,
  limitManager: number,
  limitReseller: number,
  limitDealer: number,
): boolean {
  const globalMax = Math.floor(hierarchyAddMax);
  const manager = Math.floor(limitManager);
  const reseller = Math.floor(limitReseller);
  const dealer = Math.floor(limitDealer);
  if (!Number.isFinite(globalMax) || globalMax < 1 || globalMax > HIERARCHY_GLOBAL_ADD_CREDIT_MAX) return false;
  if (!Number.isFinite(manager) || manager < 1 || manager > globalMax) return false;
  if (!Number.isFinite(reseller) || reseller < 1 || reseller > globalMax) return false;
  if (!Number.isFinite(dealer) || dealer < 1 || dealer > globalMax) return false;
  return true;
}
