import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import {
  getPortalStaffSubscriberDebitCredits,
  portalStaffCanCreateSubscriber,
} from "@/lib/portal/portalStaffCreateSubscriber";

/** Redirect portal staff to the users list when the debit wallet has no credits. */
export async function requirePortalStaffCanCreateSubscriber(
  session: SessionPayload,
  usersListPath: string,
  opts?: { dealerLogin?: string },
): Promise<void> {
  const credits = await getPortalStaffSubscriberDebitCredits(session, opts);
  if (!portalStaffCanCreateSubscriber(credits)) {
    redirect(`${usersListPath}?error=no_credits`);
  }
}
