"use client";

import { operatorCopy } from "@/lib/operatorUiCopy";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { createManagerEndUserAction, loadDealersForManagerResellerAction } from "@/actions/forms";
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

type ResellerOpt = { username: string; name: string };
type TariffOpt = { id: number; name: string };
type ValidityOpt = { value: string; label: string };
type AddonPkg = { package_id: number; name: string };

type Props = {
  resellers: ResellerOpt[];
  tariffs: TariffOpt[];
  validityOptions: ValidityOpt[];
  customPlanId: number | null;
  addonPackages: AddonPkg[];
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{children}</h2>
  );
}

export function ManagerNewUserForm({ resellers, tariffs, validityOptions, customPlanId, addonPackages }: Props) {
  const [dealers, setDealers] = useState<ResellerOpt[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [resellerChosen, setResellerChosen] = useState(false);
  const [activeReseller, setActiveReseller] = useState("");
  const [dealerValue, setDealerValue] = useState("");
  const [customPackageNeedsSelection, setCustomPackageNeedsSelection] = useState(false);

  async function onResellerChange(username: string) {
    if (!username) {
      setDealers([]);
      setResellerChosen(false);
      return;
    }
    setResellerChosen(true);
    setLoadingDealers(true);
    try {
      const d = await loadDealersForManagerResellerAction(username);
      setDealers(d);
    } finally {
      setLoadingDealers(false);
    }
  }

  const noTariffs = tariffs.length === 0;
  const noResellers = resellers.length === 0;
  const grid = "grid gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-4";

  return (
    <div className="mx-auto w-full max-w-5xl">
      {noResellers ? (
        <Alert className="mb-6" variant="default">
          You have no resellers yet. Create a reseller under your manager account before adding end users.
        </Alert>
      ) : null}
      {noTariffs ? (
        <Alert className="mb-6">
          {operatorCopy.packagesUnavailable}
        </Alert>
      ) : null}
      <form
        action={createManagerEndUserAction}
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
        <div className="flex flex-col gap-8 sm:gap-10">
          <section>
            <SectionTitle>Account</SectionTitle>
            <div className={cn(grid)}>
              <EndUserCreateCredentialFields idPrefix="mn" layout="page" />
              <FormField id="mn-mac" label="MAC address">
                <MacAddressInputWithRefresh id="mn-mac" name="mac" required className="font-mono uppercase" />
              </FormField>
            </div>
          </section>

          <section className="border-t border-border/60 pt-8 sm:pt-10">
            <SectionTitle>Subscription</SectionTitle>
            <div className={cn(grid)}>
              <FormField id="mn-validity" label="Validity">
                <FormSelect
                  id="mn-validity"
                  name="validity"
                  required
                  defaultValue="1"
                  options={validityOptions.map((o) => ({ value: o.value, label: o.label }))}
                />
              </FormField>
              <FormField id="mn-status" label="Status">
                <FormSelect
                  id="mn-status"
                  name="status"
                  defaultValue="0"
                  options={[
                    { value: "0", label: "Active" },
                    { value: "1", label: "Inactive" },
                  ]}
                />
              </FormField>
            </div>
          </section>

          <section className="border-t border-border/60 pt-8 sm:pt-10">
            <SectionTitle>Billing ownership</SectionTitle>
            <div className={cn(grid)}>
              <FormField id="mn-reseller" label="Reseller">
                <FormSelect
                  id="mn-reseller"
                  name="reseller"
                  required
                  placeholder="Select reseller"
                  value={activeReseller}
                  onValueChange={(v) => {
                    setActiveReseller(v);
                    setDealerValue("");
                    void onResellerChange(v);
                  }}
                  options={resellers.map((r) => ({
                    value: r.username,
                    label: `${r.username}${r.name && r.name !== r.username ? ` — ${r.name}` : ""}`,
                  }))}
                />
              </FormField>
              <FormField
                id="mn-dealer"
                label="Dealer (optional)"
                hint={loadingDealers ? "Loading dealers…" : "Leave empty to bill only under the reseller."}
              >
                <FormSelect
                  id="mn-dealer"
                  name="dealer"
                  value={dealerValue}
                  onValueChange={setDealerValue}
                  disabled={!resellerChosen || loadingDealers}
                  placeholder={!resellerChosen ? "Select reseller first" : "Select dealer"}
                  options={
                    resellerChosen
                      ? [
                          { value: "", label: "— Bill under reseller only —" },
                          ...dealers.map((d) => ({ value: d.username, label: d.username })),
                        ]
                      : []
                  }
                />
              </FormField>
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
            <Link href="/manager/users" className={buttonOutlineLinkClassName("min-h-11 w-full justify-center sm:w-auto")}>
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={noTariffs || noResellers || customPackageNeedsSelection}
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
