import type { AdminDealerListRow, AdminManagerListRow, AdminResellerListRow } from "@/lib/repos/billing";

/** Unified staff hub table row — safe to serialize to client leaf components. */
export type StaffHubTableClientRow = {
  rowType: "MANAGER" | "RESELLER" | "DEALER";
  username: string;
  name: string;
  status: string;
  credits: number;
  dealerCount: number;
  managerResellerCount: number;
  managerDealerCount: number;
  parentReseller: string;
  createdAt: string;
  activeUsers: number;
  expiredUsers: number;
  totalUsers: number;
  canDelete: boolean;
  stateCurrentLogin: string;
  stateLastLogin: string;
  lastLoginIp: string;
  currentLoginIp: string;
  manager?: string;
  reseller?: string;
};

export function toStaffHubTableRowFromManager(r: AdminManagerListRow): StaffHubTableClientRow {
  return {
    rowType: "MANAGER",
    username: r.username,
    stateCurrentLogin: r.currentLoginTime,
    stateLastLogin: r.lastLoginTime,
    lastLoginIp: r.lastLoginIp,
    currentLoginIp: r.currentLoginIp,
    name: r.name,
    managerResellerCount: r.resellerCount,
    managerDealerCount: r.dealerCount,
    credits: r.credits,
    dealerCount: 0,
    parentReseller: "—",
    createdAt: r.createdAt,
    status: r.status,
    activeUsers: r.activeSubscriberCount,
    expiredUsers: r.expiredSubscriberCount,
    totalUsers: r.subscriberCount,
    canDelete: r.canDelete,
  };
}

export function toStaffHubTableRowFromReseller(r: AdminResellerListRow): StaffHubTableClientRow {
  return {
    rowType: "RESELLER",
    username: r.username,
    stateCurrentLogin: r.currentLoginTime,
    stateLastLogin: r.lastLoginTime,
    lastLoginIp: r.lastLoginIp,
    currentLoginIp: r.currentLoginIp,
    name: r.name,
    managerResellerCount: 0,
    managerDealerCount: 0,
    credits: r.credits,
    dealerCount: r.dealerCount,
    parentReseller: (r.manager ?? "").trim() || "—",
    createdAt: r.createdAt,
    status: r.status,
    activeUsers: r.activeUserCount,
    expiredUsers: r.expiredUserCount,
    totalUsers: r.userCount,
    canDelete: r.canDelete,
    manager: r.manager,
  };
}

export function toStaffHubTableRowFromDealer(d: AdminDealerListRow): StaffHubTableClientRow {
  return {
    rowType: "DEALER",
    username: d.username,
    stateCurrentLogin: d.currentLoginTime,
    stateLastLogin: d.lastLoginTime,
    lastLoginIp: d.lastLoginIp,
    currentLoginIp: d.currentLoginIp,
    name: d.name,
    managerResellerCount: 0,
    managerDealerCount: 0,
    credits: d.credits,
    dealerCount: 0,
    parentReseller: d.reseller || "—",
    createdAt: d.createdAt,
    status: d.status,
    activeUsers: d.activeUserCount,
    expiredUsers: d.expiredUserCount,
    totalUsers: d.userCount,
    canDelete: d.canDelete,
    reseller: d.reseller,
    manager: d.manager,
  };
}

/** Admin resellers table — list rows never include credentials. */
export type AdminResellerListClientRow = AdminResellerListRow;

export function toAdminResellerListClientRows(rows: AdminResellerListRow[]): AdminResellerListClientRow[] {
  return rows;
}
