"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Save, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { billingToast, toastAfterModalClose } from "@/lib/client/billingToast";
import type { PortalAddUserResult } from "@/actions/forms";
import {
  createUserAction,
  getAddUserDebitWalletCreditsAction,
  loadDealersForResellerAction,
  saveUserAction,
} from "@/actions/forms";
import {
  AdminAddUserBillingOwnership,
  type AddUserOwnershipSelection,
} from "@/components/admin/AdminAddUserBillingOwnership";
import {
  clampValiditySelection,
  filterCreateValidityOptionsByDebitCredits,
  isValidityBonusOption,
  validityBonusOptionTextClass,
} from "@/lib/validityOptions";
import { EndUserTariffAndCustomAddons } from "@/components/portal/EndUserTariffAndCustomAddons";
import { FormField } from "@/components/forms/form-field";
import { MacAddressInputWithRefresh } from "@/components/forms/MacAddressInputWithRefresh";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/forms/form-select";
import { EndUserCreateCredentialFields } from "@/components/forms/EndUserCreateCredentialFields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  managersToolbarDropdownPanelClass,
  adminHudModalBackdropPerfClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalOpaqueShellClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
  staffDetailsOverlayShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { invalidateAfterEndUserMutation } from "@/lib/client/invalidateAfterBillingMutation";
import {
  CUSTOM_PACKAGE_SELECTION_MESSAGE,
  customPackageSelectionMessage,
  parseAddonPackIdsFromForm,
} from "@/lib/endUserCustomPackageValidation";
import { cn } from "@/lib/cn";

type ResellerOpt = { username: string; name: string };
type ManagerOpt = { username: string; name: string };
type TariffOpt = { id: number; name: string };
type ValidityOpt = { value: string; label: string };
type AddonPkg = { package_id: number; name: string };

const STATUS_OPTIONS = [
  { value: "0", label: "Active" },
  { value: "1", label: "Inactive" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  managers?: ManagerOpt[];
  resellers: ResellerOpt[];
  tariffs: TariffOpt[];
  validityOptions: ValidityOpt[];
  customPlanId: number | null;
  addonPackages: AddonPkg[];
  mode?: "add" | "edit";
  /**
   * Which ownership selectors to show in the modal.
   * - admin/manager: pick reseller (required) + optional dealer
   * - reseller: pick optional dealer only (reseller is implied by session)
   * - dealer: no ownership selects (fully implied by session)
   */
  billingOwnershipRole?: "admin" | "manager" | "reseller" | "dealer";
  initialValues?: {
    account?: string;
    name?: string;
    password?: string;
    mac?: string;
    ip?: string;
    phone?: string;
    status?: number;
    reseller?: string;
    dealer?: string;
    packageId?: number;
    subscribedPackageIds?: number[];
    parentPin?: string;
    note?: string;
  };
  returnTo?: string;
  createAction?: (formData: FormData) => Promise<void>;
  /**
   * Optional "no redirect" create action used by portal list modals.
   * When provided, we submit client-side to prevent navigation blink on failure.
   */
  createResultAction?: (formData: FormData) => Promise<PortalAddUserResult>;
  saveAction?: (formData: FormData) => Promise<void>;
  loadDealersAction?: (resellerUsername: string) => Promise<Array<{ username: string; name: string }>>;
  /** Dealer portal — subscribers are always billed under the signed-in dealer. */
  hideBillingOwnership?: boolean;
};

export function AdminAddUserModal({
  open,
  onClose,
  managers = [],
  resellers,
  tariffs,
  validityOptions,
  customPlanId,
  addonPackages,
  mode = "add",
  billingOwnershipRole = "admin",
  initialValues,
  returnTo = "/admin/users",
  createAction = createUserAction,
  createResultAction,
  saveAction = saveUserAction,
  loadDealersAction = loadDealersForResellerAction,
  hideBillingOwnership = false,
}: Props) {
  const router = useRouter();
  const noTariffs = tariffs.length === 0;
  const fieldGrid = "grid min-w-0 grid-cols-1 gap-1.5 text-left";
  const topSectionsGrid = "grid min-w-0 grid-cols-1 gap-1.5 text-left sm:grid-cols-2";
  const sectionShell = cn(managersToolbarModalInsetPanelClass, "min-w-0 p-2 text-left");
  const sectionTitleClass = "mb-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const rowFieldClass = "min-w-0 justify-items-stretch gap-x-1.5 !grid-cols-[6.5rem_minmax(0,1fr)]";
  const modalControlClass = "w-full text-left";
  const modalSelectTriggerClass = cn(
    managersToolbarSelectTriggerClass,
    modalControlClass,
    "[&>span]:text-left",
  );
  // Modal overlay uses z-[320]; ensure Radix select panels render above it.
  const modalSelectPanelClass = cn(managersToolbarDropdownPanelClass, "!z-[450]");
  const modalSelectItemClass = cn(
    managersToolbarSelectItemClass,
    "whitespace-normal py-1.5 leading-snug",
  );

  const [ownership, setOwnership] = useState<AddUserOwnershipSelection>({
    manager: "",
    reseller: initialValues?.reseller ?? "",
    dealer: initialValues?.dealer ?? "",
  });
  const [debitWallet, setDebitWallet] = useState<{ username: string; credits: number } | null>(null);
  const [loadingDebitWallet, setLoadingDebitWallet] = useState(false);
  const [validityValue, setValidityValue] = useState("1");
  const [customPackageNeedsSelection, setCustomPackageNeedsSelection] = useState(false);
  const ownershipFetchIdRef = useRef(0);

  const filteredValidityOptions = useMemo(() => {
    if (mode !== "add") return validityOptions;
    return filterCreateValidityOptionsByDebitCredits(validityOptions, debitWallet?.credits);
  }, [debitWallet?.credits, mode, validityOptions]);

  const validitySelectOptions = useMemo(
    () => filteredValidityOptions.map((o) => ({ value: o.value, label: o.label })),
    [filteredValidityOptions],
  );

  const validityBonusByValue = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const o of filteredValidityOptions) {
      map.set(o.value, isValidityBonusOption(o));
    }
    return map;
  }, [filteredValidityOptions]);

  const validityHint = useMemo(() => {
    if (mode !== "add") return undefined;
    if (loadingDebitWallet) return "Loading credits for billing owner…";
    if (!debitWallet) {
      return hideBillingOwnership
        ? "Loading billing wallet…"
        : billingOwnershipRole === "admin"
          ? "Select a manager (and optional reseller/dealer) to see affordable validity periods."
          : "Select billing ownership to see affordable validity periods.";
    }
    const n = Math.max(0, Math.floor(debitWallet.credits));
    return `Validity options for ${debitWallet.username} (${n} credit${n === 1 ? "" : "s"} available). Credits debit the dealer if selected, otherwise the reseller, otherwise the manager.`;
  }, [billingOwnershipRole, debitWallet, hideBillingOwnership, loadingDebitWallet, mode]);

  const refreshDebitWallet = useCallback(async (next: AddUserOwnershipSelection) => {
    const fetchId = ++ownershipFetchIdRef.current;
    setLoadingDebitWallet(true);
    try {
      const r = await getAddUserDebitWalletCreditsAction(next);
      if (fetchId !== ownershipFetchIdRef.current) return;
      if (!r.ok) {
        setDebitWallet(null);
        return;
      }
      setDebitWallet({ username: r.debitUsername, credits: r.debitCredits });
    } finally {
      if (fetchId === ownershipFetchIdRef.current) setLoadingDebitWallet(false);
    }
  }, []);

  const onOwnershipChange = useCallback(
    (next: AddUserOwnershipSelection) => {
      setOwnership(next);
      void refreshDebitWallet(next);
    },
    [refreshDebitWallet],
  );

  useEffect(() => {
    if (!open || mode !== "add") return;
    setValidityValue("1");
    setOwnership({
      manager: "",
      reseller: initialValues?.reseller ?? "",
      dealer: initialValues?.dealer ?? "",
    });
    if (hideBillingOwnership) {
      void refreshDebitWallet({ manager: "", reseller: "", dealer: "" });
    } else {
      setDebitWallet(null);
    }
  }, [hideBillingOwnership, initialValues?.dealer, initialValues?.reseller, mode, open, refreshDebitWallet]);

  useEffect(() => {
    if (mode !== "add") return;
    setValidityValue((prev) => clampValiditySelection(prev, filteredValidityOptions));
  }, [filteredValidityOptions, mode]);

  const editPlanId = mode === "edit" ? (initialValues?.packageId ?? null) : null;
  const editPackIds = mode === "edit" ? (initialValues?.subscribedPackageIds ?? []) : [];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={staffDetailsOverlayShellClass} role="presentation">
      <button
        type="button"
        className={cn("absolute inset-0", adminHudModalBackdropPerfClass)}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex min-h-0 max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden",
          managersToolbarModalOpaqueShellClass,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit user" : "Add user"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-modal-opaque-panel relative z-[1] flex min-h-0 w-full min-w-0 max-h-[inherit] flex-1 flex-col overflow-hidden rounded-[inherit] bg-white dark:bg-[hsl(222_47%_6%/0.94)]">
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 px-3.5 py-2 dark:border-b-cyan-400/10 sm:px-4 sm:py-2.5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">{mode === "edit" ? "Edit user" : "Add user"}</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {mode === "edit"
                  ? `Update account: ${initialValues?.account ?? ""}`
                  : "Create a new account without leaving this page."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <form
            action={mode === "edit" ? saveAction : createAction}
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden text-left"
            onSubmit={(e) => {
              if (mode !== "add") return;
              const form = e.currentTarget;
              const fd = new FormData(form);
              const packageMsg = customPackageSelectionMessage(
                customPlanId,
                Number.parseInt(String(fd.get("package") ?? ""), 10),
                parseAddonPackIdsFromForm(fd),
              );
              if (packageMsg) {
                e.preventDefault();
                billingToast.error(packageMsg);
                return;
              }
              if (validitySelectOptions.length === 0) {
                e.preventDefault();
                billingToast.error(
                  hideBillingOwnership
                    ? "No validity period is affordable for this billing wallet."
                    : "Select billing ownership with enough credits for a validity period.",
                );
                return;
              }
              if (!createResultAction) return;
              e.preventDefault();
              void createResultAction(fd).then((r) => {
                if (r.ok) {
                  invalidateAfterEndUserMutation();
                  toastAfterModalClose(onClose, () => {
                    billingToast.success("User created successfully.");
                    router.refresh();
                  });
                  return;
                }
                if (r.code === "insufficient_credits") {
                  const bal = r.balance ?? "?";
                  const req = r.required ?? "?";
                  billingToast.error(
                    `Not enough credits (remaining ${bal}, need ${req}). Credits are taken from the dealer if selected, otherwise the reseller.`,
                  );
                  return;
                }
                if (r.code === "custom_packages_required") {
                  billingToast.error(CUSTOM_PACKAGE_SELECTION_MESSAGE);
                  return;
                }
                billingToast.error(`Could not create user (${r.code}).`);
              });
            }}
          >
          <input type="hidden" name="returnTo" value={returnTo} />
          {mode === "edit" && initialValues?.account ? <input type="hidden" name="account" value={initialValues.account} /> : null}
          <input type="hidden" name="apply_packs" value="1" />
          <div className="thin-scrollbar scrollbar-surface-light dark:scrollbar-surface-dark min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-3 pt-1.5 sm:px-4 sm:pb-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className={topSectionsGrid}>
              <section className={sectionShell}>
                <h3 className={sectionTitleClass}>Account</h3>
                <div className={cn(fieldGrid)}>
                  {mode === "add" ? (
                    <EndUserCreateCredentialFields
                      idPrefix="mu"
                      layout="modal"
                      rowFieldClass={rowFieldClass}
                      controlClassName={modalControlClass}
                    />
                  ) : (
                    <>
                      <FormField id="mu-name" label="Name" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="mu-name"
                          name="name"
                          placeholder=""
                          className={modalControlClass}
                          defaultValue={initialValues?.name ?? ""}
                        />
                      </FormField>
                      <FormField
                        id="mu-username"
                        label="Login (device ID)"
                        hint="Lowercase letters and digits only."
                        density="compact"
                        layout="horizontal"
                        className={rowFieldClass}
                      >
                        <Input
                          id="mu-username"
                          className={cn("font-mono", modalControlClass)}
                          defaultValue={initialValues?.account ?? ""}
                          readOnly
                        />
                      </FormField>
                      <FormField
                        id="mu-password"
                        label="Password"
                        hint="Minimum 4 characters."
                        density="compact"
                        layout="horizontal"
                        className={rowFieldClass}
                      >
                        <Input
                          id="mu-password"
                          name="password"
                          type="text"
                          maxLength={100}
                          className={cn("font-mono", modalControlClass)}
                          placeholder="Leave blank to keep current password"
                        />
                      </FormField>
                    </>
                  )}
                  <FormField id="mu-mac" label="MAC address" density="compact" layout="horizontal" className={rowFieldClass}>
                    <MacAddressInputWithRefresh
                      id="mu-mac"
                      name="mac"
                      required
                      className={cn("font-mono uppercase", modalControlClass)}
                      defaultValue={mode === "edit" ? initialValues?.mac ?? "" : ""}
                      excludeAccount={mode === "edit" ? initialValues?.account : undefined}
                    />
                  </FormField>
                  {mode === "edit" ? (
                    <>
                      <FormField id="mu-ip" label="IP address" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input
                          id="mu-ip"
                          name="ip"
                          className={cn("font-mono", modalControlClass)}
                          defaultValue={initialValues?.ip ?? ""}
                          placeholder="e.g. 192.168.1.10"
                        />
                      </FormField>
                      <FormField id="mu-phone" label="Phone" density="compact" layout="horizontal" className={rowFieldClass}>
                        <Input id="mu-phone" name="phone" className={modalControlClass} defaultValue={initialValues?.phone ?? ""} />
                      </FormField>
                    </>
                  ) : null}
                </div>
              </section>

              <div className="flex min-w-0 flex-col gap-1.5">
                {!hideBillingOwnership ? (
                  <AdminAddUserBillingOwnership
                    managers={managers}
                    resellers={resellers}
                    initialReseller={initialValues?.reseller ?? ""}
                    initialDealer={initialValues?.dealer ?? ""}
                    loadDealersAction={loadDealersAction}
                    role={billingOwnershipRole}
                    onOwnershipChange={onOwnershipChange}
                    sectionShell={sectionShell}
                    sectionTitleClass={sectionTitleClass}
                    fieldGrid={fieldGrid}
                    rowFieldClass={rowFieldClass}
                    modalControlClass={modalControlClass}
                  />
                ) : null}

                <section className={sectionShell}>
                  <h3 className={sectionTitleClass}>Subscription</h3>
                  <div className={cn(fieldGrid)}>
                    {mode === "edit" ? (
                      <FormField
                        id="mu-parent-pin"
                        label="Parent PIN"
                        density="compact"
                        layout="horizontal"
                        className={rowFieldClass}
                      >
                        <Input
                          id="mu-parent-pin"
                          name="parent_password"
                          className={cn("font-mono", modalControlClass)}
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          maxLength={4}
                          defaultValue={initialValues?.parentPin || "9090"}
                          placeholder="Leave blank to keep current PIN"
                        />
                      </FormField>
                    ) : null}

                    <FormField id="mu-status" label="Status" density="compact" layout="horizontal" className={rowFieldClass}>
                      <FormSelect
                        id="mu-status"
                        name="status"
                        defaultValue={mode === "edit" ? String(initialValues?.status ?? 0) : "0"}
                        options={[...STATUS_OPTIONS]}
                        className={modalSelectTriggerClass}
                        contentClassName={modalSelectPanelClass}
                        itemClassName={modalSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                    </FormField>

                    {mode === "add" ? (
                      <FormField
                        id="mu-validity"
                        label="Validity"
                        hint={validityHint}
                        density="compact"
                        layout="horizontal"
                        className={rowFieldClass}
                      >
                        <FormSelect
                          id="mu-validity"
                          name="validity"
                          required
                          value={validityValue}
                          onValueChange={setValidityValue}
                          disabled={loadingDebitWallet || validitySelectOptions.length === 0}
                          options={validitySelectOptions}
                          placeholder={
                            loadingDebitWallet
                              ? "Loading…"
                              : validitySelectOptions.length === 0
                                ? "No affordable periods"
                                : "Select validity"
                          }
                          className={modalSelectTriggerClass}
                          contentClassName={modalSelectPanelClass}
                          itemClassName={modalSelectItemClass}
                          getItemClassName={(o) =>
                            validityBonusByValue.get(o.value) ? validityBonusOptionTextClass : undefined
                          }
                          itemShowCheck={false}
                          contentViewportClassName="max-h-[min(16rem,var(--radix-select-content-available-height))]"
                        />
                      </FormField>
                    ) : null}
                  </div>
                </section>

              </div>
            </div>

            <section className={sectionShell}>
              <h3 className={sectionTitleClass}>Subscription package</h3>
              <div className="min-w-0 w-full space-y-1.5">
                <EndUserTariffAndCustomAddons
                  tariffs={tariffs}
                  customPlanId={customPlanId}
                  addonPackages={addonPackages}
                  initialPlanId={editPlanId}
                  initialSelectedPackIds={editPackIds}
                  compact
                  fieldLayout="horizontal"
                  fieldClassName={rowFieldClass}
                  controlClassName={modalControlClass}
                  onSelectionChange={
                    mode === "add"
                      ? (state) => setCustomPackageNeedsSelection(state.needsPackages)
                      : undefined
                  }
                />
              </div>
            </section>

            <section className={sectionShell}>
              <h3 className={sectionTitleClass}>Notes</h3>
              <FormField id="mu-note" label="Comments" density="compact" layout="horizontal" className={rowFieldClass}>
                <Textarea
                  id="mu-note"
                  name="note"
                  rows={2}
                  defaultValue={mode === "edit" ? initialValues?.note ?? "" : undefined}
                  className={cn("min-h-[3.25rem]", modalControlClass)}
                  placeholder="Internal comments..."
                />
              </FormField>
            </section>

          </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-cyan-600/15 bg-inherit px-3 py-2 dark:border-t-cyan-400/10 sm:px-4">
            <Button type="button" variant="ctaLinkMuted" size="inline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="ctaLink"
              size="inline"
              disabled={noTariffs || (mode === "add" && customPackageNeedsSelection)}
              className="gap-1"
            >
              {mode === "edit" ? (
                <>
                  Save changes
                  <Save className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                </>
              ) : (
                <>
                  Create user
                  <UserPlus className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                </>
              )}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
