"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import {
  bulkRenewPortalAccountsAction,
  disablePortalSubscriberAutoRenewAction,
  getPortalAccountRenewRecoveryAvailabilityAction,
  getPortalOperatorWalletAction,
  setPortalSubscriberAutoRenewAction,
} from "@/actions/forms";
import { SubscriberAutoRenewCell } from "@/components/subscribers/SubscriberAutoRenewCell";
import { SubscriberSetAutoRenewModal } from "@/components/subscribers/SubscriberSetAutoRenewModal";
import { invalidateAfterEndUserDetailMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { toastBulkRenewSummary } from "@/lib/bulkRenewResultToast";
import { PortalSubscriberRowActions } from "@/components/portal/PortalSubscriberRowActions";
import { isBillingAccountExpired } from "@/lib/billingAccountExpiry";
import type { AccountListRow } from "@/lib/repos/billing";
import { BulkUpdateResultsModal } from "@/components/admin/BulkUpdateResultsModal";
import { cn } from "@/lib/cn";
import {
  ReceiverOnlineIconBadge,
  subscriberAccountStatusBadgeClassName,
  subscriberExpiryBadgeClassName,
} from "@/components/admin/HierarchyTableBadges";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import { BulkRenewAccountsModal } from "@/components/subscribers/BulkRenewAccountsModal";
import { SubscriberRenewRecoverSuccessModal } from "@/components/subscribers/SubscriberRenewRecoverSuccessModal";
import {
  aggregateBulkRenewAvailability,
  buildBulkRenewSuccessDetails,
  clampValiditySelection,
  filterBulkRenewValidityOptions,
  type BulkRenewAvailabilitySnapshot,
} from "@/lib/bulkRenewPlanning";
import type { SubscriberRenewRecoverSuccessDetails } from "@/lib/subscriberRenewRecoverSuccess";
import { dispatchBillingHeaderStatsRefresh } from "@/lib/realtime/client-events";

export type PortalUsersBulkVariant = "manager" | "reseller" | "dealer";

type ValidityOption = { value: string; label: string };

export type PortalUsersSortColumn =
  | "account"
  | "mac"
  | "full_name"
  | "reseller"
  | "dealer"
  | "status"
  | "expires"
  | "created";

type Props = {
  variant: PortalUsersBulkVariant;
  resellerStatusQuickActions?: boolean;
  rows: AccountListRow[];
  validityOptions: ValidityOption[];
  sort: string;
  dir: "asc" | "desc";
  sortUrls: Record<PortalUsersSortColumn, string>;
  /** Owner column: `dealer` sort by default; `reseller` when list is scoped to a single dealer (see `OperatorSubscribersPage`). */
  ownerSortUrl: string;
  ownerSortColumn: "dealer" | "reseller";
  listReturnPath: string;
  portalBase: "/manager" | "/reseller" | "/dealer";
};

const ACCOUNT_OFF = 1;
/** Avoid oversized URLs when many rows are checked (billing login per param). */
const MAX_ACCOUNTS_IN_MESSAGE_URL = 100;

function sortMark(col: string, sort: string, dir: "asc" | "desc") {
  return sort === col ? (dir === "asc" ? "↑" : "↓") : "";
}

function ownerLabel(r: AccountListRow) {
  return r.dealer?.trim() || r.reseller?.trim() || r.manager?.trim() || "—";
}

function subscriptionPill(r: AccountListRow) {
  if (r.status === ACCOUNT_OFF) {
    return { label: "Inactive", className: subscriberAccountStatusBadgeClassName(false) };
  }
  if (isBillingAccountExpired(r.expires)) {
    return { label: "Expired", className: subscriberExpiryBadgeClassName("expired") };
  }
  if (r.expires) {
    const exp = new Date(String(r.expires).replace(" ", "T"));
    if (!Number.isNaN(exp.getTime()) && exp.getTime() > Date.now() && exp.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000) {
      return { label: "Expiring soon", className: subscriberExpiryBadgeClassName("soon") };
    }
  }
  return { label: "Active", className: subscriberAccountStatusBadgeClassName(true) };
}

/** Portal subscriber grid — same columns and chrome as `AdminSubscribersTable` (Root). */
export function PortalUsersTableWithBulkRenew({
  variant,
  resellerStatusQuickActions = false,
  rows,
  validityOptions,
  sort,
  dir,
  sortUrls,
  ownerSortUrl,
  ownerSortColumn,
  listReturnPath,
  portalBase,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renewOpen, setRenewOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [validity, setValidity] = useState("1");
  const [bulkRenewAvailability, setBulkRenewAvailability] = useState<BulkRenewAvailabilitySnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [bulkRenewSuccess, setBulkRenewSuccess] = useState<SubscriberRenewRecoverSuccessDetails | null>(null);
  const [results, setResults] = useState<{ account: string; ok: boolean; message: string }[]>([]);
  const [autoRenewModalTarget, setAutoRenewModalTarget] = useState<{
    account: string;
    displayName?: string | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDisableAutoRenew = useCallback(
    async (account: string) => {
      const res = await disablePortalSubscriberAutoRenewAction(account);
      if (!res.ok) return { ok: false, message: res.message };
      invalidateAfterEndUserDetailMutation(account);
      dispatchBillingHeaderStatsRefresh();
      router.refresh();
      return { ok: true };
    },
    [router],
  );

  const bulkRenewValidityOptions = useMemo(
    () => filterBulkRenewValidityOptions(validityOptions, bulkRenewAvailability?.wallets ?? []),
    [validityOptions, bulkRenewAvailability?.wallets],
  );

  useEffect(() => {
    if (!renewOpen) return;
    const timer = window.setTimeout(
      () => setValidity((prev) => clampValiditySelection(prev, bulkRenewValidityOptions)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [renewOpen, bulkRenewValidityOptions]);

  const allAccounts = useMemo(() => rows.map((r) => r.account), [rows]);
  const allSelected = allAccounts.length > 0 && allAccounts.every((a) => selected.has(a));

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allAccounts) : new Set());
  }

  function toggleOne(account: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(account);
      else n.delete(account);
      return n;
    });
  }

  function openRenewModal() {
    if (selected.size === 0) {
      toast.warning("Select accounts for renew");
      return;
    }
    setBulkRenewAvailability(null);
    setWalletLoading(true);
    const ids = Array.from(selected);
    if (variant === "dealer") {
      void getPortalOperatorWalletAction()
        .then((res) => {
          if (!res.ok) return;
          setBulkRenewAvailability(
            aggregateBulkRenewAvailability(
              ids.length,
              ids.map((account) => ({
                account,
                ok: true,
                debitUsername: res.debitUsername,
                debitCredits: res.debitCredits,
              })),
            ),
          );
        })
        .finally(() => setWalletLoading(false));
    } else {
      void Promise.all(
        ids.map(async (account) => {
          const res = await getPortalAccountRenewRecoveryAvailabilityAction(account);
          return { account, res };
        }),
      )
        .then((rows) => {
          setBulkRenewAvailability(
            aggregateBulkRenewAvailability(
              ids.length,
              rows.map(({ account, res }) => ({
                account,
                ok: res.ok,
                debitUsername: res.ok ? res.debitUsername : null,
                debitCredits: res.ok ? res.debitCredits : null,
              })),
            ),
          );
        })
        .finally(() => setWalletLoading(false));
    }
    setRenewOpen(true);
  }

  function dismissBulkRenewSuccess() {
    setBulkRenewSuccess(null);
    if (results.length > 0) setResultsOpen(true);
  }

  function runBulkRenew() {
    const ids = Array.from(selected);
    const wallets = bulkRenewAvailability?.wallets ?? [];
    const affordableOptions = filterBulkRenewValidityOptions(validityOptions, wallets);
    const selectedOption = affordableOptions.find((v) => v.value === validity);
    startTransition(async () => {
      const res = await bulkRenewPortalAccountsAction(ids, validity);
      if (!res.ok) {
        const msg =
          res.error === "no_accounts"
            ? "Select at least one account."
            : res.error === "no_validity"
              ? "Choose a validity option."
              : res.error === "forbidden"
                ? "Not allowed."
                : res.error;
        toast.error(msg);
        return;
      }
      const successes = res.results.filter((r) => r.ok);
      const failures = res.results.filter((r) => !r.ok);
      setResults(failures.length > 0 ? res.results : []);
      setRenewOpen(false);
      setSelected(new Set());
      for (const row of successes) invalidateAfterEndUserDetailMutation(row.account);
      dispatchBillingHeaderStatsRefresh();
      if (successes.length > 0 && selectedOption && bulkRenewAvailability) {
        setBulkRenewSuccess(
          buildBulkRenewSuccessDetails({
            selectedOption,
            wallets: bulkRenewAvailability.wallets,
            successAccounts: successes.map((r) => r.account),
            accountWalletMap: bulkRenewAvailability.accountWalletMap,
          }),
        );
      }
      if (failures.length > 0) {
        if (successes.length === 0) setResultsOpen(true);
        toastBulkRenewSummary(res.results);
      } else if (successes.length === 0) {
        setResultsOpen(true);
        toastBulkRenewSummary(res.results);
      }
    });
  }

  const editHref = (account: string) =>
    `${portalBase}/users/${encodeURIComponent(account)}?list=${encodeURIComponent(listReturnPath)}`;

  const showResellerStb = variant === "reseller" && resellerStatusQuickActions;

  const messageSelectedHref = useMemo(() => {
    if (!selected.size) return `${portalBase}/message`;
    const p = new URLSearchParams();
    let n = 0;
    for (const a of selected) {
      if (n >= MAX_ACCOUNTS_IN_MESSAGE_URL) break;
      p.append("accounts", a);
      n++;
    }
    return `${portalBase}/message?${p.toString()}`;
  }, [portalBase, selected]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-sm">
        <span className="text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selected.size}</span>
        </span>
        <button
          type="button"
          onClick={openRenewModal}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          disabled={pending}
        >
          Bulk renew…
        </button>
        <Link
          href={messageSelectedHref}
          onClick={(e) => {
            if (!selected.size) {
              e.preventDefault();
              toast.warning("Select at least one user");
              return;
            }
            if (selected.size > MAX_ACCOUNTS_IN_MESSAGE_URL) {
              toast.info(
                `Only the first ${MAX_ACCOUNTS_IN_MESSAGE_URL} selected accounts were added to the link (URL size limit).`,
              );
            }
          }}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/70 dark:hover:bg-muted/50",
            !selected.size && "opacity-50",
          )}
          aria-disabled={!selected.size}
        >
          <Mail className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Message selected…
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="app-data-table-scroll thin-scrollbar">
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className={cn(dataTableStickyTh("py-2"), "w-10")}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all on this page"
                    className="rounded border-input"
                  />
                </th>
                <th className={dataTableStickyTh("py-2")}>
                  <Link href={sortUrls.account} className="text-foreground hover:text-primary">
                    Account {sortMark("account", sort, dir)}
                  </Link>
                </th>
                <th className={dataTableStickyTh("py-2")}>
                  <Link href={sortUrls.full_name} className="text-foreground hover:text-primary">
                    User {sortMark("full_name", sort, dir)}
                  </Link>
                </th>
                <th className={dataTableStickyTh("py-2")}>
                  <Link href={ownerSortUrl} className="text-foreground hover:text-primary">
                    Owner {sortMark(ownerSortColumn, sort, dir)}
                  </Link>
                </th>
                <th className={cn(dataTableStickyTh("py-2"), "font-medium")}>Package</th>
                <th className={dataTableStickyTh("py-2")}>
                  <Link href={sortUrls.mac} className="text-foreground hover:text-primary">
                    MAC {sortMark("mac", sort, dir)}
                  </Link>
                </th>
                <th className={cn(dataTableStickyTh("py-2"), "text-center")}>
                  <Link href={sortUrls.status} className="text-foreground hover:text-primary">
                    Status {sortMark("status", sort, dir)}
                  </Link>
                </th>
                <th className={cn(dataTableStickyTh("py-2"), "text-center")}>
                  <Link href={sortUrls.expires} className="text-foreground hover:text-primary">
                    Expiry {sortMark("expires", sort, dir)}
                  </Link>
                </th>
                <th className={cn(dataTableStickyTh("py-2"), "text-center font-medium")}>Auto renew</th>
                <th className={cn(dataTableStickyTh("py-2"), "text-center font-medium")}>Device</th>
                <th className={cn(dataTableStickyTh("py-2"), "text-center font-medium")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-foreground">No users match your filters</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Try clearing the search box, widening filters, or changing page size.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const sub = subscriptionPill(r);
                  const subscriptionExpired = isBillingAccountExpired(r.expires);
                  const expired = subscriptionExpired;
                  return (
                    <tr
                      key={r.account}
                      className={cn(
                        "transition-colors hover:bg-primary/5 dark:hover:bg-muted/25",
                        selected.has(r.account) && "bg-primary/[0.08] dark:bg-primary/15",
                      )}
                    >
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(r.account)}
                          onChange={(e) => toggleOne(r.account, e.target.checked)}
                          aria-label={`Select ${r.account}`}
                          className="rounded border-input"
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Link
                          href={editHref(r.account)}
                          className="font-mono text-xs font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary"
                        >
                          {r.account}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-middle text-sm font-medium text-foreground">{r.full_name?.trim() || "—"}</td>
                      <td className="px-3 py-2 align-middle font-mono text-xs text-muted-foreground">{ownerLabel(r)}</td>
                      <td className="px-3 py-2 align-middle text-xs text-muted-foreground">{r.packageName ?? "—"}</td>
                      <td className="px-3 py-2 align-middle font-mono text-xs text-muted-foreground">{r.mac || "—"}</td>
                      <td className="px-3 py-2 align-middle text-center">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", sub.className)}>{sub.label}</span>
                      </td>
                      <td className="px-3 py-2 align-middle text-center text-xs tabular-nums text-muted-foreground">
                        {r.expires ? String(r.expires).slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-2 align-middle text-center min-w-[4.5rem] sm:min-w-[9.5rem]">
                        <div className="flex justify-center">
                          <SubscriberAutoRenewCell
                            account={r.account}
                            expires={r.expires}
                            autoRenew={r.autoRenew}
                            autoRenewCyclesRemaining={r.autoRenewCyclesRemaining}
                            onConfigure={() =>
                              setAutoRenewModalTarget({
                                account: r.account,
                                displayName: r.full_name ?? r.username ?? r.account,
                              })
                            }
                            onDisable={handleDisableAutoRenew}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-center">
                        <ReceiverOnlineIconBadge online={r.receiverOnline} />
                      </td>
                      <td className="px-3 py-2 align-middle text-center">
                        <PortalSubscriberRowActions
                          account={r.account}
                          displayName={r.full_name ?? r.username ?? r.account}
                          portalBase={portalBase}
                          listReturnPath={listReturnPath}
                          subscriptionExpired={subscriptionExpired}
                          variant={variant}
                          rowStatus={r.status}
                          expired={expired}
                          resellerStatusQuickActions={showResellerStb}
                          validityOptions={validityOptions}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renewOpen ? (
        <BulkRenewAccountsModal
          open
          onClose={() => setRenewOpen(false)}
          selectedCount={selected.size}
          validityOptions={validityOptions}
          availability={bulkRenewAvailability}
          loading={walletLoading}
          validity={validity}
          onValidityChange={setValidity}
          pending={pending}
          onSubmit={runBulkRenew}
          title="Bulk renew"
        />
      ) : null}

      {bulkRenewSuccess ? (
        <SubscriberRenewRecoverSuccessModal
          open
          details={bulkRenewSuccess}
          onDismiss={dismissBulkRenewSuccess}
        />
      ) : null}

      <BulkUpdateResultsModal
        open={resultsOpen}
        results={results}
        onClose={() => {
          setResultsOpen(false);
        }}
      />

      {autoRenewModalTarget ? (
        <SubscriberSetAutoRenewModal
          account={autoRenewModalTarget.account}
          displayName={autoRenewModalTarget.displayName ?? autoRenewModalTarget.account}
          open
          onClose={() => setAutoRenewModalTarget(null)}
          validityOptions={validityOptions}
          loadAvailability={async () => {
            const res = await getPortalAccountRenewRecoveryAvailabilityAction(autoRenewModalTarget.account);
            if (!res.ok) return null;
            return res;
          }}
          onSubmit={async (period) => {
            const account = autoRenewModalTarget.account;
            const res = await setPortalSubscriberAutoRenewAction({ account, period });
            if (!res.ok) return { ok: false, message: res.message };
            setAutoRenewModalTarget(null);
            invalidateAfterEndUserDetailMutation(account);
            dispatchBillingHeaderStatsRefresh();
            router.refresh();
            return { ok: true };
          }}
        />
      ) : null}
    </>
  );
}
