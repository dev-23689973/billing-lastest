import { redirect } from "next/navigation";
import { getPortalTicketScope, type PortalTicketRole } from "@/lib/repos/tickets";

/** Redirect portal users who cannot create tickets away from `/tickets/create`. */
export async function guardPortalTicketsCreatePage(
  username: string,
  role: PortalTicketRole,
  base: "/manager" | "/reseller" | "/dealer",
) {
  const scope = await getPortalTicketScope(username, role);
  if (!scope?.canCreateTickets) {
    redirect(`${base}/tickets/dashboard`);
  }
}
