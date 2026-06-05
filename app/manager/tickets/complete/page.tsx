import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketsListRedirect, type TicketsListLegacySearchParams } from "@/lib/tickets/ticketsListRedirect";

type Props = { searchParams?: Promise<TicketsListLegacySearchParams> };

export default async function ManagerTicketsCompletePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?next=/manager/tickets/dashboard");
  const sp = (await searchParams) ?? {};
  redirect(ticketsListRedirect("/manager", { ...sp, filter: "completed" }));
}
