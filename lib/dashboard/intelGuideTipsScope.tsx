import type { IntelTip } from "@/components/dashboard/IntelGuideBadge";
import { IntelTipBody, INTEL_TIPS } from "@/components/dashboard/intelGuideTips";

export type DashboardIntelScope = "admin" | "manager" | "reseller" | "dealer";

export type DashboardIntelTips = typeof INTEL_TIPS;

const managerBranchPulse: IntelTip = {
  title: "Your network pulse",
  body: (
    <IntelTipBody
      summary="Counts and percentages for your manager subtree only — resellers and dealers you own, plus your subscriber base."
      items={[
        {
          label: "Resellers ring",
          description: "Resellers you manage. Share = resellers ÷ resellers + dealers in your branch.",
        },
        {
          label: "Dealers ring",
          description: "Dealers under your resellers.",
        },
        {
          label: "Users ring",
          description: (
            <>
              All subscriber accounts in your hierarchy (accounts linked to your resellers/dealers). % is relative to
              the three-ring total shown here.
            </>
          ),
        },
        {
          label: "Revenue & staying",
          description:
            "Revenue and staying rings use transactions and account expiry under your subtree — same formulas as admin, scoped to your operators and accounts.",
        },
        {
          label: "Right center",
          description: "Total subscribers under your management (not system-wide).",
        },
      ]}
    />
  ),
};

const managerQuadGauges: IntelTip = {
  title: "Your subscriber status",
  body: (
    <IntelTipBody
      summary="Four gauges for accounts in your reseller/dealer tree only. Percentages use your total subscriber count as the denominator."
      items={[
        {
          label: "Active / inactive / expired / expiring",
          description: "Same rules as admin (status ON/OFF, expires vs NOW), filtered to accounts in your hierarchy.",
        },
        {
          label: "Center pill",
          description: "Your total subscribers — not every account on the platform.",
        },
      ]}
    />
  ),
};

const managerCreditFlowTx: IntelTip = {
  title: "Transactions summary (your tree)",
  body: (
    <IntelTipBody
      summary="Credit in/out totals and wallet figures for your login, resellers, and dealers — not the whole system."
      items={[
        {
          label: "Credit in / out ribbons",
          description: "Daily credit flow for operators in your management tree.",
        },
        {
          label: "System wallet",
          description: "Sum of positive net balances for operators in your subtree.",
        },
        {
          label: "Promo pool",
          description:
            "Lifetime promotional bonus credits issued from your subtree. Excludes plain wallet balance.",
        },
      ]}
    />
  ),
};

const managerCreditFlowChart: IntelTip = {
  title: "Credit flow (your tree)",
  body: (
    <IntelTipBody
      summary="Mirrored credit in vs credit out chart for your manager, reseller, and dealer accounts."
      items={[
        {
          label: "Scope",
          description: "Each day buckets transactions for usernames under your management.",
        },
      ]}
    />
  ),
};

const managerTicketLifecycle: IntelTip = {
  title: "Your ticket queue",
  body: (
    <IntelTipBody
      summary="Ticket counts limited to tickets visible in your manager portal scope (same rules as the Tickets page)."
      items={[
        {
          label: "Statuses",
          description: "In progress, fixed, reopened, and other — filtered to tickets visible in your portal.",
        },
      ]}
    />
  ),
};

const managerMessageTraffic: IntelTip = {
  title: "Message traffic (your subscribers)",
  body: (
    <IntelTipBody
      summary="Device message volume for set-top boxes linked to accounts in your hierarchy."
      items={[
        {
          label: "Delivered / pending",
          description: "Same priority buckets as admin, but only for your subscribers' device logins.",
        },
      ]}
    />
  ),
};

const managerPackageDistribution: IntelTip = {
  title: "Package distribution (your subscribers)",
  body: (
    <IntelTipBody
      summary="Top subscription packages among your subscribers."
      items={[
        {
          label: "Bars",
          description: "Subscriber count per package, limited to your accounts (top 10).",
        },
      ]}
    />
  ),
};

const managerRecentTransactions: IntelTip = {
  title: "Recent transactions (your tree)",
  body: (
    <IntelTipBody
      summary="Latest five transactions where the operator username is you, a reseller you own, or a dealer under them."
      items={[
        {
          label: "Columns",
          description: "Same type/amount/promo/when rules as admin; rows are subtree-scoped.",
        },
      ]}
    />
  ),
};

const managerRecentTickets: IntelTip = {
  title: "Recent tickets (your scope)",
  body: (
    <IntelTipBody
      summary="Latest tickets visible to your manager account in the portal — not every ticket in the system."
      items={[
        {
          label: "Open link",
          description: "Links go to /manager/tickets for your queue.",
        },
      ]}
    />
  ),
};

const managerRecentMessages: IntelTip = {
  title: "Recent messages (your subscribers)",
  body: (
    <IntelTipBody
      summary="Latest device messages for set-top boxes tied to accounts in your hierarchy."
      items={[
        {
          label: "Recipient",
          description: "Subscriber login must fall under your reseller/dealer tree.",
        },
      ]}
    />
  ),
};

const managerExpiring: IntelTip = {
  title: "Expiring subscriptions (your tree)",
  body: (
    <IntelTipBody
      summary="Accounts in your hierarchy that will expire in the next 30 days, split into the same time buckets as admin."
      items={[
        {
          label: "At risk ($)",
          description: "180-day revenue proxy per account, same formula as admin but subtree accounts only.",
        },
      ]}
    />
  ),
};

const managerRecentUsers: IntelTip = {
  title: "Recent users (your tree)",
  body: (
    <IntelTipBody
      summary="Five newest subscriber accounts created under your hierarchy."
      items={[
        {
          label: "Hierarchy column",
          description: "Shows the owning reseller or dealer for each account.",
        },
      ]}
    />
  ),
};

const managerExpiredUsers: IntelTip = {
  title: "Expired users (your tree)",
  body: (
    <IntelTipBody
      summary="Five accounts in your tree that most recently passed their expiry date."
      items={[
        {
          label: "Use",
          description: "Prioritize renewals for subscribers under your resellers and dealers.",
        },
      ]}
    />
  ),
};

const managerTopReseller: IntelTip = {
  title: "Top resellers (yours)",
  body: (
    <IntelTipBody
      summary="All-time top five resellers you manage, ranked by revenue then subscribers."
      items={[
        {
          label: "Scope",
          description: "Only resellers assigned to your manager account.",
        },
      ]}
    />
  ),
};

const managerTopDealer: IntelTip = {
  title: "Top dealers (your tree)",
  body: (
    <IntelTipBody
      summary="All-time top five dealers under your resellers, ranked by revenue then subscribers."
      items={[
        {
          label: "Scope",
          description: "Dealers whose parent reseller belongs to you.",
        },
      ]}
    />
  ),
};

const managerDevicesOnline: IntelTip = {
  title: "Devices online (your subscribers)",
  body: (
    <IntelTipBody
      summary="Devices that checked in recently, counted only for accounts in your hierarchy."
      items={[
        {
          label: "Rule",
          description: "Same recent check-in window as admin, limited to your subscriber accounts.",
        },
      ]}
    />
  ),
};

const resellerBranchPulse: IntelTip = {
  title: "Your dealer pulse",
  body: (
    <IntelTipBody
      summary="Counts for your reseller subtree — dealers you own and subscribers under them."
      items={[
        {
          label: "Dealers ring",
          description: "Dealers you own. Share = dealers ÷ total in your branch.",
        },
        {
          label: "Users ring",
          description: "All subscriber accounts linked to your dealers. Shown at 100% as the outer subscriber total.",
        },
        {
          label: "Revenue & staying",
          description:
            "Revenue and staying rings use transactions and account expiry under your dealers — same formulas as admin, scoped to your accounts.",
        },
      ]}
    />
  ),
};

const resellerQuadGauges: IntelTip = {
  title: "Your subscriber status",
  body: (
    <IntelTipBody
      summary="Four gauges for accounts under your dealers only. Percentages use your total subscriber count as the denominator."
      items={[
        {
          label: "Active / inactive / expired / expiring",
          description: "Same rules as admin, filtered to accounts owned by your dealer logins.",
        },
        {
          label: "Center pill",
          description: "Your total subscribers — not every account on the platform.",
        },
      ]}
    />
  ),
};

const resellerCreditFlowTx: IntelTip = {
  title: "Transactions summary (your dealers)",
  body: (
    <IntelTipBody
      summary="Credit in/out totals for your login and dealers — not the whole system."
      items={[
        {
          label: "Credit in / out ribbons",
          description: "Daily credit flow for you and your dealers.",
        },
        {
          label: "System wallet",
          description: "Sum of positive net balances for you and your dealers.",
        },
        {
          label: "Promo pool",
          description:
            "Lifetime promotional bonus credits you issued to dealers.",
        },
      ]}
    />
  ),
};

const resellerCreditFlowChart: IntelTip = {
  title: "Credit flow (your dealers)",
  body: (
    <IntelTipBody
      summary="Mirrored credit in vs credit out chart for your reseller and dealer accounts."
      items={[
        {
          label: "Scope",
          description: "Each day buckets transactions for usernames under your reseller account.",
        },
      ]}
    />
  ),
};

const resellerMessageTraffic: IntelTip = {
  title: "Message traffic (your subscribers)",
  body: (
    <IntelTipBody
      summary="Device message volume for set-top boxes linked to accounts under your dealers."
      items={[
        {
          label: "Delivered / pending",
          description: "Same priority buckets as admin, but only for your subscribers' device logins.",
        },
      ]}
    />
  ),
};

const resellerPackageDistribution: IntelTip = {
  title: "Package distribution (your subscribers)",
  body: (
    <IntelTipBody
      summary="Top subscription packages among subscribers under your dealers."
      items={[
        {
          label: "Bars",
          description: "Subscriber count per package, limited to your accounts (top 10).",
        },
      ]}
    />
  ),
};

const resellerRecentTransactions: IntelTip = {
  title: "Recent transactions (your dealers)",
  body: (
    <IntelTipBody
      summary="Latest five transactions where the operator username is you or a dealer you own."
      items={[
        {
          label: "Columns",
          description: "Same type/amount/promo/when rules as admin; rows are subtree-scoped.",
        },
      ]}
    />
  ),
};

const resellerRecentMessages: IntelTip = {
  title: "Recent messages (your subscribers)",
  body: (
    <IntelTipBody
      summary="Latest device messages for set-top boxes tied to accounts under your dealers."
      items={[
        {
          label: "Recipient",
          description: "Subscriber login must fall under one of your dealers.",
        },
      ]}
    />
  ),
};

const resellerExpiring: IntelTip = {
  title: "Expiring subscriptions (your dealers)",
  body: (
    <IntelTipBody
      summary="Accounts under your dealers that will expire in the next 30 days, split into the same time buckets as admin."
      items={[
        {
          label: "At risk ($)",
          description: "180-day revenue proxy per account, same formula as admin but your subtree only.",
        },
      ]}
    />
  ),
};

const resellerRecentUsers: IntelTip = {
  title: "Recent users (your dealers)",
  body: (
    <IntelTipBody
      summary="Five newest subscriber accounts created under your dealers."
      items={[
        {
          label: "Hierarchy column",
          description: "Shows the owning dealer for each account.",
        },
      ]}
    />
  ),
};

const resellerExpiredUsers: IntelTip = {
  title: "Expired users (your dealers)",
  body: (
    <IntelTipBody
      summary="Five accounts under your dealers that most recently passed their expiry date."
      items={[
        {
          label: "Use",
          description: "Prioritize renewals for subscribers under your dealer network.",
        },
      ]}
    />
  ),
};

const resellerTopDealer: IntelTip = {
  title: "Top dealers (yours)",
  body: (
    <IntelTipBody
      summary="All-time top five dealers you manage, ranked by revenue then subscribers."
      items={[
        {
          label: "Scope",
          description: "Only dealers assigned to your reseller account.",
        },
      ]}
    />
  ),
};

const resellerDevicesOnline: IntelTip = {
  title: "Devices online (your subscribers)",
  body: (
    <IntelTipBody
      summary="Devices that checked in recently, counted only for accounts under your dealers."
      items={[
        {
          label: "Rule",
          description: "Same recent check-in window as admin, limited to your subscriber accounts.",
        },
      ]}
    />
  ),
};

const managerScopedTips: DashboardIntelTips = {
  ...INTEL_TIPS,
  branchPulse: managerBranchPulse,
  quadStatusGauges: managerQuadGauges,
  creditFlowTransactions: managerCreditFlowTx,
  creditFlowChart: managerCreditFlowChart,
  ticketLifecycle: managerTicketLifecycle,
  messageTraffic: managerMessageTraffic,
  packageDistribution: managerPackageDistribution,
  recentTransactions: managerRecentTransactions,
  recentTickets: managerRecentTickets,
  recentMessages: managerRecentMessages,
  expiringSubscriptions: managerExpiring,
  recentUsers: managerRecentUsers,
  expiredUsers: managerExpiredUsers,
  topOperatorsReseller: managerTopReseller,
  topOperatorsDealer: managerTopDealer,
  devicesOnline: managerDevicesOnline,
} as DashboardIntelTips;

const resellerScopedTips: DashboardIntelTips = {
  ...INTEL_TIPS,
  branchPulse: resellerBranchPulse,
  quadStatusGauges: resellerQuadGauges,
  creditFlowTransactions: resellerCreditFlowTx,
  creditFlowChart: resellerCreditFlowChart,
  messageTraffic: resellerMessageTraffic,
  packageDistribution: resellerPackageDistribution,
  recentTransactions: resellerRecentTransactions,
  recentMessages: resellerRecentMessages,
  expiringSubscriptions: resellerExpiring,
  recentUsers: resellerRecentUsers,
  expiredUsers: resellerExpiredUsers,
  topOperatorsDealer: resellerTopDealer,
  devicesOnline: resellerDevicesOnline,
} as DashboardIntelTips;

const dealerBranchPulse: IntelTip = {
  title: "Your subscriber pulse",
  body: (
    <IntelTipBody
      summary="Counts for your dealer account — subscribers you own under your login."
      items={[
        {
          label: "Users ring",
          description: "All billing accounts where accounts.username = your dealer login.",
        },
        {
          label: "Revenue & staying",
          description: "Transactions and expiry for your subscribers only — same formulas as admin, scoped to your accounts.",
        },
      ]}
    />
  ),
};

const dealerQuadGauges: IntelTip = {
  title: "Your subscriber status",
  body: (
    <IntelTipBody
      summary="Four gauges for your subscribers only. Percentages use your total subscriber count as the denominator."
      items={[
        {
          label: "Active / inactive / expired / expiring",
          description: "Same rules as admin, filtered to accounts owned by your dealer login.",
        },
      ]}
    />
  ),
};

const dealerCreditFlowTx: IntelTip = {
  title: "Transactions summary (your account)",
  body: (
    <IntelTipBody
      summary="Credit in/out totals for your dealer account only."
      items={[
        {
          label: "Credit in / out ribbons",
          description: "Daily credit flow from transactions where username is your dealer login.",
        },
      ]}
    />
  ),
};

const dealerCreditFlowChart: IntelTip = {
  title: "Credit flow (your account)",
  body: (
    <IntelTipBody
      summary="Mirrored credit in vs credit out chart for your dealer account."
      items={[
        {
          label: "Scope",
          description: "Each day buckets transactions for your login.",
        },
      ]}
    />
  ),
};

const dealerTicketLifecycle: IntelTip = {
  title: "Ticket lifecycle (your queue)",
  body: (
    <IntelTipBody
      summary="Ticket counts for tickets you filed or admin escalations visible in your dealer portal scope."
      items={[
        {
          label: "Scope",
          description: "Matches the Tickets page rules for your role (including tickets_enable when set).",
        },
      ]}
    />
  ),
};

const dealerMessageTraffic: IntelTip = {
  title: "Message traffic (your subscribers)",
  body: (
    <IntelTipBody
      summary="Device message volume for set-top boxes linked to your subscriber accounts."
      items={[
        {
          label: "Delivered / pending",
          description: "Same priority buckets as admin, filtered to your account logins.",
        },
      ]}
    />
  ),
};

const dealerPackageDistribution: IntelTip = {
  title: "Package distribution (your subscribers)",
  body: (
    <IntelTipBody
      summary="Top subscription packages among your subscriber accounts."
      items={[]}
    />
  ),
};

const dealerRecentTransactions: IntelTip = {
  title: "Recent transactions (your account)",
  body: (
    <IntelTipBody
      summary="Latest five transactions where the operator username is your dealer login."
      items={[]}
    />
  ),
};

const dealerRecentTickets: IntelTip = {
  title: "Recent tickets (your queue)",
  body: (
    <IntelTipBody
      summary="Latest open or recent tickets visible in your dealer portal scope."
      items={[]}
    />
  ),
};

const dealerRecentMessages: IntelTip = {
  title: "Recent messages (your subscribers)",
  body: (
    <IntelTipBody
      summary="Latest device messages for set-top boxes tied to your subscriber accounts."
      items={[]}
    />
  ),
};

const dealerExpiring: IntelTip = {
  title: "Expiring subscriptions (yours)",
  body: (
    <IntelTipBody
      summary="Your subscribers expiring in the next 30 days, split into the same time buckets as admin."
      items={[]}
    />
  ),
};

const dealerRecentUsers: IntelTip = {
  title: "Recent users (yours)",
  body: (
    <IntelTipBody
      summary="Five newest subscriber accounts created under your dealer login."
      items={[]}
    />
  ),
};

const dealerExpiredUsers: IntelTip = {
  title: "Expired users (yours)",
  body: (
    <IntelTipBody
      summary="Five accounts under your login that most recently passed their expiry date."
      items={[]}
    />
  ),
};

const dealerDevicesOnline: IntelTip = {
  title: "Devices online (your subscribers)",
  body: (
    <IntelTipBody
      summary="Devices that checked in recently, counted only for your subscriber accounts."
      items={[]}
    />
  ),
};

const dealerScopedTips: DashboardIntelTips = {
  ...INTEL_TIPS,
  branchPulse: dealerBranchPulse,
  quadStatusGauges: dealerQuadGauges,
  creditFlowTransactions: dealerCreditFlowTx,
  creditFlowChart: dealerCreditFlowChart,
  ticketLifecycle: dealerTicketLifecycle,
  messageTraffic: dealerMessageTraffic,
  packageDistribution: dealerPackageDistribution,
  recentTransactions: dealerRecentTransactions,
  recentTickets: dealerRecentTickets,
  recentMessages: dealerRecentMessages,
  expiringSubscriptions: dealerExpiring,
  recentUsers: dealerRecentUsers,
  expiredUsers: dealerExpiredUsers,
  devicesOnline: dealerDevicesOnline,
} as DashboardIntelTips;

/** Portal dashboards use scoped copy; admin keeps canonical INTEL_TIPS. */
export function getDashboardIntelTips(scope: DashboardIntelScope): DashboardIntelTips {
  if (scope === "admin") return INTEL_TIPS;
  if (scope === "reseller") return resellerScopedTips;
  if (scope === "dealer") return dealerScopedTips;
  return managerScopedTips;
}
