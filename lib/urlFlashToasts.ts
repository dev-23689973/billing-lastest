import type { FlashToastItem } from "@/components/FlashToasts";
import { PORTAL_ADD_USER_NO_CREDITS_TITLE } from "@/lib/portal/portalAddUserMessages";
import { operatorCopy } from "@/lib/operatorUiCopy";
import {
  portalUsersDeleteListErrorMessage,
  portalUsersRenewListErrorMessage,
  portalUsersResetListErrorMessage,
  portalUsersStatusQuickErrorMessage,
} from "@/lib/portalUsersRenewListMessages";

export type AdminHierarchyNewKind = "manager" | "admin_dealer" | "admin_reseller";

export function adminHierarchyNewMissingFlashItems(sp: { error?: string }, kind: AdminHierarchyNewKind): FlashToastItem[] {
  if (sp.error !== "missing") return [];
  const message =
    kind === "manager"
      ? "Name, username, and password are required."
      : kind === "admin_dealer"
        ? "Name, username, password, and parent reseller are required."
        : "Name, username, password, and manager are required.";
  return [{ type: "error", message }];
}

export function staffCreateCreditFlashItems(sp: { error?: string; bal?: string; req?: string }): FlashToastItem[] {
  const msg = staffCreateCreditFlashMessage(sp);
  return msg ? [{ type: "error", message: msg }] : [];
}

function staffCreateCreditFlashMessage(sp: { error?: string; bal?: string; req?: string }): string | null {
  const e = sp.error;
  if (e === "credits_required") return "Select an initial credit amount before creating the account.";
  if (e === "credits_balance") {
    return `Not enough credits for this operation (remaining ${sp.bal ?? "0"}, required ${sp.req ?? "?"}).`;
  }
  if (e === "credits_invalid") return "Choose valid credit values.";
  if (e === "credits_db") return operatorCopy.creditTransactionFailed;
  return null;
}

export function managerResellerNewFlashItems(
  sp: { error?: string; bal?: string; req?: string },
  creditBalanceLabel: string,
): FlashToastItem[] {
  const creditMsg = staffCreateCreditFlashMessage(sp);
  if (creditMsg) return [{ type: "error", message: creditMsg }];
  const e = sp.error;
  if (!e) return [];
  const msg =
    e === "missing"
      ? "Name, username, and password are required."
      : e === "password_mismatch"
        ? "Password and confirm password must match."
      : e === "username"
        ? "Username is invalid. Use letters, numbers, and underscores only (billing rules)."
        : e === "password"
          ? "Password must be between 3 and 50 characters."
          : e === "credits"
            ? `You need at least 1 credit on your manager account to create a reseller (current balance: ${creditBalanceLabel}).`
            : e === "taken"
              ? "That username is already taken."
              : e === "db"
                ? "Could not create the account. Try again or check server logs."
                : null;
  return msg ? [{ type: "error", message: msg }] : [];
}

export function managerDealerNewFlashItems(sp: { error?: string; bal?: string; req?: string }): FlashToastItem[] {
  const creditMsg = staffCreateCreditFlashMessage(sp);
  if (creditMsg) return [{ type: "error", message: creditMsg }];
  const e = sp.error;
  if (!e) return [];
  const msg =
    e === "missing"
      ? "Name, username, password, and parent reseller are required."
      : e === "password_mismatch"
        ? "Password and confirm password must match."
      : e === "username"
        ? "Username is invalid. Use 3–50 letters or numbers only."
        : e === "password"
          ? "Password must be between 3 and 50 characters."
          : e === "reseller"
            ? "Choose a reseller that belongs to your manager account."
            : e === "taken"
              ? "That username is already taken."
              : e === "db"
                ? "Could not create the account. Try again or check server logs."
                : null;
  return msg ? [{ type: "error", message: msg }] : [];
}

export function portalTicketCreateFlashItems(sp: { error?: string }): FlashToastItem[] {
  if (sp.error === "validation") {
    return [{ type: "error", message: "Please fill priority, category, channel, channel number, and subject." }];
  }
  if (sp.error === "db") {
    return [
      {
        type: "error",
        message: "Could not save the ticket. Try again or contact support.",
      },
    ];
  }
  return [];
}

export function ticketDetailFlashItems(sp: { ok?: string; error?: string }): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok === "comment") items.push({ type: "success", message: "Comment added." });
  if (sp.error === "comment") items.push({ type: "error", message: "Comment is required." });
  if (sp.error === "fixed") items.push({ type: "error", message: "This ticket is already completed." });
  if (sp.error === "validation") items.push({ type: "error", message: "Invalid priority or status." });
  if (sp.error === "db") {
    items.push({
      type: "error",
      message: "Could not complete that action. Try again or contact support.",
    });
  }
  return items;
}

export function portalTicketListFlashItems(sp: { ok?: string; error?: string }): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok === "created") items.push({ type: "success", message: "Ticket was created." });
  if (sp.ok === "complete") items.push({ type: "success", message: "Ticket marked completed." });
  if (sp.ok === "reopened") items.push({ type: "success", message: "Ticket was reopened." });
  if (sp.ok === "updated") items.push({ type: "success", message: "Ticket was updated." });
  if (sp.ok === "deleted") items.push({ type: "success", message: "Ticket was deleted." });
  if (sp.error === "ticket") items.push({ type: "error", message: "Invalid ticket." });
  return items;
}

export function adminProfilePasswordFlashItems(sp: { error?: string }): FlashToastItem[] {
  const e = sp.error;
  if (!e) return [];
  const message =
    e === "match"
      ? "New passwords do not match."
      : e === "old"
        ? "Current password is incorrect."
        : e === "old_len"
          ? "Current password must be between 3 and 100 characters."
          : e === "new_len"
            ? "New password must be between 4 and 12 characters."
            : null;
  return message ? [{ type: "error", message }] : [];
}

export type NewEndUserFlashVariant =
  | "admin"
  | "manager"
  | "dealer"
  | "reseller"
  | "manager_dealer_nested"
  | "reseller_dealer_nested";

const NEW_USER_ERRORS: Record<NewEndUserFlashVariant, Record<string, string>> = {
  admin: {
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Reseller or dealer selection is invalid.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
  },
  manager: {
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Reseller or dealer selection failed validation.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
    missing_hierarchy: "Select a reseller owned by your manager account.",
    forbidden: "That reseller or dealer is not in your hierarchy.",
    forbidden_dealer: "The dealer does not belong to the selected reseller.",
  },
  dealer: {
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Your dealer account is not linked to a reseller. Contact your administrator.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
  },
  reseller: {
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Reseller account is not valid for billing.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
  },
  manager_dealer_nested: {
    missing_dealer: "Dealer context was missing. Use Add user from that dealer’s list.",
    missing_hierarchy: "Hierarchy was incomplete.",
    forbidden: "You do not have access to create users for this dealer.",
    forbidden_dealer: "That dealer is not under the expected reseller in your tree.",
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Owner accounts are not valid for billing.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
  },
  reseller_dealer_nested: {
    missing_dealer: "Dealer context was missing. Use the Add user link from the dealer’s user list.",
    stalker_required: "TV platform connection is not configured. Contact your administrator.",
    invalid: "Check login (lowercase alphanumeric), password (4–100 chars), and MAC format (AA:BB:CC:DD:EE:FF).",
    duplicate_login: "That login is already in use.",
    duplicate_mac: "That MAC is already registered.",
    bad_owner: "Reseller account is not valid for billing.",
    bad_package: "Choose a valid package (tariff plan).",
    bad_validity: "That validity option is not allowed.",
    db: operatorCopy.createUserFailed,
  },
};

function insufficientCreditsMessage(
  variant: NewEndUserFlashVariant,
  bal: string | undefined,
  req: string | undefined,
): string {
  const b = bal ?? "0";
  const r = req ?? "?";
  switch (variant) {
    case "admin":
      return `The selected reseller/dealer does not have enough credits (remaining ${b}, need ${r} months).`;
    case "manager":
      return `Not enough credits on the debited account (remaining ${b}, need ${r} months). Credits are taken from the dealer if selected, otherwise the reseller.`;
    case "dealer":
      return `Not enough credits on your dealer balance (remaining ${b}, need ${r} months).`;
    case "reseller":
      return `Not enough credits on your reseller balance (remaining ${b}, need ${r} months).`;
    case "manager_dealer_nested":
    case "reseller_dealer_nested":
      return `Not enough credits (remaining ${b}, need ${r} months).`;
    default:
      return `Not enough credits (remaining ${b}, need ${r} months).`;
  }
}

export function newEndUserCreationFlashItems(
  sp: { error?: string; bal?: string; req?: string },
  variant: NewEndUserFlashVariant,
): FlashToastItem[] {
  const e = sp.error;
  if (!e) return [];
  if (e === "no_credits") {
    return [{ type: "error", message: PORTAL_ADD_USER_NO_CREDITS_TITLE }];
  }
  if (e === "insufficient_credits") {
    return [{ type: "error", message: insufficientCreditsMessage(variant, sp.bal, sp.req) }];
  }
  const table = NEW_USER_ERRORS[variant];
  const message = table[e] ?? `Could not create user (${e}).`;
  return [{ type: "error", message }];
}

export type OperatorUserEditFlashSp = {
  ok?: string;
  error?: string;
  bal?: string;
  req?: string;
  max?: string;
  renew_acc?: string;
};

/** Manager / reseller / dealer subscriber edit page — URL flash → Sonner items. */
export function operatorUserEditFlashItems(sp: OperatorUserEditFlashSp): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  const bal = sp.bal != null && sp.bal !== "" ? sp.bal : "0";
  const req = sp.req != null && sp.req !== "" ? sp.req : "?";
  const maxM = sp.max != null && sp.max !== "" ? sp.max : "0";

  if (sp.ok === "1") items.push({ type: "success", message: "Saved." });
  if (sp.ok === "msg") items.push({ type: "success", message: "Message queued." });
  if (sp.ok === "renew") {
    items.push({ type: "success", message: "Subscription extended (credits debited from your operator balance)." });
  }
  if (sp.ok === "renew_trial") items.push({ type: "success", message: "Free trial applied (no credits debited)." });
  if (sp.ok === "renew_recover") {
    items.push({ type: "success", message: operatorCopy.creditsRecovered });
  }
  if (sp.ok === "activated") items.push({ type: "success", message: "STB box was activated successfully." });
  if (sp.ok === "blocked") items.push({ type: "success", message: "STB box was blocked successfully." });
  if (sp.ok === "reset") items.push({ type: "success", message: operatorCopy.deviceResetSuccess });
  if (sp.ok === "deleted_user") items.push({ type: "success", message: "User account was deleted." });

  if (sp.error === "save") items.push({ type: "error", message: operatorCopy.saveFailed });
  if (sp.error === "msg_empty") items.push({ type: "error", message: "Message is required." });
  if (sp.error === "msg_stalker") {
    items.push({ type: "error", message: operatorCopy.deviceMessagingNotConfigured });
  }
  if (sp.error === "msg_events") {
    items.push({ type: "error", message: operatorCopy.deviceMessagingUnavailable });
  }
  if (sp.error === "msg_no_user") items.push({ type: "error", message: operatorCopy.deviceMessageNoProfile });
  if (sp.error === "msg_db") items.push({ type: "error", message: operatorCopy.dbError });

  const statusQuickErrMsg = portalUsersStatusQuickErrorMessage(sp.error);
  if (statusQuickErrMsg) items.push({ type: "error", message: statusQuickErrMsg });

  if (sp.error === "renew_invalid") {
    items.push({
      type: "error",
      message:
        "Renew or recover request was invalid. Check validity (1–24 or free trial) or credits (1–2000).",
    });
  }
  if (sp.error === "renew_credits") {
    items.push({
      type: "error",
      message: `Not enough credits on your balance to renew (remaining: ${bal}, required: ${req}).`,
    });
  }
  if (sp.error === "renew_recover_credits") {
    items.push({
      type: "error",
      message: `Cannot recover that many credits (remaining recoverable: ${bal}, requested: ${req}).`,
    });
  }
  if (sp.error === "renew_recover_disabled") {
    items.push({
      type: "error",
      message: "Credit recovery is turned off in admin Credit deductions (Recover bonus credit).",
    });
  }
  if (sp.error === "renew_rcdt_reseller") {
    items.push({
      type: "error",
      message: `You cannot recover ${req} credits (maximum recoverable: ${maxM} months).`,
    });
  }
  if (sp.error === "renew_no_summarize") {
    items.push({ type: "error", message: operatorCopy.renewNoCreditSummary });
  }
  if (sp.error === "renew_no_stalker") {
    items.push({ type: "error", message: operatorCopy.renewNoDeviceService });
  }
  if (sp.error === "renew_no_stalker_user" || sp.error === "renew_stalker") {
    const m =
      portalUsersRenewListErrorMessage({ error: sp.error, renew_acc: sp.renew_acc, bal: sp.bal, req: sp.req, max: sp.max }) ??
      operatorCopy.renewNoDeviceProfile();
    items.push({ type: "error", message: m });
  }
  if (sp.error === "renew_trial_used") items.push({ type: "error", message: "This MAC has already used a free trial." });
  if (sp.error === "renew_trial_limit") {
    items.push({ type: "error", message: "Free trial usage limit exceeded for this MAC." });
  }
  if (sp.error === "renew_db") items.push({ type: "error", message: operatorCopy.renewFailed });

  if (sp.error === "renew_quick_invalid") {
    const m = portalUsersRenewListErrorMessage(sp) ?? "Quick renew failed.";
    items.push({ type: "error", message: m });
  }

  const resetErrMsg = portalUsersResetListErrorMessage(sp.error);
  if (resetErrMsg) items.push({ type: "error", message: resetErrMsg });
  const deleteErrMsg = portalUsersDeleteListErrorMessage(sp.error);
  if (deleteErrMsg) items.push({ type: "error", message: deleteErrMsg });

  return items;
}

export const OPERATOR_USER_EDIT_FLASH_STRIP = ["ok", "error", "bal", "req", "max", "renew_acc"] as const;
