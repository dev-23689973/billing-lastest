"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeDollarSign, Eye, KeyRound, MoreVertical, Pencil, ReceiptText, RefreshCcw, Store, Trash2, Users, X } from "lucide-react";
import { resetStaffPasswordAction } from "@/actions/forms";
import { AdminDeleteManagerForm } from "@/components/admin/AdminDeleteManagerForm";
import { AdminManagerSubscribersModal } from "@/components/admin/AdminManagerSubscribersModal";
import { StaffTransactionsOverlay } from "@/components/admin/StaffTransactionsOverlay";
import { Button } from "@/components/ui/button";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import { staffDetailsCloseButtonClass, staffDetailsStatTileClass } from "@/components/admin/managers-toolbar-icon-button";
import { StaffPasswordResetModal } from "@/components/admin/StaffPasswordResetModal";
import { StaffRowActionModal } from "@/components/admin/StaffRowActionModal";
import { AdminStaffEditModalTrigger } from "@/components/admin/AdminStaffEditModalTrigger";
import { AdminListModalTrigger } from "@/components/admin/AdminListModalTrigger";
import { AdminUsersListModalTrigger } from "@/components/admin/AdminUsersListModalTrigger";
import { StaffDetailsSessionTiles } from "@/components/admin/StaffDetailsSessionTiles";
import { cn } from "@/lib/cn";
import type { AdminTransactionRow } from "@/lib/repos/billing";
import {
  floatingRowActionMenuDividerClass,
  floatingRowActionMenuIconClass,
  floatingRowActionMenuItemClass,
  floatingRowActionMenuItemDestructiveClass,
  tableRowActionsTriggerClass,
} from "@/lib/ui/floatingActionMenu";

export function AdminManagerRowActions({
  username,
  displayName,
  canDelete,
  redirectPath,
  status,
  credits,
  resellerCount,
  dealerCount,
  activeUsers,
  expiredUsers,
  totalUsers,
  stateCurrentLogin,
  stateLastLogin = "",
  stateLastLoginIp = "",
  stateCurrentLoginIp = "",
  initialCreditsModal,
  transactions = [],
  viewResellersHref,
}: {
  username: string;
  displayName: string;
  canDelete: boolean;
  redirectPath: string;
  status: string;
  credits: number;
  resellerCount: number;
  dealerCount: number;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  stateCurrentLogin: string;
  stateLastLogin?: string;
  stateLastLoginIp?: string;
  stateCurrentLoginIp?: string;
  initialCreditsModal?: string;
  transactions?: AdminTransactionRow[];
  /** Staff list URL: resellers under this manager (same as reseller count drill-down). */
  viewResellersHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [subscribersOpen, setSubscribersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addCreditsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const recoverCreditsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const usersTriggerRef = useRef<HTMLButtonElement | null>(null);
  const resellersTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!initialCreditsModal) return;
    const id = window.setTimeout(
      () => (initialCreditsModal === "recover" ? recoverCreditsTriggerRef.current : addCreditsTriggerRef.current)?.click(),
      0,
    );
    return () => window.clearTimeout(id);
  }, [initialCreditsModal]);

  return (
    <div className="relative flex justify-center">
      <div ref={anchorRef} className="inline-flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={tableRowActionsTriggerClass}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Actions for ${displayName || username}`}
          onClick={() => setOpen((o) => !o)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      <FloatingMenuPortal open={open} onOpenChange={setOpen} anchorRef={anchorRef}>
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => setDetailsOpen(true), 0);
          }}
        >
          <Eye className={floatingRowActionMenuIconClass} />
          View details
        </button>
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => editTriggerRef.current?.click(), 0);
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
            window.setTimeout(() => addCreditsTriggerRef.current?.click(), 0);
          }}
        >
          <BadgeDollarSign className={floatingRowActionMenuIconClass} />
          Add credits
        </button>
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => recoverCreditsTriggerRef.current?.click(), 0);
          }}
        >
          <RefreshCcw className={floatingRowActionMenuIconClass} />
          Recover credits
        </button>
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => setTransactionsOpen(true), 0);
          }}
        >
          <ReceiptText className={floatingRowActionMenuIconClass} />
          Transactions
        </button>
        {viewResellersHref ? (
          <button
            type="button"
            role="menuitem"
            className={floatingRowActionMenuItemClass}
            onClick={() => {
              setOpen(false);
              window.setTimeout(() => resellersTriggerRef.current?.click(), 0);
            }}
          >
            <Store className={floatingRowActionMenuIconClass} />
            View resellers
          </button>
        ) : null}
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => usersTriggerRef.current?.click(), 0);
          }}
        >
          <Users className={floatingRowActionMenuIconClass} />
          View users
        </button>
        <button
          type="button"
          role="menuitem"
          className={floatingRowActionMenuItemClass}
          onClick={() => {
            setOpen(false);
            window.setTimeout(() => setPasswordOpen(true), 0);
          }}
        >
          <KeyRound className={floatingRowActionMenuIconClass} />
          Reset password
        </button>
        <div className={floatingRowActionMenuDividerClass} onClick={(e) => e.stopPropagation()}>
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              className={floatingRowActionMenuItemDestructiveClass}
              onClick={() => {
                setOpen(false);
                window.setTimeout(() => setDeleteConfirmOpen(true), 0);
              }}
            >
              <Trash2 className={cn(floatingRowActionMenuIconClass, "opacity-80")} aria-hidden />
              Delete manager
            </button>
          ) : (
            <AdminDeleteManagerForm
              username={username}
              canDelete={false}
              redirectPath={redirectPath}
              buttonLabel="Delete manager"
              menuItem
            />
          )}
        </div>
      </FloatingMenuPortal>
      {deleteConfirmOpen ? (
        <AdminDeleteManagerForm
          key={`delete-manager-${username}`}
          username={username}
          canDelete
          redirectPath={redirectPath}
          buttonLabel="Delete manager"
          defaultConfirmOpen
          positionAnchorRef={anchorRef}
          onPanelOpenChange={(o) => {
            if (!o) setDeleteConfirmOpen(false);
          }}
        />
      ) : null}
      <AdminManagerSubscribersModal
        open={subscribersOpen}
        onOpenChange={setSubscribersOpen}
        managerLogin={username}
        managerDisplayName={displayName}
      />
      <StaffRowActionModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        dialogClassName="max-w-xl"
        ariaLabel="Manager details"
      >
        <div className="p-5 sm:p-6">
          <header className="mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-4 dark:border-cyan-400/10">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-foreground">Manager details</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="truncate text-right font-medium text-foreground">{displayName || "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="truncate text-right font-mono font-medium text-primary">{username}</dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  status === "A"
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
                    : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-200",
                )}
              >
                {status === "A" ? "Active" : "Suspended"}
              </span>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className={staffDetailsCloseButtonClass}
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>
            <div className="mb-3">
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Role</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">Manager</p>
              </div>
            </div>
            <StaffDetailsSessionTiles
              lastLoginTime={stateLastLogin}
              currentLoginTime={stateCurrentLogin}
              lastLoginIp={stateLastLoginIp}
              currentLoginIp={stateCurrentLoginIp}
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Credits</p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">{new Intl.NumberFormat("en-US").format(credits)}</p>
              </div>
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Team nodes</p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">{resellerCount + dealerCount}</p>
              </div>
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resellers</p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">{resellerCount}</p>
              </div>
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dealers</p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">{dealerCount}</p>
              </div>
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Active users</p>
                <p className="mt-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{activeUsers}</p>
              </div>
              <div className={staffDetailsStatTileClass}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expired users</p>
                <p className="mt-1 font-semibold tabular-nums text-amber-700 dark:text-amber-300">{expiredUsers}</p>
              </div>
              <div className={cn(staffDetailsStatTileClass, "col-span-2")}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total users</p>
                <p className="mt-1 font-semibold tabular-nums text-foreground">{totalUsers}</p>
              </div>
            </div>
        </div>
      </StaffRowActionModal>
      <StaffPasswordResetModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        username={username}
        formAction={resetStaffPasswordAction}
        idPrefix={`manager-reset-${username}`}
      />
      <StaffTransactionsOverlay
        username={username}
        open={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        initialTransactions={transactions}
      />
      <AdminStaffEditModalTrigger
        rowType="MANAGER"
        username={username}
        triggerRef={editTriggerRef}
        className="sr-only"
        label="Edit"
      />
      <AdminStaffEditModalTrigger
        rowType="MANAGER"
        username={username}
        triggerRef={addCreditsTriggerRef}
        initialView="credits"
        initialCreditsMode="add"
        className="sr-only"
        label="Add credits"
      />
      <AdminStaffEditModalTrigger
        rowType="MANAGER"
        username={username}
        triggerRef={recoverCreditsTriggerRef}
        initialView="credits"
        initialCreditsMode="recover"
        className="sr-only"
        label="Recover credits"
      />
      <AdminUsersListModalTrigger
        rowType="MANAGER"
        username={username}
        displayName={displayName || username}
        status=""
        triggerRef={usersTriggerRef}
        className="sr-only"
        label="View users"
      />
      <AdminListModalTrigger
        rowType="MANAGER"
        username={username}
        triggerRef={resellersTriggerRef}
        className="sr-only"
        label="View resellers"
      />
    </div>
  );
}
