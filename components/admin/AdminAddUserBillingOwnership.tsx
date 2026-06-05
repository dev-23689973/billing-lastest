"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { SearchableFormSelect } from "@/components/forms/SearchableFormSelect";
import { cn } from "@/lib/cn";
import { loadResellersForManagerAction } from "@/actions/forms";

type ResellerOpt = { username: string; name: string };

const dealersByReseller = new Map<string, ResellerOpt[]>();
const resellersByManager = new Map<string, ResellerOpt[]>();

async function loadDealersCached(
  action: (resellerUsername: string) => Promise<ResellerOpt[]>,
  username: string,
): Promise<ResellerOpt[]> {
  const cached = dealersByReseller.get(username);
  if (cached) return cached;
  const list = await action(username);
  dealersByReseller.set(username, list);
  return list;
}

export type AddUserOwnershipSelection = {
  manager: string;
  reseller: string;
  dealer: string;
};

type Props = {
  managers?: ResellerOpt[];
  resellers: ResellerOpt[];
  initialReseller: string;
  initialDealer: string;
  loadDealersAction: (resellerUsername: string) => Promise<ResellerOpt[]>;
  role: "admin" | "manager" | "reseller" | "dealer";
  onOwnershipChange?: (ownership: AddUserOwnershipSelection) => void;
  sectionShell: string;
  sectionTitleClass: string;
  fieldGrid: string;
  rowFieldClass: string;
  modalControlClass: string;
};

export const AdminAddUserBillingOwnership = memo(function AdminAddUserBillingOwnership({
  managers = [],
  resellers,
  initialReseller,
  initialDealer,
  loadDealersAction,
  role,
  onOwnershipChange,
  sectionShell,
  sectionTitleClass,
  fieldGrid,
  rowFieldClass,
  modalControlClass,
}: Props) {
  const [dealers, setDealers] = useState<ResellerOpt[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const roleAllowsResellerSelect = role === "admin" || role === "manager";
  const roleAllowsDealerSelect = role === "admin" || role === "manager" || role === "reseller";
  const roleAllowsManagerSelect = role === "admin";

  const [resellerChosen, setResellerChosen] = useState(
    roleAllowsResellerSelect ? Boolean(initialReseller) : true,
  );
  const [activeReseller, setActiveReseller] = useState(initialReseller);
  const [dealerValue, setDealerValue] = useState(initialDealer);
  const [activeManager, setActiveManager] = useState("");
  const [managerResellers, setManagerResellers] = useState<ResellerOpt[]>([]);
  const [loadingResellers, setLoadingResellers] = useState(false);

  const managerOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: m.username,
        label: `${m.username}${m.name && m.name !== m.username ? ` — ${m.name}` : ""}`,
      })),
    [managers],
  );

  const resellerSource = roleAllowsManagerSelect ? managerResellers : resellers;

  const resellerOptions = useMemo(
    () =>
      [
        ...(roleAllowsResellerSelect
          ? [{ value: "", label: role === "admin" ? "— Bill under manager —" : "— Bill under manager (me) —" }]
          : []),
        ...resellerSource.map((r) => ({
          value: r.username,
          label: `${r.username}${r.name && r.name !== r.username ? ` — ${r.name}` : ""}`,
        })),
      ],
    [resellerSource, role, roleAllowsResellerSelect],
  );

  const dealerOptions = useMemo(() => {
    if (!resellerChosen) return [];
    return [
      { value: "", label: "— Bill under reseller only —" },
      ...dealers.map((d) => ({ value: d.username, label: d.username })),
    ];
  }, [dealers, resellerChosen]);

  const fetchResellersForManager = useCallback(async (managerUsername: string) => {
    const m = managerUsername.trim();
    if (!m) {
      setManagerResellers([]);
      return;
    }
    const cached = resellersByManager.get(m);
    if (cached) {
      setManagerResellers(cached);
      return;
    }
    setLoadingResellers(true);
    try {
      const rows = await loadResellersForManagerAction(m);
      resellersByManager.set(m, rows);
      setManagerResellers(rows);
    } finally {
      setLoadingResellers(false);
    }
  }, []);

  const fetchDealers = useCallback(
    async (username: string) => {
      if (!username) {
        setDealers([]);
        setResellerChosen(false);
        return;
      }
      setResellerChosen(true);
      setLoadingDealers(true);
      try {
        const d = await loadDealersCached(loadDealersAction, username);
        setDealers(d);
      } catch {
        setDealers([]);
      } finally {
        setLoadingDealers(false);
      }
    },
    [loadDealersAction],
  );

  useEffect(() => {
    setActiveReseller(initialReseller);
    setDealerValue(initialDealer);
    setResellerChosen(roleAllowsResellerSelect ? Boolean(initialReseller) : true);

    // For reseller portal lists, the reseller is implied by session. We still load
    // dealer options so the user can optionally debit under a dealer.
    if (!roleAllowsDealerSelect) {
      setDealers([]);
      return;
    }

    if (roleAllowsResellerSelect && !initialReseller) {
      setDealers([]);
      return;
    }
    let cancelled = false;
    setLoadingDealers(true);
    const dealerKey = roleAllowsResellerSelect ? initialReseller : "";
    void loadDealersCached(loadDealersAction, dealerKey)
      .then((d) => {
        if (!cancelled) setDealers(d);
      })
      .catch(() => {
        if (!cancelled) setDealers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDealers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialReseller, initialDealer, loadDealersAction, roleAllowsDealerSelect, roleAllowsResellerSelect]);

  const onResellerChange = useCallback(
    (v: string) => {
      setActiveReseller(v);
      setDealerValue("");
      void fetchDealers(v);
    },
    [fetchDealers],
  );

  const onManagerChange = useCallback(
    (v: string) => {
      setActiveManager(v);
      setActiveReseller("");
      setDealerValue("");
      setDealers([]);
      setResellerChosen(false);
      void fetchResellersForManager(v);
    },
    [fetchResellersForManager],
  );

  useEffect(() => {
    onOwnershipChange?.({
      manager: roleAllowsManagerSelect ? activeManager : "",
      reseller: roleAllowsResellerSelect ? activeReseller : "",
      dealer: roleAllowsDealerSelect ? dealerValue : "",
    });
  }, [
    activeManager,
    activeReseller,
    dealerValue,
    onOwnershipChange,
    roleAllowsDealerSelect,
    roleAllowsManagerSelect,
    roleAllowsResellerSelect,
  ]);

  return (
    <section className={sectionShell}>
      <h3 className={sectionTitleClass}>Billing ownership</h3>
      <div className={cn(fieldGrid)}>
        {roleAllowsManagerSelect ? (
          <FormField id="mu-manager" label="Manager" density="compact" layout="horizontal" className={rowFieldClass}>
            <SearchableFormSelect
              id="mu-manager"
              name="manager"
              value={activeManager}
              onValueChange={onManagerChange}
              required
              placeholder="Select manager"
              searchPlaceholder="Search manager..."
              className={modalControlClass}
              size="compact"
              options={managerOptions}
            />
          </FormField>
        ) : null}

        {roleAllowsResellerSelect ? (
          <FormField id="mu-reseller" label="Reseller" density="compact" layout="horizontal" className={rowFieldClass}>
            <SearchableFormSelect
              id="mu-reseller"
              name="reseller"
              value={activeReseller}
              onValueChange={onResellerChange}
              placeholder="Select reseller"
              searchPlaceholder={loadingResellers ? "Loading resellers..." : "Search reseller..."}
              className={modalControlClass}
              size="compact"
              disabled={roleAllowsManagerSelect && (!activeManager || loadingResellers)}
              options={resellerOptions}
            />
          </FormField>
        ) : null}

        {roleAllowsDealerSelect ? (
          <FormField
            id="mu-dealer"
            label="Dealer (optional)"
            hint={
              loadingDealers
                ? "Loading dealers..."
                : roleAllowsResellerSelect
                  ? "Leave empty to bill only under the reseller."
                  : "Leave empty to bill only under the reseller (your account)."
            }
            density="compact"
            layout="horizontal"
            className={rowFieldClass}
          >
            <SearchableFormSelect
              id="mu-dealer"
              name="dealer"
              value={dealerValue}
              onValueChange={setDealerValue}
              placeholder={
                roleAllowsResellerSelect
                  ? (!resellerChosen ? "Select reseller first" : "Select dealer")
                  : "Select dealer"
              }
              searchPlaceholder="Search dealer..."
              className={modalControlClass}
              size="compact"
              disabled={(roleAllowsResellerSelect && !resellerChosen) || loadingDealers}
              options={dealerOptions}
            />
          </FormField>
        ) : null}
      </div>
    </section>
  );
});
