"use client";

import { Server, X } from "lucide-react";
import { SubscriberDetailActionsBar } from "@/components/subscribers/SubscriberDetailActionsBar";
import { SubscriberSubscriptionStatusBadge } from "@/components/subscribers/SubscriberSubscriptionStatusCard";
import {
  adminHudModalBackdropClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import {
  subscriberAccountStatusBadgeClassName,
  subscriberReceiverBadgeClassName,
} from "@/components/admin/HierarchyTableBadges";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import {
  formatAutoRenewUntilLabel,
  formatAutoRenewUntilMonthYear,
} from "@/lib/accountAutoRenew";
import { cn } from "@/lib/cn";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { rsIconSm, rsTextBody, rsTextHeadingSm } from "@/lib/ui/responsiveScale";

const ACCOUNT_OFF = 1;

export type SubscriberDetailModalData = {
  name?: string;
  username?: string;
  phone?: string;
  comments?: string;
  mac?: string;
  ip?: string;
  statusCode?: number;
  reseller?: string;
  dealer?: string;
  packageLabel?: string;
  stb?: { online?: boolean; ip?: string; firmware?: string; expiry?: string; watching?: string };
  transactionSummary?: {
    total?: number;
    creditCount?: number;
    debitCount?: number;
    netPeriods?: number;
    creditPeriods?: number;
    debitPeriods?: number;
    lastTransactionAt?: string | null;
  };
  recentTransactions?: Array<{ type?: string; periods?: number; timestamp?: string | null }>;
};

const userDetailSectionShell = cn(managersToolbarModalInsetPanelClass, "rounded-lg p-2.5");

const userDetailStatPillClass =
  "inline-flex rounded-full border border-cyan-700/35 bg-cyan-600 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-[0_1px_2px_rgb(8_145_178/0.3)] dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-foreground dark:shadow-none";

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 border-b border-cyan-600/12 py-1.5 last:border-b-0 dark:border-cyan-400/10">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-sm font-medium leading-snug text-foreground",
          multiline && "thin-scrollbar max-h-20 overflow-auto whitespace-pre-wrap text-[13px] font-normal",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export function SubscriberDetailViewModal({
  row,
  detailData,
  loading,
  error,
  onClose,
  onRenew,
  onAutoRenew,
  onEdit,
  onViewTransactions,
}: {
  row: SubscriberListClientRow;
  detailData: SubscriberDetailModalData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRenew: () => void;
  onAutoRenew: () => void;
  onEdit: () => void;
  onViewTransactions: () => void;
}) {
  const receiverOnline = detailData?.stb?.online === true || row.receiverOnline === true;
  const receiverOffline = detailData?.stb?.online === false || row.receiverOnline === false;
  // Avoid header "blink" by keeping summary header stable while the full detail payload is loading.
  const headerStatusCode = !loading && detailData?.statusCode != null ? detailData.statusCode : row.status;
  const expiresRaw = row.expires || (!loading ? detailData?.stb?.expiry : null);

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-2.5 whitespace-normal", adminHudModalBackdropClass)}
      role="dialog"
      aria-modal="true"
      aria-label="View detail"
      onClick={onClose}
    >
      <div
        className={cn(
          // Keep height stable between loading and loaded states (prevents "blink").
          "relative flex min-h-[min(70dvh,720px)] max-h-[min(92dvh,880px)] w-full max-w-[1100px] flex-col overflow-hidden shadow-xl",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay />
        <div className="hud-modal-opaque-panel relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-white dark:bg-[hsl(222_47%_6%/0.94)]">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cyan-600/15 px-4 py-3 dark:border-cyan-400/10">
            <div className="min-w-0">
              <h2 className={cn(rsTextHeadingSm, "text-foreground")}>View detail</h2>
              <p className={cn("mt-0.5", rsTextBody, "text-muted-foreground")}>
                Account <span className="font-semibold text-foreground">{row.account}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Close"
            >
              <X className={rsIconSm} aria-hidden />
            </button>
          </div>

          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {loading && !detailData ? (
              <div className="flex min-h-[min(70dvh,720px)] w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading full user info…</p>
              </div>
            ) : (
              <div className="space-y-3">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className={cn(userDetailSectionShell, "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between")}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
                      subscriberAccountStatusBadgeClassName(headerStatusCode !== ACCOUNT_OFF),
                    )}
                  >
                    {headerStatusCode === ACCOUNT_OFF ? "Inactive" : "Active"}
                  </span>
                  <SubscriberSubscriptionStatusBadge expires={expiresRaw} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={userDetailStatPillClass}>Tx: {detailData?.transactionSummary?.total ?? 0}</span>
                  <span className={userDetailStatPillClass}>Credits in: {detailData?.transactionSummary?.creditCount ?? 0}</span>
                  <span className={userDetailStatPillClass}>Credits out: {detailData?.transactionSummary?.debitCount ?? 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">
                    Profile
                  </h3>
                  <dl>
                    <DetailRow label="Full name" value={detailData?.name?.trim() || row.full_name?.trim() || "—"} />
                    <DetailRow label="Username" value={detailData?.username || row.username || "—"} />
                    <DetailRow label="Phone" value={detailData?.phone || row.phone || "—"} />
                    <DetailRow label="Comments" value={detailData?.comments || "—"} multiline />
                  </dl>
                </section>

                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">
                    Ownership
                  </h3>
                  <dl>
                    <DetailRow label="Manager" value={row.manager?.trim() || "—"} />
                    <DetailRow label="Reseller" value={detailData?.reseller?.trim() || row.reseller?.trim() || "—"} />
                    <DetailRow label="Dealer" value={detailData?.dealer?.trim() || row.dealer?.trim() || "—"} />
                    <DetailRow label="Package" value={detailData?.packageLabel || row.packageName || "—"} />
                  </dl>
                </section>

                <section className={userDetailSectionShell}>
                  <div className="mb-2 flex items-center gap-2">
                    <Server className={cn(rsIconSm, "text-emerald-600 dark:text-emerald-300")} aria-hidden />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">
                      STB information
                    </h3>
                  </div>
                  <dl>
                    <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] items-center gap-x-3 border-b border-cyan-600/12 py-1.5 dark:border-cyan-400/10">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Receiver</dt>
                      <dd>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            subscriberReceiverBadgeClassName(receiverOnline),
                            receiverOffline && "bg-rose-700 text-white dark:bg-rose-600",
                          )}
                        >
                          {receiverOnline ? "Online" : receiverOffline ? "Offline" : "Unknown"}
                        </span>
                      </dd>
                    </div>
                    <DetailRow label="MAC" value={detailData?.mac || row.mac || "—"} />
                    <DetailRow label="IP" value={detailData?.ip || row.ip || detailData?.stb?.ip || "—"} />
                    <DetailRow label="Firmware" value={detailData?.stb?.firmware || "—"} />
                    <DetailRow label="Watching" value={detailData?.stb?.watching || "—"} />
                    <DetailRow
                      label="Last active"
                      value={row.lastActive ? String(row.lastActive).slice(0, 19) : "—"}
                    />
                  </dl>
                </section>

                <section className={userDetailSectionShell}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-700/90 dark:text-cyan-300/80">
                    Subscription
                  </h3>
                  <dl>
                    <DetailRow
                      label="Auto renew"
                      value={(() => {
                        if (row.autoRenew !== true) {
                          return row.autoRenew === false ? "Disabled" : "—";
                        }
                        const until =
                          row.autoRenewCyclesRemaining != null
                            ? formatAutoRenewUntilMonthYear(row.expires, row.autoRenewCyclesRemaining) ??
                              formatAutoRenewUntilLabel(row.expires, row.autoRenewCyclesRemaining)
                            : null;
                        return until ? `Enabled · until ${until}` : "Enabled";
                      })()}
                    />
                    <DetailRow label="Created" value={row.created ? String(row.created).slice(0, 19) : "—"} />
                    <DetailRow
                      label="Last transaction"
                      value={
                        detailData?.transactionSummary?.lastTransactionAt
                          ? String(detailData.transactionSummary.lastTransactionAt).slice(0, 19)
                          : "—"
                      }
                    />
                  </dl>
                </section>
              </div>
              </div>
            )}
          </div>

          <SubscriberDetailActionsBar
            disabled={loading}
            onRenew={onRenew}
            onAutoRenew={onAutoRenew}
            onEdit={onEdit}
            onViewTransactions={onViewTransactions}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
