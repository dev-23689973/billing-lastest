import type { SessionPayload } from "@/lib/session";
import { getCreditBalance } from "@/lib/repos/creditBalance";

export { PORTAL_ADD_USER_NO_CREDITS_TITLE } from "@/lib/portal/portalAddUserMessages";

/** Portal staff may create a subscriber only when the debit wallet has credits. */
export function portalStaffCanCreateSubscriber(debitCredits: number): boolean {
  return Number.isFinite(debitCredits) && Math.floor(debitCredits) > 0;
}

/**
 * Credits on the wallet debited for a new subscriber for this session.
 * For dealer-scoped lists, pass the dealer login (billing owner).
 */
export async function getPortalStaffSubscriberDebitCredits(
  session: SessionPayload,
  opts?: { dealerLogin?: string },
): Promise<number> {
  if (session.type === "ROOT") return Number.POSITIVE_INFINITY;
  const dealer = (opts?.dealerLogin ?? "").trim();
  if (dealer) return getCreditBalance(dealer);
  if (session.type === "MNGR" || session.type === "SRSLR" || session.type === "RSLR") {
    return getCreditBalance(session.username);
  }
  return 0;
}
