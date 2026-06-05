import type { FlashToastItem } from "@/components/FlashToasts";
import { operatorCopy } from "@/lib/operatorUiCopy";
import { portalUsersRenewListErrorMessage } from "@/lib/portalUsersRenewListMessages";

type StaffListRole = "manager" | "dealer" | "reseller";

/** Unified staff index (`/admin/managers`) after creating an account from the Add staff modal. */
export function adminStaffCreateSuccessFlashItems(sp: { ok?: string }): FlashToastItem[] {
  const v = sp.ok;
  if (v === "created_manager") return [{ type: "success", message: "Manager account created." }];
  if (v === "created_reseller") return [{ type: "success", message: "Reseller account created." }];
  if (v === "created_dealer") return [{ type: "success", message: "Dealer account created." }];
  return [];
}

/** Unified staff index (`/admin/managers`) for password reset feedback. */
export function adminStaffPasswordResetFlashItems(sp: { ok?: string; error?: string }): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok === "password_reset") {
    items.push({ type: "success", message: "Password reset successfully." });
  }
  if (sp.error === "new_len") {
    items.push({ type: "error", message: "Password must be between 4 and 12 characters." });
  }
  if (sp.error === "missing") {
    items.push({ type: "error", message: "Password and confirm password are required." });
  }
  return items;
}

/** Admin staff list pages (managers / dealers / resellers). */
export function adminStaffListFlashItems(sp: { ok?: string; error?: string; bal?: string; req?: string }, role: StaffListRole): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok === "1") items.push({ type: "success", message: "Saved." });
  if (sp.ok === "credits_added") items.push({ type: "success", message: "Credits added successfully." });
  if (sp.ok === "credits_recovered") items.push({ type: "success", message: "Credits recovered successfully." });
  if (sp.ok === "deleted_manager" && role === "manager") {
    items.push({ type: "success", message: "Manager account was deleted successfully." });
  }
  if (sp.ok === "deleted_dealer" && role === "dealer") {
    items.push({ type: "success", message: "Dealer account was deleted successfully." });
  }
  if (sp.ok === "deleted_reseller" && role === "reseller") {
    items.push({ type: "success", message: "Reseller account was deleted successfully." });
  }
  if (sp.error === "delete_forbidden") {
    items.push({
      type: "error",
      message:
        role === "manager"
          ? "This manager cannot be deleted (still has resellers or linked accounts)."
          : role === "dealer"
            ? "This dealer cannot be deleted while user accounts are still assigned."
            : "This reseller cannot be deleted (still has dealers or user accounts).",
    });
  }
  if (sp.error === "delete_invalid") items.push({ type: "error", message: "Delete request was invalid." });
  if (sp.error === "credits_required") {
    items.push({ type: "error", message: "Select an initial credit amount before creating the account." });
  }
  if (sp.error === "credits_balance") {
    items.push({
      type: "error",
      message: `Not enough credits for this operation (remaining ${sp.bal ?? "0"}, required ${sp.req ?? "?"}).`,
    });
  }
  if (sp.error === "credits_invalid") items.push({ type: "error", message: "Choose valid credit values." });
  if (sp.error === "credits_db") items.push({ type: "error", message: operatorCopy.creditTransactionFailed });
  if (sp.error === "password_mismatch") {
    items.push({ type: "error", message: "Password and confirm password must match." });
  }
  return items;
}

type UserDetailSp = {
  ok?: string;
  error?: string;
  bal?: string;
  req?: string;
  renew_acc?: string;
  /** RCDT / reseller renew error detail (months). */
  max?: string;
};

/** Admin edit subscriber (`/admin/users/[id]`). */
export function adminUserDetailFlashItems(sp: UserDetailSp): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok === "1") items.push({ type: "success", message: "User account updated successfully." });
  if (sp.ok === "renew") items.push({ type: "success", message: "Subscription extended and credits debited from the account owner." });
  if (sp.ok === "renew_trial") items.push({ type: "success", message: "Free trial activated for 2 days (no owner credits debited)." });
  if (sp.ok === "renew_recover") {
    items.push({ type: "success", message: operatorCopy.creditsRecovered });
  }
  if (sp.ok === "msg") items.push({ type: "success", message: "Message queued." });
  if (sp.ok === "reset") {
    items.push({ type: "success", message: operatorCopy.deviceResetSuccess });
  }

  if (sp.error === "save") {
    items.push({ type: "error", message: operatorCopy.saveFailed });
  }
  if (sp.error === "owner") {
    items.push({ type: "error", message: operatorCopy.ownerChainInvalid });
  }
  if (sp.error === "pin") items.push({ type: "error", message: operatorCopy.parentPinInvalid });
  if (sp.error === "packages") {
    items.push({ type: "error", message: operatorCopy.savePackagesFailed });
  }
  if (sp.error === "msg_empty") items.push({ type: "error", message: operatorCopy.deviceMessageRequired });
  if (sp.error === "msg_stalker") {
    items.push({ type: "error", message: operatorCopy.deviceMessagingNotConfigured });
  }
  if (sp.error === "msg_events") {
    items.push({ type: "error", message: operatorCopy.deviceMessagingUnavailable });
  }
  if (sp.error === "msg_no_user") items.push({ type: "error", message: operatorCopy.deviceMessageNoProfile });
  if (sp.error === "msg_db") items.push({ type: "error", message: operatorCopy.dbError });
  if (sp.error === "reset_no_account") items.push({ type: "error", message: "Reset failed: account not found." });
  if (sp.error === "reset_no_stalker") {
    items.push({ type: "error", message: operatorCopy.deviceResetNoService });
  }
  if (sp.error === "reset_no_row") {
    items.push({ type: "error", message: operatorCopy.deviceResetNoProfile });
  }
  if (sp.error === "renew_credits") {
    items.push({
      type: "error",
      message: operatorCopy.insufficientOwnerCredits(sp.bal ?? "0", sp.req ?? "?"),
    });
  }
  if (sp.error === "renew_recover_credits") {
    items.push({
      type: "error",
      message: `Cannot recover ${sp.req ?? "?"} credits from this user (recover max = ${sp.bal ?? "0"}).`,
    });
  }
  if (sp.error === "renew_recover_disabled") {
    items.push({
      type: "error",
      message: "Credit recovery is disabled in Settings → Credit deductions → Recover bonus credit.",
    });
  }
  if (
    sp.error?.startsWith("renew_") &&
    sp.error !== "renew_credits" &&
    sp.error !== "renew_recover_credits" &&
    sp.error !== "renew_recover_disabled"
  ) {
    const msg =
      portalUsersRenewListErrorMessage({
        error: sp.error,
        bal: sp.bal,
        req: sp.req,
        max: sp.max,
        renew_acc: sp.renew_acc,
      }) ?? "Renew failed.";
    items.push({ type: "error", message: msg });
  }
  return items;
}
