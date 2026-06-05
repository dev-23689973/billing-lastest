"use server";

import type { CredentialKind } from "@/lib/credentials/credentialRules";
import { credentialKindChecksAvailability } from "@/lib/credentials/credentialRules";
import {
  checkEndUserLoginAvailable,
  checkEndUserMacAvailable,
  checkStaffUsernameAvailable,
  type CredentialAvailabilityResult,
} from "@/lib/repos/credentialChecks";
import { getSession } from "@/lib/session";

export async function checkCredentialAvailabilityAction(input: {
  kind: CredentialKind;
  value: string;
}): Promise<CredentialAvailabilityResult | { available: false; reason: "forbidden" }> {
  const session = await getSession();
  if (!session) return { available: false, reason: "forbidden" };

  if (!credentialKindChecksAvailability(input.kind)) {
    return { available: true };
  }

  const value = String(input.value ?? "").trim();
  if (input.kind === "endUserLogin") {
    return checkEndUserLoginAvailable(value);
  }
  if (input.kind === "staffUsername") {
    return checkStaffUsernameAvailable(value);
  }

  return { available: true };
}

export async function checkMacAvailabilityAction(input: {
  mac: string;
  excludeAccount?: string;
}): Promise<CredentialAvailabilityResult | { available: false; reason: "forbidden" }> {
  const session = await getSession();
  if (!session) return { available: false, reason: "forbidden" };

  return checkEndUserMacAvailable(input.mac, input.excludeAccount);
}
