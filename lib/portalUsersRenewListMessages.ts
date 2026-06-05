import { operatorCopy } from "@/lib/operatorUiCopy";

/** Flash copy for user list Delete (`delete_*` query params; admin + portal lists). */
export function portalUsersDeleteListErrorMessage(error: string | undefined): string | null {
  if (!error?.startsWith("delete_")) return null;
  switch (error) {
    case "delete_invalid":
      return "Delete failed: missing account.";
    case "delete_active_portal":
      return "You can't delete an active user account (reseller / dealer).";
    case "delete_no_account":
      return "Delete failed: account not found.";
    case "delete_no_stalker":
      return operatorCopy.deleteNoDeviceService;
    case "delete_no_stalker_user":
      return operatorCopy.deleteNoDeviceProfile;
    case "delete_no_account_del":
      return "Delete failed: account could not be removed.";
    case "delete_stalker_db":
    case "delete_billing_db":
      return operatorCopy.dbError;
    default:
      return "Delete failed. Try again or contact support.";
  }
}

/** Flash copy for user list Reset (`reset_*` query params). */
export function portalUsersResetListErrorMessage(error: string | undefined): string | null {
  switch (error) {
    case "reset_invalid":
      return "Reset failed: missing account.";
    case "reset_no_account":
      return "Reset failed: account not found.";
    case "reset_no_stalker":
      return operatorCopy.deviceResetNoService;
    case "reset_no_row":
      return operatorCopy.deviceResetNoProfile;
    default:
      return null;
  }
}

/** Flash copy for portal (and admin) user list quick +1 renew query params. */
export function portalUsersRenewListErrorMessage(sp: {
  error?: string;
  bal?: string;
  req?: string;
  /** Admin detail renew RCDT redirect uses `max` (months cap), not `bal`. */
  max?: string;
  /** Set when renew failed: billing account id. */
  renew_acc?: string;
}): string | null {
  const e = sp.error ?? "";
  if (e === "renew_quick_invalid") return "Quick renew failed: missing account.";
  if (!e.startsWith("renew_")) return null;
  switch (e) {
    case "renew_credits":
      return operatorCopy.insufficientCredits(sp.bal ?? "0", sp.req ?? "?");
    case "renew_recover_credits":
      return `Not enough recoverable credits (available: ${sp.bal ?? "0"}, requested: ${sp.req ?? "?"}).`;
    case "renew_no_summarize":
      return operatorCopy.renewNoCreditSummary;
    case "renew_no_stalker":
      return operatorCopy.renewNoDeviceService;
    case "renew_no_stalker_user":
      return operatorCopy.renewNoDeviceProfile(sp.renew_acc?.trim() || undefined);
    case "renew_stalker":
      return operatorCopy.renewNoDeviceProfile(sp.renew_acc?.trim() || undefined);
    case "renew_trial_used":
      return "This MAC address already used a free trial.";
    case "renew_trial_limit":
      return "This account reached the configured free-trial retry limit.";
    case "renew_rcdt_reseller":
      return `Credit recovery check failed (max: ${sp.max ?? sp.bal ?? "?"}, required: ${sp.req ?? "?"}).`;
    case "renew_invalid":
      return "Invalid renew request.";
    case "renew_db":
      return operatorCopy.dbError;
    default:
      return "Renew failed.";
  }
}

/** List-level activate/block query `error`. */
export function portalUsersStatusQuickErrorMessage(error: string | undefined): string | null {
  switch (error) {
    case "activate_expired":
      return "You can't activate an expired box.";
    case "block_expired":
      return "You can't change status on an expired box.";
    case "activate_already":
      return "The box is already active.";
    case "block_already":
      return "The box is already blocked or expired.";
    case "status_no_account":
      return "Status update failed: account not found.";
    case "status_no_stalker":
      return operatorCopy.statusNoDeviceService;
    case "status_no_stalker_user":
      return operatorCopy.statusNoDeviceProfile;
    case "status_invalid":
      return "Status update failed: invalid request.";
    case "status_db":
      return operatorCopy.dbError;
    default:
      return null;
  }
}
