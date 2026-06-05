import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TicketsCreateView } from "@/components/admin/TicketsCreateView";
import { createPortalTicketAction } from "@/actions/forms";
import { guardPortalTicketsCreatePage } from "@/lib/tickets/guardTicketsCreatePage";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function DealerTicketsCreatePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "RSLR") redirect("/login?next=/dealer/tickets/create");
  await guardPortalTicketsCreatePage(s.username, "RSLR", "/dealer");

  const sp = (await searchParams) ?? {};
  return <TicketsCreateView portalBase="/dealer" createAction={createPortalTicketAction} flash={sp} />;
}
