import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TicketsCreateView } from "@/components/admin/TicketsCreateView";
import { createPortalTicketAction } from "@/actions/forms";
import { guardPortalTicketsCreatePage } from "@/lib/tickets/guardTicketsCreatePage";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function ResellerTicketsCreatePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?next=/reseller/tickets/create");
  await guardPortalTicketsCreatePage(s.username, "SRSLR", "/reseller");

  const sp = (await searchParams) ?? {};
  return <TicketsCreateView portalBase="/reseller" createAction={createPortalTicketAction} flash={sp} />;
}
