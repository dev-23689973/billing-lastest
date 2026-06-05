/** Parse `packs` hidden inputs from add/edit user forms. */
export function parseAddonPackIdsFromForm(formData: FormData): number[] {
  const ids: number[] = [];
  for (const v of formData.getAll("packs")) {
    const n = Math.floor(Number(String(v)));
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  return [...new Set(ids)];
}

export function isCustomTariffPlan(customPlanId: number | null, tariffPlanId: number): boolean {
  return customPlanId != null && Number.isFinite(tariffPlanId) && tariffPlanId === customPlanId;
}

export function isCustomPackageSelectionIncomplete(
  customPlanId: number | null,
  tariffPlanId: number,
  selectedPackCount: number,
): boolean {
  return isCustomTariffPlan(customPlanId, tariffPlanId) && selectedPackCount < 1;
}

export const CUSTOM_PACKAGE_SELECTION_MESSAGE =
  "Select at least one package when Custom Package is chosen.";

export function customPackageSelectionMessage(
  customPlanId: number | null,
  tariffPlanId: number,
  packIds: number[],
): string | null {
  return isCustomPackageSelectionIncomplete(customPlanId, tariffPlanId, packIds.length)
    ? CUSTOM_PACKAGE_SELECTION_MESSAGE
    : null;
}
