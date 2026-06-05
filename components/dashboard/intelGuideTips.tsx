"use client";

import type {ReactNode} from "react";

import type { IntelTip } from "@/components/dashboard/IntelGuideBadge";

/**
 * Renders a short paragraph followed by a list of `label → description` pairs.
 * Used as the standard layout for an intel-guide tooltip body.
 */
export function IntelTipBody({
  summary,
  items,
  footer,
}: {
  summary?: ReactNode;
  items?: Array<{ label: string; description: ReactNode }>;
  footer?: ReactNode;
}) {
  return (
    <>
      {summary ? <p className="text-slate-600 dark:text-slate-300/95">{summary}</p> : null}
      {items?.length ? (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((it) => (
            <li key={it.label} className="flex gap-2">
              <span
                className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/70 dark:bg-cyan-400/70"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold uppercase tracking-[0.14em] text-primary dark:text-cyan-200/90">
                  {it.label}
                </span>
                <span className="text-slate-400 dark:text-slate-500"> — </span>
                <span className="text-slate-600 dark:text-slate-300/95">{it.description}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {footer ? (
        <p className="mt-2 border-t border-slate-200 pt-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-cyan-400/15 dark:text-slate-400/80">
          {footer}
        </p>
      ) : null}
    </>
  );
}

/**
 * Operator-facing intel-guide copy for the admin dashboard.
 * Describes what each widget shows — no SQL, table names, or internal schema jargon.
 */
export const INTEL_TIPS = {
  branchPulse: {
    title: "Branch pulse",
    body: (
      <IntelTipBody
        summary="Two ring clusters with a center total. Percentages show each role's share of your operator network."
        items={[
          {
            label: "Managers ring",
            description: "Number of manager accounts. Share = managers ÷ total staff (managers + resellers + dealers).",
          },
          {
            label: "Resellers ring",
            description: "Number of reseller accounts. Share = resellers ÷ total staff.",
          },
          {
            label: "Dealers ring",
            description: "Number of dealer accounts. Share = dealers ÷ total staff.",
          },
          {
            label: "Left center",
            description: "Average of the three left percentages, with total staff count below.",
          },
          {
            label: "Total units pill",
            description: "Combined staff count — same as the left ring center.",
          },
          {
            label: "Growth ring",
            description: "New subscribers in the latest period bucket ÷ the largest bucket in the current window.",
          },
          {
            label: "Revenue ring",
            description: "This month's revenue ÷ peak monthly revenue over the last 12 months.",
          },
          {
            label: "Staying ring",
            description: "Active subscribers not expiring within 7 days ÷ total subscribers.",
          },
          {
            label: "Right center",
            description: "Average of the three right percentages, with total subscriber count below.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  quadStatusGauges: {
    title: "Network status gauges",
    body: (
      <IntelTipBody
        summary="Four gauges plus a center total. Each gauge shows count and percentage of all subscribers."
        items={[
          {
            label: "Active users",
            description: "Enabled accounts that are not expiring in the next 7 days.",
          },
          {
            label: "Inactive users",
            description: "Disabled or suspended accounts.",
          },
          {
            label: "Expired users",
            description: "Accounts past their subscription end date.",
          },
          {
            label: "Expiring soon",
            description: "Active accounts that expire within the next 7 days.",
          },
          {
            label: "Center pill",
            description: "Total subscriber count. Each gauge percentage = that bucket ÷ this total.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  userActivityOverview: {
    title: "User activity overview",
    body: (
      <IntelTipBody
        summary="Monthly new accounts versus expirations for the period selected in the header."
        items={[
          {
            label: "New users (cyan area)",
            description: "Subscribers created in each month of the window.",
          },
          {
            label: "Expired users (fuchsia area)",
            description: "Subscribers whose subscription ended in each month.",
          },
          {
            label: "X axis",
            description: "Months in the current activity window.",
          },
          {
            label: "Y axis",
            description: "Number of accounts in each monthly bucket.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  creditFlowTransactions: {
    title: "Transactions summary",
    body: (
      <IntelTipBody
        summary="Left column: credit flow ribbons stacked over wallet balances."
        items={[
          {
            label: "Total credit in",
            description: "Sum of all credit added across the selected period.",
          },
          {
            label: "Total credit out",
            description: "Sum of all credits debited across the same period.",
          },
          {
            label: "Total system (wallet)",
            description: "Combined positive wallet balance across all operators.",
          },
          {
            label: "Promo pool",
            description: "Lifetime promotional bonus credits issued through hierarchy add-credit with bonus tiers.",
          },
          {
            label: "Bar",
            description: "Promo ÷ (promo + system wallet) — share of the pool that is promotional.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  creditFlowChart: {
    title: "Credit flow analysis",
    body: (
      <IntelTipBody
        summary="Mirrored area chart of credits in vs credits out across the selected period."
        items={[
          {
            label: "Upper area (credit in)",
            description: "Daily credit inflow — credits added each day.",
          },
          {
            label: "Lower area (credit out)",
            description: "Daily credit outflow — credits debited each day (shown mirrored below the axis).",
          },
          {
            label: "X axis",
            description: "Time bucket. Adapts to the header period (day / week / 2-week / month / 2-month).",
          },
          {
            label: "Y axis",
            description: "Credit amount per bucket.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  transactionsCreditActivity: {
    title: "Credit activity",
    body: (
      <IntelTipBody
        summary="Day-by-day credits in vs out for your logged-in admin account (up to the last year)."
        items={[
          {
            label: "Area — Credits in",
            description: "Credits added on each day.",
          },
          {
            label: "Line — Credits out",
            description: "Credits debited on each day.",
          },
          {
            label: "Range tabs",
            description: "1D / 1W / 1M / 1Y show the last 1, 7, 30, or 366 days.",
          },
          {
            label: "Header KPI",
            description: "Seven-day in/out totals and transaction count from your ledger.",
          },
          {
            label: "Insights",
            description: "Day-over-day change compares the last two visible days in the selected range.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  transactionsLedgerActivityMix: {
    title: "Activity mix",
    body: (
      <IntelTipBody
        summary="Each bar is a ledger category: total credit volume in the selected period, grouped by transaction type."
        items={[
          {
            label: "Period",
            description: "7 days / 30 days / All — filters rows by date before aggregating.",
          },
          {
            label: "Bar length",
            description: "Category credits ÷ the largest category (top bucket = 100%).",
          },
          {
            label: "Categories",
            description: "Promo grants, hierarchy transfers, recoveries, subscriber debits, bonuses, or other.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  ticketLifecycle: {
    title: "Ticket management",
    body: (
      <IntelTipBody
        summary="All-time breakdown of support tickets by lifecycle stage."
        items={[
          {
            label: "Reopened ring",
            description: "Tickets reopened after being closed. Pink ring.",
          },
          {
            label: "Fixed ring",
            description: "Closed or resolved tickets. Cyan ring.",
          },
          {
            label: "Progress ring",
            description: "Tickets currently being worked. Purple ring.",
          },
          {
            label: "Other ring",
            description: "Tickets in any other state. Slate ring.",
          },
          {
            label: "Total pill",
            description: "Grand total of all tickets. Each ring percentage = that stage ÷ total.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  messageTraffic: {
    title: "Message traffic",
    body: (
      <IntelTipBody
        summary="Grouped bars showing device message volume over time. The period adapts to the header range."
        items={[
          { label: "Delivered (emerald)", description: "Messages already confirmed by the device." },
          { label: "High priority (rose)", description: "Urgent messages still awaiting delivery." },
          { label: "Normal (violet)", description: "Standard-priority messages awaiting delivery." },
          { label: "Low (slate)", description: "Low-priority messages awaiting delivery." },
          { label: "Other queue (sky)", description: "Pending messages with uncategorised priority." },
          { label: "Bucket size", description: "1w → day, 1m → week, 3m → 2 weeks, 6m → month, 1y → 2 months." },
        ]}
      />
    ),
  } satisfies IntelTip,

  communicationRelay: {
    title: "Communication relay",
    body: (
      <IntelTipBody
        summary="Two trend lines from the same message dataset, plus delivery totals."
        items={[
          { label: "Confirmed line (emerald)", description: "Delivered messages per time bucket." },
          { label: "Pending line (amber)", description: "All pending messages per bucket (any priority)." },
          {
            label: "Peak references",
            description: "Dashed lines mark the bucket with the highest confirmed or pending count.",
          },
          { label: "Confirmed total", description: "Delivered messages across the whole period." },
          { label: "Pending total", description: "Queued messages across the whole period." },
          { label: "Delivery rate", description: "Delivered ÷ (delivered + pending), as a percentage." },
        ]}
      />
    ),
  } satisfies IntelTip,

  packageDistribution: {
    title: "Package distribution",
    body: (
      <IntelTipBody
        summary="Top 10 subscription packages by subscriber count."
        items={[
          { label: "Bar height", description: "Number of subscribers on each package." },
          { label: "Number above bar", description: "Exact subscriber count for that package." },
          { label: "Rotated label", description: "Package name (or a fallback label if unnamed)." },
          { label: "Y axis", description: "Scale from zero to slightly above the largest bar." },
          {
            label: "Show allocation",
            description: "Toggle lists each package with count and share of total subscribers.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  topOperatorsDealer: {
    title: "Top dealers",
    body: (
      <IntelTipBody
        summary="All-time top 5 dealers. Operators with no subscribers and no revenue are hidden."
        items={[
          { label: "Dealer (rose dot)", description: "Dealer username — leaf-level operator with no sub-operators." },
          { label: "Subscribers", description: "Subscriber accounts billed under this dealer." },
          { label: "Revenue", description: "Lifetime revenue generated by this dealer's subscribers." },
        ]}
        footer="Ordered by revenue, then subscribers, capped at 5."
      />
    ),
  } satisfies IntelTip,

  topOperatorsReseller: {
    title: "Top resellers",
    body: (
      <IntelTipBody
        summary="All-time top 5 resellers. Inactive operators are filtered out."
        items={[
          { label: "Reseller (cyan dot)", description: "Reseller username." },
          {
            label: "Subscribers",
            description: "Total accounts under this reseller — direct plus all dealer accounts below.",
          },
          {
            label: "Revenue",
            description: "Lifetime revenue across the reseller's full subtree.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  topOperatorsManager: {
    title: "Top managers",
    body: (
      <IntelTipBody
        summary="All-time top 5 managers. Inactive operators are filtered out."
        items={[
          { label: "Manager (violet dot)", description: "Manager username." },
          {
            label: "Subscribers",
            description: "Total accounts under this manager — resellers, dealers, and their subscribers.",
          },
          {
            label: "Revenue",
            description: "Lifetime revenue across the manager's full subtree.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  recentUsers: {
    title: "Recent users",
    body: (
      <IntelTipBody
        summary="Five most recently created subscriber accounts."
        items={[
          { label: "User column", description: "Account login on top, display name below." },
          { label: "Hierarchy column", description: "Owner chain — dealer or reseller the account belongs to." },
          { label: "Created column", description: "Creation date and time." },
          { label: "Expires column", description: "Subscription end date with hints like 5D LEFT or NO EXPIRY." },
          {
            label: "State pill",
            description: "Active, Expiring soon (≤ 7 days), Expired, or Inactive.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,

  expiredUsers: {
    title: "Expired users",
    body: (
      <IntelTipBody
        summary="Five subscribers whose subscriptions ended most recently."
        items={[
          { label: "User column", description: "Account login and display name." },
          { label: "Hierarchy column", description: "Owner chain — same as the recent-users card." },
          { label: "Expires column", description: "End date with ENDED Nd AGO on the second line." },
        ]}
        footer="Every row is already past its subscription end — useful for renewal follow-ups."
      />
    ),
  } satisfies IntelTip,

  expiringSubscriptions: {
    title: "Expiring subscriptions",
    body: (
      <IntelTipBody
        summary="Accounts expiring within the next 30 days, split into non-overlapping time buckets."
        items={[
          { label: "Period column", description: "Next 24 hours, 3 days, 7 days, 15 days, or 30 days." },
          { label: "Count", description: "Accounts in this bucket (each account counted once)." },
          { label: "Share", description: "Bucket count ÷ all accounts expiring within 30 days." },
          {
            label: "At risk ($)",
            description: "Estimated revenue at stake if every account in the bucket churns (based on recent activity).",
          },
          { label: "Risk pill", description: "Critical (24h / 3d), High (7d), Medium (15d / 30d)." },
        ]}
      />
    ),
  } satisfies IntelTip,

  recentTransactions: {
    title: "Recent transactions",
    body: (
      <IntelTipBody
        summary="Latest five platform-wide ledger entries."
        items={[
          {
            label: "Type",
            description: "Wallet debit, promo credit, subscription grant, or wallet credit.",
          },
          { label: "Amount", description: "Monetary value, or credit months when no money amount applies." },
          { label: "Promo", description: "Bonus months on credit rows; em dash for debits or rows without bonus." },
          { label: "When", description: "Date and 24-hour time of the transaction." },
        ]}
      />
    ),
  } satisfies IntelTip,

  recentTickets: {
    title: "Recent tickets",
    body: (
      <IntelTipBody
        summary="Latest five support tickets across the system."
        items={[
          { label: "Ticket", description: "Subject line and ticket number." },
          { label: "Updated", description: "Category and last update time." },
          {
            label: "P / S",
            description: "Priority dot (high = rose, low = amber, else sky) and status dot (in progress, fixed, reopened).",
          },
          { label: "Action", description: "Quick link — Fixed when resolved, otherwise Open." },
        ]}
      />
    ),
  } satisfies IntelTip,

  recentMessages: {
    title: "Recent messages",
    body: (
      <IntelTipBody
        summary="Latest five device messages, newest first."
        items={[
          { label: "Recipient", description: "Subscriber account login, shown in uppercase." },
          { label: "Message", description: "First line of the message text, truncated to fit." },
          {
            label: "Priority",
            description: "Colour dot for urgency. Status badges use emerald (delivered) and amber (queued).",
          },
          { label: "Time", description: "When the message was sent." },
        ]}
      />
    ),
  } satisfies IntelTip,

  staffRadialBars: {
    title: "Staff hierarchy & status",
    body: (
      <IntelTipBody
        summary="Role share chart, count ribbons, and active/inactive gauges for managers, resellers, and dealers."
        items={[
          {
            label: "3D ring chart",
            description: "Visual share of each role. Rotates slowly unless reduced motion is enabled. Use ribbons for exact numbers.",
          },
          {
            label: "Ribbons — hierarchy",
            description: "Each role's percentage of total staff. Colours: Managers (violet), Resellers (cyan), Dealers (rose).",
          },
          {
            label: "Gauges — active vs inactive",
            description: "Active and inactive counts per role. Needle shows active share; centre text lists raw counts.",
          },
          {
            label: "Motion",
            description: "Gauge dials animate gently unless reduced motion is enabled.",
          },
        ]}
        footer="3D chart requires WebGL. Ribbons and gauges work on all devices."
      />
    ),
  } satisfies IntelTip,

  messageDeliveryOverview: {
    title: "Message delivery overview",
    body: (
      <IntelTipBody
        summary="Two panels: portal staff login-popup inbox and STB device message queue."
        items={[
          {
            label: "Portal staff",
            description: "Staff who can receive login-popup messages. Dismissed vs pending until dismissed.",
          },
          {
            label: "STB subscribers",
            description: "Messages sent to set-top boxes. Delivered = device acknowledged; queued = awaiting check-in.",
          },
          {
            label: "Delivery rate",
            description: "Portal: dismissed ÷ total inbox activity. STB: delivered ÷ total sent.",
          },
          {
            label: "3D rings",
            description: "Segment size reflects each metric's share. Expand belt rows below for detail tables.",
          },
        ]}
        footer="Refresh the page after bulk sends to update counts."
      />
    ),
  } satisfies IntelTip,

  ticketsQueueOverview: {
    title: "Ticket queue overview",
    body: (
      <IntelTipBody
        summary="Support queue for this page. Click a segment or card to filter the ticket table."
        items={[
          {
            label: "Lifecycle pipeline",
            description: "Horizontal bar showing share of each ticket status.",
          },
          { label: "In progress", description: "Open tickets still being worked." },
          { label: "Re-opened", description: "Tickets reopened after being fixed." },
          { label: "Fixed", description: "Resolved tickets." },
        ]}
        footer="This strip shows ticket lifecycle only — not device or staff messaging."
      />
    ),
  } satisfies IntelTip,

  devicesOnline: {
    title: "Devices online",
    body: (
      <IntelTipBody
        summary="Set-top boxes that checked in within the last few minutes and are linked to billing accounts."
        items={[
          {
            label: "Rule",
            description: "Counts devices with a recent heartbeat. Admin view includes all linked accounts.",
          },
        ]}
      />
    ),
  } satisfies IntelTip,
};
