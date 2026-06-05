"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowUpRight, HandCoins, Mail, MoreVertical, Pencil, Power, Repeat } from "lucide-react";
import { toast } from "sonner";
import { openAutoRenewConfigureOrWarn } from "@/lib/client/openAutoRenewConfigureOrWarn";
import { operatorCopy } from "@/lib/operatorUiCopy";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import {
  floatingRowActionMenuDividerClass,
  floatingRowActionMenuIconClass,
  floatingRowActionMenuInlineButtonClass,
  floatingRowActionMenuItemClass,
  floatingRowActionMenuLinkClass,
  floatingRowActionMenuSubsectionClass,
  floatingRowActionMenuSubsectionLabelClass,
  tableRowActionsTriggerBorderedClass,
} from "@/lib/ui/floatingActionMenu";
import { ResetStalkerDeviceBindingsForm } from "@/components/admin/ResetStalkerDeviceBindingsForm";
import { AdminDeleteEndUserAccountForm } from "@/components/admin/AdminDeleteEndUserAccountForm";
import { SubscriberRenewAccountModal } from "@/components/subscribers/SubscriberRenewAccountModal";
import { SubscriberSetAutoRenewModal } from "@/components/subscribers/SubscriberSetAutoRenewModal";
import {
  deleteOperatorEndUserAccountAction,
  getPortalAccountRenewRecoveryAvailabilityAction,
  renewPortalSubscriberAccountAction,
  rebootPortalAccountDeviceAction,
  resetOperatorEndUserStalkerDevicesAction,
  setPortalSubscriberAutoRenewAction,
  setManagerUserStatusQuickAction,
  setResellerEndUserStatusQuickAction,
} from "@/actions/forms";
import { invalidateAfterEndUserMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { InlineConfirmAction } from "@/components/ui/InlineConfirmAction";
import { HudRowActionConfirmModal } from "@/components/ui/HudRowActionConfirmModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PortalBase = "/manager" | "/reseller" | "/dealer";
type Variant = "manager" | "reseller" | "dealer";

/** Row ⋮ menu aligned with `AdminSubscriberRowActions` (Root), using portal routes and actions. */
export function PortalSubscriberRowActions({
  account,
  displayName,
  portalBase,
  listReturnPath,
  subscriptionExpired,
  variant,
  rowStatus,
  expired,
  resellerStatusQuickActions,
  validityOptions,
}: {
  account: string;
  displayName?: string | null;
  portalBase: PortalBase;
  listReturnPath: string;
  subscriptionExpired: boolean;
  variant: Variant;
  rowStatus: number;
  expired: boolean;
  resellerStatusQuickActions: boolean;
  validityOptions: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [autoRenewOpen, setAutoRenewOpen] = useState(false);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [rebootPending, startRebootTransition] = useTransition();
  const anchorRef = useRef<HTMLDivElement>(null);

  const editHref = `${portalBase}/users/${encodeURIComponent(account)}?list=${encodeURIComponent(listReturnPath)}`;
  const managerCanToggle = variant === "manager" && !expired;
  const resellerCanToggle = variant === "reseller" && resellerStatusQuickActions && !expired;
  const showDelete = variant === "manager" || subscriptionExpired;

  function runRebootDevice() {
    startRebootTransition(async () => {
      const res = await rebootPortalAccountDeviceAction(account);
      if (!res.ok) {
        if (res.error === "reboot_no_account") toast.error("Account not found.");
        else if (res.error === "reboot_no_stalker") toast.error(operatorCopy.deviceRebootNoService);
        else if (res.error === "reboot_no_row") toast.error(operatorCopy.deviceRebootNoProfile);
        else if (res.error === "reboot_no_events") toast.error(operatorCopy.deviceRebootNoEvents);
        else if (res.error === "reboot_db") toast.error(operatorCopy.deviceRebootFailed);
        else if (res.error === "forbidden") toast.error("That action is not allowed for your role.");
        else toast.error("Reboot failed.");
        return;
      }
      setRebootOpen(false);
      toast.success(operatorCopy.deviceRebootSuccess);
    });
  }

  return (
    <>
      <div ref={anchorRef} className="inline-flex justify-center">
        <button
          type="button"
          className={tableRowActionsTriggerBorderedClass}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Actions for ${account}`}
          onClick={() => setOpen((o) => !o)}
        >
          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <FloatingMenuPortal open={open} onOpenChange={setOpen} anchorRef={anchorRef}>
          <div onClick={(e) => e.stopPropagation()}>
            <Link
              href={editHref}
              className={floatingRowActionMenuLinkClass}
              onClick={() => setOpen(false)}
            >
              <Pencil className={floatingRowActionMenuIconClass} />
              Edit
            </Link>
            <button
              type="button"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                setRenewOpen(true);
              }}
            >
              <HandCoins className={floatingRowActionMenuIconClass} />
              Renew
            </button>
            <button
              type="button"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                openAutoRenewConfigureOrWarn({
                  subscriptionExpired,
                  accountActive: rowStatus === 0,
                  onOpen: () => setAutoRenewOpen(true),
                });
              }}
            >
              <Repeat className={floatingRowActionMenuIconClass} />
              Auto renew
            </button>
            <Link
              href={`${portalBase}/message?account=${encodeURIComponent(account)}`}
              className={floatingRowActionMenuLinkClass}
              onClick={() => setOpen(false)}
            >
              <Mail className={floatingRowActionMenuIconClass} />
              Send message
            </Link>

            {variant === "manager" && !expired ? (
              <div className={floatingRowActionMenuSubsectionClass}>
                <p className={floatingRowActionMenuSubsectionLabelClass}>Status</p>
                <div className="flex flex-col gap-1">
                  <InlineConfirmAction
                    action={setManagerUserStatusQuickAction}
                    title="Activate STB?"
                    description="Set this STB box to ACTIVE?"
                    confirmLabel="Activate"
                    confirmVariant="default"
                    className="block w-full"
                    onPanelOpenChange={(o) => o && setOpen(false)}
                    trigger={(onOpen) => (
                      <button
                        type="button"
                        disabled={!managerCanToggle || rowStatus === 0}
                        className={cn(floatingRowActionMenuInlineButtonClass, "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10")}
                        onClick={onOpen}
                      >
                        Activate
                      </button>
                    )}
                  >
                    <input type="hidden" name="account" value={account} />
                    <input type="hidden" name="redirect" value={listReturnPath} />
                    <input type="hidden" name="mode" value="activate" />
                  </InlineConfirmAction>
                  <InlineConfirmAction
                    action={setManagerUserStatusQuickAction}
                    title="Deactivate STB?"
                    description="Set this STB box to INACTIVE?"
                    confirmLabel="Deactivate"
                    className="block w-full"
                    onPanelOpenChange={(o) => o && setOpen(false)}
                    trigger={(onOpen) => (
                      <button
                        type="button"
                        disabled={!managerCanToggle || rowStatus === 1}
                        className={cn(
                          floatingRowActionMenuInlineButtonClass,
                          "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
                        )}
                        onClick={onOpen}
                      >
                        Deactivate
                      </button>
                    )}
                  >
                    <input type="hidden" name="account" value={account} />
                    <input type="hidden" name="redirect" value={listReturnPath} />
                    <input type="hidden" name="mode" value="block" />
                  </InlineConfirmAction>
                </div>
              </div>
            ) : null}

            {resellerCanToggle ? (
              <div className={floatingRowActionMenuSubsectionClass}>
                <p className={floatingRowActionMenuSubsectionLabelClass}>STB</p>
                <div className="flex flex-col gap-1">
                  <InlineConfirmAction
                    action={setResellerEndUserStatusQuickAction}
                    title="Turn STB on?"
                    description="Set this STB box to ACTIVE?"
                    confirmLabel="On"
                    confirmVariant="default"
                    className="block w-full"
                    onPanelOpenChange={(o) => o && setOpen(false)}
                    trigger={(onOpen) => (
                      <button
                        type="button"
                        disabled={rowStatus === 0}
                        className={cn(floatingRowActionMenuInlineButtonClass, "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10")}
                        onClick={onOpen}
                      >
                        On
                      </button>
                    )}
                  >
                    <input type="hidden" name="account" value={account} />
                    <input type="hidden" name="redirect" value={listReturnPath} />
                    <input type="hidden" name="mode" value="activate" />
                  </InlineConfirmAction>
                  <InlineConfirmAction
                    action={setResellerEndUserStatusQuickAction}
                    title="Turn STB off?"
                    description="Set this STB box to INACTIVE?"
                    confirmLabel="Off"
                    className="block w-full"
                    onPanelOpenChange={(o) => o && setOpen(false)}
                    trigger={(onOpen) => (
                      <button
                        type="button"
                        disabled={rowStatus === 1}
                        className={cn(
                          floatingRowActionMenuInlineButtonClass,
                          "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
                        )}
                        onClick={onOpen}
                      >
                        Off
                      </button>
                    )}
                  >
                    <input type="hidden" name="account" value={account} />
                    <input type="hidden" name="redirect" value={listReturnPath} />
                    <input type="hidden" name="mode" value="block" />
                  </InlineConfirmAction>
                </div>
              </div>
            ) : null}

            <div className={floatingRowActionMenuDividerClass}>
              <ResetStalkerDeviceBindingsForm
                account={account}
                redirectPath={listReturnPath}
                label="Reset device"
                action={resetOperatorEndUserStalkerDevicesAction}
                menuItem
                onPanelOpenChange={(o) => o && setOpen(false)}
              />
              <button
                type="button"
                role="menuitem"
                className={floatingRowActionMenuItemClass}
                onClick={() => {
                  setOpen(false);
                  setRebootOpen(true);
                }}
              >
                <Power className={floatingRowActionMenuIconClass} aria-hidden />
                Reboot device
              </button>
            </div>

            {showDelete ? (
              <div className="border-t border-border/50">
                <AdminDeleteEndUserAccountForm
                  account={account}
                  redirectPath={listReturnPath}
                  subscriptionExpired={subscriptionExpired}
                  compact
                  menuItem
                  action={deleteOperatorEndUserAccountAction}
                  buttonLabel="Delete"
                  onPanelOpenChange={(o) => o && setOpen(false)}
                />
              </div>
            ) : null}
          </div>
        </FloatingMenuPortal>
      </div>
      {renewOpen ? (
      <SubscriberRenewAccountModal
        account={account}
        displayName={displayName}
        open
        onClose={() => setRenewOpen(false)}
        onAfterSuccess={() => {
          invalidateAfterEndUserMutation(account);
        }}
        validityOptions={validityOptions}
        loadAvailability={async () => {
          const res = await getPortalAccountRenewRecoveryAvailabilityAction(account);
          if (!res.ok) return null;
          return res;
        }}
        onSubmit={async (validity) => {
          const res = await renewPortalSubscriberAccountAction({
            account,
            validity,
            autoRenewEnabled: false,
            autoRenewTotalCycles: 0,
          });
          if (!res.ok) return { ok: false, message: res.message };
          invalidateAfterEndUserMutation(account);
          return { ok: true };
        }}
      />
      ) : null}
      {autoRenewOpen ? (
        <SubscriberSetAutoRenewModal
          account={account}
          displayName={displayName}
          accountActive={rowStatus === 0}
          open
          onClose={() => setAutoRenewOpen(false)}
          validityOptions={validityOptions}
          loadAvailability={async () => {
            const res = await getPortalAccountRenewRecoveryAvailabilityAction(account);
            if (!res.ok) return null;
            return res;
          }}
          onSubmit={async (period) => {
            const res = await setPortalSubscriberAutoRenewAction({ account, period });
            if (!res.ok) return { ok: false, message: res.message };
            invalidateAfterEndUserMutation(account);
            return { ok: true };
          }}
        />
      ) : null}
      {rebootOpen ? (
        <HudRowActionConfirmModal
          open
          onClose={() => setRebootOpen(false)}
          kicker="Reboot"
          title="Reboot set-top box?"
          footer={
            <div className="flex items-center justify-between gap-3 border-t border-cyan-600/15 px-4 py-2.5 sm:px-5 dark:border-cyan-400/10">
              <Button
                type="button"
                variant="ctaLinkMuted"
                size="inline"
                className="text-sm"
                onClick={() => setRebootOpen(false)}
                disabled={rebootPending}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="ctaLink"
                size="inline"
                className="gap-1 text-sm"
                onClick={runRebootDevice}
                disabled={rebootPending}
              >
                {rebootPending ? "Working…" : "Reboot device"}
                {!rebootPending ? <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
              </Button>
            </div>
          }
        >
          Queue a remote restart for account <span className="font-semibold text-foreground">{account}</span>. Device
          bindings stay unchanged.
        </HudRowActionConfirmModal>
      ) : null}
    </>
  );
}
