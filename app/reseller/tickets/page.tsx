import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketsListRedirect, type TicketsListLegacySearchParams } from "@/lib/tickets/ticketsListRedirect";

type Props = { searchParams?: Promise<TicketsListLegacySearchParams> };

export default async function ResellerTicketsPage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?next=/reseller/tickets/dashboard");
  redirect(ticketsListRedirect("/reseller", (await searchParams) ?? {}));
}
