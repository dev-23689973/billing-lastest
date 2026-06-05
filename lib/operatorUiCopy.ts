/** Production operator-facing strings (no PHP / schema / env jargon). */

export const operatorCopy = {
  deviceResetSuccess: "Device bindings cleared. The set-top box can be paired again.",
  deviceResetNoService: "Device service is not configured. Contact your administrator.",
  deviceResetNoProfile: "No device profile found for this account.",
  deviceResetFailed: "Could not clear device bindings. Try again or contact support.",

  deviceRebootSuccess: "Reboot queued. The set-top box will restart on its next check-in.",
  deviceRebootNoService: "Device service is not configured. Contact your administrator.",
  deviceRebootNoProfile: "No device profile found for this account.",
  deviceRebootNoEvents: "Device reboot is not available on this installation. Contact your administrator.",
  deviceRebootFailed: "Could not queue reboot. Try again or contact support.",

  subscriptionExtended: "Subscription extended by one month.",
  freeTrialApplied: "Free trial applied.",
  creditsRecovered: "Credits recovered and subscription shortened.",
  accountDeleted: "User account was deleted successfully.",

  deviceMessagingUnavailable:
    "Device messaging is not available on this installation. Contact your administrator.",
  deviceMessagingNotConfigured:
    "TV platform connection is not configured. Contact your administrator.",
  deviceMessagingNoRecipients:
    "No recipients matched this audience. Subscriber accounts must be linked to a device profile.",
  deviceMessageQueued: "Message queued for delivery on the next device check-in.",
  deviceMessageNoProfile: "This account is not linked to a device profile.",
  deviceMessageRequired: "Message is required.",

  packagesUnavailable: "No subscription packages are available. Contact your administrator.",
  ticketCategoriesUnavailable:
    "No channel categories are available. Contact your administrator to configure the TV platform.",

  customAddonsOnCreate: "Optional add-on channels are saved when the account is created.",
  customAddonsOnCustomPlan:
    "Available only when the selected package is the custom plan. Add-ons are saved with the account.",

  resetStbHelp:
    "Clears device ID, serial number, and access token so the set-top box can be paired again on the next login.",

  sendMessageHelp: "Queued for delivery when the device checks in.",
  renewRecoverHelp:
    "Renew extends the subscription and debits the owner. Recover returns unused credits up to the recoverable limit.",

  insufficientOwnerCredits: (remaining: string, required: string) =>
    `The account owner does not have enough credits (remaining ${remaining}, need ${required} months).`,

  insufficientCredits: (remaining: string, required: string) =>
    `Not enough credits (remaining ${remaining}, need ${required} months).`,

  dbError: "Something went wrong. Try again or contact support.",
  loginDbError: "Something went wrong. Please try again or contact support.",
  createUserFailed: "Could not create the user. No account was created. Try again or contact support.",
  creditTransactionFailed: "Credit transaction failed. Try again or contact support.",
  renewFailed: "Renew or recover failed. Try again or contact support.",
  creditsLoadFailed: "Credits data failed to load. Close and try again in a moment.",
  creditsApplyFailed: "Could not apply credits. Try again or contact support.",
  loginCredentials: "Invalid username or password.",

  deleteNoDeviceService: "Device service is not configured. Contact your administrator.",
  deleteNoDeviceProfile: "No device profile found for this account.",
  statusNoDeviceService: "Device service is not configured. Contact your administrator.",
  statusNoDeviceProfile: "No device profile found for this account.",

  renewNoCreditSummary: "Renew failed: credit summary is missing for this account.",
  renewNoDeviceService: "Renew failed: TV platform is not configured. Contact your administrator.",
  renewNoDeviceProfile: (accountId?: string) =>
    accountId
      ? `Renew failed: no device profile found for account ${accountId}. Create or sync the subscriber on the TV platform.`
      : "Renew failed: no device profile found for this account. Create or sync the subscriber on the TV platform.",

  ownerChainInvalid:
    "Pick a valid reseller, or a dealer that belongs to that reseller.",
  parentPinInvalid: "Parent PIN must be exactly four digits.",
  savePackagesFailed:
    "Account saved, but add-on packages could not be updated. Contact your administrator.",
  saveFailed: "Could not save changes. Try again or contact support.",

  stbPollDelivery: "Devices receive messages on their next check-in.",
} as const;

/** Message compose / history page flash errors (admin + portal). */
export function messagePageFlashError(code: string | undefined): string | null {
  switch (code) {
    case "empty":
      return operatorCopy.deviceMessageRequired;
    case "empty_title":
      return "Enter a message title.";
    case "events_table":
      return operatorCopy.deviceMessagingUnavailable;
    case "stalker":
      return operatorCopy.deviceMessagingNotConfigured;
    case "none_selected":
      return "Choose at least one recipient when using custom selection.";
    case "no_recipients":
      return operatorCopy.deviceMessagingNoRecipients;
    default:
      return null;
  }
}

/** Portal message pages — extends admin errors with role-specific codes. */
export function portalMessagePageFlashError(code: string | undefined): string | null {
  if (code === "none_selected") {
    return "Choose at least one customer when using custom selection.";
  }
  const base = messagePageFlashError(code);
  if (base) return base;
  switch (code) {
    case "invalid_audience":
      return "That audience is not available for your role.";
    case "messaging_disabled":
      return "Your reseller has disabled subscriber messaging for this account.";
    case "forbidden":
      return "That action is not allowed for your role.";
    default:
      return null;
  }
}
