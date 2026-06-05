import type { FlashToastItem } from "@/components/FlashToasts";
import {
  adminStaffCreateSuccessFlashItems,
  adminStaffListFlashItems,
  adminStaffPasswordResetFlashItems,
  adminUserDetailFlashItems,
} from "@/lib/adminInlineFlashToasts";
import { operatorCopy } from "@/lib/operatorUiCopy";
import { portalSubscriberListFlashItems } from "@/lib/portalSubscriberListFlashes";
import {
  adminHierarchyNewMissingFlashItems,
  adminProfilePasswordFlashItems,
  managerDealerNewFlashItems,
  managerResellerNewFlashItems,
  newEndUserCreationFlashItems,
  portalTicketCreateFlashItems,
  portalTicketListFlashItems,
  staffCreateCreditFlashItems,
  ticketDetailFlashItems,
  type NewEndUserFlashVariant,
} from "@/lib/urlFlashToasts";

export type BillingUrlFlashSp = Record<string, string | undefined>;

function spRecord(params: URLSearchParams): BillingUrlFlashSp {
  const out: BillingUrlFlashSp = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function dedupeItems(items: FlashToastItem[]): FlashToastItem[] {
  return items.filter(
    (item, idx, arr) => arr.findIndex((x) => x.type === item.type && x.message === item.message) === idx,
  );
}

function settingsFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  return [
    ...(sp.ok ? [{ type: "success" as const, message: "Saved." }] : []),
    ...(sp.error === "nosettings"
      ? [{ type: "error" as const, message: "Settings could not be loaded. Contact your administrator." }]
      : []),
    ...(sp.error === "validation"
      ? [
          {
            type: "error" as const,
            message:
              "Check fields: title (3–50 characters), global max add credit (1–1,000,000), minimums ≤ global max, default PIN (4 digits), retry trial count (0 or more).",
          },
        ]
      : []),
    ...(sp.error === "match" ? [{ type: "error" as const, message: "New passwords do not match." }] : []),
    ...(sp.error === "old" ? [{ type: "error" as const, message: "Current password is incorrect." }] : []),
    ...(sp.error === "old_len"
      ? [{ type: "error" as const, message: "Current password must be between 3 and 100 characters." }]
      : []),
    ...(sp.error === "new_len"
      ? [{ type: "error" as const, message: "New password must be between 4 and 12 characters." }]
      : []),
  ];
}

function deductionsFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  if (sp.ok) return [{ type: "success", message: "Credit deduction rules saved." }];
  if (sp.error) {
    return [{ type: "error", message: decodeURIComponent(sp.error) }];
  }
  return [];
}

function bonusRulesFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.ok) {
    items.push({
      type: "success",
      message: "Bonus rules saved",
      description: "Promo tiers are stored in billing configs and apply on the next add-credit action.",
    });
  }
  if (sp.error) {
    items.push({ type: "error", message: "Could not save", description: decodeURIComponent(sp.error) });
  }
  return items;
}

function messageFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  const errCode = sp.error;
  const okVal = sp.ok;
  const staffN = sp.n;
  const err =
    errCode === "empty"
      ? "Message is required."
      : errCode === "empty_title"
        ? "Title is required."
        : errCode === "none_selected"
          ? "Select at least one recipient."
          : errCode === "no_recipients"
            ? operatorCopy.deviceMessagingUnavailable
            : errCode === "events_table"
              ? operatorCopy.deviceMessagingUnavailable
              : errCode === "stalker"
                ? operatorCopy.deviceMessagingNotConfigured
                : errCode === "messaging_disabled"
                  ? "Messaging is disabled for your role."
                  : errCode === "forbidden"
                    ? "That action is not allowed for your role."
                    : errCode
                      ? `Could not send message (${errCode}).`
                      : null;

  return [
    ...(okVal === "staff"
      ? [
          {
            type: "success" as const,
            message: "Portal staff message sent",
            description: staffN
              ? `${staffN} staff member(s) will see a popup on next login until dismissed.`
              : "Recipients will see a popup on next login until dismissed.",
          },
        ]
      : []),
    ...(okVal === "stb" || okVal === "1"
      ? [
          {
            type: "success" as const,
            message: "STB message queued",
            description: operatorCopy.stbPollDelivery,
          },
        ]
      : []),
    ...(err ? [{ type: "error" as const, message: err }] : []),
  ];
}

function loginFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  const items: FlashToastItem[] = [];
  if (sp.error === "forbidden") items.push({ type: "error", message: "You do not have access to that page." });
  if (sp.error === "session") items.push({ type: "error", message: "Your session expired. Sign in again." });
  if (sp.ok === "password") items.push({ type: "success", message: "Password updated. Sign in with your new password." });
  if (sp.logout === "1") items.push({ type: "success", message: "You have been signed out." });
  return items;
}

function staffHubFlashes(pathname: string, sp: BillingUrlFlashSp): FlashToastItem[] {
  const staffNew =
    sp.staff_new === "manager"
      ? adminHierarchyNewMissingFlashItems(sp, "manager")
      : sp.staff_new === "reseller"
        ? adminHierarchyNewMissingFlashItems(sp, "admin_reseller")
        : sp.staff_new === "dealer"
          ? adminHierarchyNewMissingFlashItems(sp, "admin_dealer")
          : [];

  const items = [
    ...staffNew,
    ...adminStaffCreateSuccessFlashItems(sp),
    ...adminStaffPasswordResetFlashItems(sp),
    ...adminStaffListFlashItems(sp, "manager"),
    ...adminStaffListFlashItems(sp, "reseller"),
    ...adminStaffListFlashItems(sp, "dealer"),
  ];

  if (pathname.startsWith("/manager/resellers")) {
    items.push(...managerResellerNewFlashItems(sp, sp.bal ?? "0"));
    if (sp.ok === "created_reseller") items.push({ type: "success", message: "Reseller account created." });
    if (sp.ok === "deleted") items.push({ type: "success", message: "Reseller account deleted." });
  }
  if (pathname.startsWith("/manager/dealers")) {
    items.push(...managerDealerNewFlashItems(sp));
    if (sp.ok === "created_dealer") items.push({ type: "success", message: "Dealer account created." });
    if (sp.ok === "deleted") items.push({ type: "success", message: "Dealer account deleted." });
  }
  if (pathname.startsWith("/reseller/dealers")) {
    items.push(...staffCreateCreditFlashItems(sp));
    if (sp.ok === "created") items.push({ type: "success", message: "Dealer account created." });
    if (sp.ok === "deleted") items.push({ type: "success", message: "Dealer account deleted." });
  }

  return items;
}

function userListFlashes(pathname: string, sp: BillingUrlFlashSp): FlashToastItem[] {
  let variant: NewEndUserFlashVariant = "admin";
  if (pathname.startsWith("/manager/dealers/") && pathname.includes("/users")) variant = "manager_dealer_nested";
  else if (pathname.startsWith("/manager/")) variant = "manager";
  else if (pathname.startsWith("/reseller/dealers/") && pathname.includes("/users")) variant = "reseller_dealer_nested";
  else if (pathname.startsWith("/reseller/")) variant = "reseller";
  else if (pathname.startsWith("/dealer/")) variant = "dealer";

  return [
    ...portalSubscriberListFlashItems(sp),
    ...newEndUserCreationFlashItems(sp, variant),
    ...(sp.ok === "user_saved" ? [{ type: "success" as const, message: "User profile updated successfully." }] : []),
  ];
}

function ticketFlashes(sp: BillingUrlFlashSp): FlashToastItem[] {
  const items = [
    ...portalTicketListFlashItems(sp),
    ...ticketDetailFlashItems(sp),
    ...portalTicketCreateFlashItems(sp),
  ];
  if (sp.error === "create_disabled") {
    items.push({ type: "error", message: "Ticket creation is disabled in settings." });
  }
  return items;
}

/** Build Sonner flash items from the current URL (client-side). */
export function resolveBillingUrlFlashes(pathname: string, searchParams: URLSearchParams): FlashToastItem[] {
  const sp = spRecord(searchParams);
  let items: FlashToastItem[] = [];

  if (pathname.startsWith("/admin/settings")) items.push(...settingsFlashes(sp));
  else if (pathname.startsWith("/admin/deductions")) items.push(...deductionsFlashes(sp));
  else if (pathname.startsWith("/admin/bonus-rules")) items.push(...bonusRulesFlashes(sp));
  else if (pathname === "/login") items.push(...loginFlashes(sp));
  else if (pathname.includes("/tickets/dashboard") || /\/tickets\/?$/.test(pathname)) {
    items.push(...ticketFlashes(sp));
  } else if (pathname.includes("/tickets/create")) {
    items.push(...portalTicketCreateFlashItems(sp));
  } else if (pathname.includes("/message")) {
    items.push(...messageFlashes(sp));
  } else if (pathname.startsWith("/admin/managers")) {
    items.push(...staffHubFlashes(pathname, sp));
  } else if (
    pathname.startsWith("/manager/resellers") ||
    pathname.startsWith("/manager/dealers") ||
    pathname.startsWith("/reseller/dealers")
  ) {
    items.push(...staffHubFlashes(pathname, sp));
  } else if (/\/users\/[^/]+\/?$/.test(pathname) || /\/users\/[^/]+$/.test(pathname)) {
    if (pathname.startsWith("/admin/users/")) items.push(...adminUserDetailFlashItems(sp));
    else items.push(...userListFlashes(pathname, sp));
  } else if (pathname.endsWith("/users") || pathname.endsWith("/users/new")) {
    items.push(...userListFlashes(pathname, sp));
  } else if (pathname.endsWith("/profile")) {
    items.push(...adminProfilePasswordFlashItems(sp));
  } else {
    if (sp.ok === "1") items.push({ type: "success", message: "Saved." });
    items.push(...portalSubscriberListFlashItems(sp));
    items.push(...staffCreateCreditFlashItems(sp));
    items.push(...adminStaffCreateSuccessFlashItems(sp));
  }

  return dedupeItems(items);
}

export const BILLING_URL_FLASH_STRIP = [
  "ok",
  "error",
  "bal",
  "req",
  "staff_new",
  "credit_modal",
  "credit_user",
  "renew_acc",
  "max",
  "n",
  "channel",
  "account",
  "accounts",
  "logout",
] as const;
