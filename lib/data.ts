import { getSession } from "@/lib/session";
import * as repo from "@/lib/repos/billing";

export const getDashboardStats = repo.getDashboardStats;
export const getManagers = repo.getManagers;
export const getResellers = repo.getResellers;
export type { AdminManagerListRow, AdminResellerListRow, AdminDealerListRow } from "@/lib/repos/billing";
export const getDealers = repo.getDealers;
export const getUsersSummary = repo.getUsersSummary;
export const getDeductionsConfig = repo.getDeductionsConfig;
export const getPromoBonusRules = repo.getPromoBonusRules;

/** Promo tier JSON + active-client count for hierarchy credit UI previews (ADD). */
export async function getHierarchyCreditPreviewBundle(kind: "MNGR" | "SRSLR" | "RSLR", username: string) {
  const rules = await repo.getPromoBonusRules();
  const activeClients = await repo.countActiveClientsForPromo2({ kind, username });
  return { p1: rules.p1, p2: rules.p2, activeClients };
}
export const getSettings = repo.getSettings;
export { getAdminPackageDistribution } from "@/lib/repos/packageDistribution";
export type { AdminReportPackageRow } from "@/lib/repos/packageDistribution";
export const getAdminNotificationPrefs = repo.getAdminNotificationPrefs;
export const DEFAULT_ADMIN_NOTIFICATION_PREFS = repo.DEFAULT_ADMIN_NOTIFICATION_PREFS;
export type { AdminNotificationPrefs } from "@/lib/repos/billing";

export async function getTransactions() {
  const s = await getSession();
  if (!s?.username) return [];
  return repo.getAdminTransactions(s.username);
}

export const getOperatorTransactions = repo.getOperatorTransactions;

export type { AdminTransactionRow, AccountTransactionRow } from "@/lib/repos/billing";

export async function getManagerById(id: string) {
  return repo.getManagerByUsername(decodeURIComponent(id));
}

function mapUserStatus(s: string) {
  return s === "A" ? "ACTIVE" : "INACTIVE";
}

export const getResellerByUsername = repo.getResellerByUsername;

export async function getResellerById(id: string) {
  const u = await repo.getResellerByUsername(decodeURIComponent(id));
  if (!u) return null;
  return { ...u, status: mapUserStatus(u.status) };
}

export const getDealerByUsername = repo.getDealerByUsername;

export async function getDealerById(id: string) {
  const u = await repo.getDealerByUsername(decodeURIComponent(id));
  if (!u) return null;
  return { ...u, status: mapUserStatus(u.status) };
}

export async function getUserById(id: string) {
  return repo.getUserForEdit(decodeURIComponent(id));
}

export async function getUserByIdScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  id: string;
}) {
  return repo.getUserForEditScoped({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
    account: decodeURIComponent(input.id),
  });
}

export const listManagersForSelect = repo.listManagersForSelect;
export const listResellersForSelect = repo.listResellersForSelect;
export const listDealersForReseller = repo.listDealersForReseller;
export const listAccountsPaged = repo.listAccountsPaged;
export const listAccountsPagedScoped = repo.listAccountsPagedScoped;
export const getUsersSummaryScoped = repo.getUsersSummaryScoped;
export const getOperatorDashboardStats = repo.getOperatorDashboardStats;
export const getOperatorSubscriberTrendSeries = repo.getOperatorSubscriberTrendSeries;
export const listOperatorRecentSubscribers = repo.listOperatorRecentSubscribers;
export type { OperatorDashboardStats } from "@/lib/repos/billing";
export type { DashboardMonthPoint, DashboardDayCreditPoint } from "@/lib/repos/billing";
export const getAccountsCreatedByMonthScoped = repo.getAccountsCreatedByMonthScoped;
export const getCreditFlowByDayForUsername = repo.getCreditFlowByDayForUsername;
export const getAdminCreditFlowByDay = repo.getAdminCreditFlowByDay;
export const getAdminExpiringSoonCount = repo.getAdminExpiringSoonCount;
export const getScopedExpiringSoonCount = repo.getScopedExpiringSoonCount;
export const getAdminWalletCreditsTotal = repo.getAdminWalletCreditsTotal;
export const getAdminPromoBonusCreditsTotal = repo.getAdminPromoBonusCreditsTotal;
export const getAdminDevicesOnlineCount = repo.getAdminDevicesOnlineCount;
export const getAdminRevenueThisMonth = repo.getAdminRevenueThisMonth;
export const getAdminPeakMonthlyRevenueLastNMonths = repo.getAdminPeakMonthlyRevenueLastNMonths;
export const getAdminTopOperatorsLeaderboards = repo.getAdminTopOperatorsLeaderboards;
export const listAdminRecentSubscribers = repo.listAdminRecentSubscribers;
export const listAdminRecentAccountsWithHierarchy = repo.listAdminRecentAccountsWithHierarchy;
export const listAdminRecentlyExpiredAccountsWithHierarchy =
  repo.listAdminRecentlyExpiredAccountsWithHierarchy;
export const getAdminExpiringSubscriptionBuckets = repo.getAdminExpiringSubscriptionBuckets;
export const getAdminSubscriberTrendSeries = repo.getAdminSubscriberTrendSeries;
export const getAdminSubscriberActivityByDayRange = repo.getAdminSubscriberActivityByDayRange;
export const listAdminAccountsCreatedOnDay = repo.listAdminAccountsCreatedOnDay;
export const listAdminAccountsExpiredOnDay = repo.listAdminAccountsExpiredOnDay;
export type {
  AccountListRow,
  AdminAccountLifecycleRow,
  AdminDayActivityAccountRow,
  AdminDayActivityCounts,
  AdminExpiringBucketRow,
  AdminExpiringSubscriptionsBuckets,
  AdminMessageTrafficDayStack,
  AdminMessageAudiencePreviewCounts,
  AdminMessageRoleCounts,
  AdminRecentStalkerSendMessageRow,
  AdminRecentSubscriberRow,
  AdminStalkerMessageDashboardStats,
  AdminTopOperatorRow,
  AdminTopOperatorsLeaderboards,
  DashboardTrendPoint,
} from "@/lib/repos/billing";
export const listStalkerUsersForMessageSelect = repo.listStalkerUsersForMessageSelect;
export const listStalkerUsersForMessageSelectScoped = repo.listStalkerUsersForMessageSelectScoped;
export const getOperatorMessageAudiencePreviewCounts = repo.getOperatorMessageAudiencePreviewCounts;
export const getOperatorStalkerMessageDashboardStats = repo.getOperatorStalkerMessageDashboardStats;
export const listOperatorRecentStalkerSendMessages = repo.listOperatorRecentStalkerSendMessages;
export const countStalkerUsers = repo.countStalkerUsers;
export const getAdminStalkerMessageDashboardStats = repo.getAdminStalkerMessageDashboardStats;
export { emptyAdminStalkerMessageDashboardStats } from "@/lib/repos/billing";
export const getAdminMessageTrafficDayStacks = repo.getAdminMessageTrafficDayStacks;
export const getAdminMessageRoleCounts = repo.getAdminMessageRoleCounts;
export const listAdminRecentTransactionsGlobal = repo.listAdminRecentTransactionsGlobal;
export const listAdminRecentStalkerSendMessages = repo.listAdminRecentStalkerSendMessages;
export const getAdminMessageAudiencePreviewCounts = repo.getAdminMessageAudiencePreviewCounts;
export const resolveAdminMessageStalkerUids = repo.resolveAdminMessageStalkerUids;
export const resolveOperatorMessageStalkerUids = repo.resolveOperatorMessageStalkerUids;
export const resolveAdminAccountLoginsToStalkerUids = repo.resolveAdminAccountLoginsToStalkerUids;
export {
  listPortalStaffUsersForSelect,
  listPortalStaffUsersForSelectScoped,
  listBillingSubscriberAccountsForMessageSelect,
  getPortalStaffAudiencePreviewCounts,
  getAdminPortalStaffMessageDashboardStats,
  getAdminPortalStaffMessageStatsByRole,
  emptyPortalStaffMessageStatsByRole,
  getPortalOperatorStaffAudiencePreviewCounts,
  canOperatorSendPortalStaffMessages,
  canOperatorSendSubscriberMessages,
  listPendingPortalStaffMessagesForUser,
  listDismissPortalStaffMessagesForUser,
  listReadPortalStaffMessagesForUser,
  markPortalStaffMessageReadRecipient,
  listRecentPortalStaffMessages,
  listOperatorRecentPortalStaffMessages,
} from "@/lib/repos/portalStaffMessages";
export { dealerSubscriberMessagesEnabled } from "@/lib/repos/billing";
export type {
  PortalStaffUserOption,
  PortalStaffAudiencePreviewCounts,
  PortalOperatorStaffAudiencePreviewCounts,
  PortalStaffMessageScope,
  PortalOperatorStaffAudienceType,
  BillingSubscriberMessageOption,
  AdminPortalStaffMessageDashboardStats,
  PortalStaffRoleMessageStatus,
} from "@/lib/repos/portalStaffMessages";
export type { PortalStaffPendingMessage, PortalStaffInboxStatus } from "@/lib/portalStaffInbox";
export { derivePortalStaffInboxStatus } from "@/lib/portalStaffInbox";
export { listStalkerTariffPlans } from "@/lib/repos/accountCreate";
export type { TariffPlanRow } from "@/lib/repos/accountCreate";

export { listResellersOwnedByManager, listDealersUnderManager, managerOwnsDealer } from "@/lib/repos/managerPortal";
export type { ManagerPortalResellerRow, ManagerPortalDealerRow } from "@/lib/repos/managerPortal";

export { listDealersOwnedByReseller, resellerOwnsDealer } from "@/lib/repos/resellerPortal";
export type { ResellerPortalDealerRow } from "@/lib/repos/resellerPortal";
