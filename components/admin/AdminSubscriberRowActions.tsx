"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Eye, HandCoins, Mail, MoreVertical, Pencil, Power, ReceiptText, Repeat, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { operatorCopy } from "@/lib/operatorUiCopy";
import {
  bulkDeleteAccountsAction,
  bulkDeletePortalAccountsAction,
  bulkSendAccountsMessageAction,
  bulkSendPortalAccountsMessageAction,
  getAccountRenewRecoveryAvailabilityAction,
  getPortalAccountRenewRecoveryAvailabilityAction,
  resetAccountDeviceBindingsAction,
  resetPortalAccountDeviceBindingsAction,
  rebootAccountDeviceAction,
  rebootPortalAccountDeviceAction,
  recoverAccountCreditsAction,
  recoverPortalAccountCreditsAction,
  setSubscriberAutoRenewAction,
  setPortalSubscriberAutoRenewAction,
  renewSubscriberAccountAction,
  renewPortalSubscriberAccountAction,
  createDealerEndUserFromListAction,
  createManagerEndUserAction,
  createResellerEndUserFromListAction,
  loadDealersForManagerResellerAction,
  loadDealersForResellerPortalAction,
  saveDealerUserFromListAction,
  saveManagerUserFromListAction,
  saveResellerUserFromListAction,
} from "@/actions/forms";
import { loadEndUserDetailsModalAction } from "@/actions/modalData";
import { cachedDataLoad, dataCacheKey, DATA_CACHE_NS } from "@/lib/client/dataCache";
import { invalidateAfterEndUserMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { apiBaseToModalScope } from "@/lib/modalScope";
import type { SubscribersTablePortal } from "@/lib/subscribersPortalTable";
import { ADMIN_SUBSCRIBERS_PORTAL } from "@/lib/subscribersPortalTable";
import { BulkRenewValiditySelect } from "@/components/admin/BulkRenewValiditySelect";
import { AdminSendMessageModal } from "@/components/admin/AdminSendMessageModal";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import {
  floatingRowActionMenuDividerClass,
  floatingRowActionMenuIconClass,
  floatingRowActionMenuItemClass,
  floatingRowActionMenuItemDestructiveClass,
} from "@/lib/ui/floatingActionMenu";
import { AdminAddUserModal } from "@/components/admin/AdminAddUserModal";
import { RecoverCreditsModal } from "@/components/subscribers/RecoverCreditsModal";
import { SubscriberRenewRecoverSuccessModal } from "@/components/subscribers/SubscriberRenewRecoverSuccessModal";
import { SubscriberRenewAccountModal } from "@/components/subscribers/SubscriberRenewAccountModal";
import { SubscriberSetAutoRenewModal } from "@/components/subscribers/SubscriberSetAutoRenewModal";
import { HudRowActionConfirmModal } from "@/components/ui/HudRowActionConfirmModal";
import { Button } from "@/components/ui/button";
import { applyRecoverToExpiry, buildRecoverMonthOptions } from "@/lib/billing/subscriberRecoverPools";
import { clampValiditySelection } from "@/lib/validityOptions";
import { dispatchBillingHeaderStatsRefresh } from "@/lib/realtime/client-events";
import {
  buildSubscriberRecoverSuccessDetails,
  type SubscriberRenewRecoverSuccessDetails,
} from "@/lib/subscriberRenewRecoverSuccess";

export function AdminSubscriberRowActions({
  account,
  displayName,
  resetReturnPath,
  subscriptionExpired,
  validityOptions,
  recoverBonusEnabled = true,
  subscribersPortal = ADMIN_SUBSCRIBERS_PORTAL,
  openEditOnMount = false,
  hideMenuTrigger = false,
  editModalData,
  initialEditData,
  onViewDetail,
  onViewTransactions,
  onEditClosed,
}: {
  account: string;
  displayName?: string | null;
  resetReturnPath: string;
  subscriptionExpired: boolean;
  validityOptions: Array<{ value: string; label: string }>;
  recoverBonusEnabled?: boolean;
  subscribersPortal?: SubscribersTablePortal;
  openEditOnMount?: boolean;
  /** Render modals only (e.g. opened from detail view) — no ⋮ menu button. */
  hideMenuTrigger?: boolean;
  editModalData?: {
    resellers: Array<{ username: string; name: string }>;
    tariffs: Array<{ id: number; name: string }>;
    customPlanId: number | null;
    addonPackages: Array<{ package_id: number; name: string }>;
  };
  /** Skip end-user details fetch when parent already loaded profile (e.g. detail modal). */
  initialEditData?: {
    name: string;
    mac: string;
    ip: string;
    phone: string;
    comments: string;
    statusCode: number;
    reseller: string;
    dealer: string;
    tariffPlanId: number;
    subscribedPackageIds: number[];
  };
  onViewDetail?: () => void;
  onViewTransactions?: () => void;
  onEditClosed?: () => void;
}) {
  const isOperatorPortal = subscribersPortal.apiBase !== "/api/admin";
  const isManagerPortal = subscribersPortal.apiBase === "/api/manager";
  const isResellerPortal = subscribersPortal.apiBase === "/api/reseller";
  const isDealerPortal = subscribersPortal.apiBase === "/api/dealer";
  const apiBase = subscribersPortal.apiBase;
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(openEditOnMount);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    mac: string;
    ip: string;
    phone: string;
    comments: string;
    statusCode: number;
    reseller: string;
    dealer: string;
    tariffPlanId: number;
    subscribedPackageIds: number[];
  } | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [autoRenewOpen, setAutoRenewOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState<SubscriberRenewRecoverSuccessDetails | null>(null);
  const [recoverCreditMonths, setRecoverCreditMonths] = useState("0");
  const [recoverBonusMonths, setRecoverBonusMonths] = useState("0");

  function closeEditModal() {
    setEditOpen(false);
    onEditClosed?.();
  }
  const [availability, setAvailability] = useState<{
    expiresAt: string | null;
    recoverPeriodStartAt: string | null;
    recoverableCredits: number | null;
    recoverableBonusMonths: number | null;
    debitUsername: string | null;
    debitCredits: number | null;
    autoRenewEnabled: boolean;
    autoRenewCyclesRemaining: number;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [recoverPending, startRecoverTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();
  const [rebootPending, startRebootTransition] = useTransition();
  const [messagePending, startMessageTransition] = useTransition();
  const anchorRef = useRef<HTMLDivElement>(null);
  const recoverCreditInt = Number.parseInt(recoverCreditMonths, 10);
  const recoverBonusInt = Number.parseInt(recoverBonusMonths, 10);
  const recoverCreditCurrent = availability?.recoverableCredits ?? null;
  const recoverBonusCurrent = availability?.recoverableBonusMonths ?? null;
  const recoverCreditAfter =
    recoverCreditCurrent != null && Number.isFinite(recoverCreditInt)
      ? Math.max(0, recoverCreditCurrent - Math.max(0, recoverCreditInt))
      : null;
  const recoverBonusAfter =
    recoverBonusCurrent != null && Number.isFinite(recoverBonusInt)
      ? Math.max(0, recoverBonusCurrent - Math.max(0, recoverBonusInt))
      : null;
  const recoverCurrentExpiry = availability?.expiresAt ? new Date(String(availability.expiresAt).replace(" ", "T")) : null;
  const recoverPeriodStart = availability?.recoverPeriodStartAt
    ? new Date(String(availability.recoverPeriodStartAt).replace(" ", "T"))
    : null;
  const recoverMonthsOff =
    (Number.isFinite(recoverCreditInt) ? Math.max(0, recoverCreditInt) : 0) +
    (Number.isFinite(recoverBonusInt) ? Math.max(0, recoverBonusInt) : 0);
  const recoverAfterExpiry =
    recoverCurrentExpiry && recoverMonthsOff > 0
      ? applyRecoverToExpiry(recoverCurrentExpiry, recoverMonthsOff, recoverPeriodStart, new Date()).expiry
      : null;
  const recoverCreditOptions = useMemo(() => {
    const opts = buildRecoverMonthOptions(recoverCreditCurrent ?? 0, "credit");
    return [{ value: "0", label: "None" }, ...opts];
  }, [recoverCreditCurrent]);
  const recoverBonusOptions = useMemo(() => {
    const opts = buildRecoverMonthOptions(recoverBonusCurrent ?? 0, "bonus");
    return [{ value: "0", label: "None" }, ...opts];
  }, [recoverBonusCurrent]);
  const recoverCanSubmit =
    (Number.isFinite(recoverCreditInt) && recoverCreditInt > 0) ||
    (Number.isFinite(recoverBonusInt) && recoverBonusInt > 0);

  const editInitialValues = useMemo(
    () =>
      editData
        ? {
            account,
            name: editData.name,
            mac: editData.mac,
            ip: editData.ip,
            phone: editData.phone,
            status: editData.statusCode,
            reseller: editData.reseller,
            dealer: editData.dealer,
            packageId: editData.tariffPlanId,
            subscribedPackageIds: editData.subscribedPackageIds,
            note: editData.comments,
          }
        : undefined,
    [account, editData],
  );

  useEffect(() => {
    if (!recoverOpen) return;
    const timer = window.setTimeout(() => {
      setRecoverCreditMonths((prev) => clampValiditySelection(prev, recoverCreditOptions));
      setRecoverBonusMonths((prev) => clampValiditySelection(prev, recoverBonusOptions));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recoverOpen, recoverCreditOptions, recoverBonusOptions]);

  useEffect(() => {
    if (!openEditOnMount) return;
    if (initialEditData) {
      const timer = window.setTimeout(() => {
        setEditError(null);
        setEditData(initialEditData);
        setEditOpen(true);
        setEditLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    void openEditModal();
    // only on initial mount / prop hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEditOnMount, initialEditData]);

  async function openEditModal() {
    setEditError(null);
    setEditLoading(true);
    setEditOpen(true);
    try {
      const scope = apiBaseToModalScope(apiBase);
      const cacheKey = dataCacheKey(DATA_CACHE_NS.endUserDetails, scope, account);
      const result = await cachedDataLoad(cacheKey, () =>
        loadEndUserDetailsModalAction({
          scope,
          account,
        }),
      );
      if (!result.ok || !result.user) {
        setEditError("Could not load user details.");
        return;
      }
      setEditData({
        name: result.user.name ?? "",
        mac: result.user.mac ?? "",
        ip: result.user.ip ?? "",
        phone: result.user.phone ?? "",
        comments: result.user.comments ?? "",
        statusCode: Number(result.user.statusCode ?? 0),
        reseller: result.user.reseller ?? "",
        dealer: result.user.dealer ?? "",
        tariffPlanId: Number(result.user.tariffPlanId ?? 0),
        subscribedPackageIds: (result.user.subscribedPackageIds ?? []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0),
      });
    } catch {
      setEditError("Could not load user details.");
    } finally {
      setEditLoading(false);
    }
  }

  function runSendMessage() {
    const message = messageBody.trim();
    if (!message) {
      toast.warning("Message is required.");
      return;
    }
    startMessageTransition(async () => {
      const res = isOperatorPortal
        ? await bulkSendPortalAccountsMessageAction({ accounts: [account], message, priority: 2 })
        : await bulkSendAccountsMessageAction({ accounts: [account], message, priority: 2 });
      if (!res.ok) {
        if (res.error === "empty") toast.error("Message is required.");
        else if (res.error === "no_recipients") toast.error(operatorCopy.deviceMessageNoProfile);
        else if (res.error === "events_table") toast.error(operatorCopy.deviceMessagingUnavailable);
        else toast.error("Failed to queue message.");
        return;
      }
      setMessageOpen(false);
      setMessageBody("");
      if (res.unresolvedAccounts.length) {
        toast.warning("Message was not sent because this account is not linked to a device profile.");
      } else {
        toast.success("Message queued successfully.");
      }
    });
  }

  async function loadAvailability() {
    setAvailabilityLoading(true);
    try {
      const res = isOperatorPortal
        ? await getPortalAccountRenewRecoveryAvailabilityAction(account)
        : await getAccountRenewRecoveryAvailabilityAction(account);
      if (!res.ok) return;
      setAvailability({
        expiresAt: res.expiresAt,
        recoverableCredits: res.recoverableCredits,
        recoverableBonusMonths: res.recoverableBonusMonths,
        recoverPeriodStartAt: res.recoverPeriodStartAt,
        debitUsername: res.debitUsername,
        debitCredits: res.debitCredits,
        autoRenewEnabled: res.autoRenewEnabled,
        autoRenewCyclesRemaining: res.autoRenewCyclesRemaining,
      });
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function runDelete() {
    startDeleteTransition(async () => {
      const res = isOperatorPortal
        ? await bulkDeletePortalAccountsAction([account])
        : await bulkDeleteAccountsAction([account]);
      if (!res.ok) {
        toast.error(res.error === "no_accounts" ? "Account is required." : "Delete failed.");
        return;
      }
      const row = res.results[0];
      if (!row?.ok) {
        toast.error(row?.message || "Delete failed.");
        return;
      }
      setDeleteOpen(false);
      toast.success("User deleted successfully.");
      window.location.href = resetReturnPath;
    });
  }

  function runRecover() {
    const creditMonths = Number.parseInt(recoverCreditMonths, 10);
    const bonusMonths = Number.parseInt(recoverBonusMonths, 10);
    const maxCredit = recoverCreditCurrent ?? 0;
    const maxBonus = recoverBonusCurrent ?? 0;
    if (maxCredit <= 0 && maxBonus <= 0) {
      toast.warning("Nothing to recover — recovery would expire the account or only remove the current month.");
      return;
    }
    if (!recoverCanSubmit) {
      toast.warning("Select at least one credit month or bonus month to recover.");
      return;
    }
    if (!Number.isFinite(creditMonths) || creditMonths < 0 || creditMonths > maxCredit) {
      toast.warning(`Credit months must be between 0 and ${maxCredit}.`);
      return;
    }
    if (!Number.isFinite(bonusMonths) || bonusMonths < 0 || bonusMonths > maxBonus) {
      toast.warning(`Bonus months must be between 0 and ${maxBonus}.`);
      return;
    }
    startRecoverTransition(async () => {
      const res = isOperatorPortal
        ? await recoverPortalAccountCreditsAction(account, creditMonths, bonusMonths)
        : await recoverAccountCreditsAction(account, creditMonths, bonusMonths);
      if (!res.ok) {
        if (res.error === "insufficient_recoverable") {
          toast.error(`Not enough recoverable balance. Available ${res.balance ?? 0}, required ${res.required ?? "?"}.`);
          return;
        }
        if (res.error === "no_summarize") {
          toast.error("Credit summary is missing for this account.");
          return;
        }
        if (res.error === "no_stalker_user") {
          toast.error("No device profile found for this account.");
          return;
        }
        toast.error("Recovery failed. Please try again.");
        return;
      }
      setRecoverSuccess(
        buildSubscriberRecoverSuccessDetails({
          account,
          displayName: displayName ?? undefined,
          debitUsername: availability?.debitUsername,
          walletBefore:
            availability?.debitCredits != null && Number.isFinite(availability.debitCredits)
              ? Math.max(0, Math.floor(availability.debitCredits))
              : 0,
          creditMonths,
          bonusMonths,
          expiryBefore: recoverCurrentExpiry,
          expiryAfter: recoverAfterExpiry,
        }),
      );
      invalidateAfterEndUserMutation(account);
      dispatchBillingHeaderStatsRefresh();
    });
  }

  function dismissRecoverSuccess() {
    setRecoverSuccess(null);
    setRecoverOpen(false);
  }

  function runRebootDevice() {
    startRebootTransition(async () => {
      const res = isOperatorPortal
        ? await rebootPortalAccountDeviceAction(account)
        : await rebootAccountDeviceAction(account);
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

  function runResetDevice() {
    startResetTransition(async () => {
      const res = isOperatorPortal
        ? await resetPortalAccountDeviceBindingsAction(account)
        : await resetAccountDeviceBindingsAction(account);
      if (!res.ok) {
        if (res.error === "reset_no_account") toast.error("Account not found.");
        else if (res.error === "reset_no_stalker") toast.error(operatorCopy.deviceResetNoService);
        else if (res.error === "reset_no_row") toast.error(operatorCopy.deviceResetNoProfile);
        else if (res.error === "reset_db") toast.error(operatorCopy.deviceResetFailed);
        else toast.error("Reset failed.");
        return;
      }
      setResetOpen(false);
      toast.success(operatorCopy.deviceResetSuccess);
      window.location.href = resetReturnPath;
    });
  }

  return (
    <>
      {!hideMenuTrigger ? (
      <div ref={anchorRef} className="inline-flex justify-center">
        <button
          type="button"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-0 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground sm:h-9 sm:w-9"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Actions for ${account}`}
          onClick={() => setOpen((o) => !o)}
        >
          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
        <FloatingMenuPortal open={open} onOpenChange={setOpen} anchorRef={anchorRef}>
          <div onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                onViewDetail?.();
              }}
            >
              <Eye className={floatingRowActionMenuIconClass} />
              Details
            </button>
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                void openEditModal();
              }}
            >
              <Pencil className={floatingRowActionMenuIconClass} />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                setRenewOpen(true);
              }}
            >
              <HandCoins className={floatingRowActionMenuIconClass} />
              Renew
            </button>
            {recoverBonusEnabled ? (
              <button
                type="button"
                role="menuitem"
                className={floatingRowActionMenuItemClass}
                onClick={() => {
                  setOpen(false);
                  setRecoverOpen(true);
                  void loadAvailability();
                }}
              >
                <RotateCcw className={floatingRowActionMenuIconClass} />
                Recover credit
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                setAutoRenewOpen(true);
              }}
            >
              <Repeat className={floatingRowActionMenuIconClass} />
              Auto renew
            </button>
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                setMessageOpen(true);
              }}
            >
              <Mail className={floatingRowActionMenuIconClass} />
              Message
            </button>
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                onViewTransactions?.();
              }}
            >
              <ReceiptText className={floatingRowActionMenuIconClass} />
              Transactions
            </button>
            <div className={floatingRowActionMenuDividerClass} />
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemClass}
              onClick={() => {
                setOpen(false);
                setResetOpen(true);
              }}
            >
              <RotateCcw className={floatingRowActionMenuIconClass} aria-hidden />
              Reset device
            </button>
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
            <div className={floatingRowActionMenuDividerClass}>
              <button
                type="button"
                role="menuitem"
                className={floatingRowActionMenuItemDestructiveClass}
                onClick={() => {
                  setOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Delete
              </button>
            </div>
          </div>
        </FloatingMenuPortal>
      </div>
      ) : null}

      {renewOpen ? (
      <SubscriberRenewAccountModal
        account={account}
        displayName={displayName}
        open
        onClose={() => setRenewOpen(false)}
        onAfterSuccess={dispatchBillingHeaderStatsRefresh}
        validityOptions={validityOptions}
        loadAvailability={async () => {
          const res = isOperatorPortal
        ? await getPortalAccountRenewRecoveryAvailabilityAction(account)
        : await getAccountRenewRecoveryAvailabilityAction(account);
          if (!res.ok) return null;
          return res;
        }}
        onSubmit={async (validity) => {
          const res = isOperatorPortal
            ? await renewPortalSubscriberAccountAction({
                account,
                validity,
                autoRenewEnabled: false,
                autoRenewTotalCycles: 0,
              })
            : await renewSubscriberAccountAction({
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
          open
          onClose={() => setAutoRenewOpen(false)}
          validityOptions={validityOptions}
          loadAvailability={async () => {
            const res = isOperatorPortal
              ? await getPortalAccountRenewRecoveryAvailabilityAction(account)
              : await getAccountRenewRecoveryAvailabilityAction(account);
            if (!res.ok) return null;
            return res;
          }}
          onSubmit={async (period) => {
            const res = isOperatorPortal
              ? await setPortalSubscriberAutoRenewAction({ account, period })
              : await setSubscriberAutoRenewAction({ account, period });
            if (!res.ok) return { ok: false, message: res.message };
            invalidateAfterEndUserMutation(account);
            return { ok: true };
          }}
        />
      ) : null}
      {recoverOpen ? (
        <RecoverCreditsModal
          account={account}
          open={!recoverSuccess}
          onClose={() => setRecoverOpen(false)}
          loading={availabilityLoading}
          recoverCreditMonths={recoverCreditMonths}
          onRecoverCreditMonthsChange={setRecoverCreditMonths}
          recoverBonusMonths={recoverBonusMonths}
          onRecoverBonusMonthsChange={setRecoverBonusMonths}
          recoverCreditOptions={recoverCreditOptions}
          recoverBonusOptions={recoverBonusOptions}
          recoverCreditCurrent={recoverCreditCurrent}
          recoverBonusCurrent={recoverBonusCurrent}
          recoverCreditInt={Number.isFinite(recoverCreditInt) ? recoverCreditInt : 0}
          recoverBonusInt={Number.isFinite(recoverBonusInt) ? recoverBonusInt : 0}
          recoverCreditAfter={recoverCreditAfter}
          recoverBonusAfter={recoverBonusAfter}
          recoverCurrentExpiry={recoverCurrentExpiry}
          recoverAfterExpiry={recoverAfterExpiry}
          canSubmit={recoverCanSubmit}
          pending={recoverPending}
          onSubmit={runRecover}
        />
      ) : null}

      {recoverSuccess ? (
        <SubscriberRenewRecoverSuccessModal
          open
          details={recoverSuccess}
          onDismiss={dismissRecoverSuccess}
        />
      ) : null}

      {resetOpen ? (
        <HudRowActionConfirmModal
          open
          onClose={() => setResetOpen(false)}
          kicker="Reset"
          title="Reset device bindings?"
          footer={
            <div className="flex items-center justify-between gap-3 border-t border-cyan-600/15 px-4 py-2.5 sm:px-5 dark:border-cyan-400/10">
              <Button
                type="button"
                variant="ctaLinkMuted"
                size="inline"
                className="text-sm"
                onClick={() => setResetOpen(false)}
                disabled={resetPending}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="ctaLink"
                size="inline"
                className="gap-1 text-sm"
                onClick={runResetDevice}
                disabled={resetPending}
              >
                {resetPending ? "Working…" : "Reset device"}
                {!resetPending ? <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
              </Button>
            </div>
          }
        >
          Clear device ID, serial number, and access token for account{" "}
          <span className="font-semibold text-foreground">{account}</span> so it can be linked again. MAC address is
          unchanged.
        </HudRowActionConfirmModal>
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

      {deleteOpen ? (
        <HudRowActionConfirmModal
          open
          onClose={() => setDeleteOpen(false)}
          zIndexClass="z-[320]"
          kicker="Delete"
          title="Delete user account?"
          footer={
            <div className="flex items-center justify-between gap-3 border-t border-cyan-600/15 px-4 py-2.5 sm:px-5 dark:border-cyan-400/10">
              <button
                type="button"
                className="h-auto px-0 text-sm font-medium text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/40"
                onClick={() => setDeleteOpen(false)}
                disabled={deletePending}
              >
                Close
              </button>
              <button
                type="button"
                className="inline-flex h-auto items-center gap-1 px-0 text-sm font-semibold text-destructive underline decoration-destructive/40 underline-offset-4 transition-colors hover:decoration-destructive disabled:opacity-50"
                onClick={runDelete}
                disabled={deletePending}
              >
                {deletePending ? "Working..." : "Delete account"}
                {!deletePending ? <Trash2 className="h-4 w-4 shrink-0" aria-hidden /> : null}
              </button>
            </div>
          }
        >
          {subscriptionExpired
            ? "Permanently delete this user account? This cannot be undone."
            : "This account is still active. Do you really want to delete this user account?"}
        </HudRowActionConfirmModal>
      ) : null}
      <AdminSendMessageModal
        open={messageOpen}
        title="Send Message"
        description={`Send a message to ${account}. It will be delivered on the next device check-in.`}
        recipients={[account]}
        message={messageBody}
        maxLength={1000}
        pending={messagePending}
        submitLabel="Send Message"
        onMessageChange={setMessageBody}
        onClose={() => setMessageOpen(false)}
        onSubmit={runSendMessage}
      />

      {editOpen && editLoading ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45">
          <p className="rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm text-muted-foreground">Loading user details...</p>
        </div>
      ) : null}
      {editOpen && editError ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45" onClick={closeEditModal}>
          <div className="rounded-md border border-border/60 bg-transparent px-4 py-3 text-sm text-destructive" onClick={(e) => e.stopPropagation()}>
            {editError}
          </div>
        </div>
      ) : null}
      {editOpen && editData && editInitialValues ? (
        <AdminAddUserModal
          key={account}
          open
          onClose={closeEditModal}
          mode="edit"
          returnTo={resetReturnPath}
          resellers={editModalData?.resellers ?? []}
          tariffs={editModalData?.tariffs ?? []}
          validityOptions={validityOptions}
          customPlanId={editModalData?.customPlanId ?? null}
          addonPackages={editModalData?.addonPackages ?? []}
          initialValues={editInitialValues}
          createAction={
            isManagerPortal
              ? createManagerEndUserAction
              : isResellerPortal
                ? createResellerEndUserFromListAction
                : isDealerPortal
                  ? createDealerEndUserFromListAction
                  : undefined
          }
          saveAction={
            isManagerPortal
              ? saveManagerUserFromListAction
              : isResellerPortal
                ? saveResellerUserFromListAction
                : isDealerPortal
                  ? saveDealerUserFromListAction
                  : undefined
          }
          loadDealersAction={
            isManagerPortal
              ? loadDealersForManagerResellerAction
              : isResellerPortal
                ? loadDealersForResellerPortalAction
                : undefined
          }
          hideBillingOwnership={isDealerPortal}
        />
      ) : null}
    </>
  );
}
