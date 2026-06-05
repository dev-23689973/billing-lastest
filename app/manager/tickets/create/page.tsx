import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TicketsCreateView } from "@/components/admin/TicketsCreateView";
import { createPortalTicketAction } from "@/actions/forms";
import { guardPortalTicketsCreatePage } from "@/lib/tickets/guardTicketsCreatePage";

type Props = { searchParams?: Promise<{ error?: string }> };

export default async function ManagerTicketsCreatePage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "MNGR") redirect("/login?next=/manager/tickets/create");
  await guardPortalTicketsCreatePage(s.username, "MNGR", "/manager");

  const sp = (await searchParams) ?? {};
  return <TicketsCreateView portalBase="/manager" createAction={createPortalTicketAction} flash={sp} />;
}
