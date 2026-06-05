import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ticketsListRedirect, type TicketsListLegacySearchParams } from "@/lib/tickets/ticketsListRedirect";

type Props = { searchParams?: Promise<TicketsListLegacySearchParams> };

export default async function DealerTicketsCompletePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "RSLR") redirect("/login?next=/dealer/tickets/dashboard");
  const sp = (await searchParams) ?? {};
  redirect(ticketsListRedirect("/dealer", { ...sp, filter: "completed" }));
}
