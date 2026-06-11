import { PageHeader } from "@/components/admin/PageHeader";
import { AdminTransactionsClient } from "@/components/admin/AdminTransactionsClient";
import { loadOperatorTransactionsPageData } from "@/lib/server/loadOperatorTransactionsPageData";
import { getSession } from "@/lib/session";

export default async function TransactionsPage() {
  const session = await getSession();
  const username = session?.username ?? "";
  const isAdminLedger = session?.type === "ROOT";
  const { walletBalance, creditFlow, rows } = await loadOperatorTransactionsPageData(username);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Transactions" breadcrumb="Home › Transactions" />
      <AdminTransactionsClient
        rows={rows}
        creditFlow={creditFlow}
        walletBalance={walletBalance}
        ledgerUsername={username}
        ledgerDisplayName={session?.displayName}
        isAdminLedger={isAdminLedger}
      />
    </div>
  );
}
