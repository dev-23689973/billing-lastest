"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { validateCredentialFormat } from "@/lib/credentials/credentialRules";
import { BadgeDollarSign } from "lucide-react";
import { loadStaffCreateCreditPresetsAction } from "@/actions/modalData";
import { AddCreditPrincipalCombo } from "@/components/portal/AddCreditPrincipalCombo";
import { HierarchyAddCreditPreviewCompact } from "@/components/portal/HierarchyCreditPreviewBlocks";
import { resolveHierarchyAddCreditApplyPromo, type AddCreditPickKind } from "@/lib/formatAddCreditRungLabel";
import type { HierarchyAddCreditLadders } from "@/lib/repos/billing";
import type { StaffCreateCreditPresets, StaffCreateKind, StaffCreatePortal } from "@/lib/server/staffCreateCreditPresets";
import { BILLING_HEADER_STATS_EVENT } from "@/lib/realtime/client-events";
import { cn } from "@/lib/cn";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function amountStillAllowed(
  amount: number,
  ladders: HierarchyAddCreditLadders,
  min: number,
  max: number,
): boolean {
  if (!Number.isFinite(amount) || amount < min || amount > max) return false;
  const rung = [...ladders.promoRungs, ...ladders.additionalRungs].find((r) => r.base === amount);
  return rung != null && rung.allowed !== false;
}

type Props = {
  portal: StaffCreatePortal;
  kind: StaffCreateKind;
  idPrefix: string;
  payerUsername?: string;
  draftUsername?: string;
  onValidityChange?: (valid: boolean) => void;
  /** When false (Add staff dialog closed), skip fetch so payer balance stays fresh on reopen. */
  active?: boolean;
  /** Open `<dialog>` — keeps the amount list in the modal top layer. */
  portalContainerRef?: RefObject<HTMLElement | null>;
};

export function StaffCreateInitialCreditsBlock({
  portal,
  kind,
  idPrefix,
  payerUsername = "",
  draftUsername = "",
  onValidityChange,
  active = true,
  portalContainerRef,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addMin, setAddMin] = useState(1);
  const [addMax, setAddMax] = useState(999);
  const [ladders, setLadders] = useState<HierarchyAddCreditLadders>({
    promoRungs: [],
    additionalRungs: [],
  });
  const [payerCredits, setPayerCredits] = useState<number | null>(null);
  const [promoP1, setPromoP1] = useState<import("@/lib/promoBonus").PromoTier[]>([]);
  const [promoP2, setPromoP2] = useState<import("@/lib/promoBonus").PromoTier[]>([]);
  const [activeClients, setActiveClients] = useState(0);
  const [needsPayer, setNeedsPayer] = useState(false);
  const [payerReady, setPayerReady] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);
  const [addPick, setAddPick] = useState<AddCreditPickKind | null>(null);
  const [refreshingPromo, setRefreshingPromo] = useState(false);
  const amountRef = useRef<number | null>(null);
  const addPickRef = useRef<AddCreditPickKind | null>(null);
  const draftUsernameRef = useRef(draftUsername);

  const labelId = useId();
  const hasLadders = ladders.promoRungs.length > 0 || ladders.additionalRungs.length > 0;

  const applyPromo = useMemo(() => {
    if (amount == null || !hasLadders) return true;
    return resolveHierarchyAddCreditApplyPromo(amount, ladders, addPick);
  }, [amount, ladders, addPick, hasLadders]);

  const selectionValid = amount != null && amount >= addMin && amount <= addMax;

  useEffect(() => {
    amountRef.current = amount;
    addPickRef.current = addPick;
    draftUsernameRef.current = draftUsername;
  }, [amount, addPick, draftUsername]);

  useEffect(() => {
    if (!active) {
      onValidityChange?.(false);
      return;
    }
    onValidityChange?.(selectionValid && payerReady);
  }, [active, onValidityChange, selectionValid, payerReady]);

  const applyPresetData = useCallback(
    (d: StaffCreateCreditPresets, opts: { preserveSelection?: boolean }) => {
      setAddMin(d.addMin);
      setAddMax(d.addMax);
      setLadders(d.addCreditLadders);
      setPayerCredits(d.payerCredits);
      setPromoP1(d.promoP1);
      setPromoP2(d.promoP2);
      setActiveClients(d.activeClientsForPromo2);
      setNeedsPayer(d.needsPayer);
      setPayerReady(d.payerReady);

      if (opts.preserveSelection) {
        const prev = amountRef.current;
        if (prev != null && amountStillAllowed(prev, d.addCreditLadders, d.addMin, d.addMax)) {
          setAmount(prev);
          setAddPick(addPickRef.current);
          return;
        }
      }
      setAmount(null);
      setAddPick(null);
    },
    [],
  );

  const fetchPresets = useCallback(async () => {
    const draft = draftUsernameRef.current.trim();
    return loadStaffCreateCreditPresetsAction({
      portal,
      kind,
      payerUsername: payerUsername.trim() || undefined,
      draftUsername: draft || undefined,
    });
  }, [portal, kind, payerUsername]);

  const loadStructural = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setRefreshingPromo(false);
    const r = await fetchPresets();
    if (!r.ok || !r.data || "error" in r.data) {
      const presetErr = r.data && "error" in r.data ? r.data.error : undefined;
      setLoadError(r.error ?? presetErr ?? "Could not load credit options.");
      setLoading(false);
      return;
    }
    applyPresetData(r.data, { preserveSelection: false });
    setLoading(false);
  }, [applyPresetData, fetchPresets]);

  const refreshDraftPromo = useCallback(async () => {
    setRefreshingPromo(true);
    const r = await fetchPresets();
    if (!r.ok || !r.data || "error" in r.data) {
      setRefreshingPromo(false);
      return;
    }
    applyPresetData(r.data, { preserveSelection: true });
    setRefreshingPromo(false);
  }, [applyPresetData, fetchPresets]);

  useEffect(() => {
    if (!active) return;
    void loadStructural();
  }, [active, loadStructural]);

  useEffect(() => {
    if (!active) return;
    const onPayerBalanceRefresh = () => {
      if (loading) return;
      void refreshDraftPromo();
    };
    window.addEventListener(BILLING_HEADER_STATS_EVENT, onPayerBalanceRefresh);
    return () => window.removeEventListener(BILLING_HEADER_STATS_EVENT, onPayerBalanceRefresh);
  }, [active, loading, refreshDraftPromo]);

  const deferredDraftUsername = useDeferredValue(draftUsername);
  const draftRefreshSkipRef = useRef(true);
  useEffect(() => {
    if (loading) return;
    if (draftRefreshSkipRef.current) {
      draftRefreshSkipRef.current = false;
      return;
    }
    const draft = deferredDraftUsername.trim();
    if (draft.length > 0 && !validateCredentialFormat("staffUsername", draft).ok) {
      return;
    }
    const timer = window.setTimeout(() => {
      void refreshDraftPromo();
    }, 550);
    return () => window.clearTimeout(timer);
  }, [deferredDraftUsername, loading, refreshDraftPromo]);

  if (!active) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading credit options…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (needsPayer && !payerReady) {
    return (
      <div className="space-y-1 rounded-lg border border-border/70 bg-muted/20 p-3 dark:bg-white/[0.03]">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <BadgeDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
          Initial credits <span className="text-destructive">*</span>
        </p>
        <p className="rounded-md border border-amber-300/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
          Select the parent {kind === "dealer" ? "reseller" : "manager"} first — credit amounts load here once a payer is chosen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 dark:bg-white/[0.03]">
      <div className="space-y-1">
        <p id={labelId} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <BadgeDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
          Initial credits <span className="text-destructive">*</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Minimum {fmt(addMin)} credits required. New accounts cannot be created without an opening balance.
          {payerCredits != null ? (
            <>
              {" "}
              Payer balance: <span className="font-mono font-semibold text-foreground">{fmt(payerCredits)}</span>
            </>
          ) : null}
          {refreshingPromo ? (
            <span className="sr-only">Updating promo tiers for draft username</span>
          ) : null}
        </p>
      </div>

      {hasLadders ? (
        <div
          className={cn(refreshingPromo && "pointer-events-none opacity-[0.92]")}
          aria-busy={refreshingPromo || undefined}
        >
          <AddCreditPrincipalCombo
            idPrefix={`${idPrefix}-create-credits`}
            min={addMin}
            max={addMax}
            amount={amount}
            onAmountChange={(n, meta) => {
              setAmount(n);
              if (meta?.pick) setAddPick(meta.pick);
            }}
            ladders={ladders}
            formFieldName="credits"
            size="comfortable"
            aria-labelledby={labelId}
            placeholder={`Select amount (min ${fmt(addMin)})…`}
            portalContainerRef={portalContainerRef}
          />
        </div>
      ) : (
        <p className="text-sm text-destructive">No credit amounts available for the current payer balance.</p>
      )}

      {amount != null ? (
        <HierarchyAddCreditPreviewCompact
          principal={amount}
          p1={promoP1}
          p2={promoP2}
          activeClients={activeClients}
          applyPromo={applyPromo}
        />
      ) : null}

      {hasLadders ? (
        <input
          type="hidden"
          name="apply_promo"
          value={amount != null && applyPromo ? "1" : "0"}
        />
      ) : null}
    </div>
  );
}
