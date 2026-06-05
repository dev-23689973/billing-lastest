"use client";

import { operatorCopy } from "@/lib/operatorUiCopy";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { EndUserTariffAndCustomAddons } from "@/components/portal/EndUserTariffAndCustomAddons";
import { FormField } from "@/components/forms/form-field";
import { MacAddressInputWithRefresh } from "@/components/forms/MacAddressInputWithRefresh";
import { Alert } from "@/components/ui/alert";
import { Button, buttonOutlineLinkClassName } from "@/components/ui/button";
import { FormSelect } from "@/components/forms/form-select";
import { EndUserCreateCredentialFields } from "@/components/forms/EndUserCreateCredentialFields";
import { Input } from "@/components/ui/input";
import { billingToast } from "@/lib/client/billingToast";
import {
  customPackageSelectionMessage,
  parseAddonPackIdsFromForm,
} from "@/lib/endUserCustomPackageValidation";
import { cn } from "@/lib/cn";

type TariffOpt = { id: number; name: string };
type ValidityOpt = { value: string; label: string };
type AddonPkg = { package_id: number; name: string };

type Props = {
  /** Server action from `actions/forms` (dealer / reseller / reseller-dealer). */
  formAction: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  /** Prefix for control ids (avoid collisions if multiple instances). */
  idPrefix: string;
  validityOptions: ValidityOpt[];
  tariffs: TariffOpt[];
  customPlanId: number | null;
  addonPackages: AddonPkg[];
  /** Dealer portal only — maps to `status` in `createDealerEndUserAction`. */
  showStatus?: boolean;
  /** Reseller creating under a dealer — hidden `dealer` field. */
  ownedByDealer?: string;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</h2>
  );
}

export function OperatorNewEndUserForm({
  formAction,
  cancelHref,
  idPrefix,
  validityOptions,
  tariffs,
  customPlanId,
  addonPackages,
  showStatus = false,
  ownedByDealer,
}: Props) {
  const noTariffs = tariffs.length === 0;
  const grid = "grid gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-4";
  const [customPackageNeedsSelection, setCustomPackageNeedsSelection] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {noTariffs ? (
        <Alert className="mb-6">
          {operatorCopy.packagesUnavailable}
        </Alert>
      ) : null}
      <form
        action={formAction}
        className="w-full"
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          const msg = customPackageSelectionMessage(
            customPlanId,
            Number.parseInt(String(fd.get("package") ?? ""), 10),
            parseAddonPackIdsFromForm(fd),
          );
          if (msg) {
            e.preventDefault();
            billingToast.error(msg);
          }
        }}
      >
        {ownedByDealer ? <input type="hidden" name="dealer" value={ownedByDealer} /> : null}
        <div className="flex flex-col gap-8 sm:gap-10">
          <section>
            <SectionTitle>Account</SectionTitle>
            <div className={cn(grid)}>
              <EndUserCreateCredentialFields idPrefix={idPrefix} layout="page" />
              <FormField id={`${idPrefix}-mac`} label="MAC address">
                <MacAddressInputWithRefresh
                  id={`${idPrefix}-mac`}
                  name="mac"
                  required
                  className="font-mono uppercase"
                />
              </FormField>
            </div>
          </section>

          <section className="border-t border-border/60 pt-8 sm:pt-10">
            <SectionTitle>Subscription</SectionTitle>
            <div className={cn(grid, !showStatus && "md:max-w-md")}>
              <FormField id={`${idPrefix}-validity`} label="Validity">
                <FormSelect
                  id={`${idPrefix}-validity`}
                  name="validity"
                  required
                  defaultValue="1"
                  options={validityOptions.map((o) => ({ value: o.value, label: o.label }))}
                />
              </FormField>
              {showStatus ? (
                <FormField id={`${idPrefix}-status`} label="Status">
                  <FormSelect
                    id={`${idPrefix}-status`}
                    name="status"
                    defaultValue="0"
                    options={[
                      { value: "0", label: "Active" },
                      { value: "1", label: "Inactive" },
                    ]}
                  />
                </FormField>
              ) : null}
            </div>
          </section>

          <section className="border-t border-border/60 pt-8 sm:pt-10">
            <SectionTitle>Subscription package</SectionTitle>
            <div className="max-w-2xl space-y-4">
              <EndUserTariffAndCustomAddons
                tariffs={tariffs}
                customPlanId={customPlanId}
                addonPackages={addonPackages}
                onSelectionChange={(state) => setCustomPackageNeedsSelection(state.needsPackages)}
              />
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Link href={cancelHref} className={buttonOutlineLinkClassName("min-h-11 w-full justify-center sm:w-auto")}>
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={noTariffs || customPackageNeedsSelection}
              className="min-h-11 w-full px-8 font-semibold sm:w-auto"
            >
              Create user
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
