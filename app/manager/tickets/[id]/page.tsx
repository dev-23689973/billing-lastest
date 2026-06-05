import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketDetailRedirect } from "@/lib/tickets/ticketsListRedirect";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string; error?: string }>;
};

export default async function ManagerTicketDetailPage({ params, searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?next=/manager/tickets/dashboard");

  const { id: rawId } = await params;
  const ticketId = Number(decodeURIComponent(rawId));
  if (!Number.isFinite(ticketId) || ticketId <= 0) {
    redirect("/manager/tickets/dashboard?error=ticket");
  }

  redirect(ticketDetailRedirect("/manager", ticketId, (await searchParams) ?? {}));
}
