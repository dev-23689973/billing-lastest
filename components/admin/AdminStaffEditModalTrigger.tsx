"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { ArrowRight, BadgeDollarSign, CircleUserRound, FileText, KeyRound, Landmark, Minus, Plus, Save, ShieldCheck, UserRound, Wallet, X } from "lucide-react";
import Link from "next/link";
import { billingToast } from "@/lib/client/billingToast";
import {
  CreditsActionSuccessModal,
  type CreditsActionSuccessDetails,
} from "@/components/admin/CreditsActionSuccessModal";
import { StaffHudDashedButton } from "@/components/admin/StaffHudDashedSubmitButton";
import { StaffRowActionModal } from "@/components/admin/StaffRowActionModal";
import { PasswordInputWithToggle } from "@/components/forms/PasswordInputWithToggle";
import { SearchableFormSelect } from "@/components/forms/SearchableFormSelect";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import type { PromoTier } from "@/lib/promoBonus";
import { computePromoBonusesForAddCapped } from "@/lib/addCreditLadder";
import { resolveHierarchyAddCreditApplyPromo, type AddCreditPickKind } from "@/lib/formatAddCreditRungLabel";
import { HIERARCHY_ADD_CREDITS_MAX, hierarchyAddCreditsSubmitMax } from "@/lib/constants/hierarchyCredits";
import {
  HierarchyAddCreditPreviewDetail,
} from "@/components/portal/HierarchyCreditPreviewBlocks";
import { AddCreditPrincipalCombo } from "@/components/portal/AddCreditPrincipalCombo";
import { RecoverGrantsMultiCombo } from "@/components/portal/RecoverGrantsMultiCombo";
import {
  BILLING_DATA_CACHE_INVALIDATE,
  cachedDataLoad,
  dataCacheKey,
  DATA_CACHE_NS,
} from "@/lib/client/dataCache";
import {
  invalidateAfterStaffCreditsMutation,
  invalidateAfterStaffProfileMutation,
} from "@/lib/client/invalidateAfterBillingMutation";
import { dispatchStaffHubListRefresh } from "@/lib/realtime/client-events";
import { grantWalletDebitAmount } from "@/lib/billing/hierarchyRecover";
import { loadStaffEditorModalAction } from "@/actions/modalData";
import { saveStaffEditorAction } from "@/actions/clientData";
import { editorApiBaseToPortal } from "@/lib/modalScope";
import { canEditStaffTicketsCreatePermission } from "@/lib/staff/canEditStaffTicketsCreate";
import { operatorCopy } from "@/lib/operatorUiCopy";

type StaffType = "MANAGER" | "RESELLER" | "DEALER";

function roleLabel(rowType: StaffType) {
  if (rowType === "MANAGER") return "Manager";
  if (rowType === "RESELLER") return "Reseller";
  return "Dealer";
}

function buildCreditsSuccessDetails(
  data: StaffEditorResponse,
  input:
    | { mode: "add"; principal: number; credited: number; applyPromo: boolean }
    | { mode: "recover"; credited: number; walletDebited: number; recoverGrantCount: number },
): CreditsActionSuccessDetails {
  const balanceBefore = data.credits;
  if (input.mode === "add") {
    const promoBonus = input.applyPromo ? Math.max(0, input.credited - input.principal) : 0;
    const payerCreditsAfter =
      data.payerCredits != null && Number.isFinite(Number(data.payerCredits))
        ? Math.max(0, Number(data.payerCredits) - input.principal)
        : null;
    return {
      mode: "add",
      staffType: data.type,
      username: data.username,
      displayName: data.name,
      balanceBefore,
      balanceAfter: balanceBefore + input.credited,
      credited: input.credited,
      principal: input.principal,
      promoBonus,
      payerCreditsAfter,
    };
  }
  return {
    mode: "recover",
    staffType: data.type,
    username: data.username,
    displayName: data.name,
    balanceBefore,
    balanceAfter: Math.max(0, balanceBefore - input.walletDebited),
    credited: input.credited,
    recoverGrantCount: input.recoverGrantCount,
  };
}

/** Dark theme `--muted` is transparent; use an always-visible track for switch affordance (incl. disabled). */
const editorSwitchTrackClass =
  "pointer-events-none relative inline-block h-7 w-12 shrink-0 rounded-full border border-slate-500/45 bg-slate-600/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:border-emerald-400/50 peer-checked:bg-emerald-500/85 peer-checked:after:translate-x-5 peer-disabled:border-slate-500/60 peer-disabled:bg-slate-800 peer-disabled:opacity-95 peer-disabled:after:bg-slate-400 peer-checked:peer-disabled:border-emerald-800/55 peer-checked:peer-disabled:bg-emerald-950/70 peer-checked:peer-disabled:after:translate-x-5";

/** Stacked label + control — single column in modal (avoids 2-col squeeze on narrow viewports). */
const editorProfileFieldClass = "flex min-w-0 flex-col gap-1.5";
const editorProfileLabelClass = "flex w-full min-w-0 items-center gap-1.5 text-sm font-medium leading-snug";

type StaffEditorResponse = {
  type: StaffType;
  username: string;
  name: string;
  password?: string;
  status: string;
  comments: string;
  credits: number;
  hierarchyAddMin?: number;
  hierarchyAddMax?: number;
  manager?: string;
  username_owner?: string;
  tickets_manager?: string;
  managerOptions?: { value: string; label: string }[];
  resellerOptions?: { value: string; label: string }[];
  promoP1?: PromoTier[];
  promoP2?: PromoTier[];
  activeClientsForPromo2?: number;
  payerCredits?: number | null;
  addCreditLadders?: {
    promoRungs: { base: number; promo1: number; promo2: number; total: number; allowed: boolean }[];
    additionalRungs: { base: number; promo1: number; promo2: number; total: number; allowed: boolean }[];
  };
  reversibleGrants?: {
    grantTxId: number;
    creditedAt: string;
    base: number;
    promo1: number;
    promo2: number;
    total: number;
    promoUnsplit?: number;
    recoverableAmount?: number;
    walletDebitAmount?: number;
    bonusVoidAmount?: number;
    creditsAvailableAfter?: number;
    isPartialRemainder?: boolean;
  }[];
};

type StaffEditorCreditsErrorResponse = {
  ok?: boolean;
  error?: string;
  balance?: number;
  required?: number;
};

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.floor(n)));
}

function creditsFailureMessage(input: {
  operation: "ADD" | "RECOVER";
  staffType: StaffType;
  requested: number;
  error?: StaffEditorCreditsErrorResponse;
}) {
  const code = input.error?.error ?? "credits_error";
  const required = Number(input.error?.required);
  const balance = Number(input.error?.balance);
  const hasNums = Number.isFinite(required) && Number.isFinite(balance);
  if (code === "insufficient_credits") {
    if (input.operation === "ADD") {
      const sourceLabel = input.staffType === "MANAGER" ? "admin wallet" : input.staffType === "RESELLER" ? "manager wallet" : "reseller wallet";
      if (hasNums) {
        const promoHint = required > input.requested ? " (includes promo bonus on add)" : "";
        return `Not enough ${sourceLabel} balance. Need ${formatInt(required)}, available ${formatInt(balance)}${promoHint}.`;
      }
      return `Not enough ${sourceLabel} balance to add credits.`;
    }
    if (hasNums) {
      return `Insufficient target balance for recover. Need ${formatInt(required)}, available ${formatInt(balance)}.`;
    }
    return "Insufficient target balance for recover.";
  }
  if (code === "invalid_grants") {
    return "Could not reverse the selected credit load(s). One or more may already be reversed or are invalid.";
  }
  if (code === "invalid") {
    return "Amount is outside the allowed range for this role/settings.";
  }
  if (code === "no_owner") {
    return "This staff account has no valid parent owner configured.";
  }
  if (code === "no_target") {
    return "Target user was not found or role no longer matches.";
  }
  if (code === "db") {
    return operatorCopy.creditsApplyFailed;
  }
  return "Could not update credits.";
}

function applyProfileFormToEditor(
  prev: StaffEditorResponse,
  payload: Record<string, string>,
): StaffEditorResponse {
  const next: StaffEditorResponse = {
    ...prev,
    name: payload.name ?? prev.name,
    status: payload.status ?? prev.status,
    comments: payload.comments ?? prev.comments,
  };
  if (payload.password) next.password = payload.password;
  if (payload.manager != null) next.manager = payload.manager;
  if (payload.username_owner != null) next.username_owner = payload.username_owner;
  if (payload.tickets_manager != null) next.tickets_manager = payload.tickets_manager;
  return next;
}

type ProfileFormSnapshot = {
  name: string;
  password: string;
  status: string;
  manager: string;
  username_owner: string;
  tickets_manager: string;
  comments: string;
};

function profileStatusFromData(data: StaffEditorResponse, isManagerPortal: boolean): string {
  if (data.type === "MANAGER" || (data.type === "RESELLER" && isManagerPortal)) {
    return data.status !== "S" ? "ACTIVE" : "INACTIVE";
  }
  return data.status === "ACTIVE" || data.status === "A" ? "ACTIVE" : "INACTIVE";
}

function snapshotFromEditorData(data: StaffEditorResponse, isManagerPortal: boolean): ProfileFormSnapshot {
  return {
    name: data.name ?? "",
    password: "",
    status: profileStatusFromData(data, isManagerPortal),
    manager: data.manager ?? "",
    username_owner: data.username_owner ?? "",
    tickets_manager: (data.tickets_manager ?? "Yes") === "Yes" ? "Yes" : "No",
    comments: data.comments ?? "",
  };
}

function readProfileFormSnapshot(form: HTMLFormElement): ProfileFormSnapshot {
  const fd = new FormData(form);
  const statusBox = form.querySelector<HTMLInputElement>(
    'input[type="checkbox"][name="status"][value="ACTIVE"]',
  );
  const ticketsBox = form.querySelector<HTMLInputElement>(
    'input[type="checkbox"][name="tickets_manager"][value="Yes"]',
  );
  return {
    name: String(fd.get("name") ?? "").trim(),
    password: String(fd.get("password") ?? "").trim(),
    status: statusBox?.checked ? "ACTIVE" : "INACTIVE",
    manager: String(fd.get("manager") ?? "").trim(),
    username_owner: String(fd.get("username_owner") ?? "").trim(),
    tickets_manager: ticketsBox?.checked ? "Yes" : "No",
    comments: String(fd.get("comments") ?? ""),
  };
}

function profileSnapshotsEqual(a: ProfileFormSnapshot, b: ProfileFormSnapshot): boolean {
  return (
    a.name === b.name &&
    a.password === b.password &&
    a.status === b.status &&
    a.manager === b.manager &&
    a.username_owner === b.username_owner &&
    a.tickets_manager === b.tickets_manager &&
    a.comments === b.comments
  );
}

function applyCreditsAddToEditor(
  prev: StaffEditorResponse,
  input: { baseAmount: number; creditedTotal: number },
): StaffEditorResponse {
  const nextPayer =
    prev.payerCredits != null && Number.isFinite(Number(prev.payerCredits))
      ? Math.max(0, Number(prev.payerCredits) - input.baseAmount)
      : prev.payerCredits;
  return {
    ...prev,
    credits: prev.credits + input.creditedTotal,
    payerCredits: nextPayer,
  };
}

function applyCreditsRecoverGrantsToEditor(
  prev: StaffEditorResponse,
  grantTxIds: number[],
  recoveredTotal: number,
): StaffEditorResponse {
  const idSet = new Set(grantTxIds);
  return {
    ...prev,
    credits: Math.max(0, prev.credits - recoveredTotal),
    reversibleGrants: prev.reversibleGrants?.filter((g) => !idSet.has(g.grantTxId)),
  };
}

export function AdminStaffEditModalTrigger({
  rowType,
  username,
  label,
  className,
  onOpen,
  initialView = "profile",
  initialCreditsMode = "both",
  triggerRef,
  editorApiBase = "/api/admin",
}: {
  rowType: StaffType;
  username: string;
  label: ReactNode;
  className?: string;
  onOpen?: () => void;
  initialView?: "profile" | "credits";
  initialCreditsMode?: "both" | "add" | "recover";
  triggerRef?: Ref<HTMLButtonElement>;
  /** `/api/admin` (default) or `/api/manager` for scoped staff editor. */
  editorApiBase?: string;
}) {
  const isManagerPortal = editorApiBase === "/api/manager";
  const isResellerPortal = editorApiBase === "/api/reseller";
  const canEditTicketsCreate = canEditStaffTicketsCreatePermission(editorApiBaseToPortal(editorApiBase));
  const creditsOnlyModal = initialView === "credits";
  const staffListStaleRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const supportsSplitEditorLoad = editorApiBase === "/api/admin";
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCredits, setSavingCredits] = useState<"" | "ADD" | "RECOVER">("");
  const [data, setData] = useState<StaffEditorResponse | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [addAmount, setAddAmount] = useState<number | null>(null);
  const [addPick, setAddPick] = useState<AddCreditPickKind | null>(null);
  const [recoverGrantSelection, setRecoverGrantSelection] = useState<number[]>([]);
  const [creditsSuccess, setCreditsSuccess] = useState<CreditsActionSuccessDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const profileBaselineRef = useRef<ProfileFormSnapshot | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  const addCreditLadders = data?.addCreditLadders;
  const hasAddCreditLadders =
    !!addCreditLadders && (addCreditLadders.promoRungs.length > 0 || addCreditLadders.additionalRungs.length > 0);

  const addApplyPromo = useMemo(() => {
    if (addAmount == null || !addCreditLadders) return true;
    return resolveHierarchyAddCreditApplyPromo(addAmount, addCreditLadders, addPick);
  }, [addAmount, addCreditLadders, addPick]);

  const addPromoBreakdown = useMemo(() => {
    if (addAmount == null || !data?.promoP1 || !data.promoP2 || !addApplyPromo) return null;
    return computePromoBonusesForAddCapped(addAmount, data.activeClientsForPromo2 ?? 0, data.promoP1, data.promoP2);
  }, [data, addAmount, addApplyPromo]);

  const projectedAddTotal =
    addAmount != null
      ? addApplyPromo && addPromoBreakdown
        ? addAmount + addPromoBreakdown.bonus1 + addPromoBreakdown.bonus2
        : addAmount
      : null;
  const policyAddMax = Math.max(
    1,
    Math.min(HIERARCHY_ADD_CREDITS_MAX, Number(data?.hierarchyAddMax ?? HIERARCHY_ADD_CREDITS_MAX)),
  );
  const payerBal =
    data?.payerCredits != null && Number.isFinite(Number(data.payerCredits)) ? Number(data.payerCredits) : undefined;
  const addMax = hierarchyAddCreditsSubmitMax(policyAddMax, payerBal);
  const addMin = Math.max(1, Math.min(addMax, Number(data?.hierarchyAddMin ?? 1)));

  const needsCreditsPanel = initialView === "credits";

  const updateProfileDirty = useCallback(() => {
    const form = profileFormRef.current;
    const baseline = profileBaselineRef.current;
    if (!form || !baseline) {
      setProfileDirty(false);
      return;
    }
    setProfileDirty(!profileSnapshotsEqual(baseline, readProfileFormSnapshot(form)));
  }, []);

  useEffect(() => {
    if (!open || !data || creditsOnlyModal) return;
    profileBaselineRef.current = snapshotFromEditorData(data, isManagerPortal);
    const nextStatus = profileStatusFromData(data, isManagerPortal) === "ACTIVE";
    const timer = window.setTimeout(() => {
      setStatusChecked(nextStatus);
      setProfileDirty(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, data, creditsOnlyModal, isManagerPortal]);

  useEffect(() => {
    if (open) return;
    profileBaselineRef.current = null;
    const timer = window.setTimeout(() => setProfileDirty(false), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function fetchEditorSection(section: "profile" | "credits" | "all"): Promise<StaffEditorResponse> {
    const portal = editorApiBaseToPortal(editorApiBase);
    const cacheKey = dataCacheKey(
      DATA_CACHE_NS.staffEditor,
      portal,
      rowType,
      username,
      section,
      initialCreditsMode,
    );
    return cachedDataLoad(cacheKey, async () => {
      const result = await loadStaffEditorModalAction({
        portal,
        type: rowType,
        username,
        section,
        creditsMode: initialCreditsMode,
      });
      if (!result.ok) {
        const err = new Error(`load_failed:${result.status ?? result.error}`) as Error & {
          status?: number;
          code?: string;
        };
        err.status = result.status;
        err.code = result.error;
        throw err;
      }
      return result.data as StaffEditorResponse;
    });
  }

  async function loadEditorData() {
    if (!supportsSplitEditorLoad) return fetchEditorSection("all");
    const [profile, credits] = await Promise.all([fetchEditorSection("profile"), fetchEditorSection("credits")]);
    return { ...profile, ...credits };
  }

  const refreshCreditsSlice = useCallback(async () => {
    if (!supportsSplitEditorLoad) {
      try {
        setData(await loadEditorData());
      } catch {
        /* keep previous editor data if reload fails after a successful save */
      }
      return;
    }
    setCreditsLoading(true);
    try {
      const credits = await fetchEditorSection("credits");
      setData((prev) => (prev ? { ...prev, ...credits } : credits));
      setLoadError(null);
    } catch {
      /* Save may have succeeded — do not wipe the open modal */
    } finally {
      setCreditsLoading(false);
    }
  }, [supportsSplitEditorLoad, editorApiBase, rowType, username]);

  const closeModal = useCallback(() => {
    setCreditsSuccess(null);
    setOpen(false);
    if (staffListStaleRef.current) {
      staffListStaleRef.current = false;
      dispatchStaffHubListRefresh();
    }
  }, []);

  /** Done on the credits result dialog — close success overlay and the add/recover editor modal. */
  const dismissCreditsSuccess = useCallback(() => {
    closeModal();
  }, [closeModal]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setRecoverGrantSelection([]), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const onCacheInvalidate = (event: Event) => {
      const prefix = (event as CustomEvent<{ prefix?: string }>).detail?.prefix ?? "";
      if (prefix && !prefix.startsWith(DATA_CACHE_NS.staffEditor)) return;
      if (open) {
        if (needsCreditsPanel) void refreshCreditsSlice();
        return;
      }
      window.setTimeout(() => {
        setData(null);
        setAddAmount(null);
        setAddPick(null);
      }, 0);
    };
    window.addEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);
    return () => window.removeEventListener(BILLING_DATA_CACHE_INVALIDATE, onCacheInvalidate);
  }, [open, needsCreditsPanel, refreshCreditsSlice]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (creditsSuccess) {
        dismissCreditsSuccess();
        return;
      }
      closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeModal, creditsSuccess, dismissCreditsSuccess]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setCreditsLoading(false);
      setLoadError(null);
      try {
        if (supportsSplitEditorLoad && creditsOnlyModal && needsCreditsPanel) {
          const credits = await fetchEditorSection("credits");
          if (!cancelled) {
            setData(credits);
            setAddAmount(null);
            setAddPick(null);
          }
        } else {
          const json = supportsSplitEditorLoad ? await fetchEditorSection("profile") : await loadEditorData();
          if (!cancelled) {
            setData(json);
            setAddAmount(null);
            setAddPick(null);
          }
          if (!cancelled && supportsSplitEditorLoad && needsCreditsPanel) {
            setCreditsLoading(true);
            try {
              const credits = await fetchEditorSection("credits");
              if (!cancelled) setData((prev) => (prev ? { ...prev, ...credits } : credits));
            } catch {
              if (!cancelled) setLoadError("Could not load credits data. Close and try again from the staff list.");
            } finally {
              if (!cancelled) setCreditsLoading(false);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          const status = (e as { status?: number }).status;
          if (status === 404) {
            setLoadError(`No ${roleLabel(rowType).toLowerCase()} account found for “${username}”.`);
          } else if (status === 403) {
            setLoadError("You do not have permission to open this editor.");
          } else if ((e as { code?: string }).code === "load_error" || status === 500) {
            setLoadError(
              operatorCopy.creditsLoadFailed,
            );
          } else {
            setLoadError("Could not load editor data. Close and try again from the staff list.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    document.body.style.overflow = "";
    return () => {
      cancelled = true;
    };
  }, [open, rowType, username, supportsSplitEditorLoad, needsCreditsPanel, creditsOnlyModal]);

  const addSelectionAllowed = useMemo(() => {
    if (addAmount == null) return false;
    const ladders = data?.addCreditLadders;
    if (!ladders) return addAmount >= addMin && addAmount <= addMax;
    const rung =
      ladders.promoRungs.find((r) => r.base === addAmount) ?? ladders.additionalRungs.find((r) => r.base === addAmount);
    if (!rung) return false;
    return rung.allowed;
  }, [data?.addCreditLadders, addAmount, addMin, addMax]);

  const effectiveRecoverGrantIds = recoverGrantSelection;

  const recoverSelectionSummary = useMemo(() => {
    const grants = data?.reversibleGrants;
    if (!grants?.length || effectiveRecoverGrantIds.length < 1) {
      return { walletDebit: 0, payerRefund: 0, count: 0 };
    }
    const map = new Map(grants.map((g) => [g.grantTxId, g]));
    let walletDebit = 0;
    let payerRefund = 0;
    for (const id of effectiveRecoverGrantIds) {
      const g = map.get(id);
      if (!g) continue;
      walletDebit += grantWalletDebitAmount(g);
      payerRefund += Math.max(0, Math.floor(g.recoverableAmount ?? grantWalletDebitAmount(g)));
    }
    return { walletDebit, payerRefund, count: effectiveRecoverGrantIds.length };
  }, [data?.reversibleGrants, effectiveRecoverGrantIds]);

  async function submitRecoverGrants() {
    if (!data) return;
    if (!effectiveRecoverGrantIds.length) {
      billingToast.error("Select a credit load to reverse.");
      return;
    }
    setSavingCredits("RECOVER");
    try {
      const result = await saveStaffEditorAction(editorApiBase, {
        mode: "credits",
        type: data.type,
        username: data.username,
        operation: "RECOVER",
        grantTxIds: effectiveRecoverGrantIds,
      });
      if (!result.ok) {
        throw new Error(
          creditsFailureMessage({
            operation: "RECOVER",
            staffType: data.type,
            requested: recoverSelectionSummary.payerRefund,
            error: result,
          }),
        );
      }
      invalidateAfterStaffCreditsMutation();
      setData((prev) =>
        prev
          ? applyCreditsRecoverGrantsToEditor(prev, effectiveRecoverGrantIds, recoverSelectionSummary.walletDebit)
          : prev,
      );
      setRecoverGrantSelection([]);
      staffListStaleRef.current = true;
      setCreditsSuccess(
        buildCreditsSuccessDetails(data, {
          mode: "recover",
          credited: recoverSelectionSummary.payerRefund,
          walletDebited: recoverSelectionSummary.walletDebit,
          recoverGrantCount: recoverSelectionSummary.count,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Could not update credits.";
      billingToast.error(msg);
    } finally {
      setSavingCredits("");
    }
  }

  async function submitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    const form = e.currentTarget;
    const profileSnapshot = readProfileFormSnapshot(form);
    setSavingProfile(true);
    try {
      const payload: Record<string, string> = {
        mode: "profile",
        type: data.type,
        username: data.username,
        name: profileSnapshot.name,
        password: profileSnapshot.password,
        // Keep client-side `data.status` shape consistent with the GET response:
        // - manager (and manager-scoped reseller): uses "A"/"S"
        // - admin reseller/dealer: uses "ACTIVE"/"INACTIVE"
        status:
          data.type === "MANAGER" || (data.type === "RESELLER" && isManagerPortal)
            ? profileSnapshot.status === "ACTIVE"
              ? "A"
              : "S"
            : profileSnapshot.status,
        comments: profileSnapshot.comments,
      };
      if (data.type === "RESELLER" && !isManagerPortal) {
        payload.manager = profileSnapshot.manager;
      }
      if (canEditTicketsCreate && (data.type === "MANAGER" || data.type === "RESELLER" || data.type === "DEALER")) {
        payload.tickets_manager = profileSnapshot.tickets_manager;
      }
      if (data.type === "DEALER") {
        payload.username_owner = profileSnapshot.username_owner;
      }
      const result = await saveStaffEditorAction(editorApiBase, payload);
      if (!result.ok) throw new Error("save_failed");
      invalidateAfterStaffProfileMutation();
      setData((prev) => {
        if (!prev) return prev;
        const next = applyProfileFormToEditor(prev, payload);
        profileBaselineRef.current = snapshotFromEditorData(next, isManagerPortal);
        return next;
      });
      const profileFormEl = profileFormRef.current;
      const passwordInput = profileFormEl?.querySelector<HTMLInputElement>('input[name="password"]');
      if (passwordInput) passwordInput.value = "";
      setProfileDirty(false);
      staffListStaleRef.current = true;
      billingToast.success("Profile updated successfully.");
    } catch {
      billingToast.error("Could not save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitCredits(e: React.FormEvent<HTMLFormElement>, operation: "ADD" | "RECOVER") {
    e.preventDefault();
    if (!data) return;
    if (operation === "ADD" && addAmount == null) {
      billingToast.error("Select an amount to add.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    setSavingCredits(operation);
    try {
      const requestedCredits = Number.parseInt(String(formData.get("credits") ?? ""), 10);
      const result = await saveStaffEditorAction(editorApiBase, {
        mode: "credits",
        type: data.type,
        username: data.username,
        operation,
        credits: requestedCredits,
        ...(operation === "ADD"
          ? { applyPromo: addCreditLadders ? addApplyPromo : true }
          : {}),
      });
      if (!result.ok) {
        throw new Error(creditsFailureMessage({ operation, staffType: data.type, requested: requestedCredits, error: result }));
      }
      invalidateAfterStaffCreditsMutation();
      const creditedTotal =
        operation === "ADD"
          ? projectedAddTotal ?? requestedCredits
          : requestedCredits;
      const successDetails =
        operation === "ADD"
          ? buildCreditsSuccessDetails(data, {
              mode: "add",
              principal: requestedCredits,
              credited: creditedTotal,
              applyPromo: addCreditLadders ? addApplyPromo : true,
            })
          : buildCreditsSuccessDetails(data, {
              mode: "recover",
              credited: creditedTotal,
              walletDebited: creditedTotal,
              recoverGrantCount: 1,
            });
      setData((prev) => {
        if (!prev) return prev;
        if (operation === "ADD") {
          return applyCreditsAddToEditor(prev, { baseAmount: requestedCredits, creditedTotal });
        }
        if (operation === "RECOVER") {
          return { ...prev, credits: Math.max(0, prev.credits - requestedCredits) };
        }
        return prev;
      });
      setAddAmount(null);
      setAddPick(null);
      setRecoverGrantSelection([]);
      staffListStaleRef.current = true;
      setCreditsSuccess(successDetails);
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Could not update credits.";
      billingToast.error(msg);
    } finally {
      setSavingCredits("");
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {label}
      </button>
      <StaffRowActionModal
        open={open}
        onClose={closeModal}
        bare
        perfBackdrop
        ariaLabel={`Edit ${roleLabel(rowType)} ${username}`}
        dialogClassName={cn(
          initialView === "credits"
            ? initialCreditsMode === "both"
              ? "max-w-[min(96vw,960px)]"
              : initialCreditsMode === "recover" || data?.reversibleGrants?.length
                ? "max-w-[min(96vw,680px)]"
                : "max-w-[min(96vw,600px)]"
            : "max-w-[min(96vw,720px)]",
        )}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] flex min-h-0 min-w-0 max-h-[calc(100dvh-2rem)] flex-col overflow-hidden overflow-x-hidden bg-white dark:bg-[hsl(222_47%_6%/0.94)]">
            <div
              className={cn(
                "flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 dark:border-b-cyan-400/10 dark:bg-white/[0.06] dark:backdrop-blur-md",
                initialView === "credits" ? "px-4 py-4 sm:px-5" : "px-3 py-3 sm:px-4",
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-semibold tracking-tight text-foreground",
                    initialView === "credits" ? "text-xl sm:text-2xl" : "text-sm",
                  )}
                >
                  {initialView === "credits" ? "Credits" : `${roleLabel(rowType)} editor`}
                </p>
                <div className="mt-2 flex min-w-0 flex-nowrap items-center gap-2 sm:gap-2.5">
                  <div
                    className={cn(
                      "inline-flex min-w-0 shrink items-center gap-2 rounded-md border border-border/70 bg-background/80 text-muted-foreground dark:bg-white/[0.08]",
                      initialView === "credits" ? "max-w-[min(100%,13rem)] px-3 py-1.5 text-sm sm:max-w-none sm:text-base" : "max-w-full px-2 py-0.5 text-xs",
                    )}
                  >
                    <UserRound
                      className={cn("shrink-0 text-muted-foreground", initialView === "credits" ? "h-4 w-4" : "h-3.5 w-3.5")}
                      aria-hidden
                    />
                    <span className="truncate font-mono">
                      {initialView === "credits" ? `${roleLabel(rowType)}: ${username}` : username}
                    </span>
                  </div>
                  {loading ? (
                    <span
                      className={cn(
                        "shrink-0 text-muted-foreground",
                        initialView === "credits" ? "text-sm sm:text-base" : "text-xs",
                      )}
                    >
                      Loading…
                    </span>
                  ) : data ? (
                    <div
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]",
                        initialView === "credits" ? "px-3 py-1.5" : "px-2.5 py-1",
                      )}
                      title="Wallet credits in billing"
                    >
                      <Wallet
                        className={cn(
                          "shrink-0 text-emerald-600/90 dark:text-emerald-400/85",
                          initialView === "credits" ? "h-4 w-4" : "h-3.5 w-3.5",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "font-medium text-muted-foreground",
                          initialView === "credits" ? "text-sm" : "text-xs",
                        )}
                      >
                        Balance
                      </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums text-foreground",
                          initialView === "credits" ? "text-base sm:text-lg" : "text-sm",
                        )}
                      >
                        {new Intl.NumberFormat("en-US").format(data.credits)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "mt-1.5 leading-snug text-muted-foreground",
                    initialView === "credits" ? "text-base" : "text-[11px]",
                  )}
                >
                  {initialView === "credits" ? (
                    initialCreditsMode === "add"
                      ? "Add credits below."
                      : initialCreditsMode === "recover"
                        ? "Recover credits below."
                        : "Add or recover below — each action submits independently."
                  ) : (
                    <>
                      <ShieldCheck className="mr-1 inline h-3.5 w-3.5 shrink-0 text-emerald-500/80 align-text-bottom" aria-hidden />
                      Secure edit session with inline save feedback.
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                  "hover:bg-muted/40 hover:text-foreground",
                )}
                aria-label="Close editor"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div
              className={cn(
                "min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-4 sm:p-4 sm:pb-5",
                initialView === "credits" ? "max-h-[min(80vh,680px)]" : "max-h-[min(82vh,760px)]",
              )}
            >
              {loading || (creditsLoading && !data) ? (
                <div className="rounded-xl border border-border/60 bg-background/40 p-6 text-sm text-muted-foreground dark:bg-white/[0.06]">
                  {creditsLoading && !loading ? "Refreshing credits…" : "Loading editor..."}
                </div>
              ) : !data ? (
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-6 text-sm dark:bg-white/[0.06]">
                  <p className="text-destructive">{loadError ?? "Could not load editor data."}</p>
                  {editorApiBase === "/api/admin" ? (
                    <Link href="/admin/managers" className="text-xs font-medium text-primary hover:underline">
                      Back to staff list
                    </Link>
                  ) : null}
                </div>
              ) : initialView === "credits" ? (
                <div className="mx-auto min-w-0 w-full max-w-full space-y-3">
                  <div className="min-w-0 max-w-full space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-base dark:rounded-none dark:border-border/60 dark:bg-white/[0.04]">
                    <div
                      className={cn(
                        "grid min-w-0 max-w-full grid-cols-1 gap-6",
                        initialCreditsMode === "both" ? "lg:grid-cols-2 lg:gap-0" : "",
                      )}
                    >
                      {initialCreditsMode !== "recover" ? (
                        <div className={cn("min-w-0 space-y-3", initialCreditsMode === "both" ? "lg:pr-5" : "")}>
                          <form onSubmit={(e) => void submitCredits(e, "ADD")} className="space-y-3">
                            <Label
                              htmlFor={
                                hasAddCreditLadders
                                  ? `editor-credits-add-${data.username}-summary`
                                  : `editor-credits-add-${data.username}`
                              }
                              className="inline-flex items-center gap-2 text-lg font-medium"
                            >
                              <BadgeDollarSign className="h-5 w-5 text-muted-foreground" aria-hidden />
                              Amount to add
                            </Label>
                            {hasAddCreditLadders && addCreditLadders ? (
                              <div className="space-y-2">
                                <AddCreditPrincipalCombo
                                  idPrefix={`editor-credits-add-${data.username}`}
                                  min={addMin}
                                  max={addMax}
                                  amount={addAmount}
                                  onAmountChange={(n, meta) => {
                                    setAddAmount(n);
                                    if (meta?.pick) setAddPick(meta.pick);
                                  }}
                                  ladders={addCreditLadders}
                                  formFieldName="credits"
                                  size="comfortable"
                                  aria-labelledby={`editor-credits-add-preset-label-${data.username}`}
                                />
                              </div>
                            ) : (
                              <Input
                                id={`editor-credits-add-${data.username}`}
                                type="number"
                                name="credits"
                                min={addMin}
                                max={addMax}
                                value={addAmount ?? ""}
                                onChange={(e) =>
                                  setAddAmount(
                                    Math.max(addMin, Math.min(addMax, Number.parseInt(e.target.value || String(addMin), 10) || addMin)),
                                  )
                                }
                                required
                              />
                            )}
                            {addAmount != null && data.promoP1 != null && data.promoP2 != null ? (
                              <HierarchyAddCreditPreviewDetail
                                principal={addAmount}
                                currentBalance={data.credits}
                                p1={data.promoP1}
                                p2={data.promoP2}
                                activeClients={data.activeClientsForPromo2 ?? 0}
                                applyPromo={addApplyPromo}
                                hideFooterProjected
                                size="comfortable"
                              />
                            ) : null}
                            <div className="mb-6 flex items-center justify-between rounded-md border border-emerald-300/90 bg-white px-4 py-3 shadow-[0_1px_3px_rgb(15_23_42/0.08)] dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:shadow-none">
                              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200/90">
                                Projected after add
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                              </p>
                              <p className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                {projectedAddTotal != null
                                  ? new Intl.NumberFormat("en-US").format(data.credits + projectedAddTotal)
                                  : "—"}
                              </p>
                            </div>
                            <StaffHudDashedButton
                              disabled={savingCredits === "ADD" || !addSelectionAllowed}
                              className="!w-fit self-start px-5 py-2.5"
                            >
                              <Plus className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="text-sm font-semibold uppercase tracking-wide">Apply add credits</span>
                            </StaffHudDashedButton>
                          </form>
                        </div>
                      ) : null}

                      {initialCreditsMode !== "add" ? (
                        <div
                          className={cn(
                            "min-w-0 max-w-full space-y-3",
                            initialCreditsMode === "both"
                              ? "border-t border-border/50 pt-6 lg:border-t-0 lg:border-l lg:border-border/50 lg:pt-0 lg:pl-5"
                              : "",
                          )}
                        >
                          <div className="min-w-0 max-w-full space-y-3">
                          <Label
                            id={`editor-recover-grants-label-${data.username}`}
                            className="inline-flex max-w-full items-center gap-2 text-lg font-medium"
                          >
                            <BadgeDollarSign className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                            Load to reverse
                          </Label>
                            <RecoverGrantsMultiCombo
                              idPrefix={`editor-recover-grants-${data.username}`}
                              grants={data.reversibleGrants ?? []}
                              selectedIds={recoverGrantSelection}
                              onSelectionChange={setRecoverGrantSelection}
                              selectionMode="multiple"
                              currentBalance={data.credits}
                              placeholder="Select loads to reverse…"
                              size="comfortable"
                              aria-labelledby={`editor-recover-grants-label-${data.username}`}
                            />
                          <p className="min-w-0 max-w-full text-pretty text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            Oldest loads are spent first. Loads you can still reverse appear below (newest first), including
                            any partial remainder on the latest grant.
                          </p>
                            <StaffHudDashedButton
                              type="button"
                              disabled={
                                savingCredits === "RECOVER" ||
                                effectiveRecoverGrantIds.length < 1 ||
                                recoverSelectionSummary.walletDebit > data.credits
                              }
                              className="!w-fit self-start px-5 py-2.5"
                              onClick={() => void submitRecoverGrants()}
                            >
                              <Minus className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="text-sm font-semibold uppercase tracking-wide">Apply recover credits</span>
                            </StaffHudDashedButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <form
                  ref={profileFormRef}
                  onSubmit={submitProfile}
                  onInput={updateProfileDirty}
                  onChange={updateProfileDirty}
                  className="min-w-0 max-w-full space-y-4"
                >
                    <input type="hidden" name="_intent" value="edit" />
                    <input type="hidden" name="username" value={data.username} />
                    <div className="grid min-w-0 grid-cols-1 gap-3">
                      <div className={editorProfileFieldClass}>
                        <Label htmlFor={`editor-name-${data.username}`} className={editorProfileLabelClass}>
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          Display name
                        </Label>
                        <Input id={`editor-name-${data.username}`} name="name" defaultValue={data.name} required />
                      </div>
                      <div className={editorProfileFieldClass}>
                        <Label htmlFor={`editor-username-${data.username}`} className={editorProfileLabelClass}>
                          <CircleUserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          Username
                        </Label>
                        <Input id={`editor-username-${data.username}`} readOnly value={data.username} className="font-mono text-muted-foreground" />
                      </div>
                      <div className={editorProfileFieldClass}>
                        <Label htmlFor={`editor-password-${data.username}`} className={editorProfileLabelClass}>
                          <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          Password
                        </Label>
                        <PasswordInputWithToggle
                          id={`editor-password-${data.username}`}
                          name="password"
                          placeholder="Leave blank to keep current password"
                          autoComplete="new-password"
                        />
                      </div>
                      {data.type === "RESELLER" && !isManagerPortal ? (
                        <div className={editorProfileFieldClass}>
                          <Label htmlFor={`editor-manager-${data.username}`} className={editorProfileLabelClass}>
                            <Landmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            Manager
                          </Label>
                          <SearchableFormSelect
                            id={`editor-manager-${data.username}`}
                            name="manager"
                            defaultValue={data.manager ?? ""}
                            searchPlaceholder="Search manager..."
                            options={data.managerOptions ?? []}
                            onValueChange={updateProfileDirty}
                          />
                        </div>
                      ) : data.type === "DEALER" && !isResellerPortal ? (
                        <div className={editorProfileFieldClass}>
                          <Label htmlFor={`editor-reseller-${data.username}`} className={editorProfileLabelClass}>
                            <Landmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            Parent reseller
                          </Label>
                          <SearchableFormSelect
                            id={`editor-reseller-${data.username}`}
                            name="username_owner"
                            defaultValue={data.username_owner ?? ""}
                            searchPlaceholder="Search reseller..."
                            options={data.resellerOptions ?? []}
                            onValueChange={updateProfileDirty}
                          />
                        </div>
                      ) : data.type === "MANAGER" || (data.type === "RESELLER" && isManagerPortal) ? (
                        <div className={editorProfileFieldClass}>
                          <Label htmlFor={`editor-status-${data.username}`} className={editorProfileLabelClass}>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            Status
                          </Label>
                          <div id={`editor-status-${data.username}`} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                            <label
                              className={cn(
                                "inline-flex items-center",
                                savingProfile ? "cursor-not-allowed" : "cursor-pointer",
                              )}
                            >
                              <input
                                type="checkbox"
                                name="status"
                                value="ACTIVE"
                                checked={statusChecked}
                                onChange={(e) => {
                                  setStatusChecked(e.currentTarget.checked);
                                  updateProfileDirty();
                                }}
                                disabled={savingProfile}
                                className="peer sr-only"
                              />
                              <span className={editorSwitchTrackClass} aria-hidden />
                            </label>
                            <span className="min-w-0 text-sm font-medium leading-snug text-foreground">Active / Suspended</span>
                          </div>
                          <input type="hidden" name="status" value="INACTIVE" />
                        </div>
                      ) : null}
                      {data.type !== "MANAGER" && !(data.type === "RESELLER" && isManagerPortal) ? (
                        <div className={editorProfileFieldClass}>
                          <Label htmlFor={`editor-status2-${data.username}`} className={editorProfileLabelClass}>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            Status
                          </Label>
                          <div id={`editor-status2-${data.username}`} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                            <label
                              className={cn(
                                "inline-flex items-center",
                                savingProfile ? "cursor-not-allowed" : "cursor-pointer",
                              )}
                            >
                              <input
                                type="checkbox"
                                name="status"
                                value="ACTIVE"
                                checked={statusChecked}
                                onChange={(e) => {
                                  setStatusChecked(e.currentTarget.checked);
                                  updateProfileDirty();
                                }}
                                disabled={savingProfile}
                                className="peer sr-only"
                              />
                              <span className={editorSwitchTrackClass} aria-hidden />
                            </label>
                            <span className="min-w-0 text-sm font-medium leading-snug text-foreground">Active / Suspended</span>
                          </div>
                          <input type="hidden" name="status" value="INACTIVE" />
                        </div>
                      ) : null}
                      {canEditTicketsCreate && (data.type === "MANAGER" || data.type === "RESELLER" || data.type === "DEALER") ? (
                        <div className={editorProfileFieldClass}>
                          <Label htmlFor={`editor-tickets-${data.username}`} className={editorProfileLabelClass}>
                            Can create tickets
                          </Label>
                          <div id={`editor-tickets-${data.username}`} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                            <label
                              className={cn(
                                "inline-flex items-center",
                                savingProfile ? "cursor-not-allowed" : "cursor-pointer",
                              )}
                            >
                              <input
                                type="checkbox"
                                name="tickets_manager"
                                value="Yes"
                                defaultChecked={(data.tickets_manager ?? "Yes") === "Yes"}
                                disabled={savingProfile}
                                className="peer sr-only"
                              />
                              <span className={editorSwitchTrackClass} aria-hidden />
                            </label>
                            <span className="min-w-0 text-sm font-medium leading-snug text-foreground">On / Off</span>
                          </div>
                          <input type="hidden" name="tickets_manager" value="No" />
                        </div>
                      ) : null}
                      <div className={editorProfileFieldClass}>
                        <Label htmlFor={`editor-comments-${data.username}`} className={editorProfileLabelClass}>
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          Internal notes
                        </Label>
                        <textarea
                          id={`editor-comments-${data.username}`}
                          name="comments"
                          rows={4}
                          defaultValue={data.comments}
                          className="flex min-h-[100px] w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 justify-end border-t border-border/60 px-2 pt-3 dark:border-t-cyan-400/10">
                      <StaffHudDashedButton
                        disabled={savingProfile || !profileDirty}
                        className="!w-auto max-w-full shrink-0 min-w-[10.5rem]"
                      >
                        <Save className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="text-[11px] font-semibold uppercase tracking-wide">Save changes</span>
                      </StaffHudDashedButton>
                    </div>
                </form>
              )}
        </div>
        </div>
      </StaffRowActionModal>
      {creditsSuccess ? (
        <CreditsActionSuccessModal open details={creditsSuccess} onDismiss={dismissCreditsSuccess} />
      ) : null}
    </>
  );
}
