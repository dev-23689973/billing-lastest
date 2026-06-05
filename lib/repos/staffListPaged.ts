import type { RowDataPacket } from "mysql2";
import { TX_WALLET_BALANCE_SUM_SQL, TX_WALLET_BALANCE_SUM_T_SQL } from "@/lib/billing/transactionWalletSql";
import { getBillingPool } from "@/lib/db/pool";
import {
  batchCountSubscriberAccountsByDealer,
  batchCountSubscriberAccountsByManager,
  batchCountSubscriberAccountsByReseller,
  batchStaffCreatedAt,
  batchStaffLoginIps,
  type AdminDealerListRow,
  type AdminManagerListRow,
  type AdminResellerListRow,
} from "@/lib/repos/billing";
import type { ManagerPortalDealerRow, ManagerPortalResellerRow } from "@/lib/repos/managerPortal";
import type { ResellerPortalDealerRow } from "@/lib/repos/resellerPortal";

function parseBillingDateTime(raw: unknown): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(normalized);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function formatManagerLastActive(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const se = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${da} ${h}:${mi}:${se}`;
}

export type AdminStaffTypeCounts = {
  managers: { total: number; active: number };
  resellers: { total: number; active: number };
  dealers: { total: number; active: number };
};

export type ManagerStaffTypeCounts = {
  resellers: { total: number; active: number };
  dealers: { total: number; active: number };
};

export type ResellerDealerCounts = {
  dealers: { total: number; active: number };
};

function countBucket(row: RowDataPacket | undefined) {
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
  };
}

/**
 * Staff hub KPI totals — must match list queries (dealers only under a reseller, not orphan RSLR rows).
 */
export async function getAdminStaffTypeCounts(): Promise<AdminStaffTypeCounts> {
  const pool = getBillingPool();
  const [[mRows], [rRows], [dRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users WHERE type = 'MNGR'`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users WHERE type = 'SRSLR'`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN d.status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users d
       INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
       WHERE d.type = 'RSLR'`,
    ),
  ]);
  return {
    managers: countBucket(mRows[0]),
    resellers: countBucket(rRows[0]),
    dealers: countBucket(dRows[0]),
  };
}

/** Manager staff hub KPI — resellers owned by manager + dealers under them. */
export async function getManagerStaffTypeCounts(managerUsername: string): Promise<ManagerStaffTypeCounts> {
  const pool = getBillingPool();
  const m = managerUsername.trim();
  const [[rRows], [dRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users WHERE type = 'SRSLR' AND username_owner = ?`,
      [m],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN d.status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users d
       INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
       WHERE d.type = 'RSLR' AND r.username_owner = ?`,
      [m],
    ),
  ]);
  return {
    resellers: countBucket(rRows[0]),
    dealers: countBucket(dRows[0]),
  };
}

/** Reseller dealers list KPI — RSLR owned by this reseller. */
export async function getResellerDealerCounts(resellerUsername: string): Promise<ResellerDealerCounts> {
  const pool = getBillingPool();
  const r = resellerUsername.trim();
  const [dRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS active
       FROM users WHERE type = 'RSLR' AND username_owner = ?`,
    [r],
  );
  return { dealers: countBucket(dRows[0]) };
}

function clampPageSize(pageSizeRaw: number) {
  return Math.min(
    100,
    Math.max(5, Math.floor(Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 25)),
  );
}

/** Page size + offset after total is known (avoids empty pages when ?page= is too high). */
function pagingAfterCount(total: number, pageRaw: number, pageSizeRaw: number) {
  const pageSize = clampPageSize(pageSizeRaw);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(
    Math.max(1, Math.floor(Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1)),
    totalPages,
  );
  return { page, pageSize, offset: (page - 1) * pageSize, totalPages };
}

type PagedSliceInput = {
  page: number;
  pageSize: number;
  offset?: number;
  limit?: number;
};

function resolvePagedSlice(total: number, input: PagedSliceInput) {
  if (input.offset != null && input.limit != null) {
    return {
      offset: Math.max(0, Math.floor(input.offset)),
      limit: clampPageSize(input.limit),
    };
  }
  const { offset, pageSize } = pagingAfterCount(total, input.page, input.pageSize);
  return { offset, limit: pageSize };
}

function managerStatusClause(status: "" | "active" | "inactive" | undefined) {
  if (status === "active") return { sql: ` AND u.status = 'A'`, params: [] as unknown[] };
  if (status === "inactive") return { sql: ` AND u.status <> 'A'`, params: [] as unknown[] };
  return { sql: "", params: [] as unknown[] };
}

function managerSearchClause(search: string | undefined) {
  const q = search?.trim();
  if (!q) return { sql: "", params: [] as unknown[] };
  const like = `%${q}%`;
  return { sql: ` AND (u.username LIKE ? OR u.name LIKE ?)`, params: [like, like] as unknown[] };
}

export type StaffHierarchySelectOption = {
  username: string;
  name: string;
};

/** Username + name only — for staff hub dropdowns without loading full lists. */
export async function listStaffHierarchySelectOptions(): Promise<{
  managers: StaffHierarchySelectOption[];
  resellers: StaffHierarchySelectOption[];
}> {
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, name, type FROM users WHERE type IN ('MNGR', 'SRSLR') ORDER BY type ASC, username ASC`,
  );
  const managers: StaffHierarchySelectOption[] = [];
  const resellers: StaffHierarchySelectOption[] = [];
  for (const r of rows) {
    const opt = {
      username: String(r.username),
      name: r.name != null ? String(r.name) : "",
    };
    if (r.type === "MNGR") managers.push(opt);
    else if (r.type === "SRSLR") resellers.push(opt);
  }
  return { managers, resellers };
}

type ResellerSortKey = "manager" | "name" | "username" | "dealerCount" | "status";

const RESELLER_CREDITS_ORDER =
  `(SELECT ${TX_WALLET_BALANCE_SUM_T_SQL} FROM transactions t WHERE t.username = u.username)`;
const RESELLER_USERCOUNT_ORDER = `(
  (SELECT COUNT(*) FROM accounts a INNER JOIN users sr ON sr.username = a.username AND sr.type = 'SRSLR' WHERE sr.username = u.username)
  + (SELECT COUNT(*) FROM accounts a INNER JOIN users d ON d.username = a.username AND d.type = 'RSLR'
     INNER JOIN users sr ON sr.username = d.username_owner AND sr.type = 'SRSLR' WHERE sr.username = u.username)
)`;

const RESELLER_SORT_SQL: Record<ResellerSortKey, string> = {
  manager: "u.username_owner",
  name: "u.name",
  username: "u.username",
  dealerCount: "dealer_count",
  status: "u.status",
};

function adminResellerOrderBy(sortRaw: string | undefined): string {
  if (sortRaw === "credits") return RESELLER_CREDITS_ORDER;
  if (sortRaw === "userCount") return RESELLER_USERCOUNT_ORDER;
  const sortKey = RESELLER_SORT_SQL[sortRaw as ResellerSortKey] ? (sortRaw as ResellerSortKey) : "username";
  return RESELLER_SORT_SQL[sortKey];
}

function resellerSearchClause(search: string | undefined) {
  const q = search?.trim();
  if (!q) return { sql: "", params: [] as unknown[] };
  const like = `%${q}%`;
  return {
    sql: ` AND (u.username LIKE ? OR u.name LIKE ? OR u.username_owner LIKE ?)`,
    params: [like, like, like],
  };
}

function resellerStatusClause(status: "" | "active" | "inactive" | undefined) {
  if (status === "active") return { sql: ` AND u.status = 'A'`, params: [] as unknown[] };
  if (status === "inactive") return { sql: ` AND u.status <> 'A'`, params: [] as unknown[] };
  return { sql: "", params: [] as unknown[] };
}

async function enrichAdminManagers(rows: RowDataPacket[]): Promise<AdminManagerListRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((r) => String(r.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");

  const [resellerCountRows, dealerCountRows, childRows, acctRows, balRows, createdMap, ipMap, subTotalMap, subActiveMap, subExpiredMap] =
    await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT username_owner AS manager_login, COUNT(*) AS c
         FROM users WHERE type = 'SRSLR' AND username_owner IN (${ph}) GROUP BY username_owner`,
        usernames,
      ).then(([r]) => r),
      pool.execute<RowDataPacket[]>(
        `SELECT r.username_owner AS manager_login, COUNT(*) AS c
         FROM users d
         INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
         WHERE d.type = 'RSLR' AND r.username_owner IN (${ph}) GROUP BY r.username_owner`,
        usernames,
      ).then(([r]) => r),
      pool.execute<RowDataPacket[]>(
        `SELECT username_owner AS owner, COUNT(*) AS c FROM users WHERE username_owner IN (${ph}) GROUP BY username_owner`,
        usernames,
      ).then(([r]) => r),
      pool.execute<RowDataPacket[]>(
        `SELECT username, COUNT(*) AS c FROM accounts WHERE username IN (${ph}) GROUP BY username`,
        usernames,
      ).then(([r]) => r),
      pool.execute<RowDataPacket[]>(
        `SELECT username,
            ${TX_WALLET_BALANCE_SUM_SQL} AS balance
         FROM transactions WHERE username IN (${ph}) GROUP BY username`,
        usernames,
      ).then(([r]) => r),
      batchStaffCreatedAt(usernames),
      batchStaffLoginIps(usernames),
      batchCountSubscriberAccountsByManager(usernames, "total"),
      batchCountSubscriberAccountsByManager(usernames, "active"),
      batchCountSubscriberAccountsByManager(usernames, "expired"),
    ]);

  const resellerCountMap = new Map(resellerCountRows.map((r) => [String(r.manager_login), Number(r.c)]));
  const dealerCountMap = new Map(dealerCountRows.map((r) => [String(r.manager_login), Number(r.c)]));
  const childMap = new Map(childRows.map((r) => [String(r.owner), Number(r.c)]));
  const acctMap = new Map(acctRows.map((r) => [String(r.username), Number(r.c)]));
  const balMap = new Map(balRows.map((r) => [String(r.username), Number(r.balance)]));

  return rows.map((r) => {
    const username = String(r.username);
    const childCount = childMap.get(username) ?? 0;
    const acctCount = acctMap.get(username) ?? 0;
    const resellerCount = resellerCountMap.get(username) ?? 0;
    const dealerCount = dealerCountMap.get(username) ?? 0;
    const subscriberCount = subTotalMap.get(username) ?? 0;
    const activeSubscriberCount = subActiveMap.get(username) ?? 0;
    const expiredSubscriberCount = subExpiredMap.get(username) ?? 0;
    const loginCandidates = [parseBillingDateTime(r.last_login_time), parseBillingDateTime(r.current_login_time)].filter(
      (d): d is Date => d != null,
    );
    const loginMax =
      loginCandidates.length > 0 ? new Date(Math.max(...loginCandidates.map((d) => d.getTime()))) : null;

    return {
      username,
      name: r.name != null ? String(r.name) : "",
      status: String(r.status ?? "A"),
      resellerCount,
      dealerCount,
      subscriberCount,
      activeSubscriberCount,
      expiredSubscriberCount,
      credits: balMap.get(username) ?? 0,
      canDelete: childCount === 0 && acctCount === 0,
      currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
      lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
      lastActive: loginMax ? formatManagerLastActive(loginMax) : "—",
      createdAt: createdMap.get(username) ?? "",
    };
  });
}

/** Admin — all managers, SQL page + enrich only current page. */
export async function listManagersPagedAdmin(input: {
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: AdminManagerListRow[]; total: number }> {
  const pool = getBillingPool();
  const search = managerSearchClause(input.search);
  const status = managerStatusClause(input.status);
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const sort = input.sort ?? "username";
  const orderCol = sort === "name" ? "u.name" : sort === "status" ? "u.status" : "u.username";
  const where = `u.type = 'MNGR'${search.sql}${status.sql}`;
  const params = [...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM users u WHERE ${where}`, params);
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, limit } = resolvePagedSlice(total, input);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.last_login_time, u.current_login_time
     FROM users u
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, u.username ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows: await enrichAdminManagers(rows), total };
}

async function enrichAdminResellers(rows: RowDataPacket[]): Promise<AdminResellerListRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((r) => String(r.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");

  const [balRows, createdMap, ipMap] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT username,
          ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username IN (${ph}) GROUP BY username`,
      usernames,
    ).then(([r]) => r),
    batchStaffCreatedAt(usernames),
    batchStaffLoginIps(usernames),
  ]);
  const balMap = new Map(balRows.map((r) => [String(r.username), Number(r.balance)]));

  const [subTotalMap, subActiveMap, subExpiredMap] = await Promise.all([
    batchCountSubscriberAccountsByReseller(usernames, "total"),
    batchCountSubscriberAccountsByReseller(usernames, "active"),
    batchCountSubscriberAccountsByReseller(usernames, "expired"),
  ]);

  return rows.map((r) => {
    const username = String(r.username);
    const dealerCount = Number(r.dealer_count ?? 0);
    const userCount = subTotalMap.get(username) ?? 0;
    const activeUserCount = subActiveMap.get(username) ?? 0;
    const expiredUserCount = subExpiredMap.get(username) ?? 0;
    const loginCandidates = [parseBillingDateTime(r.last_login_time), parseBillingDateTime(r.current_login_time)].filter(
      (d): d is Date => d != null,
    );
    const loginMax =
      loginCandidates.length > 0 ? new Date(Math.max(...loginCandidates.map((d) => d.getTime()))) : null;
    return {
      username,
      manager: r.manager != null ? String(r.manager) : "",
      name: r.name != null ? String(r.name) : "",
      status: String(r.status ?? "A"),
      dealerCount,
      activeUserCount,
      expiredUserCount,
      userCount,
      credits: balMap.get(username) ?? 0,
      canDelete: dealerCount === 0 && userCount === 0,
      currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
      lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
      lastActive: loginMax ? formatManagerLastActive(loginMax) : "—",
      createdAt: createdMap.get(username) ?? "",
    };
  });
}

async function enrichManagerResellers(
  rows: RowDataPacket[],
  managerUsername: string,
): Promise<ManagerPortalResellerRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((r) => String(r.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const mgr = managerUsername.trim();
  const countOpts = mgr ? { managerUsername: mgr } : undefined;
  const [balRows, ipMap, subTotalMap, subActiveMap, subExpiredMap] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT username,
          ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username IN (${ph}) GROUP BY username`,
      usernames,
    ),
    batchStaffLoginIps(usernames),
    batchCountSubscriberAccountsByReseller(usernames, "total", countOpts),
    batchCountSubscriberAccountsByReseller(usernames, "active", countOpts),
    batchCountSubscriberAccountsByReseller(usernames, "expired", countOpts),
  ]);
  const balMap = new Map(balRows[0].map((r) => [String(r.username), Number(r.balance)]));

  return rows.map((r) => {
    const username = String(r.username);
    const dealerCount = Number(r.dealer_count ?? 0);
    const userCount = subTotalMap.get(username) ?? Number(r.user_count ?? 0);
    const activeUserCount = subActiveMap.get(username) ?? 0;
    const expiredUserCount = subExpiredMap.get(username) ?? 0;
    return {
      username,
      name: r.name != null ? String(r.name) : "",
      status: String(r.status ?? "A"),
      comments: r.comments != null ? String(r.comments) : "",
      dealerCount,
      userCount,
      activeUserCount,
      expiredUserCount,
      credits: balMap.get(username) ?? 0,
      canDelete: dealerCount === 0 && userCount === 0,
      currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
      lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
    };
  });
}

/** Admin — all resellers, SQL page + enrich only current page. */
export async function listResellersPagedAdmin(input: {
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: AdminResellerListRow[]; total: number }> {
  const pool = getBillingPool();
  const search = resellerSearchClause(input.search);
  const status = resellerStatusClause(input.status);
  const orderCol = adminResellerOrderBy(input.sort);
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const where = `u.type = 'SRSLR'${search.sql}${status.sql}`;
  const params = [...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users u WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, limit } = resolvePagedSlice(total, input);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.username_owner AS manager, u.last_login_time, u.current_login_time,
      (SELECT COUNT(*) FROM users ch WHERE ch.username_owner = u.username AND ch.type = 'RSLR') AS dealer_count
     FROM users u
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, u.username ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows: await enrichAdminResellers(rows), total };
}

/** Manager portal — resellers under one manager. */
export async function listResellersPagedForManager(input: {
  managerUsername: string;
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: ManagerPortalResellerRow[]; total: number }> {
  const pool = getBillingPool();
  const m = input.managerUsername.trim();
  const search = resellerSearchClause(input.search);
  const status = resellerStatusClause(input.status);
  const sortKey = input.sort === "name" || input.sort === "username" || input.sort === "status" ? input.sort : "username";
  const orderCol = sortKey === "name" ? "u.name" : sortKey === "status" ? "u.status" : "u.username";
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const where = `u.type = 'SRSLR' AND u.username_owner = ?${search.sql}${status.sql}`;
  const params: unknown[] = [m, ...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM users u WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, limit } = resolvePagedSlice(total, input);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.last_login_time, u.current_login_time,
      COALESCE(u.comments, '') AS comments,
      (SELECT COUNT(*) FROM users ch WHERE ch.username_owner = u.username AND ch.type = 'RSLR') AS dealer_count,
      (SELECT COUNT(*) FROM accounts a WHERE a.username = u.username) AS user_count
     FROM users u
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, u.username ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows: await enrichManagerResellers(rows, m), total };
}

type DealerSortKey = "username" | "name" | "reseller" | "manager" | "status";

function dealerSearchClause(search: string | undefined, alias = "d") {
  const q = search?.trim();
  if (!q) return { sql: "", params: [] as unknown[] };
  const like = `%${q}%`;
  return {
    sql: ` AND (${alias}.username LIKE ? OR ${alias}.name LIKE ? OR ${alias}.username_owner LIKE ? OR r.username_owner LIKE ?)`,
    params: [like, like, like, like],
  };
}

function dealerStatusClause(status: "" | "active" | "inactive" | undefined, alias = "d") {
  if (status === "active") return { sql: ` AND ${alias}.status = 'A'`, params: [] as unknown[] };
  if (status === "inactive") return { sql: ` AND ${alias}.status <> 'A'`, params: [] as unknown[] };
  return { sql: "", params: [] as unknown[] };
}

async function enrichAdminDealers(rows: RowDataPacket[]): Promise<AdminDealerListRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((r) => String(r.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");

  const [balRows, createdMap, ipMap] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT username,
          ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username IN (${ph}) GROUP BY username`,
      usernames,
    ).then(([r]) => r),
    batchStaffCreatedAt(usernames),
    batchStaffLoginIps(usernames),
  ]);
  const balMap = new Map(balRows.map((r) => [String(r.username), Number(r.balance)]));

  const [activeMap, expiredMap] = await Promise.all([
    batchCountSubscriberAccountsByDealer(usernames, "active"),
    batchCountSubscriberAccountsByDealer(usernames, "expired"),
  ]);

  return rows.map((r) => {
    const username = String(r.username);
    const userCount = Number(r.user_count ?? 0);
    const loginCandidates = [parseBillingDateTime(r.last_login_time), parseBillingDateTime(r.current_login_time)].filter(
      (d): d is Date => d != null,
    );
    const loginMax =
      loginCandidates.length > 0 ? new Date(Math.max(...loginCandidates.map((d) => d.getTime()))) : null;
    return {
      username,
      manager: r.manager_username != null ? String(r.manager_username) : "",
      reseller: r.reseller_username != null ? String(r.reseller_username) : "",
      name: r.name != null ? String(r.name) : "",
      status: String(r.status ?? "A"),
      activeUserCount: activeMap.get(username) ?? 0,
      expiredUserCount: expiredMap.get(username) ?? 0,
      userCount,
      credits: balMap.get(username) ?? 0,
      canDelete: userCount === 0,
      currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
      lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
      lastActive: loginMax ? formatManagerLastActive(loginMax) : "—",
      createdAt: createdMap.get(username) ?? "",
    };
  });
}

/** Admin dealers list (optional reseller filter). */
export async function listDealersPagedAdmin(input: {
  resellerUsername?: string;
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: AdminDealerListRow[]; total: number }> {
  const pool = getBillingPool();
  const reseller = input.resellerUsername?.trim();
  const search = dealerSearchClause(input.search);
  const status = dealerStatusClause(input.status);
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const sort = input.sort ?? "username";
  const orderCol =
    sort === "name"
      ? "d.name"
      : sort === "reseller"
        ? "d.username_owner"
        : sort === "manager"
          ? "r.username_owner"
          : sort === "status"
            ? "d.status"
            : "d.username";

  const resellerClause = reseller ? " AND r.username = ?" : "";
  const where = `d.type = 'RSLR'${resellerClause}${search.sql}${status.sql}`;
  const params: unknown[] = reseller ? [reseller, ...search.params, ...status.params] : [...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, limit } = resolvePagedSlice(total, input);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.username, d.name, d.status, d.last_login_time, d.current_login_time,
            d.username_owner AS reseller_username, r.username_owner AS manager_username,
            (SELECT COUNT(*) FROM accounts a WHERE a.username = d.username) AS user_count
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, d.username ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows: await enrichAdminDealers(rows), total };
}

const STAFF_CREDITS_BALANCE_SQL = `(SELECT ${TX_WALLET_BALANCE_SUM_T_SQL} FROM transactions t WHERE t.username = u.username)`;

/** Sort keys supported by cross-type SQL hub paging (no full-table load). */
export const ADMIN_HUB_UNION_SORT_KEYS = new Set([
  "name",
  "username",
  "credits",
  "status",
  "parentReseller",
  "dealerCount",
  "state",
]);

export type AdminStaffHubOrderedKey = { kind: "MNGR" | "SRSLR" | "RSLR"; username: string };

export type AdminStaffHubPagedResult = {
  managers: AdminManagerListRow[];
  resellers: AdminResellerListRow[];
  dealers: AdminDealerListRow[];
  total: number;
  /** Present when rows are merged-sorted across types (not type-segment order). */
  orderedKeys: AdminStaffHubOrderedKey[] | null;
};

export function adminStaffHubUsesServerPaging(sortBy: string | undefined, hasSearch: boolean): boolean {
  if (hasSearch) return true;
  if (!sortBy || sortBy === "type") return true;
  return ADMIN_HUB_UNION_SORT_KEYS.has(sortBy);
}

async function fetchAdminManagersByUsernames(usernames: string[]): Promise<AdminManagerListRow[]> {
  if (!usernames.length) return [];
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.last_login_time, u.current_login_time
     FROM users u WHERE u.type = 'MNGR' AND u.username IN (${ph})`,
    usernames,
  );
  const enriched = await enrichAdminManagers(rows);
  const order = new Map(usernames.map((u, i) => [u, i]));
  return enriched.sort((a, b) => (order.get(a.username) ?? 0) - (order.get(b.username) ?? 0));
}

async function fetchAdminResellersByUsernames(usernames: string[]): Promise<AdminResellerListRow[]> {
  if (!usernames.length) return [];
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.username_owner AS manager, u.last_login_time, u.current_login_time,
      (SELECT COUNT(*) FROM users ch WHERE ch.username_owner = u.username AND ch.type = 'RSLR') AS dealer_count
     FROM users u WHERE u.type = 'SRSLR' AND u.username IN (${ph})`,
    usernames,
  );
  const enriched = await enrichAdminResellers(rows);
  const order = new Map(usernames.map((u, i) => [u, i]));
  return enriched.sort((a, b) => (order.get(a.username) ?? 0) - (order.get(b.username) ?? 0));
}

async function fetchAdminDealersByUsernames(usernames: string[]): Promise<AdminDealerListRow[]> {
  if (!usernames.length) return [];
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.username, d.name, d.status, d.last_login_time, d.current_login_time,
            d.username_owner AS reseller_username, r.username_owner AS manager_username,
            (SELECT COUNT(*) FROM accounts a WHERE a.username = d.username) AS user_count
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE d.type = 'RSLR' AND d.username IN (${ph})`,
    usernames,
  );
  const enriched = await enrichAdminDealers(rows);
  const order = new Map(usernames.map((u, i) => [u, i]));
  return enriched.sort((a, b) => (order.get(a.username) ?? 0) - (order.get(b.username) ?? 0));
}

function adminHubUnionOrderExpr(sort: string): string {
  switch (sort) {
    case "name":
      return "name_sort";
    case "credits":
      return "credits_sort";
    case "status":
      return "status_sort";
    case "parentReseller":
      return "parent_sort";
    case "dealerCount":
      return "branch_sort";
    case "state":
      return "state_sort";
    default:
      return "username_sort";
  }
}

async function listAdminStaffHubPagedUnion(input: {
  page: number;
  pageSize: number;
  search?: string;
  status?: "" | "active" | "inactive";
  sort: string;
  dir?: string;
}): Promise<AdminStaffHubPagedResult> {
  const pool = getBillingPool();
  const status = input.status;
  const search = (input.search ?? "").trim() || undefined;
  const sort = input.sort;
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const orderExpr = adminHubUnionOrderExpr(sort);
  const mSearch = managerSearchClause(search);
  const mStatus = managerStatusClause(status);
  const rSearch = resellerSearchClause(search);
  const rStatus = resellerStatusClause(status);
  const dSearch = dealerSearchClause(search);
  const dStatus = dealerStatusClause(status);

  const unionSql = `
      SELECT 'MNGR' AS staff_kind, u.username,
        COALESCE(u.name, '') AS name_sort,
        u.username AS username_sort,
        ${STAFF_CREDITS_BALANCE_SQL} AS credits_sort,
        u.status AS status_sort,
        '' AS parent_sort,
        (SELECT COUNT(*) FROM users ch WHERE ch.type = 'SRSLR' AND ch.username_owner = u.username) AS branch_sort,
        0 AS type_sort,
        COALESCE(u.current_login_time, u.last_login_time, '1970-01-01') AS state_sort
      FROM users u
      WHERE u.type = 'MNGR'${mSearch.sql}${mStatus.sql}
      UNION ALL
      SELECT 'SRSLR' AS staff_kind, u.username,
        COALESCE(u.name, '') AS name_sort,
        u.username AS username_sort,
        ${STAFF_CREDITS_BALANCE_SQL} AS credits_sort,
        u.status AS status_sort,
        COALESCE(u.username_owner, '') AS parent_sort,
        (SELECT COUNT(*) FROM users ch WHERE ch.username_owner = u.username AND ch.type = 'RSLR') AS branch_sort,
        1 AS type_sort,
        COALESCE(u.current_login_time, u.last_login_time, '1970-01-01') AS state_sort
      FROM users u
      WHERE u.type = 'SRSLR'${rSearch.sql}${rStatus.sql}
      UNION ALL
      SELECT 'RSLR' AS staff_kind, d.username,
        COALESCE(d.name, '') AS name_sort,
        d.username AS username_sort,
        (SELECT ${TX_WALLET_BALANCE_SUM_T_SQL} FROM transactions t WHERE t.username = d.username) AS credits_sort,
        d.status AS status_sort,
        COALESCE(d.username_owner, '') AS parent_sort,
        0 AS branch_sort,
        2 AS type_sort,
        COALESCE(d.current_login_time, d.last_login_time, '1970-01-01') AS state_sort
      FROM users d
      INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
      WHERE d.type = 'RSLR'${dSearch.sql}${dStatus.sql}`;

  const unionParams = [
    ...mSearch.params,
    ...mStatus.params,
    ...rSearch.params,
    ...rStatus.params,
    ...dSearch.params,
    ...dStatus.params,
  ];

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM (${unionSql}) counted`,
    unionParams,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, pageSize: unionPageSize } = pagingAfterCount(total, input.page, input.pageSize);

  const [pageRows] = await pool.query<RowDataPacket[]>(
    `SELECT staff_kind, username FROM (${unionSql}) hub
     ORDER BY ${orderExpr} ${orderDir}, username_sort ${orderDir}
     LIMIT ? OFFSET ?`,
    [...unionParams, unionPageSize, offset],
  );

  const orderedKeys: AdminStaffHubOrderedKey[] = pageRows.map((r) => ({
    kind: String(r.staff_kind) as AdminStaffHubOrderedKey["kind"],
    username: String(r.username),
  }));

  const mgrNames = orderedKeys.filter((k) => k.kind === "MNGR").map((k) => k.username);
  const rslNames = orderedKeys.filter((k) => k.kind === "SRSLR").map((k) => k.username);
  const dlrNames = orderedKeys.filter((k) => k.kind === "RSLR").map((k) => k.username);

  const [managers, resellers, dealers] = await Promise.all([
    fetchAdminManagersByUsernames(mgrNames),
    fetchAdminResellersByUsernames(rslNames),
    fetchAdminDealersByUsernames(dlrNames),
  ]);

  return { managers, resellers, dealers, total, orderedKeys };
}

/**
 * Admin staff hub — all types, ordered manager → reseller → dealer (or reverse).
 * Fetches only the rows needed for the current page (no full-table load).
 */
export async function listAdminStaffHubPaged(input: {
  page: number;
  pageSize: number;
  search?: string;
  status?: "" | "active" | "inactive";
  sort?: string;
  dir?: string;
}): Promise<AdminStaffHubPagedResult> {
  const status = input.status;
  const search = (input.search ?? "").trim() || undefined;
  const sortRaw = (input.sort ?? "").trim();
  const dir = input.dir === "desc" ? "desc" : "asc";
  const pageSize = clampPageSize(input.pageSize);
  const page = Math.max(1, Math.floor(input.page));

  if (sortRaw && sortRaw !== "type" && ADMIN_HUB_UNION_SORT_KEYS.has(sortRaw)) {
    return listAdminStaffHubPagedUnion({
      page,
      pageSize,
      search,
      status,
      sort: sortRaw,
      dir,
    });
  }

  const [mHead, rHead, dHead] = await Promise.all([
    listManagersPagedAdmin({ page: 1, pageSize: 1, search, status, sort: "username", dir: "asc" }),
    listResellersPagedAdmin({ page: 1, pageSize: 1, search, status, sort: "username", dir: "asc" }),
    listDealersPagedAdmin({ page: 1, pageSize: 1, search, status, sort: "username", dir: "asc" }),
  ]);

  const segments =
    dir === "asc"
      ? ([
          { key: "managers" as const, total: mHead.total, fetch: (offset: number, limit: number) =>
            listManagersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
          { key: "resellers" as const, total: rHead.total, fetch: (offset: number, limit: number) =>
            listResellersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
          { key: "dealers" as const, total: dHead.total, fetch: (offset: number, limit: number) =>
            listDealersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
        ] as const)
      : ([
          { key: "dealers" as const, total: dHead.total, fetch: (offset: number, limit: number) =>
            listDealersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
          { key: "resellers" as const, total: rHead.total, fetch: (offset: number, limit: number) =>
            listResellersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
          { key: "managers" as const, total: mHead.total, fetch: (offset: number, limit: number) =>
            listManagersPagedAdmin({ page: 1, pageSize: limit, search, status, sort: "username", dir: "asc", offset, limit }) },
        ] as const);

  const total = mHead.total + rHead.total + dHead.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  let skip = (safePage - 1) * pageSize;
  let remaining = pageSize;

  const out = {
    managers: [] as AdminManagerListRow[],
    resellers: [] as AdminResellerListRow[],
    dealers: [] as AdminDealerListRow[],
    total,
  };

  for (const seg of segments) {
    if (remaining <= 0) break;
    if (skip >= seg.total) {
      skip -= seg.total;
      continue;
    }
    const segSkip = skip;
    skip = 0;
    const segLimit = Math.min(remaining, seg.total - segSkip);
    const slice = await seg.fetch(segSkip, segLimit);
    if (seg.key === "managers") out.managers.push(...(slice.rows as AdminManagerListRow[]));
    else if (seg.key === "resellers") out.resellers.push(...(slice.rows as AdminResellerListRow[]));
    else out.dealers.push(...(slice.rows as AdminDealerListRow[]));
    remaining -= slice.rows.length;
  }

  return { ...out, orderedKeys: null };
}

async function enrichManagerDealers(rows: RowDataPacket[]): Promise<ManagerPortalDealerRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((r) => String(r.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const [balRows, ipMap, subActiveMap, subExpiredMap] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT username,
          ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username IN (${ph}) GROUP BY username`,
      usernames,
    ),
    batchStaffLoginIps(usernames),
    batchCountSubscriberAccountsByDealer(usernames, "active"),
    batchCountSubscriberAccountsByDealer(usernames, "expired"),
  ]);
  const balMap = new Map(balRows[0].map((r) => [String(r.username), Number(r.balance)]));

  return rows.map((r) => {
    const username = String(r.username);
    const userCount = Number(r.user_count ?? 0);
    return {
      username,
      name: r.name != null ? String(r.name) : "",
      status: String(r.status ?? "A"),
      resellerUsername: String(r.reseller_username ?? ""),
      userCount,
      activeUserCount: subActiveMap.get(username) ?? 0,
      expiredUserCount: subExpiredMap.get(username) ?? 0,
      credits: balMap.get(username) ?? 0,
      canDelete: userCount === 0,
      currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
      lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
    };
  });
}

export async function listDealersPagedForManager(input: {
  managerUsername: string;
  resellerUsername?: string;
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
  offset?: number;
  limit?: number;
}): Promise<{ rows: ManagerPortalDealerRow[]; total: number }> {
  const pool = getBillingPool();
  const m = input.managerUsername.trim();
  const reseller = input.resellerUsername?.trim();
  const search = dealerSearchClause(input.search);
  const status = dealerStatusClause(input.status);
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const sort = input.sort ?? "username";
  const orderCol = sort === "name" ? "d.name" : sort === "status" ? "d.status" : "d.username";
  const resellerClause = reseller ? " AND r.username = ?" : "";
  const where = `d.type = 'RSLR' AND r.type = 'SRSLR' AND r.username_owner = ?${resellerClause}${search.sql}${status.sql}`;
  const params: unknown[] = reseller ? [m, reseller, ...search.params, ...status.params] : [m, ...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE ${where}`,
    params,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const { offset, limit } = resolvePagedSlice(total, input);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.username, d.name, d.status, d.last_login_time, d.current_login_time,
      d.username_owner AS reseller_username,
      (SELECT COUNT(*) FROM accounts a WHERE a.username = d.username) AS user_count
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, d.username ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows: await enrichManagerDealers(rows), total };
}

/**
 * Manager staff hub — resellers under manager, then dealers (or reverse when dir=desc).
 * Same paging model as {@link listAdminStaffHubPaged}.
 */
export async function listManagerStaffHubPaged(input: {
  managerUsername: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: "" | "active" | "inactive";
  dir?: string;
}): Promise<{
  resellers: ManagerPortalResellerRow[];
  dealers: ManagerPortalDealerRow[];
  total: number;
}> {
  const m = input.managerUsername.trim();
  const status = input.status;
  const search = (input.search ?? "").trim() || undefined;
  const dir = input.dir === "desc" ? "desc" : "asc";
  const pageSize = clampPageSize(input.pageSize);
  const page = Math.max(1, Math.floor(input.page));

  const [rHead, dHead] = await Promise.all([
    listResellersPagedForManager({ managerUsername: m, page: 1, pageSize: 1, search, status, sort: "username", dir: "asc" }),
    listDealersPagedForManager({ managerUsername: m, page: 1, pageSize: 1, search, status, sort: "username", dir: "asc" }),
  ]);

  const segments =
    dir === "asc"
      ? ([
          {
            key: "resellers" as const,
            total: rHead.total,
            fetch: (offset: number, limit: number) =>
              listResellersPagedForManager({
                managerUsername: m,
                page: 1,
                pageSize: limit,
                search,
                status,
                sort: "username",
                dir: "asc",
                offset,
                limit,
              }),
          },
          {
            key: "dealers" as const,
            total: dHead.total,
            fetch: (offset: number, limit: number) =>
              listDealersPagedForManager({
                managerUsername: m,
                page: 1,
                pageSize: limit,
                search,
                status,
                sort: "username",
                dir: "asc",
                offset,
                limit,
              }),
          },
        ] as const)
      : ([
          {
            key: "dealers" as const,
            total: dHead.total,
            fetch: (offset: number, limit: number) =>
              listDealersPagedForManager({
                managerUsername: m,
                page: 1,
                pageSize: limit,
                search,
                status,
                sort: "username",
                dir: "asc",
                offset,
                limit,
              }),
          },
          {
            key: "resellers" as const,
            total: rHead.total,
            fetch: (offset: number, limit: number) =>
              listResellersPagedForManager({
                managerUsername: m,
                page: 1,
                pageSize: limit,
                search,
                status,
                sort: "username",
                dir: "asc",
                offset,
                limit,
              }),
          },
        ] as const);

  const total = rHead.total + dHead.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  let skip = (safePage - 1) * pageSize;
  let remaining = pageSize;

  const out = {
    resellers: [] as ManagerPortalResellerRow[],
    dealers: [] as ManagerPortalDealerRow[],
    total,
  };

  for (const seg of segments) {
    if (remaining <= 0) break;
    if (skip >= seg.total) {
      skip -= seg.total;
      continue;
    }
    const segSkip = skip;
    skip = 0;
    const segLimit = Math.min(remaining, seg.total - segSkip);
    const slice = await seg.fetch(segSkip, segLimit);
    if (seg.key === "resellers") out.resellers.push(...(slice.rows as ManagerPortalResellerRow[]));
    else out.dealers.push(...(slice.rows as ManagerPortalDealerRow[]));
    remaining -= slice.rows.length;
  }

  return out;
}

async function enrichResellerDealers(rows: RowDataPacket[]): Promise<ResellerPortalDealerRow[]> {
  if (rows.length === 0) return [];
  const usernames = rows.map((row) => String(row.username));
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");

  const [balRows, ipMap] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT username,
          ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username IN (${ph}) GROUP BY username`,
      usernames,
    ).then(([r]) => r),
    batchStaffLoginIps(usernames),
  ]);
  const balMap = new Map(balRows.map((b) => [String(b.username), Number(b.balance)]));

  const [activeMap, expiredMap] = await Promise.all([
    batchCountSubscriberAccountsByDealer(usernames, "active"),
    batchCountSubscriberAccountsByDealer(usernames, "expired"),
  ]);

  return rows.map((row) => {
    const username = String(row.username);
    const userCount = Number(row.user_count ?? 0);
    return {
      username,
      name: row.name != null ? String(row.name) : "",
      status: String(row.status ?? "A"),
      userCount,
      activeUserCount: activeMap.get(username) ?? 0,
      expiredUserCount: expiredMap.get(username) ?? 0,
      credits: balMap.get(username) ?? 0,
      canDelete: userCount === 0,
      currentLoginTime: row.current_login_time != null ? String(row.current_login_time) : "",
      lastLoginTime: row.last_login_time != null ? String(row.last_login_time) : "",
      currentLoginIp: ipMap.get(username)?.currentLoginIp ?? "",
      lastLoginIp: ipMap.get(username)?.lastLoginIp ?? "",
    };
  });
}

export async function listDealersPagedForReseller(input: {
  resellerUsername: string;
  search?: string;
  status?: "" | "active" | "inactive";
  page: number;
  pageSize: number;
  sort?: string;
  dir?: string;
}): Promise<{ rows: ResellerPortalDealerRow[]; total: number }> {
  const pool = getBillingPool();
  const r = input.resellerUsername.trim();
  const q = input.search?.trim();
  const search = q
    ? { sql: ` AND (u.username LIKE ? OR u.name LIKE ?)`, params: [`%${q}%`, `%${q}%`] as unknown[] }
    : { sql: "", params: [] as unknown[] };
  const status = dealerStatusClause(input.status, "u");
  const orderDir = input.dir === "desc" ? "DESC" : "ASC";
  const sort = input.sort ?? "username";
  const orderCol =
    sort === "name"
      ? "u.name"
      : sort === "status"
        ? "u.status"
        : sort === "activeUsers" || sort === "expiredUsers" || sort === "totalUsers"
          ? "user_count"
          : "u.username";
  const where = `u.type = 'RSLR' AND u.username_owner = ?${search.sql}${status.sql}`;
  const params: unknown[] = [r, ...search.params, ...status.params];

  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM users u WHERE ${where}`, params);
  const total = Number(countRows[0]?.c ?? 0);
  const { pageSize, offset } = pagingAfterCount(total, input.page, input.pageSize);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.last_login_time, u.current_login_time,
      (SELECT COUNT(*) FROM accounts a WHERE a.username = u.username) AS user_count
     FROM users u
     WHERE ${where}
     ORDER BY ${orderCol} ${orderDir}, u.username ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return { rows: await enrichResellerDealers(rows), total };
}
