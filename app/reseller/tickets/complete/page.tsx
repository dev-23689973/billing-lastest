import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketsListRedirect, type TicketsListLegacySearchParams } from "@/lib/tickets/ticketsListRedirect";

type Props = { searchParams?: Promise<TicketsListLegacySearchParams> };

export default async function ResellerTicketsCompletePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?next=/reseller/tickets/dashboard");
  const sp = (await searchParams) ?? {};
  redirect(ticketsListRedirect("/reseller", { ...sp, filter: "completed" }));
}
