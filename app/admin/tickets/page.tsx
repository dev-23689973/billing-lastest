import { redirect } from "next/navigation";
import { ticketsListRedirect, type TicketsListLegacySearchParams } from "@/lib/tickets/ticketsListRedirect";

type Props = { searchParams?: Promise<TicketsListLegacySearchParams> };

/** Legacy `/admin/tickets` → ticket queue dashboard (alerts “All tickets”, bookmarks). */
export default async function AdminTicketsLegacyRedirect({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  redirect(ticketsListRedirect("/admin", sp));
}
