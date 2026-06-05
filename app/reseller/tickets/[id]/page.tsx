import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketDetailRedirect } from "@/lib/tickets/ticketsListRedirect";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

export default async function ResellerTicketDetailPage({ params, searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?next=/reseller/tickets/dashboard");

  const { id: rawId } = await params;
  const ticketId = Number(decodeURIComponent(rawId));
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    redirect("/reseller/tickets/dashboard?error=ticket");
  }

  redirect(ticketDetailRedirect("/reseller", ticketId, (await searchParams) ?? {}));
}
