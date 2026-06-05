import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";

export default async function DashboardPage() {
  return <DashboardPageContent scope="admin" portalBase="/admin" />;
}
