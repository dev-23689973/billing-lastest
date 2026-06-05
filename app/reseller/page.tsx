import { redirect } from "next/navigation";

import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";
import { getSession } from "@/lib/session";

export default async function ResellerDashboardPage() {
  const s = await getSession();
  if (!s || s.type !== "SRSLR") redirect("/login?error=forbidden");

  return (
    <DashboardPageContent
      scope="reseller"
      resellerUsername={s.username}
      portalBase="/reseller"
    />
  );
}
