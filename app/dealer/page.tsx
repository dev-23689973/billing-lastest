import { redirect } from "next/navigation";

import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";
import { getSession } from "@/lib/session";

export default async function DealerDashboardPage() {
  const s = await getSession();
  if (!s || s.type !== "RSLR") redirect("/login?error=forbidden");

  return (
    <DashboardPageContent
      scope="dealer"
      dealerUsername={s.username}
      portalBase="/dealer"
    />
  );
}
