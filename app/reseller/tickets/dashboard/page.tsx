import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PortalTicketsDashboard } from "@/components/portal/PortalTicketsDashboard";

type Props = {
  searchParams?: Promise<{ q?: string; status?: string; priority?: string; sort?: string; ticket?: string; page?: string; pageSize?: string }>;
};

export default async function ResellerTicketsDashboardPage({ searchParams }: Props) {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?next=/reseller/tickets/dashboard");
  const sp = (await searchParams) ?? {};

  return (
    <PortalTicketsDashboard portalBase="/reseller" filters={sp} viewer={{ type: s.type, username: s.username }} />
  );
}
