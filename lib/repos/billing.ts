import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";
import { verifyPassword } from "@/lib/auth/password";
import {
  stalkerPasswordDigest,
  computeExpiryDatePhp,
  insertDebitLikePhp,
  buildMonthDeductionChargedMap,
  monthRenewChargedCredits,
} from "@/lib/repos/accountCreate";
import { CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS } from "@/lib/creditDeductions";
import { isCreateOnlyValidityValue } from "@/lib/validityOptions";
import { getCreditBalance } from "@/lib/repos/creditBalance";
import {
  getStalkerCustomPackagePlanId,
  getStalkerUserDbIdByLogin,
  listStalkerPackagesForPlan,
  listStalkerUserSubscribedPackageIds,
} from "@/lib/repos/stalkerUserPackages";
import { SUBSCRIBER_TX_CREDIT, SUBSCRIBER_TX_DEBIT } from "@/lib/billing/subscriberTransactionTypes";
import {
  applyRecoverToExpiry,
  effectiveRecoverPools,
  isRecoverAllowedForMonths,
  isSubscriptionExpiryActive,
  maxTotalRecoverableMonthsOff,
} from "@/lib/billing/subscriberRecoverPools";
import {
  TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL,
  TX_ADMIN_PERIODS_SIGNED_SQL,
  TX_WALLET_BALANCE_SUM_SQL,
  TX_WALLET_ROW_EFFECT_SQL,
} from "@/lib/billing/transactionWalletSql";
import { HIERARCHY_GLOBAL_ADD_CREDIT_MAX } from "@/lib/billing/hierarchyCreditSettingsValidation";
import {
  HIERARCHY_ADD_CREDITS_MAX,
  HIERARCHY_RECOVER_CREDITS_MAX,
  hierarchyAddCreditsSubmitMax,
  isWalletBalanceRecoverGrantId,
  WALLET_BALANCE_RECOVER_GRANT_TX_ID,
} from "@/lib/constants/hierarchyCredits";
import {
  applyAdditionalPayerCapRung,
  applyPromoPayerCapRung,
  filterPromoRungsWithinPayerBalance,
  buildAddCreditAdditionalPrincipalBases,
  buildAddCreditPromoPrincipalBases,
  capAddCreditAdditionalPresetMax,
  capAddCreditPresetMax,
  resolveAddCreditPresetUiMax,
  resolveAddCreditAdditionalPresetMaxRungs,
  computePromoBonusesForAddCapped,
} from "@/lib/addCreditLadder";
import { normalizeClientIp } from "@/lib/normalizeClientIp";
import { accountListSearchWhereClause, type AccountListSearchOptions } from "@/lib/repos/accountListSearch";
import {
  findAccountLoginsByStalkerUserIdSearch,
  isStalkerUserIdSearchQuery,
} from "@/lib/repos/stalkerUserIdSearch";
import {
  formatStaffCreatedAtDisplay,
  normalizeStaffCreatedAtDbValue,
} from "@/lib/staffDisplayFormat";
import { revalidateWalletDashboardCaches } from "@/lib/dashboard/revalidateAdminDashboardCaches";

export { formatStaffCreatedAtDisplay, normalizeStaffCreatedAtDbValue };
import { PROMO_BONUS_REMARKS_SUM_EXPR, PROMO_GRANT_ISSUER_WHERE } from "@/lib/promoGrantLedger";
import {
  parsePromoTiersJson,
  PROMO_BONUS_P1_CONFIG_KEY,
  PROMO_BONUS_P2_CONFIG_KEY,
  type PromoTier,
  validatePromoTiers,
} from "@/lib/promoBonus";
import { randomUUID } from "node:crypto";
import {
  ACCOUNT_AUTO_RENEW_MARK_OFF,
  ACCOUNT_AUTO_RENEW_MARK_ON,
  clampAutoRenewTotalCycles,
  parseAccountAutoRenewCyclesRemaining,
  parseAccountAutoRenewMark,
} from "@/lib/accountAutoRenew";
import {
  HIERARCHY_GRANT_CRDT_WHERE_SQL,
  isSubscriberBeneficiaryCrdt,
  parseHierarchyGrantMetaPromos,
  resolveHierarchyGrantAmounts,
  resolveLooseWalletCrdtAmounts,
} from "@/lib/hierarchyGrantRemark";
import type { Pool } from "mysql2/promise";
import {
  appendWalletSurplusRecoverOption,
  buildReversibleRecoverOptions,
  buildWalletBalanceRecoverOption,
  enrichGrantRecoverSlice,
  resolveRecoverDebitAmounts,
  type HierarchyReversibleGrant,
} from "@/lib/billing/hierarchyRecover";

export type { HierarchyReversibleGrant, RecoverDebitLine } from "@/lib/billing/hierarchyRecover";
export {
  appendWalletSurplusRecoverOption,
  buildReversibleRecoverOptions,
  buildWalletBalanceRecoverOption,
  grantWalletDebitAmount,
  hierarchyGrantPrincipalSpent,
  hierarchyRecoverableBaseCredits,
  hierarchyRecoverablePrincipalRefund,
  hierarchyRecoverWalletSlice,
  resolveRecoverDebitAmounts,
} from "@/lib/billing/hierarchyRecover";

export { getCreditBalance };
export {
  HIERARCHY_ADD_CREDITS_MAX,
  HIERARCHY_RECOVER_CREDITS_MAX,
  WALLET_BALANCE_RECOVER_GRANT_TX_ID,
  isWalletBalanceRecoverGrantId,
};

function bustWalletDashboardCacheAfterCreditMutation(): void {
  try {
    revalidateWalletDashboardCaches();
  } catch {
    /* no-op outside Next.js cache context */
  }
}

const ACCOUNT_STATUS_ON = 0;
const ACCOUNT_STATUS_OFF = 1;

export type BillingUserRow = {
  id: number;
  name: string | null;
  username: string;
  password: string;
  type: string;
  username_owner: string | null;
  status: string;
  current_login_time: string | null;
};

function row<T extends RowDataPacket>(r: T[]): T | null {
  return r[0] ?? null;
}

import { formatMysqlDateTime, isBillingAccountExpired } from "@/lib/billingAccountExpiry";

export { formatMysqlDateTime, isBillingAccountExpired } from "@/lib/billingAccountExpiry";

function normalizeMacForStalker(mac: string) {
  return mac.trim().toUpperCase().replace(/-/g, ":");
}

async function stalkerCutOnOff(stalker: NonNullable<ReturnType<typeof getStalkerPool>>, uid: number, mode: "on" | "off") {
  const status = mode === "on" ? ACCOUNT_STATUS_ON : ACCOUNT_STATUS_OFF;
  const conn = await stalker.getConnection();
  try {
    await conn.execute("UPDATE users SET status = :s WHERE id = :id", { s: status, id: uid });
    const addtime = formatMysqlDateTime(new Date());
    const eventtime = formatMysqlDateTime(new Date(Date.now() + 4 * 60 * 1000));
    const event = mode === "on" ? "cut_on" : "cut_off";
    try {
      await conn.execute(
        `INSERT INTO events (uid, event, priority, addtime, eventtime) VALUES (:uid, :event, 1, :addtime, :eventtime)`,
        { uid, event, addtime, eventtime },
      );
    } catch {
      /* DBs without Ministra `events` table — `users.status` update still applies */
    }
  } finally {
    conn.release();
  }
}

export type AuthenticateRootResult =
  | { ok: true; user: BillingUserRow; previousLogin: string | null }
  | { ok: false; reason: "credentials" | "forbidden" };

export type AuthenticateBillingLoginResult =
  | { ok: true; user: BillingUserRow; previousLogin: string | null }
  | { ok: false; reason: "credentials" };

/**
 * Any active billing `users` row with password check (shared by admin + operator portals).
 */
export async function authenticateBillingLogin(username: string, password: string): Promise<AuthenticateBillingLoginResult> {
  const pool = getBillingPool();
  const uNorm = username.trim().toLowerCase();
  if (!uNorm) return { ok: false, reason: "credentials" };
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, username, password, type, username_owner, status, current_login_time
     FROM users
     WHERE LOWER(TRIM(username)) = :u
       AND UPPER(TRIM(COALESCE(status, ''))) NOT IN ('S', 'INACTIVE')
     LIMIT 1`,
    { u: uNorm },
  );
  const u = row(rows) as BillingUserRow | null;
  if (!u) return { ok: false, reason: "credentials" };
  if (!(await verifyPassword(password, u.password))) return { ok: false, reason: "credentials" };
  return { ok: true, user: u, previousLogin: u.current_login_time };
}

/**
 * ROOT-only check (e.g. server actions that must stay admin-only).
 * Non-ROOT accounts get `forbidden` so operators are not told "invalid credentials".
 */
export async function authenticateRoot(username: string, password: string): Promise<AuthenticateRootResult> {
  const r = await authenticateBillingLogin(username, password);
  if (!r.ok) return { ok: false, reason: "credentials" };
  if (r.user.type !== "ROOT") return { ok: false, reason: "forbidden" };
  return { ok: true, user: r.user, previousLogin: r.previousLogin };
}

export type StaffLoginIpSnapshot = {
  lastLoginIp: string;
  currentLoginIp: string;
};

function normalizeStaffIpDbValue(raw: unknown): string {
  return normalizeClientIp(String(raw ?? ""));
}

export { formatStaffIpDisplay, formatStaffLoginTimeDisplay } from "@/lib/staffDisplayFormat";

function pickStaffIpFromRow(r: RowDataPacket): StaffLoginIpSnapshot {
  return {
    lastLoginIp:
      normalizeStaffIpDbValue(r.last_login_ip) ||
      normalizeStaffIpDbValue(r.last_ip) ||
      "",
    currentLoginIp:
      normalizeStaffIpDbValue(r.current_login_ip) ||
      normalizeStaffIpDbValue(r.ip) ||
      normalizeStaffIpDbValue(r.current_ip) ||
      "",
  };
}

/** Billing `users` login IPs for staff list / details modals. */
export async function batchStaffLoginIps(usernames: string[]): Promise<Map<string, StaffLoginIpSnapshot>> {
  if (usernames.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const sqlAttempts = [
    `SELECT username, last_login_ip, current_login_ip FROM users WHERE username IN (${ph})`,
    `SELECT username, last_ip AS last_login_ip, ip AS current_login_ip FROM users WHERE username IN (${ph})`,
    `SELECT username, last_ip AS last_login_ip, current_ip AS current_login_ip FROM users WHERE username IN (${ph})`,
  ];
  for (const sql of sqlAttempts) {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(sql, usernames);
      const byUser = new Map(rows.map((r) => [String(r.username), pickStaffIpFromRow(r)]));
      const out = new Map<string, StaffLoginIpSnapshot>();
      for (const u of usernames) {
        out.set(u, byUser.get(u) ?? { lastLoginIp: "", currentLoginIp: "" });
      }
      return out;
    } catch (err) {
      if (!isMysqlUnknownColumn(err, "last_login_ip") && !isMysqlUnknownColumn(err, "current_login_ip") && !isMysqlUnknownColumn(err, "last_ip") && !isMysqlUnknownColumn(err, "current_ip") && !isMysqlUnknownColumn(err, "ip")) {
        throw err;
      }
    }
  }
  return new Map();
}

export async function touchUserLogin(userId: number, clientIp?: string | null): Promise<void> {
  const pool = getBillingPool();
  const ip = normalizeStaffIpDbValue(clientIp) || null;
  const timeOnly = `UPDATE users SET last_login_time = current_login_time, current_login_time = NOW() WHERE id = :id`;
  const attempts: { sql: string; params: { id: number; ip: string | null } }[] = [
    {
      sql: `UPDATE users SET last_login_time = current_login_time, last_login_ip = current_login_ip,
            current_login_time = NOW(), current_login_ip = COALESCE(:ip, current_login_ip) WHERE id = :id`,
      params: { id: userId, ip },
    },
    {
      sql: `UPDATE users SET last_login_time = current_login_time, last_ip = ip,
            current_login_time = NOW(), ip = COALESCE(:ip, ip) WHERE id = :id`,
      params: { id: userId, ip },
    },
    { sql: timeOnly, params: { id: userId, ip: null } },
  ];
  for (const { sql, params } of attempts) {
    try {
      await pool.execute(sql, params);
      return;
    } catch (err) {
      if (sql === timeOnly) throw err;
      if (
        !isMysqlUnknownColumn(err, "last_login_ip") &&
        !isMysqlUnknownColumn(err, "current_login_ip") &&
        !isMysqlUnknownColumn(err, "last_ip") &&
        !isMysqlUnknownColumn(err, "ip")
      ) {
        throw err;
      }
    }
  }
}

export async function getDashboardStats() {
  const pool = getBillingPool();
  /** One round-trip — avoids grabbing many pool connections at once (MySQL “Too many connections” under dev/HMR). */
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM accounts) AS total_users,
       (SELECT COUNT(*) FROM accounts WHERE status = ?) AS active_users,
       (SELECT COUNT(*) FROM accounts
         WHERE expires IS NOT NULL AND expires > '1970-01-01 00:00:00' AND expires < NOW()) AS expired_users,
       (SELECT COUNT(*) FROM users WHERE type = 'MNGR') AS total_mngr,
       (SELECT COUNT(*) FROM users WHERE type = 'SRSLR') AS total_srslr,
       (SELECT COUNT(*) FROM users d
         INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
         WHERE d.type = 'RSLR') AS total_rslr`,
    [ACCOUNT_STATUS_ON],
  );
  const r = rows[0] ?? {};
  return {
    totalUsers: Number(r.total_users ?? 0),
    activeUsers: Number(r.active_users ?? 0),
    expiredUsers: Number(r.expired_users ?? 0),
    totalManagers: Number(r.total_mngr ?? 0),
    totalResellers: Number(r.total_srslr ?? 0),
    totalDealers: Number(r.total_rslr ?? 0),
  };
}

/** Admin managers index — PHP `admin/managers/index` table columns + delete eligibility. */
export type AdminManagerListRow = {
  username: string;
  name: string;
  status: string;
  resellerCount: number;
  /** RSLR rows under resellers owned by this manager. */
  dealerCount: number;
  /** Billing `accounts` rows owned by resellers or dealers in this manager’s tree. */
  subscriberCount: number;
  /** Active subscriber rows in manager tree (`accounts.status` on). */
  activeSubscriberCount: number;
  /** Expired subscriber rows in manager tree. */
  expiredSubscriberCount: number;
  credits: number;
  canDelete: boolean;
  /** Raw DB login timestamps (users.current_login_time / users.last_login_time). */
  currentLoginTime: string;
  lastLoginTime: string;
  /** `users.current_login_ip` / `users.last_login_ip` (or legacy `ip` / `last_ip`). */
  currentLoginIp: string;
  lastLoginIp: string;
  /**
   * Latest activity: max of billing `users.last_login_time` / `current_login_time` (portal auth)
   * and newest `transactions.timestamp` anywhere under this manager (own login, resellers, dealers).
   */
  lastActive: string;
  /** Hover hint showing login vs billing sources. */
  lastActiveTitle?: string;
  /** `users.created_at` (set on create; migration backfill may copy first valid transaction). */
  createdAt: string;
};

function parseBillingDateTime(raw: unknown): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === "0000-00-00 00:00:00" || s.startsWith("0000-00-00")) return null;
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(normalized);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function staffCreatedAtMapFromRows(
  usernames: string[],
  rows: RowDataPacket[],
  pick: (r: RowDataPacket) => unknown,
): Map<string, string> {
  const byUser = new Map(rows.map((r) => [String(r.username), r]));
  const out = new Map<string, string>();
  for (const u of usernames) {
    const row = byUser.get(u);
    const v = normalizeStaffCreatedAtDbValue(row ? pick(row) : null);
    if (v) out.set(u, v);
  }
  return out;
}

/** Pre-migration only: earliest valid `transactions.timestamp` when `users.created_at` column does not exist. */
async function batchStaffCreatedAtFromTransactions(usernames: string[]): Promise<Map<string, string>> {
  if (usernames.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, MIN(\`timestamp\`) AS first_at
     FROM transactions
     WHERE username IN (${ph})
       AND \`timestamp\` IS NOT NULL
       AND \`timestamp\` > '1000-01-01 00:00:00'
     GROUP BY username`,
    usernames,
  );
  return staffCreatedAtMapFromRows(usernames, rows, (r) => r.first_at);
}

/** Staff list **Created** — only `users.created_at`. NULL/empty → no value (UI shows —). */
export async function batchStaffCreatedAt(usernames: string[]): Promise<Map<string, string>> {
  if (usernames.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = usernames.map(() => "?").join(",");

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM users WHERE username IN (${ph})`,
      usernames,
    );
    return staffCreatedAtMapFromRows(usernames, rows, (r) => r.created_at);
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "created_at")) throw err;
    /** DB has no `created_at` column yet — legacy installs only. */
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT username, DATE_FORMAT(\`created\`, '%Y-%m-%d %H:%i:%s') AS created_legacy
         FROM users WHERE username IN (${ph})`,
        usernames,
      );
      const legacy = staffCreatedAtMapFromRows(usernames, rows, (r) => r.created_legacy);
      if (legacy.size > 0) return legacy;
    } catch (e2) {
      if (!isMysqlUnknownColumn(e2, "created")) throw e2;
    }
    return batchStaffCreatedAtFromTransactions(usernames);
  }
}

type StaffInsertParams = {
  name: string;
  username: string;
  password: string;
  manager?: string;
  username_owner?: string;
  tickets_enable?: number;
  subscriber_messages_enable?: number;
};

async function insertStaffUserRow(
  withCreatedSql: string,
  withoutCreatedSql: string,
  params: StaffInsertParams,
): Promise<boolean> {
  const pool = getBillingPool();
  try {
    const [res] = await pool.execute<ResultSetHeader>(withCreatedSql, {
      ...params,
      created_at: formatMysqlDateTime(new Date()),
    });
    return res.affectedRows === 1;
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "created_at")) throw err;
    const [res] = await pool.execute<ResultSetHeader>(withoutCreatedSql, params);
    return res.affectedRows === 1;
  }
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

export async function getManagers(): Promise<AdminManagerListRow[]> {
  const pool = getBillingPool();
  /** One row per manager — avoids correlated subqueries (they time out on large hierarchies / serverless). */
  const [mgrRows] = await pool.execute<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.last_login_time, u.current_login_time
     FROM users u WHERE u.type = 'MNGR' ORDER BY u.username ASC`,
  );
  if (mgrRows.length === 0) return [];

  const usernames = mgrRows.map((r) => String(r.username));
  const ph = usernames.map(() => "?").join(",");

  const [resellerCountRows] = await pool.execute<RowDataPacket[]>(
    `SELECT username_owner AS manager_login, COUNT(*) AS c
     FROM users WHERE type = 'SRSLR' AND username_owner IN (${ph}) GROUP BY username_owner`,
    usernames,
  );
  const [dealerCountRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.username_owner AS manager_login, COUNT(*) AS c
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE d.type = 'RSLR' AND r.username_owner IN (${ph}) GROUP BY r.username_owner`,
    usernames,
  );
  const [subTotalMap, subActiveMap, subExpiredMap] = await Promise.all([
    batchCountSubscriberAccountsByManager(usernames, "total"),
    batchCountSubscriberAccountsByManager(usernames, "active"),
    batchCountSubscriberAccountsByManager(usernames, "expired"),
  ]);

  const [childRows] = await pool.execute<RowDataPacket[]>(
    `SELECT username_owner AS owner, COUNT(*) AS c FROM users WHERE username_owner IN (${ph}) GROUP BY username_owner`,
    usernames,
  );
  const [acctRows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, COUNT(*) AS c FROM accounts WHERE username IN (${ph}) GROUP BY username`,
    usernames,
  );
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

  const resellerCountMap = new Map(resellerCountRows.map((r) => [String(r.manager_login), Number(r.c)]));
  const dealerCountMap = new Map(dealerCountRows.map((r) => [String(r.manager_login), Number(r.c)]));

  /** Latest billing txn time for manager + all SRSLR/RSLR in their tree (`transactions.username`). */
  let hierarchyTxRows: RowDataPacket[] = [];
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT x.manager_login, MAX(x.tx_time) AS last_tx
       FROM (
         SELECT m.username AS manager_login, t.\`timestamp\` AS tx_time
         FROM users m
         INNER JOIN transactions t ON t.username = m.username
         WHERE m.type = 'MNGR' AND m.username IN (${ph})
         UNION ALL
         SELECT sr.username_owner AS manager_login, t.\`timestamp\` AS tx_time
         FROM transactions t
         INNER JOIN users sr ON sr.username = t.username AND sr.type = 'SRSLR'
         WHERE sr.username_owner IN (${ph})
         UNION ALL
         SELECT r.username_owner AS manager_login, t.\`timestamp\` AS tx_time
         FROM transactions t
         INNER JOIN users d ON d.username = t.username AND d.type = 'RSLR'
         INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
         WHERE r.username_owner IN (${ph})
       ) x
       GROUP BY x.manager_login`,
      [...usernames, ...usernames, ...usernames],
    );
    hierarchyTxRows = rows;
  } catch (err) {
    console.error("[getManagers] hierarchy last_tx query failed:", err);
  }

  const childMap = new Map(childRows.map((r) => [String(r.owner), Number(r.c)]));
  const acctMap = new Map(acctRows.map((r) => [String(r.username), Number(r.c)]));
  const balMap = new Map(balRows.map((r) => [String(r.username), Number(r.balance)]));
  const hierarchyLastTxMap = new Map(hierarchyTxRows.map((r) => [String(r.manager_login), r.last_tx]));

  return mgrRows.map((r) => {
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
    const billingActivity = parseBillingDateTime(hierarchyLastTxMap.get(username));

    const parts: Date[] = [];
    if (loginMax) parts.push(loginMax);
    if (billingActivity) parts.push(billingActivity);
    const overall = parts.length > 0 ? new Date(Math.max(...parts.map((d) => d.getTime()))) : null;

    let lastActive = "—";
    let lastActiveTitle: string | undefined;
    if (overall) {
      lastActive = formatManagerLastActive(overall);
      const hint: string[] = [];
      if (loginMax) hint.push(`Portal login: ${formatManagerLastActive(loginMax)}`);
      if (billingActivity) hint.push(`Billing (tree): ${formatManagerLastActive(billingActivity)}`);
      if (hint.length) lastActiveTitle = hint.join(" · ");
    }

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
      lastActive,
      lastActiveTitle,
      createdAt: createdMap.get(username) ?? "",
    };
  });
}

/** PHP `admin/Managers::delete` — block if any `users` child or `accounts` row references this username. */
export async function deleteAdminManager(username: string): Promise<boolean> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return false;
  const [[r1]] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users WHERE username_owner = :u", { u });
  if (Number(r1?.c) > 0) return false;
  const [[r2]] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM accounts WHERE username = :u", { u });
  if (Number(r2?.c) > 0) return false;
  const [res] = await pool.execute<ResultSetHeader>(
    "DELETE FROM users WHERE username = :u AND type = 'MNGR' LIMIT 1",
    { u },
  );
  return res.affectedRows === 1;
}

export async function getManagerByUsername(username: string) {
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, password, status, comments, tickets_enable FROM users WHERE type = 'MNGR' AND username = :u LIMIT 1`,
      { u: username },
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, password, status, comments FROM users WHERE type = 'MNGR' AND username = :u LIMIT 1`,
      { u: username },
    );
  }
  const r = row(rows);
  if (!r) return null;
  const u = String(r.username);
  const te = r.tickets_enable != null ? Number(r.tickets_enable) : 1;
  const [balRows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${TX_WALLET_BALANCE_SUM_SQL} AS balance
     FROM transactions WHERE username = :u`,
    { u },
  );
  const credits = Number(balRows[0]?.balance ?? 0);
  let tx: AccountTransactionRow[] = [];
  try {
    tx = await listTransactionsByUsername(u, 50);
  } catch (err) {
    console.error("[getManagerByUsername] transactions", u, err);
  }
  return {
    id: u,
    username: u,
    name: r.name != null ? String(r.name) : "",
    password: String(r.password ?? ""),
    status: String(r.status ?? "A"),
    comments: r.comments != null ? String(r.comments) : "",
    ticketsManager: te ? "Yes" : "No",
    tickets_enable: te,
    credits,
    transactions: tx,
  };
}

export async function insertManager(input: {
  name: string;
  username: string;
  password: string;
  tickets_enable?: number;
}) {
  const tickets_enable = input.tickets_enable ?? 1;
  try {
    return insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, tickets_enable, created_at) VALUES (:name, :username, :password, 'A', 'MNGR', :tickets_enable, :created_at)`,
      `INSERT INTO users (name, username, password, status, type, tickets_enable) VALUES (:name, :username, :password, 'A', 'MNGR', :tickets_enable)`,
      { name: input.name, username: input.username, password: input.password, tickets_enable },
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    return insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, created_at) VALUES (:name, :username, :password, 'A', 'MNGR', :created_at)`,
      `INSERT INTO users (name, username, password, status, type) VALUES (:name, :username, :password, 'A', 'MNGR')`,
      { name: input.name, username: input.username, password: input.password },
    );
  }
}

export async function updateManager(input: {
  username: string;
  name: string;
  password: string;
  status: string;
  comments: string;
  tickets_enable?: number;
}) {
  const pool = getBillingPool();
  if (input.tickets_enable !== undefined) {
    try {
      const [res] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET name = :name, password = :password, status = :status, comments = :comments, tickets_enable = :tickets_enable, type = 'MNGR' WHERE username = :username AND type = 'MNGR'`,
        {
          username: input.username,
          name: input.name,
          password: input.password,
          status: input.status,
          comments: input.comments,
          tickets_enable: input.tickets_enable,
        },
      );
      return res.affectedRows === 1;
    } catch (err) {
      if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    }
  }
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name, password = :password, status = :status, comments = :comments, type = 'MNGR' WHERE username = :username AND type = 'MNGR'`,
    {
      username: input.username,
      name: input.name,
      password: input.password,
      status: input.status,
      comments: input.comments,
    },
  );
  return res.affectedRows === 1;
}

export async function updateManagerStatus(username: string, status: "A" | "S") {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET status = :status WHERE username = :username AND type = 'MNGR'`,
    { username, status },
  );
  return res.affectedRows === 1;
}

export async function updateManagerName(username: string, name: string) {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name WHERE username = :username AND type = 'MNGR'`,
    { username, name },
  );
  return res.affectedRows === 1;
}

export async function listManagersForSelect() {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, COALESCE(name, username) AS display_name FROM users WHERE type = 'MNGR' ORDER BY username ASC`,
  );
  return rows.map((r) => ({ username: String(r.username), name: String(r.display_name) }));
}

/** Admin resellers index — PHP `admin/resellers/index` + delete eligibility (`reseller_action_buttons`). */
export type AdminResellerListRow = {
  username: string;
  manager: string;
  name: string;
  status: string;
  dealerCount: number;
  activeUserCount: number;
  expiredUserCount: number;
  userCount: number;
  credits: number;
  canDelete: boolean;
  currentLoginTime: string;
  lastLoginTime: string;
  currentLoginIp: string;
  lastLoginIp: string;
  lastActive: string;
  createdAt: string;
};

export async function getResellers(): Promise<AdminResellerListRow[]> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT u.username, u.name, u.status, u.username_owner AS manager, u.last_login_time, u.current_login_time,
      (SELECT COUNT(*) FROM users ch WHERE ch.username_owner = u.username AND ch.type = 'RSLR') AS dealer_count
     FROM users u WHERE u.type = 'SRSLR' ORDER BY u.username ASC`,
  );
  if (rows.length === 0) return [];

  const usernames = rows.map((r) => String(r.username));
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

/** PHP `admin/Resellers::delete` — block if dealers under reseller or `accounts` rows owned by reseller. */
export async function deleteAdminReseller(username: string): Promise<boolean> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return false;
  const [r1Rows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users WHERE username_owner = :u", { u });
  if (Number(r1Rows[0]?.c ?? 0) > 0) return false;
  const [r2Rows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM accounts WHERE username = :u", { u });
  if (Number(r2Rows[0]?.c ?? 0) > 0) return false;
  const [res] = await pool.execute<ResultSetHeader>(
    "DELETE FROM users WHERE username = :u AND type = 'SRSLR' LIMIT 1",
    { u },
  );
  return res.affectedRows === 1;
}

export async function getResellerByUsername(username: string) {
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, password, status, username_owner, comments, tickets_enable FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1`,
      { u: username },
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, password, status, username_owner, comments FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1`,
      { u: username },
    );
  }
  const r = row(rows);
  if (!r) return null;
  const un = String(r.username);
  const te = r.tickets_enable != null ? Number(r.tickets_enable) : 1;
  const [balRows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${TX_WALLET_BALANCE_SUM_SQL} AS balance
     FROM transactions WHERE username = :u`,
    { u: un },
  );
  const credits = Number(balRows[0]?.balance ?? 0);
  let tx: AccountTransactionRow[] = [];
  try {
    tx = await listTransactionsByUsername(un, 50);
  } catch (err) {
    console.error("[getResellerByUsername] transactions", un, err);
  }
  return {
    id: un,
    name: r.name != null ? String(r.name) : "",
    username: un,
    password: String(r.password ?? ""),
    status: String(r.status ?? "A") as "A" | "S",
    manager: r.username_owner != null ? String(r.username_owner) : "",
    comments: r.comments != null ? String(r.comments) : "",
    ticketsManager: te ? "Yes" : "No",
    tickets_enable: te,
    credits,
    transactions: tx,
  };
}

export async function insertReseller(input: {
  name: string;
  username: string;
  password: string;
  manager: string;
  tickets_enable?: number;
}) {
  const tickets_enable = input.tickets_enable ?? 1;
  const payload = { name: input.name, username: input.username, password: input.password, manager: input.manager, tickets_enable };
  try {
    return insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable, created_at) VALUES (:name, :username, :password, 'A', 'SRSLR', :manager, :tickets_enable, :created_at)`,
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable) VALUES (:name, :username, :password, 'A', 'SRSLR', :manager, :tickets_enable)`,
      payload,
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    return insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, username_owner, created_at) VALUES (:name, :username, :password, 'A', 'SRSLR', :manager, :created_at)`,
      `INSERT INTO users (name, username, password, status, type, username_owner) VALUES (:name, :username, :password, 'A', 'SRSLR', :manager)`,
      input,
    );
  }
}

export async function updateReseller(input: {
  username: string;
  name: string;
  password: string;
  status: string;
  manager: string;
  comments: string;
  tickets_enable?: number;
}) {
  const pool = getBillingPool();
  if (input.tickets_enable !== undefined) {
    try {
      const [res] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET name = :name, password = :password, status = :status, comments = :comments, username_owner = :manager, tickets_enable = :tickets_enable, type = 'SRSLR' WHERE username = :username AND type = 'SRSLR'`,
        input,
      );
      return res.affectedRows === 1;
    } catch (err) {
      if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    }
  }
  const rest = {
    username: input.username,
    name: input.name,
    password: input.password,
    status: input.status,
    manager: input.manager,
    comments: input.comments,
  };
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name, password = :password, status = :status, comments = :comments, username_owner = :manager, type = 'SRSLR' WHERE username = :username AND type = 'SRSLR'`,
    rest,
  );
  return res.affectedRows === 1;
}

export async function updateResellerStatus(username: string, status: "A" | "S") {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET status = :status WHERE username = :username AND type = 'SRSLR'`,
    { username, status },
  );
  return res.affectedRows === 1;
}

export async function updateResellerName(username: string, name: string) {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name WHERE username = :username AND type = 'SRSLR'`,
    { username, name },
  );
  return res.affectedRows === 1;
}

/** Admin dealers index — PHP `admin/dealers/index` + `dealer_action_buttons` delete rule. */
export type AdminDealerListRow = {
  username: string;
  manager: string;
  reseller: string;
  name: string;
  status: string;
  activeUserCount: number;
  expiredUserCount: number;
  userCount: number;
  credits: number;
  canDelete: boolean;
  currentLoginTime: string;
  lastLoginTime: string;
  currentLoginIp: string;
  lastLoginIp: string;
  lastActive: string;
  createdAt: string;
};

export async function getDealers(filter?: { resellerUsername?: string }): Promise<AdminDealerListRow[]> {
  const pool = getBillingPool();
  const reseller = filter?.resellerUsername?.trim();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT d.username, d.name, d.status, d.last_login_time, d.current_login_time, d.username_owner AS reseller_username,
            r.username_owner AS manager_username,
            (SELECT COUNT(*) FROM accounts a WHERE a.username = d.username) AS user_count
     FROM users d
     INNER JOIN users r ON r.username = d.username_owner AND r.type = 'SRSLR'
     WHERE d.type = 'RSLR'${reseller ? " AND r.username = :reseller" : ""}
     ORDER BY d.username ASC`,
    reseller ? { reseller } : {},
  );
  if (rows.length === 0) return [];

  const usernames = rows.map((r) => String(r.username));
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
    const activeUserCount = activeMap.get(username) ?? 0;
    const expiredUserCount = expiredMap.get(username) ?? 0;
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
      activeUserCount,
      expiredUserCount,
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

/** PHP `admin/Dealers::delete` — block if any `accounts` rows owned by this dealer (`has_users`). */
export async function deleteAdminDealer(username: string): Promise<boolean> {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return false;
  const [cntRows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM accounts WHERE username = :u", { u });
  if (Number(cntRows[0]?.c ?? 0) > 0) return false;
  const [res] = await pool.execute<ResultSetHeader>(
    "DELETE FROM users WHERE username = :u AND type = 'RSLR' LIMIT 1",
    { u },
  );
  return res.affectedRows === 1;
}

export async function getDealerByUsername(username: string) {
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT d.username, d.name, d.password, d.status, d.username_owner AS reseller_username, d.comments, d.tickets_enable,
              COALESCE(d.subscriber_messages_enable, 1) AS subscriber_messages_enable,
              sr.username_owner AS manager_username
       FROM users d
       LEFT JOIN users sr ON sr.username = d.username_owner AND sr.type = 'SRSLR'
       WHERE d.type = 'RSLR' AND d.username = :u LIMIT 1`,
      { u: username },
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "subscriber_messages_enable")) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT d.username, d.name, d.password, d.status, d.username_owner AS reseller_username, d.comments, d.tickets_enable,
              1 AS subscriber_messages_enable,
              sr.username_owner AS manager_username
       FROM users d
       LEFT JOIN users sr ON sr.username = d.username_owner AND sr.type = 'SRSLR'
       WHERE d.type = 'RSLR' AND d.username = :u LIMIT 1`,
      { u: username },
    );
  }
  const r = row(rows);
  if (!r) return null;
  const un = String(r.username);
  const [balRows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${TX_WALLET_BALANCE_SUM_SQL} AS balance
     FROM transactions WHERE username = :u`,
    { u: un },
  );
  const credits = Number(balRows[0]?.balance ?? 0);
  let tx: AccountTransactionRow[] = [];
  try {
    tx = await listTransactionsByUsername(un, 50);
  } catch (err) {
    console.error("[getDealerByUsername] transactions", un, err);
  }
  const te = r.tickets_enable != null ? Number(r.tickets_enable) : 0;
  const sme = r.subscriber_messages_enable != null ? Number(r.subscriber_messages_enable) : 1;
  return {
    id: un,
    name: r.name != null ? String(r.name) : "",
    username: un,
    passwordPlaceholder: String(r.password ?? ""),
    status: String(r.status ?? "A") as "A" | "S",
    reseller: r.reseller_username != null ? String(r.reseller_username) : "",
    manager: r.manager_username != null ? String(r.manager_username) : "",
    ticketsManager: te ? "Yes" : "No",
    tickets_enable: te,
    subscriberMessagesManager: sme ? "Yes" : "No",
    subscriber_messages_enable: sme,
    comments: r.comments != null ? String(r.comments) : "",
    credits,
    transactions: tx,
  };
}

/** Credits modal slice — user row + balance only (no transaction list). */
export async function getManagerCreditsEditorSlice(username: string) {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'MNGR' AND username = :u LIMIT 1`,
    { u },
  );
  const r = row(rows);
  if (!r) return null;
  const un = String(r.username);
  let credits = 0;
  try {
    credits = await getCreditBalance(un);
  } catch (err) {
    console.error("[getManagerCreditsEditorSlice] balance", un, err);
  }
  return { username: un, credits };
}

export async function getResellerCreditsEditorSlice(username: string) {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, username_owner AS manager FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1`,
    { u },
  );
  const r = row(rows);
  if (!r) return null;
  const un = String(r.username);
  let credits = 0;
  try {
    credits = await getCreditBalance(un);
  } catch (err) {
    console.error("[getResellerCreditsEditorSlice] balance", un, err);
  }
  return {
    username: un,
    manager: r.manager != null ? String(r.manager) : "",
    credits,
  };
}

export async function getDealerCreditsEditorSlice(username: string) {
  const pool = getBillingPool();
  const u = username.trim();
  if (!u) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, username_owner AS reseller FROM users WHERE type = 'RSLR' AND username = :u LIMIT 1`,
    { u },
  );
  const r = row(rows);
  if (!r) return null;
  const un = String(r.username);
  let credits = 0;
  try {
    credits = await getCreditBalance(un);
  } catch (err) {
    console.error("[getDealerCreditsEditorSlice] balance", un, err);
  }
  return {
    username: un,
    reseller: r.reseller != null ? String(r.reseller) : "",
    credits,
  };
}

/** Reseller dropdown options (capped — use search on Users list for full directory). */
export async function listResellersForSelect(limit = 2000) {
  const pool = getBillingPool();
  const lim = Math.min(5000, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT username, COALESCE(name, username) AS display_name FROM users WHERE type = 'SRSLR' ORDER BY username ASC LIMIT ${lim}`,
  );
  return rows.map((r) => ({ username: String(r.username), name: String(r.display_name) }));
}

export async function listDealersForReseller(resellerUsername: string) {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, COALESCE(name, username) AS display_name FROM users WHERE type = 'RSLR' AND username_owner = :r ORDER BY username ASC`,
    { r: resellerUsername },
  );
  return rows.map((r) => ({ username: String(r.username), name: String(r.display_name) }));
}

/** Parent reseller login for a dealer (`users.username_owner` where `type = 'RSLR'`). */
export async function getResellerUsernameForDealer(dealerUsername: string): Promise<string | null> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username_owner AS r FROM users WHERE type = 'RSLR' AND username = :d LIMIT 1`,
    { d: dealerUsername.trim() },
  );
  const v = rows[0]?.r;
  return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

export async function insertDealer(input: {
  name: string;
  username: string;
  password: string;
  username_owner: string;
  tickets_enable: number;
  subscriber_messages_enable?: number;
}) {
  const payload = {
    ...input,
    subscriber_messages_enable: input.subscriber_messages_enable ?? 1,
  };
  try {
    return await insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable, subscriber_messages_enable, created_at)
       VALUES (:name, :username, :password, 'A', 'RSLR', :username_owner, :tickets_enable, :subscriber_messages_enable, :created_at)`,
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable, subscriber_messages_enable)
       VALUES (:name, :username, :password, 'A', 'RSLR', :username_owner, :tickets_enable, :subscriber_messages_enable)`,
      payload,
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "subscriber_messages_enable")) throw err;
    return insertStaffUserRow(
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable, created_at)
       VALUES (:name, :username, :password, 'A', 'RSLR', :username_owner, :tickets_enable, :created_at)`,
      `INSERT INTO users (name, username, password, status, type, username_owner, tickets_enable)
       VALUES (:name, :username, :password, 'A', 'RSLR', :username_owner, :tickets_enable)`,
      input,
    );
  }
}

export async function updateDealer(input: {
  username: string;
  name: string;
  password: string;
  status: string;
  username_owner: string;
  tickets_enable: number;
  subscriber_messages_enable?: number;
  comments: string;
}) {
  const pool = getBillingPool();
  const baseSql = `UPDATE users SET name = :name, password = :password, status = :status, username_owner = :username_owner, tickets_enable = :tickets_enable, comments = :comments, type = 'RSLR' WHERE username = :username AND type = 'RSLR'`;

  if (input.subscriber_messages_enable === undefined) {
    const [res] = await pool.execute<ResultSetHeader>(baseSql, input);
    return res.affectedRows === 1;
  }

  const withMessaging = { ...input, subscriber_messages_enable: input.subscriber_messages_enable ? 1 : 0 };
  try {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET name = :name, password = :password, status = :status, username_owner = :username_owner,
              tickets_enable = :tickets_enable, subscriber_messages_enable = :subscriber_messages_enable,
              comments = :comments, type = 'RSLR'
       WHERE username = :username AND type = 'RSLR'`,
      withMessaging,
    );
    return res.affectedRows === 1;
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "subscriber_messages_enable")) throw err;
    const [res] = await pool.execute<ResultSetHeader>(baseSql, input);
    return res.affectedRows === 1;
  }
}

export async function updateDealerStatus(username: string, status: "A" | "S") {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET status = :status WHERE username = :username AND type = 'RSLR'`,
    { username, status },
  );
  return res.affectedRows === 1;
}

export async function updateDealerName(username: string, name: string) {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name WHERE username = :username AND type = 'RSLR'`,
    { username, name },
  );
  return res.affectedRows === 1;
}

/** When column missing (pre-migration), dealers may send subscriber messages (legacy behavior). */
export async function dealerSubscriberMessagesEnabled(dealerUsername: string): Promise<boolean> {
  const pool = getBillingPool();
  const u = dealerUsername.trim();
  if (!u) return false;
  try {
    const [[row]] = await pool.query<RowDataPacket[]>(
      `SELECT subscriber_messages_enable AS en FROM users WHERE type = 'RSLR' AND username = ? LIMIT 1`,
      [u],
    );
    if (!row) return false;
    return Number(row.en ?? 1) === 1;
  } catch (err) {
    if (isMysqlUnknownColumn(err, "subscriber_messages_enable")) return true;
    throw err;
  }
}

export type AdjustHierarchyCreditsResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "no_target" | "no_owner" | "insufficient_credits" | "invalid_grants" | "db";
      balance?: number;
      required?: number;
    };

async function nextTransactionNumber(conn: PoolConnection, username: string): Promise<number> {
  const [[row]] = await conn.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(`transaction`), 0) + 1 AS n FROM transactions WHERE username = :u",
    { u: username },
  );
  return Number(row?.n ?? 1);
}

function mysqlErrno(err: unknown): number | undefined {
  return (err as { errno?: number })?.errno;
}

function mysqlMessage(err: unknown): string {
  return String((err as Error)?.message ?? err ?? "");
}

/** 1054 — column missing (strict mode). */
function isMysqlUnknownColumn(err: unknown, column: string): boolean {
  if (mysqlErrno(err) !== 1054) return false;
  return mysqlMessage(err).includes(column);
}

/** 1364 — NOT NULL column with no default on INSERT. */
function isMysqlNoDefaultForField(err: unknown, column: string): boolean {
  if (mysqlErrno(err) !== 1364) return false;
  return mysqlMessage(err).includes(column);
}

/** 1406 — value longer than column allows (`configs.value` often VARCHAR in legacy billing DBs). */
function isMysqlDataTooLongForColumn(err: unknown): boolean {
  const n = mysqlErrno(err);
  if (n === 1406) return true;
  const msg = mysqlMessage(err).toLowerCase();
  return msg.includes("data too long for column") || msg.includes("too long for column");
}

/** 3988 / ER_IMPOSSIBLE_STRING_CONVERSION — utf8mb4 param into utf8mb3 column. */
function isMysqlCollationMismatch(err: unknown): boolean {
  const n = mysqlErrno(err);
  if (n === 3988) return true;
  const msg = mysqlMessage(err).toLowerCase();
  return msg.includes("collation") && msg.includes("impossible");
}

/** Set once after a successful widen so we do not ALTER on every request. */
let configsValueColumnKnownWide = false;
let configsColumnsUtf8mb4Known = false;
let settingsRowUtf8mb4Known = false;

async function widenConfigsValueColumnToMediumText(conn: PoolConnection): Promise<boolean> {
  if (configsValueColumnKnownWide) return true;
  try {
    await conn.execute(
      "ALTER TABLE configs MODIFY COLUMN `value` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    configsValueColumnKnownWide = true;
    return true;
  } catch (e) {
    console.error("[billing] ALTER configs.value → MEDIUMTEXT utf8mb4 failed:", mysqlMessage(e));
    return false;
  }
}

async function ensureConfigsColumnsUtf8mb4(conn: PoolConnection): Promise<boolean> {
  if (configsColumnsUtf8mb4Known) return true;
  try {
    await conn.execute(
      "ALTER TABLE configs MODIFY COLUMN `key` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL",
    );
    await conn.execute(
      "ALTER TABLE configs MODIFY COLUMN `value` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    configsColumnsUtf8mb4Known = true;
    configsValueColumnKnownWide = true;
    return true;
  } catch (e) {
    console.error("[billing] ALTER configs columns utf8mb4 failed:", mysqlMessage(e));
    return false;
  }
}

/** Legacy billing `settings` rows often mix utf8mb3 columns with utf8mb4 connection params. */
async function ensureSettingsRowUtf8mb4(conn: PoolConnection): Promise<boolean> {
  if (settingsRowUtf8mb4Known) return true;
  try {
    await conn.execute(
      "ALTER TABLE settings MODIFY COLUMN title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL",
    );
    await conn.execute(
      "ALTER TABLE settings MODIFY COLUMN email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL",
    );
    await conn.execute(
      "ALTER TABLE settings MODIFY COLUMN global_msg MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL",
    );
    settingsRowUtf8mb4Known = true;
    return true;
  } catch (e) {
    console.error("[billing] ALTER settings row utf8mb4 failed:", mysqlMessage(e));
    return false;
  }
}

/** 1146 — referenced table does not exist (e.g. stripped Ministra / backup DB without `events`). */
function isMysqlNoSuchTable(err: unknown): boolean {
  return mysqlErrno(err) === 1146;
}

/** Ministra device messaging uses `events`; some DB dumps omit it. */
async function stalkerHasEventsTable(stalker: NonNullable<ReturnType<typeof getStalkerPool>>): Promise<boolean> {
  try {
    await stalker.execute("SELECT 1 FROM `events` LIMIT 1");
    return true;
  } catch (e) {
    if (isMysqlNoSuchTable(e)) return false;
    return true;
  }
}

/** For admin/portal message UX when `broadcastStalkerMessage` returns 0. */
export async function stalkerEventsMessagingReady(): Promise<"no_pool" | "no_events" | "ok"> {
  const stalker = getStalkerPool();
  if (!stalker) return "no_pool";
  if (!(await stalkerHasEventsTable(stalker))) return "no_events";
  return "ok";
}

/**
 * Admin / hierarchy credit lines (`credit_manage_admin` parity). Many billing DBs require
 * `user_transaction` (and sometimes `amount`) on `transactions`; legacy schemas omit them.
 */
async function insertHierarchyCreditTransaction(
  conn: PoolConnection,
  input: {
    username: string;
    type: "CRDT" | "DBIT";
    periods: number;
    remarks: string;
    account?: string;
  },
): Promise<number> {
  const tx = await nextTransactionNumber(conn, input.username);
  const account =
    input.account != null && String(input.account).trim() !== "" ? String(input.account).trim() : null;
  const base = {
    username: input.username,
    type: input.type,
    transaction: tx,
    periods: input.periods,
    timestamp: formatMysqlDateTime(new Date()),
    remarks: input.remarks,
    account,
  };

  const legacySql = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, NULL, NULL, :remarks, 0, :account)`;

  const withUserTxSql = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, NULL, NULL, :remarks, 0, :user_transaction, :account)`;

  const withUserTxAmountSql = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, amount, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, NULL, NULL, :remarks, 0, :user_transaction, :amount, :account)`;

  try {
    await conn.execute(withUserTxSql, { ...base, user_transaction: 0 });
    return tx;
  } catch (e) {
    if (isMysqlUnknownColumn(e, "user_transaction") || isMysqlUnknownColumn(e, "'user_transaction'")) {
      await conn.execute(legacySql, base);
      return tx;
    }
    if (isMysqlNoDefaultForField(e, "amount") || isMysqlNoDefaultForField(e, "'amount'")) {
      try {
        await conn.execute(withUserTxAmountSql, { ...base, user_transaction: 0, amount: 0 });
        return tx;
      } catch (e2) {
        if (isMysqlUnknownColumn(e2, "amount") || isMysqlUnknownColumn(e2, "'amount'")) throw e;
        throw e2;
      }
    }
    throw e;
  }
}

function parseRecoverOfTxIdsFromRemarks(text: string): number[] {
  const out: number[] = [];
  const re = /\[recover_of_tx:(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Math.floor(Number(m[1]));
    if (Number.isFinite(n) && n >= 1) out.push(n);
  }
  return out;
}

async function loadHierarchyGrantRowStubs(
  conn: Pool | PoolConnection,
  username: string,
): Promise<{ txno: number; periods: number }[]> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT \`transaction\` AS txno, periods, remarks, account FROM transactions
     WHERE ${HIERARCHY_GRANT_CRDT_WHERE_SQL}
     ORDER BY \`timestamp\` ASC`,
    { u: username },
  );
  const out: { txno: number; periods: number }[] = [];
  for (const r of rows) {
    const amounts = resolveHierarchyGrantAmounts(
      r.remarks != null ? String(r.remarks) : "",
      Math.floor(Number(r.periods)),
      r.account != null ? String(r.account) : null,
    );
    if (!amounts) continue;
    const txno = Math.floor(Number(r.txno));
    if (!Number.isFinite(txno) || txno < 1) continue;
    out.push({ txno, periods: amounts.total });
  }
  return out;
}

/** Grant CRDT tx ids already reversed (tagged recover DBIT/CRDT, plus legacy untagged recover FIFO). */
export function applyLegacyUntaggedRecoverFifo(
  grantRows: ReadonlyArray<{ txno: number; periods: number }>,
  legacyRecovers: ReadonlyArray<{ txno: number; periods: number }>,
  consumed: Set<number>,
): void {
  if (legacyRecovers.length < 1 || grantRows.length < 1) return;
  const grants = grantRows
    .map((r) => ({
      tid: Math.floor(Number(r.txno)),
      total: Math.floor(Number(r.periods)),
    }))
    .filter((g) => Number.isFinite(g.tid) && g.tid >= 1 && Number.isFinite(g.total) && g.total >= 1);
  for (const row of legacyRecovers) {
    const recoverTxno = Math.floor(Number(row.txno));
    let remaining = Math.floor(Number(row.periods));
    if (!Number.isFinite(remaining) || remaining < 1) continue;
    for (const g of grants) {
      if (consumed.has(g.tid)) continue;
      // Legacy PHP recover rows have no grant tag — only loads that existed before this DBIT can match.
      if (Number.isFinite(recoverTxno) && recoverTxno >= 1 && g.tid >= recoverTxno) continue;
      if (remaining < 1) break;
      if (remaining >= g.total) {
        remaining -= g.total;
        consumed.add(g.tid);
      } else {
        // Partial legacy recover — grant may still hold a wallet remainder.
        remaining = 0;
      }
    }
  }
}

async function loadRecoverConsumedGrantIds(
  conn: Pool | PoolConnection,
  username: string,
  grantRows: ReadonlyArray<{ txno: number; periods: number }>,
): Promise<Set<number>> {
  const out = new Set<number>();

  const [taggedRows] = await conn.execute<RowDataPacket[]>(
    `SELECT remarks FROM transactions
     WHERE remarks LIKE :hint
       AND (username = :u OR account = :u)
       AND remarks LIKE '%credits recovered%'`,
    { u: username, hint: "%recover_of_tx:%" },
  );
  for (const row of taggedRows) {
    for (const id of parseRecoverOfTxIdsFromRemarks(String(row.remarks ?? ""))) {
      out.add(id);
    }
  }

  const [legacyRows] = await conn.execute<RowDataPacket[]>(
    `SELECT \`transaction\` AS txno, periods FROM transactions
     WHERE username = :u AND type = 'DBIT'
       AND remarks LIKE '%credits recovered%'
       AND remarks NOT LIKE '%recover_of_tx:%'
     ORDER BY \`timestamp\` ASC`,
    { u: username },
  );
  applyLegacyUntaggedRecoverFifo(
    grantRows,
    legacyRows.map((row) => ({
      txno: Math.floor(Number(row.txno)),
      periods: Math.floor(Number(row.periods)),
    })),
    out,
  );

  return out;
}

type HierarchyGrantCrdtRow = {
  tid: number;
  remarks: string;
  periods: number;
  account: string | null;
  ts: string;
};

function parseWalletCrdtRow(row: RowDataPacket): HierarchyGrantCrdtRow | null {
  const tid = Math.floor(Number(row.txno ?? row.transaction));
  const remarks = row.remarks != null ? String(row.remarks) : "";
  const periods = Math.floor(Number(row.periods));
  const account = row.account != null ? String(row.account) : null;
  if (!Number.isFinite(tid) || tid < 1 || !Number.isFinite(periods) || periods < 1) return null;
  if (isSubscriberBeneficiaryCrdt(remarks, account)) return null;
  const amounts = resolveLooseWalletCrdtAmounts(remarks, periods, account);
  if (!amounts) return null;
  return { tid, remarks, periods, account, ts: String(row.ts ?? "") };
}

function hierarchyGrantFromCrdtRow(row: HierarchyGrantCrdtRow): HierarchyReversibleGrant {
  const meta = parseHierarchyGrantMetaPromos(row.remarks);
  let promo1 = meta?.p1 ?? 0;
  let promo2 = meta?.p2 ?? 0;
  let promoUnsplit: number | undefined;
  const amounts = resolveHierarchyGrantAmounts(row.remarks, row.periods, row.account)!;
  const { base, total } = amounts;
  if (!meta && total > base) {
    promo1 = 0;
    promo2 = 0;
    promoUnsplit = total - base;
  }
  return {
    grantTxId: row.tid,
    creditedAt: row.ts,
    base,
    promo1,
    promo2,
    total,
    ...(promoUnsplit != null ? { promoUnsplit } : {}),
  };
}

/** When tagged grants do not explain wallet balance, include other beneficiary CRDT loads. */
async function loadSupplementalHierarchyGrants(
  conn: Pool | PoolConnection,
  username: string,
  knownTxIds: Set<number>,
): Promise<HierarchyReversibleGrant[]> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT \`transaction\` AS txno, periods, remarks, account, \`timestamp\` AS ts FROM transactions
     WHERE username = :u AND type = 'CRDT'
     ORDER BY \`timestamp\` ASC`,
    { u: username },
  );
  const out: HierarchyReversibleGrant[] = [];
  for (const row of rows) {
    const parsed = parseWalletCrdtRow(row);
    if (!parsed || knownTxIds.has(parsed.tid)) continue;
    out.push(hierarchyGrantFromCrdtRow(parsed));
  }
  return out;
}

/** Last-resort: one recover row tied to newest unconsumed wallet CRDT when balance > 0. */
function buildNewestWalletRemainderOption(
  rows: HierarchyGrantCrdtRow[],
  consumed: Set<number>,
  balance: number,
): HierarchyReversibleGrant[] {
  const bal = Math.max(0, Math.floor(balance));
  if (bal < 1) return [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]!;
    if (consumed.has(row.tid)) continue;
    if (isSubscriberBeneficiaryCrdt(row.remarks, row.account)) continue;
    const amounts = resolveLooseWalletCrdtAmounts(row.remarks, row.periods, row.account);
    if (!amounts) continue;
    const grant = hierarchyGrantFromCrdtRow(row);
    const walletRemainder = Math.min(bal, amounts.total);
    if (walletRemainder < 1) continue;
    return [
      enrichGrantRecoverSlice(grant, walletRemainder, walletRemainder < amounts.total, 0),
    ];
  }
  return [];
}

/**
 * Oldest unconsumed hierarchy CRDT grant whose `(base P)` matches principal.
 * Recover debits **base principal only** (promo stays with admin subsidy).
 */
async function findFifoHierarchyGrantMatch(
  conn: Pool | PoolConnection,
  creditUsername: string,
  principal: number,
): Promise<{ periods: number; grantTransactionId: number } | null> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT \`transaction\` AS txno, periods, remarks, account FROM transactions
     WHERE ${HIERARCHY_GRANT_CRDT_WHERE_SQL}
     ORDER BY \`timestamp\` ASC`,
    { u: creditUsername },
  );
  const grantStubs: { txno: number; periods: number }[] = [];
  const parsed: { tid: number; base: number; periods: number }[] = [];
  for (const row of rows) {
    const tid = Math.floor(Number(row.txno));
    const amounts = resolveHierarchyGrantAmounts(
      row.remarks != null ? String(row.remarks) : "",
      Math.floor(Number(row.periods)),
      row.account != null ? String(row.account) : null,
    );
    if (!Number.isFinite(tid) || tid < 1 || !amounts) continue;
    grantStubs.push({ txno: tid, periods: amounts.total });
    parsed.push({ tid, base: amounts.base, periods: amounts.total });
  }
  const consumed = await loadRecoverConsumedGrantIds(conn, creditUsername, grantStubs);
  for (const row of parsed) {
    if (consumed.has(row.tid)) continue;
    if (row.base !== principal) continue;
    if (!Number.isFinite(row.periods) || row.periods < principal) continue;
    return { periods: row.periods, grantTransactionId: row.tid };
  }
  return null;
}

/** Recover debit for UI preview: matched grant returns **principal (base)** only, not promo total. */
export async function previewHierarchyRecoverDebit(input: {
  creditUsername: string;
  principal: number;
}): Promise<{ debitTotal: number; matchedGrantTxId: number | null }> {
  const pool = getBillingPool();
  const principal = Math.floor(Number(input.principal));
  const u = input.creditUsername.trim();
  if (!u || !Number.isFinite(principal) || principal < 1) {
    return { debitTotal: 0, matchedGrantTxId: null };
  }
  const match = await findFifoHierarchyGrantMatch(pool, u, principal);
  if (match) return { debitTotal: principal, matchedGrantTxId: match.grantTransactionId };
  return { debitTotal: principal, matchedGrantTxId: null };
}

/** Oldest-first hierarchy CRDT grants (tagged + legacy PHP) not yet referenced by a recover DBIT. */
export async function listReversibleHierarchyGrants(creditUsername: string): Promise<HierarchyReversibleGrant[]> {
  try {
    return await listReversibleHierarchyGrantsInner(creditUsername);
  } catch (err) {
    console.error("[listReversibleHierarchyGrants]", creditUsername, err);
    try {
      const balance = await getCreditBalance(creditUsername.trim());
      if (balance > 0) return [buildWalletBalanceRecoverOption(balance)];
    } catch (balanceErr) {
      console.error("[listReversibleHierarchyGrants] balance fallback", creditUsername, balanceErr);
    }
    return [];
  }
}

async function listReversibleHierarchyGrantsInner(creditUsername: string): Promise<HierarchyReversibleGrant[]> {
  const pool = getBillingPool();
  const u = creditUsername.trim();
  if (!u) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT \`transaction\` AS txno, periods, remarks, account, \`timestamp\` AS ts FROM transactions
     WHERE ${HIERARCHY_GRANT_CRDT_WHERE_SQL}
     ORDER BY \`timestamp\` ASC`,
    { u },
  );
  const grantStubs: { txno: number; periods: number }[] = [];
  const parsed: { tid: number; remarks: string; base: number; total: number; ts: string }[] = [];
  for (const row of rows) {
    const tid = Math.floor(Number(row.txno));
    const remarks = row.remarks != null ? String(row.remarks) : "";
    const amounts = resolveHierarchyGrantAmounts(
      remarks,
      Math.floor(Number(row.periods)),
      row.account != null ? String(row.account) : null,
    );
    if (!Number.isFinite(tid) || tid < 1 || !amounts) continue;
    grantStubs.push({ txno: tid, periods: amounts.total });
    parsed.push({
      tid,
      remarks,
      base: amounts.base,
      total: amounts.total,
      ts: String(row.ts ?? ""),
    });
  }
  const consumed = await loadRecoverConsumedGrantIds(pool, u, grantStubs);
  const out: HierarchyReversibleGrant[] = [];
  for (const row of parsed) {
    if (consumed.has(row.tid)) continue;
    const { tid, remarks, base, total } = row;
    const meta = parseHierarchyGrantMetaPromos(remarks);
    let promo1 = meta?.p1 ?? 0;
    let promo2 = meta?.p2 ?? 0;
    let promoUnsplit: number | undefined;
    if (!meta && total > base) {
      promo1 = 0;
      promo2 = 0;
      promoUnsplit = total - base;
    }
    out.push({
      grantTxId: tid,
      creditedAt: row.ts,
      base,
      promo1,
      promo2,
      total,
      ...(promoUnsplit != null ? { promoUnsplit } : {}),
    });
  }
  const balance = await getCreditBalance(u);
  let options = buildReversibleRecoverOptions(out, balance);
  let grantSource = out;
  if (options.length < 1 && balance > 0) {
    const known = new Set(out.map((g) => g.grantTxId));
    const supplemental = await loadSupplementalHierarchyGrants(pool, u, known);
    if (supplemental.length > 0) {
      const grantStubs2 = supplemental.map((g) => ({ txno: g.grantTxId, periods: g.total }));
      const consumed2 = await loadRecoverConsumedGrantIds(pool, u, grantStubs2);
      const merged = supplemental.filter((g) => !consumed2.has(g.grantTxId));
      options = buildReversibleRecoverOptions(merged, balance);
      grantSource = merged;
    }
    if (options.length < 1) {
      const [allCrdtRows] = await pool.execute<RowDataPacket[]>(
        `SELECT \`transaction\` AS txno, periods, remarks, account, \`timestamp\` AS ts FROM transactions
         WHERE username = :u AND type = 'CRDT'
         ORDER BY \`timestamp\` ASC`,
        { u },
      );
      const walletRows: HierarchyGrantCrdtRow[] = [];
      for (const row of allCrdtRows) {
        const parsed = parseWalletCrdtRow(row);
        if (parsed) walletRows.push(parsed);
      }
      const allStubs = walletRows.map((r) => ({ txno: r.tid, periods: r.periods }));
      const consumedAll = await loadRecoverConsumedGrantIds(pool, u, allStubs);
      const looseGrants = walletRows
        .filter((r) => !consumedAll.has(r.tid))
        .map((r) => hierarchyGrantFromCrdtRow(r));
      options = buildReversibleRecoverOptions(looseGrants, balance);
      grantSource = looseGrants;
      if (options.length < 1) {
        options = buildNewestWalletRemainderOption(walletRows, consumedAll, balance);
      }
    }
  }
  if (options.length < 1 && balance > 0) {
    options = [buildWalletBalanceRecoverOption(balance)];
  } else {
    options = appendWalletSurplusRecoverOption(options, grantSource, balance);
  }
  return options;
}

function hierarchyRecoverRemarkParts(walletDebit: number, payerRefund: number, bonusVoid: number): string {
  if (bonusVoid > 0 && payerRefund > 0) {
    return `${walletDebit} credits recovered (${payerRefund} refunded, ${bonusVoid} promo void)`;
  }
  if (bonusVoid > 0 && payerRefund < 1) {
    return `${walletDebit} credits recovered (promo void)`;
  }
  return `${walletDebit} credits recovered`;
}

export type HierarchyAddCreditRung = {
  base: number;
  promo1: number;
  promo2: number;
  total: number;
  /** False when payer wallet cannot cover `total` (admin→manager is always true). */
  allowed: boolean;
  /** Additional wallet cap row: principal = payer balance, no Promo 1/2 on submit. */
  principalOnly?: boolean;
};

/** Two independent preset ladders for hierarchy add-credit UI. */
export type HierarchyAddCreditLadders = {
  /** 100, 200, … through max with Promo 1 + Promo 2 breakdown (bonuses may be zero per row). */
  promoRungs: HierarchyAddCreditRung[];
  /** From billing minimum through max; principal only (no Promo 1/2 on submit). */
  additionalRungs: HierarchyAddCreditRung[];
};

function buildHierarchyAddCreditRungList(
  bases: number[],
  withPromo: boolean,
  activeClients: number,
  p1: PromoTier[],
  p2: PromoTier[],
  payerBal: number,
): HierarchyAddCreditRung[] {
  const rungs: HierarchyAddCreditRung[] = [];
  for (const base of bases) {
    const b = withPromo
      ? computePromoBonusesForAddCapped(base, activeClients, p1, p2)
      : { bonus1: 0, bonus2: 0 };
    const total = base + b.bonus1 + b.bonus2;
    rungs.push({
      base,
      promo1: b.bonus1,
      promo2: b.bonus2,
      total,
      allowed: base <= payerBal,
    });
  }
  return rungs;
}

/** When preset UI cap (e.g. 100k) is below billing max (e.g. 1M), still offer the policy max as a row. */
function appendPolicyMaxPromoRung(
  rungs: HierarchyAddCreditRung[],
  policyMax: number,
  presetMax: number,
  activeClients: number,
  p1: PromoTier[],
  p2: PromoTier[],
): HierarchyAddCreditRung[] {
  const top = Math.floor(policyMax);
  const cap = Math.floor(presetMax);
  if (!Number.isFinite(top) || top <= cap || rungs.some((r) => r.base === top)) return rungs;
  const b = computePromoBonusesForAddCapped(top, activeClients, p1, p2);
  const total = top + b.bonus1 + b.bonus2;
  return [...rungs, { base: top, promo1: b.bonus1, promo2: b.bonus2, total, allowed: true }].sort((a, b) => a.base - b.base);
}

/** Promo ladder (100…max) + additional ladder (billing min…max); payer balance cap on preset totals. */
export async function buildHierarchyAddCreditRungs(input: {
  portal: HierarchyCreditsPortal;
  targetUsername: string;
  payerUsername: string;
  settings: Pick<SettingsBundle, "limitManagerCredit" | "limitResellerCredit" | "limitDealerCredit" | "hierarchyAddCreditMax">;
}): Promise<HierarchyAddCreditLadders> {
  const addMin = hierarchyAddCreditsMin(input.portal, input.settings);
  const addMax = hierarchyAddCreditsMax(input.settings);
  const rules = await getPromoBonusRules();
  const promoKind: "MNGR" | "SRSLR" | "RSLR" =
    input.portal === "admin_manager"
      ? "MNGR"
      : input.portal === "admin_reseller" || input.portal === "manager_reseller"
        ? "SRSLR"
        : "RSLR";
  const activeClients = await countActiveClientsForPromo2({ kind: promoKind, username: input.targetUsername.trim() });
  const payerBal =
    input.portal === "admin_manager"
      ? Number.MAX_SAFE_INTEGER
      : await getCreditBalance(input.payerUsername.trim());

  const payerCap =
    payerBal < Number.MAX_SAFE_INTEGER / 4 ? Math.max(addMin, Math.floor(payerBal)) : undefined;
  const presetUiMax = resolveAddCreditPresetUiMax(input.portal);
  const additionalMaxRungs = resolveAddCreditAdditionalPresetMaxRungs(input.portal);
  const presetMax = capAddCreditPresetMax(addMin, addMax, payerBal, presetUiMax);
  const additionalPresetMax = capAddCreditAdditionalPresetMax(addMin, addMax, payerBal, presetUiMax);
  const promoBases = buildAddCreditPromoPrincipalBases(addMin, presetMax, payerCap);
  let additionalBases = buildAddCreditAdditionalPrincipalBases(
    addMin,
    additionalPresetMax,
    payerCap,
    additionalMaxRungs,
  );
  if (payerCap != null) {
    additionalBases = applyAdditionalPayerCapRung(additionalBases, payerCap, addMin);
  }

  let promoRungs = buildHierarchyAddCreditRungList(promoBases, true, activeClients, rules.p1, rules.p2, payerBal);
  if (payerCap != null) {
    promoRungs = filterPromoRungsWithinPayerBalance(promoRungs, payerBal);
    promoRungs = applyPromoPayerCapRung(promoRungs, payerCap, activeClients, rules.p1, rules.p2, addMin).map((r) => ({
      ...r,
      allowed: true,
    }));
  }

  const additionalRungs = buildHierarchyAddCreditRungList(
    additionalBases,
    false,
    activeClients,
    rules.p1,
    rules.p2,
    payerBal,
  );
  const additionalFiltered =
    payerCap != null ? filterPromoRungsWithinPayerBalance(additionalRungs, payerBal) : additionalRungs;

  const additionalOut = additionalFiltered.map((r) => ({
    ...r,
    allowed: payerCap != null ? r.base <= payerCap : r.base <= payerBal,
    principalOnly: payerCap != null && r.base === payerCap,
  }));
  if (payerCap != null && !additionalOut.some((r) => r.base === payerCap)) {
    additionalOut.push({
      base: payerCap,
      promo1: 0,
      promo2: 0,
      total: payerCap,
      allowed: true,
      principalOnly: true,
    });
    additionalOut.sort((a, b) => a.base - b.base);
  }

  if (input.portal === "admin_manager" && addMax > presetMax) {
    promoRungs = appendPolicyMaxPromoRung(promoRungs, addMax, presetMax, activeClients, rules.p1, rules.p2);
    const top = Math.floor(addMax);
    if (!additionalOut.some((r) => r.base === top)) {
      additionalOut.push({
        base: top,
        promo1: 0,
        promo2: 0,
        total: top,
        allowed: true,
        principalOnly: true,
      });
      additionalOut.sort((a, b) => a.base - b.base);
    }
  }

  return {
    promoRungs,
    additionalRungs: additionalOut,
  };
}

export async function recoverHierarchyCreditsByGrantTxIds(input: {
  kind: "admin_manager" | "hierarchy";
  adminUsername?: string;
  managerUsername?: string;
  targetUsername?: string;
  targetType?: "SRSLR" | "RSLR";
  ownerUsername?: string;
  grantTxIds: number[];
  operatorUsername: string;
  /** Used for wallet-balance recover on resellers/dealers (ADD limits); defaults to admin_* portals. */
  portal?: HierarchyCreditsPortal;
}): Promise<AdjustHierarchyCreditsResult> {
  const ids = [
    ...new Set(
      input.grantTxIds
        .map((n) => Math.floor(Number(n)))
        .filter((n) => Number.isFinite(n) && (isWalletBalanceRecoverGrantId(n) || n >= 1)),
    ),
  ].sort((a, b) => a - b);
  if (ids.length < 1) return { ok: false, code: "invalid" };

  const pool = getBillingPool();
  const op = input.operatorUsername.trim();
  const walletIds = ids.filter((id) => isWalletBalanceRecoverGrantId(id));
  const grantIds = ids.filter((id) => !isWalletBalanceRecoverGrantId(id));
  if (walletIds.length > 0 && grantIds.length > 0) return { ok: false, code: "invalid_grants" };

  if (input.kind === "admin_manager") {
    const manager = (input.managerUsername ?? "").trim();
    const admin = (input.adminUsername ?? "").trim();
    if (!manager || !admin) return { ok: false, code: "no_target" };
    const [targets] = await pool.execute<RowDataPacket[]>(
      "SELECT username FROM users WHERE username = :u AND type = 'MNGR' LIMIT 1",
      { u: manager },
    );
    if (!targets.length) return { ok: false, code: "no_target" };

    const reversible = await listReversibleHierarchyGrants(manager);
    const debits = resolveRecoverDebitAmounts(reversible, ids);
    if (!debits) return { ok: false, code: "invalid_grants" };

    if (walletIds.length > 0) {
      const amount = debits[0]?.walletDebit ?? 0;
      if (amount < 1) return { ok: false, code: "invalid" };
      return adjustManagerCredits({
        adminUsername: admin,
        managerUsername: manager,
        operation: "RECOVER",
        credits: amount,
        operatorUsername: op,
      });
    }

    const grantStubs = await loadHierarchyGrantRowStubs(pool, manager);
    const consumed = await loadRecoverConsumedGrantIds(pool, manager, grantStubs);
    for (const { tid } of debits) {
      if (consumed.has(tid)) return { ok: false, code: "invalid_grants" };
    }

    const sumWalletDebit = debits.reduce((s, g) => s + g.walletDebit, 0);
    const balance = await getCreditBalance(manager);
    if (balance < sumWalletDebit) {
      return { ok: false, code: "insufficient_credits", balance, required: sumWalletDebit };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const g of debits) {
        const { walletDebit, payerRefund, bonusVoid, tid } = g;
        const txTag = ` [recover_of_tx:${tid}]`;
        const opt = reversible.find((r) => r.grantTxId === tid);
        const remainder = opt?.isPartialRemainder ? " (remainder) " : " ";
        const core = hierarchyRecoverRemarkParts(walletDebit, payerRefund, bonusVoid);
        const mgrRemark = `${core}${remainder}${txTag} by ${op}`;
        const admRemark = `${core} from ${manager}${remainder}${txTag}`;
        await insertHierarchyCreditTransaction(conn, {
          username: manager,
          type: "DBIT",
          periods: walletDebit,
          remarks: mgrRemark,
        });
        if (payerRefund > 0) {
          await insertHierarchyCreditTransaction(conn, {
            username: admin,
            type: "CRDT",
            periods: payerRefund,
            account: manager,
            remarks: admRemark,
          });
        }
      }
      await conn.commit();
      bustWalletDashboardCacheAfterCreditMutation();
      return { ok: true };
    } catch (err) {
      await conn.rollback();
      console.error("[recoverHierarchyCreditsByGrantTxIds] admin_manager DB error:", mysqlMessage(err));
      return { ok: false, code: "db" };
    } finally {
      conn.release();
    }
  }

  const target = (input.targetUsername ?? "").trim();
  const owner = (input.ownerUsername ?? "").trim();
  const targetType = input.targetType;
  if (!target || !owner || (targetType !== "SRSLR" && targetType !== "RSLR")) return { ok: false, code: "no_target" };

  const [targets] = await pool.execute<RowDataPacket[]>(
    "SELECT username, username_owner FROM users WHERE username = :u AND type = :t LIMIT 1",
    { u: target, t: targetType },
  );
  if (!targets.length) return { ok: false, code: "no_target" };
  if (String(targets[0].username_owner ?? "") !== owner) return { ok: false, code: "invalid_grants" };

  const reversible = await listReversibleHierarchyGrants(target);
  const debits = resolveRecoverDebitAmounts(reversible, ids);
  if (!debits) return { ok: false, code: "invalid_grants" };

  if (walletIds.length > 0) {
    const amount = debits[0]?.walletDebit ?? 0;
    if (amount < 1) return { ok: false, code: "invalid" };
    const portal =
      input.portal ?? (targetType === "SRSLR" ? "admin_reseller" : "admin_dealer");
    return adjustHierarchyCredits({
      targetUsername: target,
      targetType,
      operation: "RECOVER",
      credits: amount,
      operatorUsername: op,
      portal,
    });
  }

  const grantStubs = await loadHierarchyGrantRowStubs(pool, target);
  const consumed = await loadRecoverConsumedGrantIds(pool, target, grantStubs);
  for (const { tid } of debits) {
    if (consumed.has(tid)) return { ok: false, code: "invalid_grants" };
  }

  const sumWalletDebit = debits.reduce((s, g) => s + g.walletDebit, 0);
  const balance = await getCreditBalance(target);
  if (balance < sumWalletDebit) {
    return { ok: false, code: "insufficient_credits", balance, required: sumWalletDebit };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const g of debits) {
      const { walletDebit, payerRefund, bonusVoid, tid } = g;
      const txTag = ` [recover_of_tx:${tid}]`;
      const opt = reversible.find((r) => r.grantTxId === tid);
      const remainder = opt?.isPartialRemainder ? " (remainder) " : " ";
      const core = hierarchyRecoverRemarkParts(walletDebit, payerRefund, bonusVoid);
      const tgtRemark = `${core}${remainder}${txTag} by ${op}`;
      const ownRemark = `${core} from ${target}${remainder}${txTag}`;
      await insertHierarchyCreditTransaction(conn, {
        username: target,
        type: "DBIT",
        periods: walletDebit,
        remarks: tgtRemark,
      });
      if (payerRefund > 0) {
        await insertHierarchyCreditTransaction(conn, {
          username: owner,
          type: "CRDT",
          periods: payerRefund,
          account: target,
          remarks: ownRemark,
        });
      }
    }
    await conn.commit();
    bustWalletDashboardCacheAfterCreditMutation();
    return { ok: true };
  } catch (err) {
    await conn.rollback();
    console.error("[recoverHierarchyCreditsByGrantTxIds] hierarchy DB error:", mysqlMessage(err));
    return { ok: false, code: "db" };
  } finally {
    conn.release();
  }
}

/**
 * Admin → manager credit posting (`Managers::transactions` + `credit_manage_admin` with sender = logged-in admin).
 * ADD: no balance check on admin (PHP `check_credits` returns true for CRDT).
 * RECOVER: manager balance must cover the debit (PHP `check_credits` for DBIT).
 */
export async function adjustManagerCredits(input: {
  adminUsername: string;
  managerUsername: string;
  operation: "ADD" | "RECOVER";
  credits: number;
  operatorUsername: string;
  /** When false, credit principal only (additional-credit wallet row). Default: apply Promo 1 + 2. */
  applyPromo?: boolean;
}): Promise<AdjustHierarchyCreditsResult> {
  const manager = input.managerUsername.trim();
  const admin = input.adminUsername.trim();
  const credits = Math.floor(Number(input.credits));
  const settings = await getSettings();
  const addMax = hierarchyAddCreditsMax(settings);
  const addMin = hierarchyAddCreditsMin("admin_manager", settings);
  if (!manager) return { ok: false, code: "no_target" };
  if (!admin) return { ok: false, code: "no_owner" };
  if (input.operation === "ADD") {
    if (!Number.isFinite(credits) || credits < addMin || credits > addMax) return { ok: false, code: "invalid" };
  } else if (!Number.isFinite(credits) || credits < 1 || credits > HIERARCHY_RECOVER_CREDITS_MAX) {
    return { ok: false, code: "invalid" };
  }

  const pool = getBillingPool();
  const [targets] = await pool.execute<RowDataPacket[]>(
    "SELECT username FROM users WHERE username = :u AND type = 'MNGR' LIMIT 1",
    { u: manager },
  );
  if (!targets.length) return { ok: false, code: "no_target" };

  let recoverDebitTotal = credits;
  let recoverGrantTxId: number | null = null;
  if (input.operation === "RECOVER") {
    const match = await findFifoHierarchyGrantMatch(pool, manager, credits);
    if (match) {
      recoverDebitTotal = credits;
      recoverGrantTxId = match.grantTransactionId;
    }
    const balance = await getCreditBalance(manager);
    if (balance < recoverDebitTotal) return { ok: false, code: "insufficient_credits", balance, required: recoverDebitTotal };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (input.operation === "ADD") {
      const applyPromo = input.applyPromo !== false;
      let pct1 = 0;
      let pct2 = 0;
      let bonus1 = 0;
      let bonus2 = 0;
      let activeClients = 0;
      if (applyPromo) {
        const rules = await getPromoBonusRules();
        activeClients = await countActiveClientsForPromo2({ kind: "MNGR", username: manager });
        const b = computePromoBonusesForAddCapped(credits, activeClients, rules.p1, rules.p2);
        pct1 = b.pct1;
        pct2 = b.pct2;
        bonus1 = b.bonus1;
        bonus2 = b.bonus2;
      }
      const totalCredited = credits + bonus1 + bonus2;
      const grantSuffix =
        bonus1 + bonus2 > 0
          ? ` [promo_grant:${randomUUID()}|p1=${bonus1}|p2=${bonus2}|pct1=${pct1}|pct2=${pct2}|ac=${activeClients}]`
          : "";
      const remarksAdmin =
        bonus1 + bonus2 > 0
          ? `${manager} received ${credits} credits +${bonus1} Promo1 (${pct1}%) +${bonus2} Promo2 (${pct2}%) = ${totalCredited}${grantSuffix}`
          : `${manager} received ${credits} credits`;
      await insertHierarchyCreditTransaction(conn, {
        username: admin,
        type: "DBIT",
        periods: credits,
        account: manager,
        remarks: remarksAdmin.length > 480 ? `${remarksAdmin.slice(0, 477)}...` : remarksAdmin,
      });
      const childRemarks =
        bonus1 + bonus2 > 0
          ? `${totalCredited} credits received by ${input.operatorUsername} (base ${credits}) [grant_meta:p1=${bonus1}|p2=${bonus2}]`
          : `${totalCredited} credits received by ${input.operatorUsername} (base ${credits})`;
      await insertHierarchyCreditTransaction(conn, {
        username: manager,
        type: "CRDT",
        periods: totalCredited,
        remarks: childRemarks,
      });
    } else {
      const dr = recoverDebitTotal;
      const base = credits;
      const op = input.operatorUsername;
      const txTag = recoverGrantTxId != null ? ` [recover_of_tx:${recoverGrantTxId}]` : "";
      const mgrRemark =
        recoverGrantTxId != null
          ? dr > base
            ? `${dr} credits recovered (${base} base)${txTag} by ${op}`
            : `${dr} credits recovered${txTag} by ${op}`
          : `${dr} credits recovered by ${op}`;
      const admRemark =
        recoverGrantTxId != null
          ? dr > base
            ? `${dr} credits recovered from ${manager} (${base} base)${txTag}`
            : `${dr} credits recovered from ${manager}${txTag}`
          : `${dr} credits recovered from ${manager}`;
      await insertHierarchyCreditTransaction(conn, {
        username: manager,
        type: "DBIT",
        periods: dr,
        remarks: mgrRemark,
      });
      await insertHierarchyCreditTransaction(conn, {
        username: admin,
        type: "CRDT",
        periods: dr,
        account: manager,
        remarks: admRemark,
      });
    }
    await conn.commit();
    bustWalletDashboardCacheAfterCreditMutation();
    return { ok: true };
  } catch (err) {
    await conn.rollback();
    console.error("[adjustManagerCredits] DB error:", mysqlMessage(err));
    return { ok: false, code: "db" };
  } finally {
    conn.release();
  }
}

/** PHP reseller/dealer credit modals — ADD select runs from `limit_*_credit` up to `hierarchy_add_credit_max` (bounded by `HIERARCHY_ADD_CREDITS_MAX`); RECOVER is numeric min 1. */

export type HierarchyCreditsPortal =
  | "admin_manager"
  | "admin_reseller"
  | "admin_dealer"
  | "manager_reseller"
  | "manager_dealer"
  | "reseller_dealer";

/** PHP `limit_reseller_credit` / `limit_dealer_credit` as the lower bound of the ADD credits range (capped at `HIERARCHY_ADD_CREDITS_MAX`). */
export function hierarchyAddCreditsMin(
  portal: HierarchyCreditsPortal,
  settings: Pick<SettingsBundle, "limitManagerCredit" | "limitResellerCredit" | "limitDealerCredit" | "hierarchyAddCreditMax">,
): number {
  const maxAllowed = hierarchyAddCreditsMax(settings);
  const parseCap = (raw: string) => {
    const n = Math.floor(Number.parseInt(String(raw).trim(), 10));
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(maxAllowed, n);
  };

  if (portal === "admin_manager") {
    const v = parseCap(settings.limitManagerCredit);
    if (v != null) return v;
    return 1;
  }
  if (portal === "admin_reseller" || portal === "manager_reseller") {
    const v = parseCap(settings.limitResellerCredit);
    if (v != null) return v;
    return portal === "manager_reseller" ? 1 : 2000;
  }
  const v = parseCap(settings.limitDealerCredit);
  if (v != null) return v;
  return portal === "reseller_dealer" ? 1 : 2000;
}

export function hierarchyAddCreditsMax(
  settings: Pick<SettingsBundle, "hierarchyAddCreditMax">,
): number {
  const n = Math.floor(Number.parseInt(String(settings.hierarchyAddCreditMax).trim(), 10));
  if (!Number.isFinite(n) || n < 1) return HIERARCHY_GLOBAL_ADD_CREDIT_MAX;
  return Math.min(HIERARCHY_ADD_CREDITS_MAX, HIERARCHY_GLOBAL_ADD_CREDIT_MAX, n);
}

export { hierarchyAddCreditsSubmitMax };

/**
 * Admin credit transfer parity for reseller/dealer edit screens (`transactions` actions in PHP controllers).
 * ADD: owner DBIT (to target) + target CRDT.
 * RECOVER: target DBIT + owner CRDT (from target).
 */
export async function adjustHierarchyCredits(input: {
  targetUsername: string;
  targetType: "SRSLR" | "RSLR";
  operation: "ADD" | "RECOVER";
  credits: number;
  operatorUsername: string;
  portal: HierarchyCreditsPortal;
  /** When false, credit principal only (additional wallet cap). Default: apply Promo 1 + 2. */
  applyPromo?: boolean;
}): Promise<AdjustHierarchyCreditsResult> {
  const target = input.targetUsername.trim();
  const credits = Math.floor(Number(input.credits));
  if (!target) return { ok: false, code: "no_target" };

  const settings = await getSettings();
  const addMin = hierarchyAddCreditsMin(input.portal, settings);
  const addMax = hierarchyAddCreditsMax(settings);
  if (input.operation !== "ADD" && (!Number.isFinite(credits) || credits < 1 || credits > HIERARCHY_RECOVER_CREDITS_MAX)) {
    return { ok: false, code: "invalid" };
  }

  const pool = getBillingPool();
  const [targets] = await pool.execute<RowDataPacket[]>(
    "SELECT username, username_owner FROM users WHERE username = :u AND type = :t LIMIT 1",
    { u: target, t: input.targetType },
  );
  if (!targets.length) return { ok: false, code: "no_target" };
  const owner = targets[0].username_owner != null ? String(targets[0].username_owner) : "";
  if (!owner) return { ok: false, code: "no_owner" };

  const balanceUsername = input.operation === "ADD" ? owner : target;
  const ownerBalance = await getCreditBalance(balanceUsername);
  if (input.operation === "ADD") {
    const submitMax = hierarchyAddCreditsSubmitMax(addMax, ownerBalance);
    if (!Number.isFinite(credits) || credits < addMin || credits > submitMax) {
      return { ok: false, code: "invalid" };
    }
  }
  let addTotalCredited = credits;
  let addPct1 = 0;
  let addPct2 = 0;
  let addBonus1 = 0;
  let addBonus2 = 0;
  let addActiveClients = 0;
  if (input.operation === "ADD") {
    const applyPromo = input.applyPromo !== false;
    if (applyPromo) {
      const rules = await getPromoBonusRules();
      const promoKind = input.targetType === "SRSLR" ? "SRSLR" : "RSLR";
      addActiveClients = await countActiveClientsForPromo2({ kind: promoKind, username: target });
      const b = computePromoBonusesForAddCapped(credits, addActiveClients, rules.p1, rules.p2);
      addPct1 = b.pct1;
      addPct2 = b.pct2;
      addBonus1 = b.bonus1;
      addBonus2 = b.bonus2;
    }
    addTotalCredited = credits + addBonus1 + addBonus2;
  }
  let recoverDebitTotal = credits;
  let recoverGrantTxId: number | null = null;
  if (input.operation === "RECOVER") {
    const match = await findFifoHierarchyGrantMatch(pool, target, credits);
    if (match) {
      recoverDebitTotal = credits;
      recoverGrantTxId = match.grantTransactionId;
    }
  }
  const debitAmount = input.operation === "ADD" ? credits : recoverDebitTotal;
  if (ownerBalance < debitAmount) {
    return { ok: false, code: "insufficient_credits", balance: ownerBalance, required: debitAmount };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (input.operation === "ADD") {
      const bonus1 = addBonus1;
      const bonus2 = addBonus2;
      const pct1 = addPct1;
      const pct2 = addPct2;
      const activeClients = addActiveClients;
      const totalCredited = addTotalCredited;
      const grantSuffix =
        bonus1 + bonus2 > 0
          ? ` [promo_grant:${randomUUID()}|p1=${bonus1}|p2=${bonus2}|pct1=${pct1}|pct2=${pct2}|ac=${activeClients}]`
          : "";
      const remarksOwner =
        bonus1 + bonus2 > 0
          ? `${target} received ${credits} credits +${bonus1} Promo1 (${pct1}%) +${bonus2} Promo2 (${pct2}%) = ${totalCredited}${grantSuffix}`
          : `${target} received ${credits} credits`;
      await insertHierarchyCreditTransaction(conn, {
        username: owner,
        type: "DBIT",
        periods: credits,
        account: target,
        remarks: remarksOwner.length > 480 ? `${remarksOwner.slice(0, 477)}...` : remarksOwner,
      });
      const childRemarks =
        bonus1 + bonus2 > 0
          ? `${totalCredited} credits received by ${input.operatorUsername} (base ${credits}) [grant_meta:p1=${bonus1}|p2=${bonus2}]`
          : `${totalCredited} credits received by ${input.operatorUsername} (base ${credits})`;
      await insertHierarchyCreditTransaction(conn, {
        username: target,
        type: "CRDT",
        periods: totalCredited,
        remarks: childRemarks,
      });
    } else {
      const dr = recoverDebitTotal;
      const base = credits;
      const op = input.operatorUsername;
      const txTag = recoverGrantTxId != null ? ` [recover_of_tx:${recoverGrantTxId}]` : "";
      const tgtRemark =
        recoverGrantTxId != null
          ? dr > base
            ? `${dr} credits recovered (${base} base)${txTag} by ${op}`
            : `${dr} credits recovered${txTag} by ${op}`
          : `${dr} credits recovered by ${op}`;
      const ownRemark =
        recoverGrantTxId != null
          ? dr > base
            ? `${dr} credits recovered from ${target} (${base} base)${txTag}`
            : `${dr} credits recovered from ${target}${txTag}`
          : `${dr} credits recovered from ${target}`;
      await insertHierarchyCreditTransaction(conn, {
        username: target,
        type: "DBIT",
        periods: dr,
        remarks: tgtRemark,
      });
      await insertHierarchyCreditTransaction(conn, {
        username: owner,
        type: "CRDT",
        periods: dr,
        account: target,
        remarks: ownRemark,
      });
    }
    await conn.commit();
    bustWalletDashboardCacheAfterCreditMutation();
    return { ok: true };
  } catch (err) {
    await conn.rollback();
    console.error("[adjustHierarchyCredits] DB error:", mysqlMessage(err));
    return { ok: false, code: "db" };
  } finally {
    conn.release();
  }
}

export async function getUsersSummary() {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS all_cnt,
       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active_cnt,
       SUM(CASE WHEN expires IS NOT NULL AND expires > '1970-01-01 00:00:00' AND expires < NOW() THEN 1 ELSE 0 END) AS expired_cnt,
       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS inactive_cnt
     FROM accounts`,
    [ACCOUNT_STATUS_ON, ACCOUNT_STATUS_OFF],
  );
  const r = rows[0] ?? {};
  return {
    all: Number(r.all_cnt ?? 0),
    active: Number(r.active_cnt ?? 0),
    expired: Number(r.expired_cnt ?? 0),
    inactive: Number(r.inactive_cnt ?? 0),
  };
}

export type AccountListRow = {
  account: string;
  username: string;
  full_name: string | null;
  mac: string | null;
  ip: string | null;
  phone: string | null;
  expires: string | null;
  status: number;
  autoRenew: boolean | null;
  /** Remaining scheduled cycles (`accounts.credit`). */
  autoRenewCyclesRemaining: number | null;
  manager: string;
  reseller: string;
  dealer: string;
  password: string;
  created: string | null;
  /** Billing `accounts.last_active` (source of truth for subscriber last activity). */
  lastActive: string | null;
  /** Stalker `tariff_plan` name for `users.login` = account; null when unknown or Stalker off. */
  packageName: string | null;
  /** Stalker `keep_alive` window; null when Stalker unavailable or no row. */
  receiverOnline: boolean | null;
  /** Raw Stalker `users.keep_alive`; null when Stalker unavailable or no row. */
  receiverKeepAlive: string | null;
  /** Stalker now playing label (content or type); null when offline or Stalker off. */
  nowPlaying: string | null;
  /** Stalker `users.id` where `users.login` = `account`; null when Stalker off or no row. */
  stalkerUserId: number | null;
};

type AccountScope = { ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string };

function accountScopeWhereClause(scope: AccountScope): { sql: string; params: unknown[] } {
  const owner = scope.ownerUsername.trim();
  if (scope.ownerType === "ROOT") return { sql: "1=1", params: [] };
  if (!owner) return { sql: "1=0", params: [] };
  if (scope.ownerType === "MNGR") {
    return {
      sql: "(ur1.username_owner = ? OR ur2.username_owner = ?)",
      params: [owner, owner],
    };
  }
  if (scope.ownerType === "SRSLR") {
    return {
      sql: "(a.username = ? OR ur1.username = ? OR ur2.username = ?)",
      params: [owner, owner, owner],
    };
  }
  return {
    sql: "(ud.username = ? OR a.username = ?)",
    params: [owner, owner],
  };
}

/** Same joins as {@link listAccountsPaged} — staff-hub subscriber totals must match modal scope. */
const ACCOUNTS_HIERARCHY_FROM_SQL = `
  FROM accounts a
  LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
  LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
  LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL`;

export type StaffHubSubscriberCountFilter = "total" | "active" | "expired";

/** Staff-hub Active column, sidebar stats, and Promo 2 — `accounts.status` on. */
function activeSubscriberAccountsSql(alias = "a"): { sql: string; params: unknown[] } {
  return {
    sql: `${alias}.status = ?`,
    params: [ACCOUNT_STATUS_ON],
  };
}

function staffHubSubscriberCountFilterSql(filter: StaffHubSubscriberCountFilter): { sql: string; params: unknown[] } {
  if (filter === "active") {
    const active = activeSubscriberAccountsSql("a");
    return { sql: ` AND ${active.sql}`, params: active.params };
  }
  if (filter === "expired") {
    return { sql: " AND a.expires IS NOT NULL AND a.expires < NOW()", params: [] };
  }
  return { sql: "", params: [] };
}

/** Batch subscriber counts under each manager (matches admin manager subscribers modal). */
export async function batchCountSubscriberAccountsByManager(
  managerLogins: string[],
  filter: StaffHubSubscriberCountFilter,
): Promise<Map<string, number>> {
  if (managerLogins.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = managerLogins.map(() => "?").join(",");
  const { sql: filtSql, params: filtParams } = staffHubSubscriberCountFilterSql(filter);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(ur1.username_owner, ur2.username_owner, '') AS manager_login, COUNT(*) AS c
     ${ACCOUNTS_HIERARCHY_FROM_SQL}
     WHERE COALESCE(ur1.username_owner, ur2.username_owner, '') IN (${ph})${filtSql}
     GROUP BY COALESCE(ur1.username_owner, ur2.username_owner, '')`,
    [...managerLogins, ...filtParams] as (string | number)[],
  );
  return new Map(rows.map((r) => [String(r.manager_login), Number(r.c)]));
}

/** Batch subscriber counts under each reseller (matches admin/manager reseller subscribers modal). */
export async function batchCountSubscriberAccountsByReseller(
  resellerLogins: string[],
  filter: StaffHubSubscriberCountFilter,
  options?: { managerUsername?: string },
): Promise<Map<string, number>> {
  if (resellerLogins.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = resellerLogins.map(() => "?").join(",");
  const mgr = options?.managerUsername?.trim();
  const mgrSql = mgr ? " AND (ur1.username_owner = ? OR ur2.username_owner = ?)" : "";
  const mgrParams = mgr ? [mgr, mgr] : [];
  const { sql: filtSql, params: filtParams } = staffHubSubscriberCountFilterSql(filter);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(ur1.username, ur2.username, '') AS reseller_login, COUNT(*) AS c
     ${ACCOUNTS_HIERARCHY_FROM_SQL}
     WHERE COALESCE(ur1.username, ur2.username, '') IN (${ph})${mgrSql}${filtSql}
     GROUP BY COALESCE(ur1.username, ur2.username, '')`,
    [...resellerLogins, ...mgrParams, ...filtParams] as (string | number)[],
  );
  return new Map(rows.map((r) => [String(r.reseller_login), Number(r.c)]));
}

/** Single reseller subscriber total — same filters as {@link listAccountsPaged} / manager subscribers API. */
export async function countSubscriberAccountsForReseller(input: {
  resellerLogin: string;
  filter: StaffHubSubscriberCountFilter;
  managerUsername?: string;
}): Promise<number> {
  const login = input.resellerLogin.trim();
  if (!login) return 0;
  const map = await batchCountSubscriberAccountsByReseller([login], input.filter, {
    managerUsername: input.managerUsername,
  });
  return map.get(login) ?? 0;
}

/** Batch subscriber counts per dealer login (`accounts.username`, matches dealer subscribers modal). */
export async function batchCountSubscriberAccountsByDealer(
  dealerLogins: string[],
  filter: StaffHubSubscriberCountFilter,
): Promise<Map<string, number>> {
  if (dealerLogins.length === 0) return new Map();
  const pool = getBillingPool();
  const ph = dealerLogins.map(() => "?").join(",");
  const { sql: filtSql, params: filtParams } = staffHubSubscriberCountFilterSql(filter);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.username AS dealer_login, COUNT(*) AS c
     FROM accounts a
     WHERE a.username IN (${ph})${filtSql}
     GROUP BY a.username`,
    [...dealerLogins, ...filtParams] as (string | number)[],
  );
  return new Map(rows.map((r) => [String(r.dealer_login), Number(r.c)]));
}

/** Active subscriber rows under scope: `accounts.status` on (Promo 2 client-count axis). */
export async function countActiveClientsForPromo2(scope: { kind: "MNGR" | "SRSLR" | "RSLR"; username: string }): Promise<number> {
  const u = scope.username.trim();
  if (!u) return 0;
  const { sql, params } = accountScopeWhereClause({ ownerType: scope.kind, ownerUsername: u });
  const active = activeSubscriberAccountsSql("a");
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM accounts a
     LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
     LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
     LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
     WHERE ${sql} AND ${active.sql}`,
    [...params, ...active.params],
  );
  return Number(rows[0]?.c ?? 0);
}

async function resolveAdminStalkerIdSearchLogins(
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR",
  search: string | undefined | null,
): Promise<string[] | undefined> {
  if (ownerType !== "ROOT") return undefined;
  const q = search?.trim() ?? "";
  if (!q || !isStalkerUserIdSearchQuery(q)) return undefined;
  return findAccountLoginsByStalkerUserIdSearch(q);
}

function accountListWhereClause(
  status: string | undefined | null,
  search: string | undefined | null,
  autoRenew: string | undefined | null,
  searchOptions?: AccountListSearchOptions,
): { sql: string; params: unknown[] } {
  const parts: string[] = ["1=1"];
  const params: unknown[] = [];
  const s = typeof status === "string" ? status.trim().toLowerCase() : undefined;
  if (s === "active") {
    /** Staff-hub Active column + subscriber modal: `accounts.status` on. */
    const active = activeSubscriberAccountsSql("a");
    parts.push(active.sql);
    params.push(...active.params);
  } else if (s === "expired") {
    /** Staff-hub Expired column: past expiry date (any account status). */
    parts.push("a.expires IS NOT NULL AND a.expires < NOW()");
  } else if (s === "inactive") {
    parts.push("a.status = ?");
    params.push(ACCOUNT_STATUS_OFF);
  } else if (s === "expiring") {
    parts.push(
      "a.status = ? AND a.expires IS NOT NULL AND a.expires > NOW() AND a.expires <= DATE_ADD(NOW(), INTERVAL 7 DAY)",
    );
    params.push(ACCOUNT_STATUS_ON);
  } else if (s === "expiry") {
    /** Dashboard “Expiry” donut: expired by date OR expiring within 7 days (status on). */
    parts.push(
      "(" +
        "(a.expires IS NOT NULL AND a.expires > ? AND a.expires < NOW())" +
        " OR " +
        "(a.status = ? AND a.expires IS NOT NULL AND a.expires > NOW() AND a.expires <= DATE_ADD(NOW(), INTERVAL 7 DAY))" +
        ")",
    );
    params.push("1970-01-01 00:00:00", ACCOUNT_STATUS_ON);
  } else if (s === "activity") {
    /** Dashboard “Activity” donut: inactive (off) OR status-on excluding only the expiring-soon window (matches activeNonExpiring + inactive). */
    parts.push(
      "(" +
        "(a.status = ?)" +
        " OR " +
        "(" +
        "a.status = ?" +
        " AND (" +
        "a.expires IS NULL" +
        " OR a.expires <= NOW()" +
        " OR a.expires > DATE_ADD(NOW(), INTERVAL 7 DAY)" +
        ")" +
        ")" +
        ")",
    );
    params.push(ACCOUNT_STATUS_OFF, ACCOUNT_STATUS_ON);
  }
  const ar = typeof autoRenew === "string" ? autoRenew.trim() : "";
  if (ar === "1") {
    parts.push("a.mark = ?");
    params.push(1);
  } else if (ar === "0") {
    parts.push("a.mark = ?");
    params.push(0);
  }
  const searchClause = accountListSearchWhereClause(search, searchOptions);
  if (searchClause.sql) {
    parts.push(searchClause.sql);
    params.push(...searchClause.params);
  }
  return { sql: parts.join(" AND "), params };
}

/** Same window as PHP `Stalker_model::check_keep_alive` (`120 * 2` seconds). */
const STALKER_KEEP_ALIVE_ONLINE_SEC = 240;

function stalkerKeepAliveIsOnline(keepAlive: unknown): boolean {
  if (keepAlive == null) return false;
  const raw = String(keepAlive).trim();
  if (!raw || raw === "0000-00-00 00:00:00") return false;
  const t = Date.parse(raw.replace(" ", "T"));
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) / 1000 < STALKER_KEEP_ALIVE_ONLINE_SEC;
}

function escapeMySqlIdent(ident: string): string {
  return "`" + ident.replace(/`/g, "``") + "`";
}

/**
 * Billing accounts whose Stalker `users.login` matches `accounts.account` and `keep_alive`
 * is within {@link STALKER_KEEP_ALIVE_ONLINE_SEC} (same rule as {@link stalkerKeepAliveIsOnline}).
 * Uses a single billing-pool query with qualified table names (both DBs on the same server).
 * Returns `null` when Stalker is not configured or the query fails (e.g. missing cross-DB grants).
 */
export async function getAdminDevicesOnlineCount(): Promise<number | null> {
  const stalkerDb = process.env.STALKER_DATABASE_NAME?.trim();
  if (!stalkerDb) return null;
  const billingDb = (process.env.DATABASE_NAME ?? "stalker_billing").trim();
  const pool = getBillingPool();
  const s = escapeMySqlIdent(stalkerDb);
  const b = escapeMySqlIdent(billingDb);
  const sec = STALKER_KEEP_ALIVE_ONLINE_SEC;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM ${s}.users u
       INNER JOIN ${b}.accounts a ON a.account = u.login
       WHERE u.keep_alive IS NOT NULL
         AND TRIM(COALESCE(u.keep_alive, '')) <> ''
         AND u.keep_alive > '1970-01-01 00:00:00'
         AND u.keep_alive > DATE_SUB(NOW(), INTERVAL ${sec} SECOND)`,
    );
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

async function batchStalkerTariffLabelsForAccounts(accounts: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const unique = [...new Set(accounts.map((a) => a.trim()).filter(Boolean))];
  for (const u of unique) result.set(u, null);
  const stalker = getStalkerPool();
  if (!stalker || unique.length === 0) return result;
  const ph = unique.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT u.login, u.tariff_plan_id, tp.name AS plan_name
       FROM users u
       LEFT JOIN tariff_plan tp ON tp.id = u.tariff_plan_id
       WHERE u.login IN (${ph})`,
      unique,
    );
    for (const r of rows) {
      const login = r.login != null ? String(r.login) : "";
      if (!login) continue;
      const tid = Number(r.tariff_plan_id ?? 0);
      const name = r.plan_name != null ? String(r.plan_name).trim() : "";
      if (name) result.set(login, name);
      else if (tid > 0) result.set(login, `Plan #${tid}`);
    }
  } catch (err) {
    console.warn("[batchStalkerTariffLabelsForAccounts]", mysqlMessage(err));
  }
  return result;
}

function stalkerNowPlayingLabel(row: RowDataPacket): string | null {
  const content =
    row.now_playing_content != null ? String(row.now_playing_content).trim() : "";
  if (content) return content;
  const type = row.now_playing_type != null ? String(row.now_playing_type).trim() : "";
  return type || null;
}

async function batchStalkerNowPlayingForAccounts(accounts: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const unique = [...new Set(accounts.map((a) => a.trim()).filter(Boolean))];
  for (const u of unique) result.set(u, null);
  const stalker = getStalkerPool();
  if (!stalker || unique.length === 0) return result;
  const ph = unique.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT login, now_playing_content, now_playing_type FROM users WHERE login IN (${ph})`,
      unique,
    );
    for (const r of rows) {
      const login = r.login != null ? String(r.login) : "";
      if (!login) continue;
      const label = stalkerNowPlayingLabel(r);
      if (label) result.set(login, label);
    }
  } catch (err) {
    console.warn("[batchStalkerNowPlayingForAccounts]", mysqlMessage(err));
  }
  return result;
}

async function batchStalkerUserIdsForAccounts(accounts: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!accounts.length) return out;
  const stalker = getStalkerPool();
  if (!stalker) return out;
  const uniq = [...new Set(accounts.map((a) => String(a).trim()).filter(Boolean))];
  const chunk = 400;
  for (let i = 0; i < uniq.length; i += chunk) {
    const part = uniq.slice(i, i + chunk);
    const ph = part.map(() => "?").join(",");
    try {
      const [rows] = await stalker.query<RowDataPacket[]>(
        `SELECT id, login FROM users WHERE login IN (${ph})`,
        part,
      );
      for (const r of rows) {
        const login = String(r.login ?? "").trim();
        const id = Number(r.id ?? 0);
        if (login && Number.isFinite(id) && id > 0) out.set(login, id);
      }
    } catch (err) {
      console.warn("[batchStalkerUserIdsForAccounts]", mysqlMessage(err));
    }
  }
  return out;
}

async function batchStalkerReceiverOnlineForAccounts(accounts: string[]): Promise<Map<string, boolean | null>> {
  const result = new Map<string, boolean | null>();
  const unique = [...new Set(accounts.map((a) => a.trim()).filter(Boolean))];
  for (const u of unique) result.set(u, null);
  const stalker = getStalkerPool();
  if (!stalker || unique.length === 0) return result;
  const ph = unique.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT login, keep_alive FROM users WHERE login IN (${ph})`,
      unique,
    );
    for (const r of rows) {
      const login = r.login != null ? String(r.login) : "";
      if (login) result.set(login, stalkerKeepAliveIsOnline(r.keep_alive));
    }
  } catch (err) {
    console.warn("[batchStalkerReceiverOnlineForAccounts]", mysqlMessage(err));
  }
  return result;
}

async function batchStalkerReceiverKeepAliveForAccounts(
  accounts: Array<{ account: string; mac: string | null }>,
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const uniqueAccounts = [...new Set(accounts.map((a) => a.account.trim()).filter(Boolean))];
  const uniqueMacs = [...new Set(accounts.map((a) => normalizeMacForStalker(a.mac ?? "")).filter(Boolean))];
  for (const u of uniqueAccounts) result.set(u, null);
  const stalker = getStalkerPool();
  if (!stalker || (uniqueAccounts.length === 0 && uniqueMacs.length === 0)) return result;
  const loginPh = uniqueAccounts.map(() => "?").join(",");
  const macPh = uniqueMacs.map(() => "?").join(",");
  const whereParts: string[] = [];
  const whereParams: string[] = [];
  if (uniqueAccounts.length > 0) {
    whereParts.push(`login IN (${loginPh})`);
    whereParams.push(...uniqueAccounts);
  }
  if (uniqueMacs.length > 0) {
    whereParts.push(`UPPER(REPLACE(TRIM(COALESCE(mac, '')), '-', ':')) IN (${macPh})`);
    whereParams.push(...uniqueMacs);
  }
  const whereSql = whereParts.join(" OR ");

  const mapByLogin = new Map<string, string | null>();
  const mapByMac = new Map<string, string | null>();

  const setActivity = (loginRaw: unknown, macRaw: unknown, activityRaw: unknown) => {
    const login = loginRaw != null ? String(loginRaw).trim() : "";
    const mac = macRaw != null ? normalizeMacForStalker(String(macRaw)) : "";
    const raw = activityRaw != null ? String(activityRaw).trim() : "";
    const activity = raw && raw !== "0000-00-00 00:00:00" ? raw : null;
    if (login) mapByLogin.set(login, activity);
    if (mac) mapByMac.set(mac, activity);
  };

  try {
    // Prefer `last_active` when available (legacy PHP behavior); fallback to mixed/legacy schemas.
    try {
      const [rows] = await stalker.query<RowDataPacket[]>(
        `SELECT login, mac, last_active AS activity_at FROM users WHERE ${whereSql}`,
        whereParams,
      );
      for (const r of rows) {
        setActivity(r.login, r.mac, r.activity_at);
      }
    } catch {
      try {
        const [rows] = await stalker.query<RowDataPacket[]>(
          `SELECT login, mac, COALESCE(last_active, keep_alive) AS activity_at FROM users WHERE ${whereSql}`,
          whereParams,
        );
        for (const r of rows) {
          setActivity(r.login, r.mac, r.activity_at);
        }
      } catch {
        const [rows] = await stalker.query<RowDataPacket[]>(
          `SELECT login, mac, keep_alive FROM users WHERE ${whereSql}`,
          whereParams,
        );
        for (const r of rows) {
          setActivity(r.login, r.mac, r.keep_alive);
        }
      }
    }
  } catch (err) {
    console.warn("[batchStalkerReceiverKeepAliveForAccounts]", mysqlMessage(err));
  }
  for (const row of accounts) {
    const acct = row.account.trim();
    if (!acct) continue;
    const mac = normalizeMacForStalker(row.mac ?? "");
    const activity = mapByLogin.get(acct) ?? (mac ? mapByMac.get(mac) : undefined) ?? null;
    result.set(acct, activity);
  }
  return result;
}

const ACCOUNT_SORT_COLS: Record<string, string> = {
  account: "a.account",
  manager: "COALESCE(ur1.username_owner, ur2.username_owner, '')",
  reseller: "COALESCE(ur1.username, ur2.username, '')",
  dealer: "COALESCE(ud.username, '')",
  /** Username column displays device login (`accounts.account`). */
  username: "a.account",
  full_name: "a.full_name",
  mac: "a.mac",
  expires: "a.expires",
  status: "a.status",
  created: "a.created",
};

/**
 * Paginated accounts list (admin ROOT). Mirrors PHP `Users_model::get_user_by_status` filters;
 * hierarchy columns follow dealer → reseller → manager chain.
 */
export async function listAccountsPaged(input: {
  status?: string | null;
  search?: string | null;
  autoRenew?: string | null;
  /** Admin only: exact billing manager login (`COALESCE(ur1.username_owner, ur2.username_owner)`) — subscribers under that manager’s tree. */
  managerLogin?: string | null;
  /** Admin only: exact reseller login (`COALESCE(ur1.username, ur2.username)`) — subscribers under that reseller’s branch. */
  resellerLogin?: string | null;
  /** Admin only: dealer billing login (`accounts.username`) — subscribers owned by that dealer. */
  dealerLogin?: string | null;
  page: number;
  pageSize: number;
  sort?: string | null;
  dir?: string | null;
}): Promise<{ rows: AccountListRow[]; total: number }> {
  return listAccountsPagedScoped({
    ownerType: "ROOT",
    ownerUsername: "",
    ...input,
  });
}

export async function listAccountsPagedScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  /** SRSLR or MNGR: limit to `accounts.username` = this dealer login (PHP `Dealers_users::index` / manager branch). */
  dealerUsername?: string | null;
  /** MNGR only: limit to accounts under this reseller login (`ur1` / `ur2`). */
  resellerUsername?: string | null;
  status?: string | null;
  search?: string | null;
  autoRenew?: string | null;
  /** ROOT admin: restrict to accounts whose hierarchy manager login equals this (exact match). */
  managerLogin?: string | null;
  /** ROOT admin: restrict to accounts whose hierarchy reseller login equals this (exact match). */
  resellerLogin?: string | null;
  /** ROOT admin: restrict to accounts owned by this dealer (`accounts.username`). */
  dealerLogin?: string | null;
  page: number;
  pageSize: number;
  sort?: string | null;
  dir?: string | null;
}): Promise<{ rows: AccountListRow[]; total: number }> {
  const pool = getBillingPool();

  // Keep `accounts.status` consistent with expiry date.
  // If a subscription has ended, the account is considered inactive regardless of prior manual status.
  // This mirrors the desired UI rule and prevents "expired but active" toggles.
  await pool.execute(
    "UPDATE accounts SET status = ? WHERE status = ? AND expires IS NOT NULL AND expires > '1970-01-01 00:00:00' AND expires < NOW()",
    [ACCOUNT_STATUS_OFF, ACCOUNT_STATUS_ON],
  );

  const pageNum = Number(input.page);
  const pageSizeNum = Number(input.pageSize);
  const page = Math.max(1, Math.floor(Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1));
  const pageSize = Math.min(
    100,
    Math.max(5, Math.floor(Number.isFinite(pageSizeNum) && pageSizeNum > 0 ? pageSizeNum : 20)),
  );
  const stalkerIdAccountLogins = await resolveAdminStalkerIdSearchLogins(input.ownerType, input.search);
  const searchOptions: AccountListSearchOptions | undefined =
    stalkerIdAccountLogins != null ? { stalkerIdAccountLogins } : undefined;
  const { sql: whereSql, params: whereParams } = accountListWhereClause(
    input.status,
    input.search,
    input.autoRenew,
    searchOptions,
  );
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const dealerBranch =
    (input.ownerType === "SRSLR" || input.ownerType === "MNGR") &&
    input.dealerUsername != null &&
    String(input.dealerUsername).trim() !== ""
      ? { sql: "a.username = ?", params: [String(input.dealerUsername).trim()] as unknown[] }
      : null;
  const resellerOnly =
    input.ownerType === "MNGR" && input.resellerUsername != null && String(input.resellerUsername).trim() !== ""
      ? {
          sql: "COALESCE(ur1.username, ur2.username, '') = ?",
          params: [String(input.resellerUsername).trim()] as unknown[],
        }
      : null;
  let fullWhereSql = `(${whereSql}) AND (${scopeSql})`;
  let fullWhereParams: unknown[] = [...whereParams, ...scopeParams];
  if (dealerBranch) {
    fullWhereSql = `(${fullWhereSql}) AND (${dealerBranch.sql})`;
    fullWhereParams = [...fullWhereParams, ...dealerBranch.params];
  }
  if (resellerOnly) {
    fullWhereSql = `(${fullWhereSql}) AND (${resellerOnly.sql})`;
    fullWhereParams = [...fullWhereParams, ...resellerOnly.params];
  }

  const mgrLogin =
    input.ownerType === "ROOT" && input.managerLogin != null && String(input.managerLogin).trim() !== ""
      ? String(input.managerLogin).trim()
      : null;
  if (mgrLogin) {
    fullWhereSql = `(${fullWhereSql}) AND (COALESCE(ur1.username_owner, ur2.username_owner, '') = ?)`;
    fullWhereParams = [...fullWhereParams, mgrLogin];
  }

  const resLogin =
    input.ownerType === "ROOT" && input.resellerLogin != null && String(input.resellerLogin).trim() !== ""
      ? String(input.resellerLogin).trim()
      : null;
  if (resLogin) {
    fullWhereSql = `(${fullWhereSql}) AND (COALESCE(ur1.username, ur2.username, '') = ?)`;
    fullWhereParams = [...fullWhereParams, resLogin];
  }

  const dlrLogin =
    input.ownerType === "ROOT" && input.dealerLogin != null && String(input.dealerLogin).trim() !== ""
      ? String(input.dealerLogin).trim()
      : null;
  if (dlrLogin) {
    fullWhereSql = `(${fullWhereSql}) AND (a.username = ?)`;
    fullWhereParams = [...fullWhereParams, dlrLogin];
  }

  const rawSort = input.sort;
  const sortStr =
    typeof rawSort === "string"
      ? rawSort
      : Array.isArray(rawSort) && typeof rawSort[0] === "string"
        ? rawSort[0]
        : "";
  const sortKey = sortStr && ACCOUNT_SORT_COLS[sortStr] ? sortStr : "manager";
  const orderCol = ACCOUNT_SORT_COLS[sortKey] ?? "a.account";
  const orderDir = input.dir?.toLowerCase() === "desc" ? "DESC" : "ASC";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     FROM accounts a
     LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
     LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
     LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
     WHERE ${fullWhereSql}`,
    fullWhereParams,
  );
  const total = Number(countRows[0]?.c ?? 0);
  const offset = (page - 1) * pageSize;

  const listParams = [...fullWhereParams, pageSize, offset];
  const listSql = `SELECT
       a.account,
       a.username,
       a.full_name,
       a.mac,
       a.ip,
       a.phone,
       a.expires,
       a.status,
       a.mark,
       a.credit AS auto_renew_cycles,
       a.online AS account_online,
       a.password,
       a.created,
       a.last_active,
       COALESCE(ud.username, '') AS dealer_login,
       COALESCE(ur1.username, ur2.username, '') AS reseller_login,
       COALESCE(ur1.username_owner, ur2.username_owner, '') AS manager_login
     FROM accounts a
     LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
     LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
     LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
     WHERE ${fullWhereSql}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`;
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(listSql, listParams);
  } catch {
    const listSqlLegacy = listSql.replace("a.credit AS auto_renew_cycles,", "NULL AS auto_renew_cycles,");
    [rows] = await pool.query<RowDataPacket[]>(listSqlLegacy, listParams);
  }

  const mapped: AccountListRow[] = rows.map((r) => ({
    account: String(r.account ?? ""),
    username: String(r.username ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    mac: r.mac != null ? String(r.mac) : null,
    ip: r.ip != null ? String(r.ip) : null,
    phone: r.phone != null ? String(r.phone) : null,
    expires: r.expires != null ? String(r.expires) : null,
    status: Number(r.status ?? 0),
    autoRenew: r.mark == null ? null : parseAccountAutoRenewMark(r.mark),
    autoRenewCyclesRemaining: parseAccountAutoRenewCyclesRemaining(r.auto_renew_cycles),
    manager: String(r.manager_login ?? ""),
    reseller: String(r.reseller_login ?? ""),
    dealer: String(r.dealer_login ?? ""),
    password: String(r.password ?? ""),
    created: r.created != null ? String(r.created) : null,
    lastActive: r.last_active != null ? String(r.last_active) : null,
    packageName: null,
    receiverOnline:
      r.account_online == null
        ? null
        : Number(r.account_online) === 1
          ? true
          : Number(r.account_online) === 0
            ? false
            : null,
    receiverKeepAlive: null,
    nowPlaying: null,
    stalkerUserId: null,
  }));

  const stalker = getStalkerPool();
  const accountsOnPage = mapped.map((x) => x.account);
  let pkgMap: Map<string, string | null> | null = null;
  let recvMap: Map<string, boolean | null> | null = null;
  let recvKeepAliveMap: Map<string, string | null> | null = null;
  let stalkerIdMap: Map<string, number> | null = null;
  let nowPlayingMap: Map<string, string | null> | null = null;
  if (stalker) {
    [pkgMap, recvMap, recvKeepAliveMap, stalkerIdMap] = await Promise.all([
      batchStalkerTariffLabelsForAccounts(accountsOnPage),
      batchStalkerReceiverOnlineForAccounts(accountsOnPage),
      batchStalkerReceiverKeepAliveForAccounts(mapped.map((r) => ({ account: r.account, mac: r.mac }))),
      batchStalkerUserIdsForAccounts(accountsOnPage),
    ]);
    const onlineAccounts = mapped
      .filter((r) => (r.receiverOnline ?? (recvMap ? (recvMap.get(r.account) ?? null) : null)) === true)
      .map((r) => r.account);
    nowPlayingMap = await batchStalkerNowPlayingForAccounts(onlineAccounts);
  }

  const withMeta = mapped.map((r) => {
    const online = r.receiverOnline ?? (recvMap ? (recvMap.get(r.account) ?? null) : null);
    const playing = nowPlayingMap ? (nowPlayingMap.get(r.account) ?? null) : null;
    return {
      ...r,
      packageName: pkgMap ? (pkgMap.get(r.account) ?? null) : null,
      receiverOnline: online,
      receiverKeepAlive: recvKeepAliveMap ? (recvKeepAliveMap.get(r.account) ?? null) : null,
      nowPlaying: online === true ? playing : null,
      stalkerUserId: stalkerIdMap?.get(r.account) ?? null,
    };
  });

  return { rows: withMeta, total };
}

export async function getUsersSummaryScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  /** SRSLR only: counts for one dealer’s subscribers (`accounts.username` = dealer login). */
  dealerUsername?: string | null;
}) {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const dealerOnly =
    input.ownerType === "SRSLR" && input.dealerUsername != null && String(input.dealerUsername).trim() !== ""
      ? { sql: " AND a.username = ?", params: [String(input.dealerUsername).trim()] as unknown[] }
      : { sql: "", params: [] as unknown[] };
  const fromClause = `FROM accounts a
    LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
    LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
    LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
    WHERE ${scopeSql}${dealerOnly.sql}`;
  const summaryParams = [...scopeParams, ...dealerOnly.params];

  const [[all], [active], [expired], [inactive]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c ${fromClause}`, summaryParams),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c ${fromClause} AND a.status = ?`, [...summaryParams, ACCOUNT_STATUS_ON]),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c ${fromClause} AND a.expires IS NOT NULL AND a.expires > ? AND a.expires < NOW()`,
      [...summaryParams, "1970-01-01 00:00:00"],
    ),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c ${fromClause} AND a.status = ?`, [...summaryParams, ACCOUNT_STATUS_OFF]),
  ]);
  return {
    all: Number(all[0]?.c ?? 0),
    active: Number(active[0]?.c ?? 0),
    expired: Number(expired[0]?.c ?? 0),
    inactive: Number(inactive[0]?.c ?? 0),
  };
}

/** Portal home tiles (PHP manager, reseller, and dealer Dashboard controllers and shared dashboard view). */
export type OperatorDashboardStats = {
  balance: number;
  /** Subscriber rows under hierarchy scope (billing accounts table). */
  totalAccounts: number;
  activeAccounts: number;
  expiredAccounts: number;
  /** Accounts with billing status off (same notion as subscriber lists). */
  inactiveAccounts: number;
  /** Managers only: SRSLR rows owned by this manager (username_owner). */
  resellerCount: number | null;
  /**
   * Managers: RSLR under those resellers. Resellers: RSLR under this reseller.
   * Dealers: unused (null).
   */
  dealerCount: number | null;
};

export async function getOperatorDashboardStats(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
}): Promise<OperatorDashboardStats> {
  const u = input.ownerUsername.trim();
  const summary = await getUsersSummaryScoped({
    ownerType: input.ownerType,
    ownerUsername: u,
  });
  const balance = await getCreditBalance(u);
  const pool = getBillingPool();

  let resellerCount: number | null = null;
  let dealerCount: number | null = null;

  if (input.ownerType === "MNGR") {
    const [[r1]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM users WHERE type = 'SRSLR' AND username_owner = ?",
      [u],
    );
    resellerCount = Number(r1?.c ?? 0);
    const [[r2]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM users usr
       WHERE usr.type = 'RSLR'
         AND usr.username_owner IN (
           SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?
         )`,
      [u],
    );
    dealerCount = Number(r2?.c ?? 0);
  } else if (input.ownerType === "SRSLR") {
    const [[r3]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM users WHERE type = 'RSLR' AND username_owner = ?",
      [u],
    );
    dealerCount = Number(r3?.c ?? 0);
  }

  return {
    balance,
    totalAccounts: summary.all,
    activeAccounts: summary.active,
    expiredAccounts: summary.expired,
    inactiveAccounts: summary.inactive,
    resellerCount,
    dealerCount,
  };
}

/** Points for “new subscribers” trend (by `accounts.created`). */
export type DashboardMonthPoint = { key: string; label: string; count: number };

/** Credits added vs spent per calendar day (`transactions.periods`, absolute). */
export type DashboardDayCreditPoint = { key: string; label: string; creditIn: number; creditOut: number };

function accountsScopedFromClause(): string {
  return `FROM accounts a
    LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
    LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
    LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL`;
}

function ymKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthShortLabel(ym: string): string {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return ym;
  const d = new Date(y, mo - 1, 1);
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function buildLastNMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(ymKey(d));
  }
  return out;
}

function buildLastNDayKeys(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    });
  }
  return out;
}

/** Last `monthCount` calendar months of new `accounts` rows (created timestamp). */
export async function getAccountsCreatedByMonthScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  monthCount?: number;
}): Promise<DashboardMonthPoint[]> {
  const pool = getBillingPool();
  const monthCount = Math.min(24, Math.max(3, Math.floor(input.monthCount ?? 6)));
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const fromClause = accountsScopedFromClause();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(a.created, '%Y-%m') AS ym, COUNT(*) AS c
     ${fromClause}
     WHERE (${scopeSql})
       AND a.created IS NOT NULL
       AND a.created > '1970-01-01 00:00:00'
       AND a.created >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
     GROUP BY ym
     ORDER BY ym ASC`,
    [...scopeParams, monthCount - 1],
  );
  const map = new Map(rows.map((r) => [String(r.ym ?? ""), Number(r.c ?? 0)]));
  const keys = buildLastNMonthKeys(monthCount);
  return keys.map((key) => ({
    key,
    label: monthShortLabel(key),
    count: map.get(key) ?? 0,
  }));
}

/** Accounts whose subscription expired in each month, limited to hierarchy scope. */
export async function getAccountsExpiredByMonthScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  monthCount?: number;
}): Promise<DashboardMonthPoint[]> {
  const pool = getBillingPool();
  const monthCount = Math.min(24, Math.max(3, Math.floor(input.monthCount ?? 6)));
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const fromClause = accountsScopedFromClause();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(a.expires, '%Y-%m') AS ym, COUNT(*) AS c
     ${fromClause}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL
       AND a.expires > '1970-01-01 00:00:00'
       AND a.expires < NOW()
       AND a.expires >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
     GROUP BY ym
     ORDER BY ym ASC`,
    [...scopeParams, monthCount - 1],
  );
  const map = new Map(rows.map((r) => [String(r.ym ?? ""), Number(r.c ?? 0)]));
  const keys = buildLastNMonthKeys(monthCount);
  return keys.map((key) => ({
    key,
    label: monthShortLabel(key),
    count: map.get(key) ?? 0,
  }));
}

/** Monthly new vs expired subscribers for portal operators (same chart shape as admin). */
export async function getOperatorSubscriberTrendSeries(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  monthCount?: number;
}) {
  const mc = Math.min(24, Math.max(6, Math.floor(input.monthCount ?? 12)));
  const created = await getAccountsCreatedByMonthScoped({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
    monthCount: mc,
  });
  const expired = await getAccountsExpiredByMonthScoped({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
    monthCount: mc,
  });
  const expMap = new Map(expired.map((e) => [e.key, e.count]));
  return created.map((c) => ({
    key: c.key,
    label: c.label,
    newAccounts: c.count,
    expired: expMap.get(c.key) ?? 0,
  }));
}

/** Operator’s own billing rows: credit in (CRDT) vs debit (DBIT) by day. */
export async function getCreditFlowByDayForUsername(
  username: string,
  dayCount?: number,
): Promise<DashboardDayCreditPoint[]> {
  const pool = getBillingPool();
  const u = username.trim();
  const n = Math.min(366, Math.max(1, Math.floor(dayCount ?? 14)));
  if (!u) return buildLastNDayKeys(n).map((d) => ({ ...d, creditIn: 0, creditOut: 0 }));

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(t.\`timestamp\`) AS d,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'CRDT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_in,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'DBIT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_out
     FROM transactions t
     WHERE t.username = ?
       AND t.\`timestamp\` IS NOT NULL
       AND t.\`timestamp\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(t.\`timestamp\`)
     ORDER BY d ASC`,
    [u, n - 1],
  );
  const map = new Map(
    rows.map((r) => {
      const raw = r.d;
      const key =
        raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : String(raw ?? "").slice(0, 10);
      return [key, { in: Number(r.credit_in ?? 0), out: Number(r.credit_out ?? 0) }];
    }),
  );
  return buildLastNDayKeys(n).map(({ key, label }) => {
    const v = map.get(key);
    return { key, label, creditIn: v?.in ?? 0, creditOut: v?.out ?? 0 };
  });
}

/** System-wide credit movement (all operators) — admin overview. */
export async function getAdminCreditFlowByDay(dayCount?: number): Promise<DashboardDayCreditPoint[]> {
  const pool = getBillingPool();
  const n = Math.min(366, Math.max(7, Math.floor(dayCount ?? 14)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(t.\`timestamp\`) AS d,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'CRDT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_in,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'DBIT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_out
     FROM transactions t
     WHERE t.\`timestamp\` IS NOT NULL
       AND t.\`timestamp\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(t.\`timestamp\`)
     ORDER BY d ASC`,
    [n - 1],
  );
  const map = new Map(
    rows.map((r) => {
      const raw = r.d;
      const key =
        raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : String(raw ?? "").slice(0, 10);
      return [key, { in: Number(r.credit_in ?? 0), out: Number(r.credit_out ?? 0) }];
    }),
  );
  return buildLastNDayKeys(n).map(({ key, label }) => {
    const v = map.get(key);
    return { key, label, creditIn: v?.in ?? 0, creditOut: v?.out ?? 0 };
  });
}

export type AdminRecentSubscriberRow = {
  account: string;
  full_name: string | null;
  status: number;
  expires: string | null;
  created: string | null;
};

/** Active accounts expiring within the next `withinDays` days (not yet expired). */
export async function getAdminExpiringSoonCount(withinDays: number): Promise<number> {
  const pool = getBillingPool();
  const d = Math.max(1, Math.min(90, Math.floor(withinDays)));
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM accounts
     WHERE status = ?
       AND expires IS NOT NULL
       AND expires > NOW()
       AND expires <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
    [ACCOUNT_STATUS_ON, d],
  );
  return Number(rows[0]?.c ?? 0);
}

/** Scoped active accounts expiring within next `withinDays` days. */
export async function getScopedExpiringSoonCount(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  withinDays?: number;
}): Promise<number> {
  const pool = getBillingPool();
  const days = Math.max(1, Math.min(90, Math.floor(input.withinDays ?? 7)));
  const owner = input.ownerUsername.trim();
  if (!owner) return 0;
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: owner,
  });
  const fromClause = accountsScopedFromClause();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c
     ${fromClause}
     WHERE (${scopeSql})
       AND a.status = ?
       AND a.expires IS NOT NULL
       AND a.expires > NOW()
       AND a.expires <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
    [...scopeParams, ACCOUNT_STATUS_ON, days],
  );
  return Number(rows[0]?.c ?? 0);
}

/** Sum of positive net credit balances across all billing users (`transactions`). */
export async function getAdminWalletCreditsTotal(): Promise<number> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(SUM(bal), 0) AS t FROM (
       SELECT SUM(${TX_WALLET_ROW_EFFECT_SQL}) AS bal
       FROM transactions
       GROUP BY username
     ) s
     WHERE bal > 0`,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

/**
 * Lifetime sum of P1+P2 promo bonus credits from sender DBIT rows tagged `[promo_grant:…]`.
 * Used for admin “promo pool” (bonuses issued on hierarchy add-credit, not plain wallet balance).
 */
export async function getAdminPromoBonusCreditsTotal(): Promise<number> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${PROMO_BONUS_REMARKS_SUM_EXPR} AS t
     FROM transactions
     WHERE ${PROMO_GRANT_ISSUER_WHERE}`,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

/** Sum of absolute `amount` values this calendar month (when column populated). */
export async function getAdminRevenueThisMonth(): Promise<number> {
  const pool = getBillingPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE \`timestamp\` >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''`,
    );
    return Math.round(Number(rows[0]?.r ?? 0) * 100) / 100;
  } catch {
    return 0;
  }
}

/** Single operator's leaderboard entry: their username, attributed subscribers and lifetime revenue. */
export type AdminTopOperatorRow = {
  username: string;
  /** Total `accounts` rows attributed to this operator (and to descendants below them — see notes on `getAdminTopOperatorsLeaderboards`). */
  subscribers: number;
  /** Lifetime sum of |`transactions.amount`| for this operator and all of their descendants. */
  revenue: number;
};

export type AdminTopOperatorsLeaderboards = {
  /** Top RSLR operators (no descendants below them). */
  dealers: AdminTopOperatorRow[];
  /** Top SRSLR operators (their own activity + dealers below). */
  resellers: AdminTopOperatorRow[];
  /** Top MNGR operators (their own activity + resellers + dealers below). */
  managers: AdminTopOperatorRow[];
};

/**
 * Top dealers / resellers / managers — all-time, not period-bound.
 *
 * - "Subscribers" = `COUNT(*)` of `accounts` attributed to the operator named in `accounts.username`
 *   (and rolled up to that operator's reseller / manager).
 * - "Revenue" = `SUM(ABS(CAST(transactions.amount AS DECIMAL(14,2))))`, attributed to
 *   `transactions.username` (and rolled up the same way).
 * - Hierarchy is read from `users.type` / `users.username_owner` (`MNGR` → `SRSLR` → `RSLR`).
 * - Operators with no subscribers AND no revenue are dropped before ranking.
 * - Tie-break: revenue DESC, then subscribers DESC, then username ASC.
 */
export async function getAdminTopOperatorsLeaderboards(input?: {
  limit?: number;
}): Promise<AdminTopOperatorsLeaderboards> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(20, Math.floor(input?.limit ?? 5)));

  /** Per-username total account counts (all-time). Empty for usernames with no accounts. */
  const [subRows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.username AS u, COUNT(*) AS c
       FROM accounts a
      GROUP BY a.username`,
  );
  const subsByUser = new Map<string, number>(
    subRows.map((r) => [String(r.u ?? ""), Math.max(0, Math.floor(Number(r.c ?? 0)))]),
  );

  /** Per-username lifetime sum of |amount| (guards null/empty `amount` strings). */
  const [revRows] = await pool.execute<RowDataPacket[]>(
    `SELECT t.username AS u, COALESCE(SUM(ABS(CAST(t.amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions t
      WHERE t.amount IS NOT NULL
        AND TRIM(COALESCE(t.amount, '')) <> ''
      GROUP BY t.username`,
  );
  const revByUser = new Map<string, number>(
    revRows.map((r) => [String(r.u ?? ""), Math.max(0, Number(r.r ?? 0))]),
  );

  /** Hierarchy snapshot: username → type / owner. Limited to operator types so we don't read raw subscriber rows here. */
  const [userRows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, type, username_owner
       FROM users
      WHERE type IN ('MNGR', 'SRSLR', 'RSLR')`,
  );

  const ownerOf = new Map<string, string>();
  const dealers: string[] = [];
  const resellers: string[] = [];
  const managers: string[] = [];
  for (const r of userRows) {
    const u = String(r.username ?? "").trim();
    if (!u) continue;
    const t = String(r.type ?? "").trim();
    const owner = String(r.username_owner ?? "").trim();
    ownerOf.set(u, owner);
    if (t === "RSLR") dealers.push(u);
    else if (t === "SRSLR") resellers.push(u);
    else if (t === "MNGR") managers.push(u);
  }

  /** Roll dealers' activity up to their reseller (`username_owner`). */
  const dealerSubsForReseller = new Map<string, number>();
  const dealerRevForReseller = new Map<string, number>();
  for (const d of dealers) {
    const sr = ownerOf.get(d);
    if (!sr) continue;
    const s = subsByUser.get(d) ?? 0;
    const r = revByUser.get(d) ?? 0;
    if (s) dealerSubsForReseller.set(sr, (dealerSubsForReseller.get(sr) ?? 0) + s);
    if (r) dealerRevForReseller.set(sr, (dealerRevForReseller.get(sr) ?? 0) + r);
  }

  /** Each reseller's full subtree total (own + dealers under them). */
  const resellerSubsTotal = new Map<string, number>();
  const resellerRevTotal = new Map<string, number>();
  for (const sr of resellers) {
    const s = (subsByUser.get(sr) ?? 0) + (dealerSubsForReseller.get(sr) ?? 0);
    const r = (revByUser.get(sr) ?? 0) + (dealerRevForReseller.get(sr) ?? 0);
    resellerSubsTotal.set(sr, s);
    resellerRevTotal.set(sr, r);
  }

  /** Roll resellers' subtree totals up to their manager (`username_owner`). */
  const resellerSubsForManager = new Map<string, number>();
  const resellerRevForManager = new Map<string, number>();
  for (const sr of resellers) {
    const mgr = ownerOf.get(sr);
    if (!mgr) continue;
    const s = resellerSubsTotal.get(sr) ?? 0;
    const r = resellerRevTotal.get(sr) ?? 0;
    if (s) resellerSubsForManager.set(mgr, (resellerSubsForManager.get(mgr) ?? 0) + s);
    if (r) resellerRevForManager.set(mgr, (resellerRevForManager.get(mgr) ?? 0) + r);
  }

  /**
   * Drop operators with zero activity (no subscribers and no revenue) — a leaderboard
   * padded with alphabetically-first names at `0 / $0` is meaningless. After that,
   * sort by revenue DESC → subscribers DESC → username ASC and trim to `limit`.
   */
  const orderAndTrim = (rows: AdminTopOperatorRow[]): AdminTopOperatorRow[] => {
    return rows
      .filter((r) => r.revenue > 0 || r.subscribers > 0)
      .sort((a, b) => {
        if (a.revenue !== b.revenue) return b.revenue - a.revenue;
        if (a.subscribers !== b.subscribers) return b.subscribers - a.subscribers;
        return a.username.localeCompare(b.username);
      })
      .slice(0, lim);
  };

  const dealerRows: AdminTopOperatorRow[] = dealers.map((u) => ({
    username: u,
    subscribers: subsByUser.get(u) ?? 0,
    revenue: revByUser.get(u) ?? 0,
  }));

  const resellerRows: AdminTopOperatorRow[] = resellers.map((u) => ({
    username: u,
    subscribers: resellerSubsTotal.get(u) ?? 0,
    revenue: resellerRevTotal.get(u) ?? 0,
  }));

  const managerRows: AdminTopOperatorRow[] = managers.map((u) => ({
    username: u,
    subscribers: (subsByUser.get(u) ?? 0) + (resellerSubsForManager.get(u) ?? 0),
    revenue: (revByUser.get(u) ?? 0) + (resellerRevForManager.get(u) ?? 0),
  }));

  return {
    dealers: orderAndTrim(dealerRows),
    resellers: orderAndTrim(resellerRows),
    managers: orderAndTrim(managerRows),
  };
}

/**
 * Largest calendar-month sum of |amount| over the last `monthCount` months (inclusive of current month).
 * Used to scale the admin revenue ring without arbitrary constants.
 */
export async function getAdminPeakMonthlyRevenueLastNMonths(monthCount?: number): Promise<number> {
  const pool = getBillingPool();
  const mc = Math.min(24, Math.max(1, Math.floor(monthCount ?? 12)));
  const intervalMonths = Math.max(0, mc - 1);
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(mo_total), 0) AS peak
       FROM (
         SELECT COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS mo_total
         FROM transactions
         WHERE \`timestamp\` >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ? MONTH), '%Y-%m-01 00:00:00')
           AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
         GROUP BY DATE_FORMAT(\`timestamp\`, '%Y-%m')
       ) t`,
      [intervalMonths],
    );
    return Math.round(Number(rows[0]?.peak ?? 0) * 100) / 100;
  } catch {
    return 0;
  }
}

export async function listAdminRecentSubscribers(limit: number): Promise<AdminRecentSubscriberRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT account, full_name, status, expires, created
     FROM accounts
     ORDER BY created DESC
     LIMIT ?`,
    [lim],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    status: Number(r.status ?? 0),
    expires: r.expires != null ? String(r.expires) : null,
    created: r.created != null ? String(r.created) : null,
  }));
}

export async function listOperatorRecentSubscribers(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  limit?: number;
}): Promise<AdminRecentSubscriberRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(input.limit ?? 8)));
  const u = input.ownerUsername.trim();
  if (!u) return [];
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: u,
  });
  const fromClause = accountsScopedFromClause();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created
     ${fromClause}
     WHERE (${scopeSql})
     ORDER BY a.created DESC
     LIMIT ?`,
    [...scopeParams, lim],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    status: Number(r.status ?? 0),
    expires: r.expires != null ? String(r.expires) : null,
    created: r.created != null ? String(r.created) : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin "Recent users" / "Expired users" / "Expiring subscriptions" panels
// (rendered in `AdminAccountsLifecycleSection` at the bottom of the dashboard).
// All three queries are direct reads off `accounts` + `users`; no period
// selector or client-side derivation is involved.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One row in the bottom-row "Recent users" / "Expired users" tables.
 *
 * `ownerUsername` is `accounts.username` (typically the dealer's login).
 * `ownerParentUsername` is that dealer's `users.username_owner` (typically a
 * reseller login), or `null` when the chain is broken / the row is owned
 * directly by ADMIN/manager-tier without a parent.
 */
export type AdminAccountLifecycleRow = {
  account: string;
  full_name: string | null;
  status: number;
  expires: string | null;
  /** `accounts.created` — when the row was inserted (may be null on legacy rows). */
  created: string | null;
  ownerUsername: string;
  /** Type of `ownerUsername` from `users.type` — `RSLR` / `SRSLR` / `MNGR` / `null`. */
  ownerType: "MNGR" | "SRSLR" | "RSLR" | null;
  ownerParentUsername: string | null;
};

function mapLifecycleRow(r: RowDataPacket): AdminAccountLifecycleRow {
  const ownerTypeRaw = r.owner_type != null ? String(r.owner_type).toUpperCase().trim() : "";
  const ownerType: AdminAccountLifecycleRow["ownerType"] =
    ownerTypeRaw === "MNGR" || ownerTypeRaw === "SRSLR" || ownerTypeRaw === "RSLR"
      ? (ownerTypeRaw as AdminAccountLifecycleRow["ownerType"])
      : null;
  return {
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    status: Number(r.status ?? 0),
    expires: r.expires != null ? String(r.expires) : null,
    created: r.created != null ? String(r.created) : null,
    ownerUsername: String(r.owner_username ?? ""),
    ownerType,
    ownerParentUsername:
      r.owner_parent_username != null && String(r.owner_parent_username).trim() !== ""
        ? String(r.owner_parent_username)
        : null,
  };
}

/**
 * Most recent accounts with their owner hierarchy joined in one shot.
 *
 *  - No time-window filter: every row in `accounts` is eligible.
 *  - Order: newest `created` first; NULL/legacy values go last (`IS NULL` sort key).
 *  - Uses `pool.query` (not `pool.execute`) because some MySQL servers reject `LIMIT ?`
 *    via the prepared-statement protocol (`ER_WRONG_ARGUMENTS Incorrect arguments to
 *    mysqld_stmt_execute`). `lim` is sanitized to an integer in [1,25] so it is safe
 *    to interpolate.
 */
export async function listAdminRecentAccountsWithHierarchy(limit: number): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username,
            u.type AS owner_type,
            u.username_owner AS owner_parent_username
       FROM accounts a
       LEFT JOIN users u ON u.username = a.username
      ORDER BY
        (a.created IS NULL) ASC,
        a.created DESC,
        (a.expires IS NULL) ASC,
        a.expires DESC,
        a.account DESC
      LIMIT ${lim}`,
  );
  return rows.map(mapLifecycleRow);
}

/**
 * Accounts whose subscription has already ended (`expires` strictly before `NOW()`), with hierarchy.
 *
 *  - Excludes future expiries (no "expiring soon" rows).
 *  - Ordered by `expires DESC` — most recently expired first (no rolling window).
 *  - Uses `pool.query` with an inlined integer `LIMIT` (same reason as the recent-list
 *    query above: avoids `ER_WRONG_ARGUMENTS Incorrect arguments to mysqld_stmt_execute`).
 */
export async function listAdminRecentlyExpiredAccountsWithHierarchy(limit: number): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username,
            u.type AS owner_type,
            u.username_owner AS owner_parent_username
       FROM accounts a
       LEFT JOIN users u ON u.username = a.username
      WHERE a.expires IS NOT NULL
        AND a.expires < NOW()
      ORDER BY a.expires DESC
      LIMIT ${lim}`,
  );
  return rows.map(mapLifecycleRow);
}

/** One bucket row in the "Expiring subscriptions" panel. */
export type AdminExpiringBucketRow = {
  /** Stable id for the bucket — `"24h" | "3d" | "7d" | "15d" | "30d"`. */
  key: "24h" | "3d" | "7d" | "15d" | "30d";
  /** Human label for the table (`"Next 24 hours"`, `"Next 3 days"`, …). */
  label: string;
  /** Inclusive upper bound for this bucket, in days from now. */
  withinDays: number;
  /** Count of `status = ON` accounts whose `expires` falls inside this bucket and outside the previous one. */
  count: number;
  /** Lifetime |amount| sum across `transactions` for the accounts in this bucket — proxy for "at risk $". */
  atRiskUsd: number;
};

/** Output of `getAdminExpiringSubscriptionBuckets()`. */
export type AdminExpiringSubscriptionsBuckets = {
  /** Total accounts whose `expires` is between `NOW()` and `NOW() + 30 days` (the union of every bucket). */
  totalWithin30Days: number;
  /** Total `atRiskUsd` across every bucket. */
  totalAtRiskUsd: number;
  rows: AdminExpiringBucketRow[];
};

/**
 * "Expiring subscriptions" panel — non-overlapping buckets of accounts whose
 * `expires` falls within the next N days from now.
 *
 *  - Buckets are non-overlapping (an account is counted in exactly one bucket).
 *  - "At risk $" = `SUM(ABS(transactions.amount))` for those accounts over the last 180 days,
 *    used as a proxy for the revenue we would lose if every account in the bucket churns.
 *  - Accounts must be `status = ON` and have `expires > NOW()` (not already expired).
 */
export async function getAdminExpiringSubscriptionBuckets(): Promise<AdminExpiringSubscriptionsBuckets> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.account, a.expires
       FROM accounts a
      WHERE a.status = ?
        AND a.expires IS NOT NULL
        AND a.expires > NOW()
        AND a.expires <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY a.expires ASC
      LIMIT 1500`,
    [ACCOUNT_STATUS_ON],
  );

  const now = Date.now();
  const day = 86_400_000;
  const buckets: Array<{ key: AdminExpiringBucketRow["key"]; label: string; withinDays: number; accounts: string[] }> = [
    { key: "24h", label: "Next 24 hours", withinDays: 1, accounts: [] },
    { key: "3d", label: "Next 3 days", withinDays: 3, accounts: [] },
    { key: "7d", label: "Next 7 days", withinDays: 7, accounts: [] },
    { key: "15d", label: "Next 15 days", withinDays: 15, accounts: [] },
    { key: "30d", label: "Next 30 days", withinDays: 30, accounts: [] },
  ];

  for (const r of rows) {
    const acct = String(r.account ?? "");
    const ex = r.expires != null ? String(r.expires) : "";
    if (!acct || !ex) continue;
    const t = Date.parse(ex.includes("T") ? ex : ex.replace(" ", "T"));
    if (!Number.isFinite(t) || t <= now) continue;
    const deltaDays = (t - now) / day;
    if (deltaDays <= 1) buckets[0].accounts.push(acct);
    else if (deltaDays <= 3) buckets[1].accounts.push(acct);
    else if (deltaDays <= 7) buckets[2].accounts.push(acct);
    else if (deltaDays <= 15) buckets[3].accounts.push(acct);
    else if (deltaDays <= 30) buckets[4].accounts.push(acct);
  }

  const allAccounts = [...new Set(buckets.flatMap((b) => b.accounts))];
  const revByAccount = new Map<string, number>();
  if (allAccounts.length > 0) {
    const uniq = allAccounts.slice(0, 1500);
    const ph = uniq.map(() => "?").join(",");
    const [revRows] = await pool.execute<RowDataPacket[]>(
      `SELECT account AS acct,
              COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS rev
         FROM transactions
        WHERE account IN (${ph})
          AND \`timestamp\` >= DATE_SUB(NOW(), INTERVAL 180 DAY)
          AND amount IS NOT NULL
          AND TRIM(COALESCE(amount, '')) <> ''
        GROUP BY account`,
      uniq,
    );
    for (const r of revRows) {
      const a = String(r.acct ?? "");
      if (a) revByAccount.set(a, Math.round(Number(r.rev ?? 0) * 100) / 100);
    }
  }

  const resultRows: AdminExpiringBucketRow[] = buckets.map((b) => {
    const atRiskUsd = b.accounts.reduce((s, a) => s + (revByAccount.get(a) ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      withinDays: b.withinDays,
      count: b.accounts.length,
      atRiskUsd: Math.round(atRiskUsd * 100) / 100,
    };
  });

  const totalWithin30Days = resultRows.reduce((s, r) => s + r.count, 0);
  const totalAtRiskUsd = Math.round(resultRows.reduce((s, r) => s + r.atRiskUsd, 0) * 100) / 100;

  return { totalWithin30Days, totalAtRiskUsd, rows: resultRows };
}

/** Accounts whose subscription expired in each calendar month (bucketed by `expires`). */
export async function getAccountsExpiredByMonthLastN(monthCount: number): Promise<DashboardMonthPoint[]> {
  const pool = getBillingPool();
  const n = Math.min(24, Math.max(3, Math.floor(monthCount)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(expires, '%Y-%m') AS ym, COUNT(*) AS c
     FROM accounts
     WHERE expires IS NOT NULL
       AND expires > '1970-01-01 00:00:00'
       AND expires < NOW()
       AND expires >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
     GROUP BY ym
     ORDER BY ym ASC`,
    [n - 1],
  );
  const map = new Map(rows.map((r) => [String(r.ym ?? ""), Number(r.c ?? 0)]));
  const keys = buildLastNMonthKeys(n);
  return keys.map((key) => ({
    key,
    label: monthShortLabel(key),
    count: map.get(key) ?? 0,
  }));
}

export type DashboardTrendPoint = { key: string; label: string; newAccounts: number; expired: number };

/** Monthly new accounts vs accounts that expired in that month (aligned keys). */
export async function getAdminSubscriberTrendSeries(monthCount?: number): Promise<DashboardTrendPoint[]> {
  const mc = Math.min(24, Math.max(6, Math.floor(monthCount ?? 12)));
  const created = await getAccountsCreatedByMonthScoped({ ownerType: "ROOT", ownerUsername: "", monthCount: mc });
  const expired = await getAccountsExpiredByMonthLastN(mc);
  const expMap = new Map(expired.map((e) => [e.key, e.count]));
  return created.map((c) => ({
    key: c.key,
    label: c.label,
    newAccounts: c.count,
    expired: expMap.get(c.key) ?? 0,
  }));
}

/** Local calendar `YYYY-MM-DD` (Node/process TZ + Date getters — matches HUD helpers). */
export function adminLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rowDateToYmd(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return adminLocalYmd(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** Per-day counts for admin HUD calendar (local calendar dates as `YYYY-MM-DD`). */
export type AdminDayActivityCounts = { newCount: number; expiredCount: number };

/** Aggregate new signups and expiry-day counts between two local dates (inclusive). */
export async function getAdminSubscriberActivityByDayRange(from: Date, to: Date): Promise<Record<string, AdminDayActivityCounts>> {
  const pool = getBillingPool();
  const fromStr = adminLocalYmd(from);
  const toStr = adminLocalYmd(to);
  if (fromStr > toStr) return {};

  const out: Record<string, AdminDayActivityCounts> = {};
  const todayStr = adminLocalYmd(new Date());

  const [createdRows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(a.created) AS d, COUNT(*) AS c
     FROM accounts a
     WHERE a.created IS NOT NULL
       AND DATE(a.created) BETWEEN ? AND ?
       AND DATE(a.created) <= ?
     GROUP BY DATE(a.created)`,
    [fromStr, toStr, todayStr],
  );
  for (const r of createdRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].newCount = Math.floor(Number(r.c ?? 0));
  }

  const [expRows] = await pool.execute<RowDataPacket[]>(
    `SELECT DATE(a.expires) AS d, COUNT(*) AS c
     FROM accounts a
     WHERE a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) BETWEEN ? AND ?
       AND DATE(a.expires) <= ?
     GROUP BY DATE(a.expires)`,
    [fromStr, toStr, todayStr],
  );
  for (const r of expRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].expiredCount = Math.floor(Number(r.c ?? 0));
  }

  return out;
}

export type AdminDayActivityAccountRow = {
  account: string;
  full_name: string | null;
  username: string | null;
  created: string | null;
  expires: string | null;
};

export async function listAdminAccountsCreatedOnDay(day: Date): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     FROM accounts a
     WHERE a.created IS NOT NULL AND DATE(a.created) = ?
     ORDER BY a.created DESC, a.account ASC
     LIMIT 300`,
    [d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

/** Accounts whose subscription end (`expires`) falls on this local calendar day. */
export async function listAdminAccountsExpiredOnDay(day: Date): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     FROM accounts a
     WHERE a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) = ?
     ORDER BY a.expires DESC, a.account ASC
     LIMIT 300`,
    [d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

/** Matches PHP `Transaction_model::get_all_admin` column list and `periods` sign rule. */
export type AdminTransactionRow = {
  transaction: string;
  username: string;
  type: string;
  periods: number;
  amount: string | null;
  account: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  remarks: string | null;
  free_month: number | null;
  timestamp: string | null;
  created_by: string | null;
};

function isMissingCreatedByColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "ER_BAD_FIELD_ERROR" && String(e?.message ?? "").includes("created_by")) return true;
  return false;
}

function withoutCreatedByColumn(sql: string): string {
  return sql.replace(/,\s*`?created_by`?/i, "");
}

/** Admin / operator ledger list (`get_all_admin` periods sign). */
export const ADMIN_TRANSACTION_PERIODS_SQL = TX_ADMIN_PERIODS_SIGNED_SQL;

export const ADMIN_TRANSACTION_SELECT_SQL = `\`transaction\`, username, type,
          ${ADMIN_TRANSACTION_PERIODS_SQL} AS periods,
          amount, account, coverage_start, coverage_end, remarks, free_month,
          \`timestamp\`, created_by`;

export function mapAdminTransactionRow(r: RowDataPacket): AdminTransactionRow {
  return {
    transaction: String(r.transaction ?? ""),
    username: String(r.username ?? ""),
    type: String(r.type ?? "").toUpperCase(),
    periods: Number(r.periods ?? 0),
    amount: r.amount != null ? String(r.amount) : null,
    account: r.account != null ? String(r.account) : null,
    coverage_start: r.coverage_start != null ? String(r.coverage_start) : null,
    coverage_end: r.coverage_end != null ? String(r.coverage_end) : null,
    remarks: r.remarks != null ? String(r.remarks) : null,
    free_month: (() => {
      if (r.free_month == null || r.free_month === "") return null;
      const n = Number(r.free_month);
      return Number.isFinite(n) ? n : null;
    })(),
    timestamp: r.timestamp != null ? String(r.timestamp) : null,
    created_by: r.created_by != null ? String(r.created_by) : null,
  };
}

async function queryAdminTransactionRows(
  sql: string,
  params: Array<string | number>,
): Promise<AdminTransactionRow[]> {
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(sql, params);
  } catch (err) {
    if (!isMissingCreatedByColumnError(err)) throw err;
    [rows] = await pool.query<RowDataPacket[]>(withoutCreatedByColumn(sql), params);
  }
  return rows.map(mapAdminTransactionRow);
}

export async function getAdminTransactions(username: string): Promise<AdminTransactionRow[]> {
  const u = username.trim();
  if (!u) return [];
  const lim = 500;
  const sql = `SELECT ${ADMIN_TRANSACTION_SELECT_SQL}
   FROM transactions
   WHERE username = ?
   ORDER BY \`timestamp\` DESC
   LIMIT ${lim}`;
  return queryAdminTransactionRows(sql, [u]);
}

/**
 * Latest rows across all operators from `transactions` (admin dashboard feed).
 * Uses `pool.query` with an inlined integer `LIMIT` for the same MySQL compatibility
 * as `listAdminRecentAccountsWithHierarchy` (avoids `ER_WRONG_ARGUMENTS` on `LIMIT ?`).
 */
export async function listAdminRecentTransactionsGlobal(limit: number): Promise<AdminTransactionRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const sql = `SELECT \`transaction\`, username, type,
          ${TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL} AS periods,
          amount, account, coverage_start, coverage_end, remarks, free_month,
          \`timestamp\`, created_by
     FROM transactions
    ORDER BY \`timestamp\` DESC
    LIMIT ${lim}`;
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(sql);
  } catch (err) {
    if (!isMissingCreatedByColumnError(err)) throw err;
    [rows] = await pool.query<RowDataPacket[]>(withoutCreatedByColumn(sql));
  }
  return rows.map(mapAdminTransactionRow);
}

/** PHP `Transaction_model::get_all` (manager, reseller, dealer transactions index). */
export async function getOperatorTransactions(username: string): Promise<AdminTransactionRow[]> {
  return getAdminTransactions(username);
}

export async function getDeductionsConfig() {
  const pool = getBillingPool();
  const [deductions] = await pool.execute<RowDataPacket[]>(
    `SELECT id, month, month_deduction FROM credit_deductions ORDER BY month ASC`,
  );
  const [[free]] = await pool.query<RowDataPacket[]>(
    "SELECT value FROM configs WHERE `key` = '1_month_free' LIMIT 1",
  );
  const [[bonus]] = await pool.query<RowDataPacket[]>(
    "SELECT value FROM configs WHERE `key` = 'is_recover_bonus_credit' LIMIT 1",
  );
  return {
    rows: deductions.map((d) => ({
      id: Number(d.id),
      month: Number(d.month),
      month_deduction: String(d.month_deduction ?? ""),
    })),
    monthFree: Boolean(Number(free?.value ?? 0)),
    recoverBonus: Boolean(Number(bonus?.value ?? 0)),
  };
}

async function upsertConfigKeyOnce(conn: PoolConnection, key: string, value: string): Promise<void> {
  const [existing] = await conn.execute<RowDataPacket[]>("SELECT id FROM configs WHERE `key` = :k LIMIT 1", { k: key });
  if (existing.length) {
    await conn.execute("UPDATE configs SET value = :v, updated_at = NOW() WHERE `key` = :k", { v: value, k: key });
  } else {
    await conn.execute("INSERT INTO configs (`key`, value, updated_at) VALUES (:k, :v, NOW())", { k: key, v: value });
  }
}

async function upsertConfigKey(conn: PoolConnection, key: string, value: string): Promise<void> {
  try {
    await upsertConfigKeyOnce(conn, key, value);
  } catch (e) {
    if (isMysqlCollationMismatch(e)) {
      const ok = await ensureConfigsColumnsUtf8mb4(conn);
      if (!ok) throw e;
      await upsertConfigKeyOnce(conn, key, value);
      return;
    }
    if (!isMysqlDataTooLongForColumn(e)) throw e;
    const ok = await widenConfigsValueColumnToMediumText(conn);
    if (!ok) throw e;
    await upsertConfigKeyOnce(conn, key, value);
  }
}

/** Single-row upsert for `configs` (used outside deduction transactions). */
export async function upsertConfigByKey(key: string, value: string): Promise<void> {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    await upsertConfigKey(conn, key, value);
  } finally {
    conn.release();
  }
}

export type PromoBonusRules = { p1: PromoTier[]; p2: PromoTier[] };

const PROMO_TIERS_TABLE = "bonus_promo_tiers";

function promoTypeLabel(v: string): "P1" | "P2" | null {
  return v === "P1" || v === "P2" ? v : null;
}

async function ensurePromoTiersTable(conn: PoolConnection): Promise<void> {
  await conn.execute(
    `CREATE TABLE IF NOT EXISTS ${PROMO_TIERS_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      promo_type ENUM('P1','P2') NOT NULL,
      sort_order INT UNSIGNED NOT NULL,
      ge INT UNSIGNED NOT NULL,
      lt INT UNSIGNED NULL,
      percentage DECIMAL(6,3) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_promo_tiers_type_order (promo_type, sort_order),
      KEY idx_promo_tiers_type_ge (promo_type, ge)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

async function getPromoBonusRulesFromConfigJson(pool: Pool): Promise<PromoBonusRules> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT `key`, value FROM configs WHERE `key` IN (?, ?)",
    [PROMO_BONUS_P1_CONFIG_KEY, PROMO_BONUS_P2_CONFIG_KEY],
  );
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(String(r.key), r.value != null ? String(r.value) : "");
  }
  return {
    p1: parsePromoTiersJson(map.get(PROMO_BONUS_P1_CONFIG_KEY)),
    p2: parsePromoTiersJson(map.get(PROMO_BONUS_P2_CONFIG_KEY)),
  };
}

export async function getPromoBonusRules(): Promise<PromoBonusRules> {
  const pool = getBillingPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT promo_type, ge, lt, percentage
       FROM ${PROMO_TIERS_TABLE}
       ORDER BY promo_type ASC, sort_order ASC, id ASC`,
    );
    const p1: PromoTier[] = [];
    const p2: PromoTier[] = [];
    for (const r of rows) {
      const type = promoTypeLabel(String(r.promo_type ?? ""));
      if (!type) continue;
      const ge = Math.floor(Number(r.ge));
      const ltRaw = r.lt;
      const lt =
        ltRaw == null || String(ltRaw).trim() === ""
          ? null
          : Math.floor(Number(ltRaw));
      const percentage = Number(r.percentage);
      if (!Number.isFinite(ge) || ge < 0) continue;
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) continue;
      if (lt != null && (!Number.isFinite(lt) || lt <= ge)) continue;
      const row: PromoTier = { ge, lt, percentage };
      if (type === "P1") p1.push(row);
      else p2.push(row);
    }

    // If table is empty (fresh migration), fallback to legacy JSON config values.
    if (p1.length === 0 && p2.length === 0) {
      return await getPromoBonusRulesFromConfigJson(pool);
    }
    return { p1, p2 };
  } catch (e) {
    if (isMysqlNoSuchTable(e)) {
      return await getPromoBonusRulesFromConfigJson(pool);
    }
    throw e;
  }
}

export async function savePromoBonusRules(input: {
  p1: PromoTier[];
  p2: PromoTier[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const e1 = validatePromoTiers(input.p1, "Promo 1 (requested credits)", true);
  if (e1) return { ok: false, error: e1 };
  const e2 = validatePromoTiers(input.p2, "Promo 2 (active clients)", true);
  if (e2) return { ok: false, error: e2 };
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensurePromoTiersTable(conn);
    await conn.execute(`DELETE FROM ${PROMO_TIERS_TABLE} WHERE promo_type IN ('P1','P2')`);

    const insertSql =
      `INSERT INTO ${PROMO_TIERS_TABLE} (promo_type, sort_order, ge, lt, percentage, created_at, updated_at)
       VALUES (:promo_type, :sort_order, :ge, :lt, :percentage, NOW(), NOW())`;
    for (let i = 0; i < input.p1.length; i++) {
      const r = input.p1[i];
      await conn.execute(insertSql, {
        promo_type: "P1",
        sort_order: i,
        ge: r.ge,
        lt: r.lt,
        percentage: r.percentage,
      });
    }
    for (let i = 0; i < input.p2.length; i++) {
      const r = input.p2[i];
      await conn.execute(insertSql, {
        promo_type: "P2",
        sort_order: i,
        ge: r.ge,
        lt: r.lt,
        percentage: r.percentage,
      });
    }
    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    return { ok: false, error: `Could not save bonus tiers in ${PROMO_TIERS_TABLE}: ${mysqlMessage(e)}` };
  } finally {
    conn.release();
  }
}

export async function saveDeductions(input: {
  rows: { month: number; month_deduction: number }[];
  monthFree: boolean;
  recoverBonus: boolean;
}) {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("TRUNCATE TABLE credit_deductions");
    for (const r of input.rows) {
      await conn.execute(
        `INSERT INTO credit_deductions (\`month\`, month_deduction, created_at, updated_at) VALUES (:m, :md, NOW(), NOW())`,
        { m: r.month, md: r.month_deduction },
      );
    }
    await upsertConfigKey(conn, "1_month_free", input.monthFree ? "1" : "0");
    await upsertConfigKey(conn, "is_recover_bonus_credit", input.recoverBonus ? "1" : "0");
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

const SETTINGS_CONFIG_KEYS = [
  "limit_manager_credit",
  "limit_reseller_credit",
  "limit_dealer_credit",
  "hierarchy_add_credit_max",
  "pin_default",
  "is_retry_trial",
  "number_retry_trial",
  "notify_expiring_subscriptions",
  "notify_low_credit",
  "notify_new_tickets",
  "notify_device_offline",
  "portal_tickets_create_enabled",
] as const;

function settingsConfigBool(map: Map<string, string>, key: string, whenMissing: boolean): boolean {
  const raw = map.get(key);
  if (raw == null || raw === "") return whenMissing;
  return Boolean(Number(raw));
}

export const DEFAULT_PANEL_TITLE = "Billing Panel";

/** Brand name from `settings.title` (browser tab, sidebar, login). */
export async function getPanelTitle(): Promise<string> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT title FROM settings ORDER BY id DESC LIMIT 1`,
  );
  const r = row(rows);
  const title = r ? String(r.title ?? "").trim() : "";
  if (title.length >= 3 && title.length <= 50) return title;
  return DEFAULT_PANEL_TITLE;
}

export type SettingsBundle = {
  id: number;
  title: string;
  adminEmail: string;
  announcement: string;
  /** Public paths under `/uploads/announcements/`. */
  announcementSlides: string[];
  /** Optional gprod-style flash heading above the message body. */
  announcementFlash: import("@/lib/announcement-flash").AnnouncementFlashHeading | null;
  limitManagerCredit: string;
  limitResellerCredit: string;
  limitDealerCredit: string;
  hierarchyAddCreditMax: string;
  pinDefault: string;
  isRetryTrial: boolean;
  numberRetryTrial: string;
  notifyExpiringSubscriptions: boolean;
  notifyLowCredit: boolean;
  notifyNewTickets: boolean;
  notifyDeviceOffline: boolean;
  /** When false, portal staff cannot open new tickets (existing tickets remain visible). */
  portalTicketsCreateEnabled: boolean;
};

export async function getSettings(): Promise<SettingsBundle> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, title, email, global_msg FROM settings ORDER BY id DESC LIMIT 1`,
  );
  const r = row(rows);
  const base = {
    id: r ? Number(r.id) : 0,
    title: r ? String(r.title ?? "") : "",
    adminEmail: r ? String(r.email ?? "") : "",
    announcement: r ? String(r.global_msg ?? "") : "",
  };

  const settingsConfigKeys = [...SETTINGS_CONFIG_KEYS, "global_announcement_slides", "global_announcement_flash"] as const;
  const ph = settingsConfigKeys.map(() => "?").join(",");
  const [cfgRows] = await pool.execute<RowDataPacket[]>(
    `SELECT \`key\`, value FROM configs WHERE \`key\` IN (${ph})`,
    [...settingsConfigKeys],
  );
  const map = new Map<string, string>();
  for (const row of cfgRows) {
    const k = row["key"] != null ? String(row["key"]) : "";
    if (k) map.set(k, row.value != null ? String(row.value) : "");
  }

  const { parseAnnouncementSlidesJson } = await import("@/lib/global-announcement-data");
  const { parseAnnouncementFlashJson } = await import("@/lib/announcement-flash");

  return {
    ...base,
    announcementSlides: parseAnnouncementSlidesJson(map.get("global_announcement_slides")),
    announcementFlash: parseAnnouncementFlashJson(map.get("global_announcement_flash")),
    limitManagerCredit: map.get("limit_manager_credit") ?? "1",
    limitResellerCredit: map.get("limit_reseller_credit") ?? "200",
    limitDealerCredit: map.get("limit_dealer_credit") ?? "200",
    hierarchyAddCreditMax: map.get("hierarchy_add_credit_max") ?? String(HIERARCHY_ADD_CREDITS_MAX),
    pinDefault: map.get("pin_default") ?? "9090",
    isRetryTrial: Boolean(Number(map.get("is_retry_trial") ?? 0)),
    numberRetryTrial: map.get("number_retry_trial") ?? "0",
    notifyExpiringSubscriptions: settingsConfigBool(map, "notify_expiring_subscriptions", true),
    notifyLowCredit: settingsConfigBool(map, "notify_low_credit", true),
    notifyNewTickets: settingsConfigBool(map, "notify_new_tickets", true),
    notifyDeviceOffline: settingsConfigBool(map, "notify_device_offline", false),
    portalTicketsCreateEnabled: settingsConfigBool(map, "portal_tickets_create_enabled", true),
  };
}

const ADMIN_NOTIFICATION_CONFIG_KEYS = [
  "notify_expiring_subscriptions",
  "notify_low_credit",
  "notify_new_tickets",
  "notify_device_offline",
] as const;

export type AdminNotificationPrefs = Pick<
  SettingsBundle,
  "notifyExpiringSubscriptions" | "notifyLowCredit" | "notifyNewTickets" | "notifyDeviceOffline"
>;

/** Used when `configs` is unreachable so UI still renders with safe defaults. */
export const DEFAULT_ADMIN_NOTIFICATION_PREFS: AdminNotificationPrefs = {
  notifyExpiringSubscriptions: true,
  notifyLowCredit: true,
  notifyNewTickets: true,
  notifyDeviceOffline: false,
};

/** Lightweight read of notification toggles (admin Settings → Notifications). */
export async function getAdminNotificationPrefs(): Promise<AdminNotificationPrefs> {
  const pool = getBillingPool();
  const ph = ADMIN_NOTIFICATION_CONFIG_KEYS.map(() => "?").join(",");
  const [cfgRows] = await pool.execute<RowDataPacket[]>(
    `SELECT \`key\`, value FROM configs WHERE \`key\` IN (${ph})`,
    [...ADMIN_NOTIFICATION_CONFIG_KEYS],
  );
  const map = new Map<string, string>();
  for (const row of cfgRows) {
    const k = row["key"] != null ? String(row["key"]) : "";
    if (k) map.set(k, row.value != null ? String(row.value) : "");
  }
  return {
    notifyExpiringSubscriptions: settingsConfigBool(map, "notify_expiring_subscriptions", true),
    notifyLowCredit: settingsConfigBool(map, "notify_low_credit", true),
    notifyNewTickets: settingsConfigBool(map, "notify_new_tickets", true),
    notifyDeviceOffline: settingsConfigBool(map, "notify_device_offline", false),
  };
}

async function updateSettingsRowOnce(
  conn: PoolConnection,
  id: number,
  title: string,
  email: string,
  global_msg: string,
): Promise<boolean> {
  const [res] = await conn.execute<ResultSetHeader>(
    `UPDATE settings SET title = :title, email = :email, global_msg = :global_msg WHERE id = :id`,
    { id, title, email, global_msg },
  );
  return res.affectedRows === 1;
}

export async function updateSettingsRow(id: number, title: string, email: string, global_msg: string) {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    return await updateSettingsRowOnce(conn, id, title, email, global_msg);
  } catch (e) {
    if (!isMysqlCollationMismatch(e)) throw e;
    const ok = await ensureSettingsRowUtf8mb4(conn);
    if (!ok) throw e;
    return await updateSettingsRowOnce(conn, id, title, email, global_msg);
  } finally {
    conn.release();
  }
}

/** Announcement tab — only touches `global_msg` (avoids rewriting title/email). */
export async function updateSettingsAnnouncement(id: number, global_msg: string): Promise<boolean> {
  const pool = getBillingPool();
  const conn = await pool.getConnection();
  try {
    const run = async () => {
      const [res] = await conn.execute<ResultSetHeader>(
        "UPDATE settings SET global_msg = :global_msg WHERE id = :id",
        { id, global_msg },
      );
      return res.affectedRows === 1;
    };
    try {
      return await run();
    } catch (e) {
      if (!isMysqlCollationMismatch(e)) throw e;
      const ok = await ensureSettingsRowUtf8mb4(conn);
      if (!ok) throw e;
      return await run();
    }
  } finally {
    conn.release();
  }
}

function formatBillingExpiryForStb(expires: unknown): string {
  if (expires == null) return "—";
  const s = String(expires).trim();
  if (!s || s === "0000-00-00 00:00:00") return "—";
  return s;
}

function buildStbSnapshotFromStalkerUserRow(stalkerUser: RowDataPacket | undefined, billingExpires: unknown) {
  const expiry = formatBillingExpiryForStb(billingExpires);
  const dash = "—";
  if (!stalkerUser) {
    return { online: false, ip: dash, firmware: dash, watching: dash, expiry };
  }
  const ipRaw = stalkerUser.ip != null ? String(stalkerUser.ip).trim() : "";
  const ip = ipRaw ? ipRaw : dash;
  const fwRaw =
    stalkerUser.image_version != null
      ? String(stalkerUser.image_version).trim()
      : stalkerUser.version != null
        ? String(stalkerUser.version).trim()
        : "";
  const firmware = fwRaw ? fwRaw : dash;
  const watchRaw =
    stalkerUser.now_playing_content != null
      ? String(stalkerUser.now_playing_content).trim()
      : stalkerUser.now_playing_type != null
        ? String(stalkerUser.now_playing_type).trim()
        : "";
  const watching = watchRaw ? watchRaw : dash;
  return {
    online: stalkerKeepAliveIsOnline(stalkerUser.keep_alive),
    ip,
    firmware,
    watching,
    expiry,
  };
}

export async function getUserForEdit(account: string) {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.account, a.username, a.full_name, a.password, a.mac, a.ip, a.phone, a.note, a.status, a.expires,
            u.type AS utype
     FROM accounts a
     LEFT JOIN users u ON u.username = a.username
     WHERE a.account = :a LIMIT 1`,
    { a: account },
  );
  const r = row(rows);
  if (!r) return null;
  const ownerLogin = String(r.username ?? "");
  const utype = r.utype != null ? String(r.utype) : "";
  const isDealer = utype === "RSLR";
  const isReseller = utype === "SRSLR";

  const [own] = await pool.execute<RowDataPacket[]>(
    `SELECT username_owner FROM users WHERE username = :u LIMIT 1`,
    { u: ownerLogin },
  );
  const ownerParent = own[0]?.username_owner != null ? String(own[0].username_owner) : "";

  /** Reseller / dealer shown in the form match PHP owner chain (`accounts.username` is dealer or reseller). */
  let resellerForForm = "";
  let dealerForForm = "";
  if (isDealer) {
    resellerForForm = ownerParent;
    dealerForForm = ownerLogin;
  } else if (isReseller) {
    resellerForForm = ownerLogin;
    dealerForForm = "";
  }

  let tariffPlanId = 0;
  let parentPin = "";
  let packageLabel = "—";
  let stalkerUserId: number | null = null;
  let customPackagePlanId: number | null = null;
  let addonPackages: { package_id: number; name: string }[] = [];
  let subscribedPackageIds: number[] = [];
  let messageEvents: StalkerDeviceEventRow[] = [];

  let stalkerUserRow: RowDataPacket | undefined;
  const stalker = getStalkerPool();
  if (stalker) {
    const [su] = await stalker.execute<RowDataPacket[]>("SELECT * FROM users WHERE login = :l LIMIT 1", { l: account });
    stalkerUserRow = su[0];
    if (stalkerUserRow) {
      stalkerUserId = Number(stalkerUserRow.id);
      tariffPlanId = stalkerUserRow.tariff_plan_id != null ? Number(stalkerUserRow.tariff_plan_id) : 0;
      parentPin = stalkerUserRow.parent_password != null ? String(stalkerUserRow.parent_password) : "";
      if (tariffPlanId > 0) {
        const [tn] = await stalker.execute<RowDataPacket[]>("SELECT name FROM tariff_plan WHERE id = :id LIMIT 1", {
          id: tariffPlanId,
        });
        packageLabel = tn.length ? String(tn[0].name ?? "") : `Plan #${tariffPlanId}`;
      }
    }
    /** Must run whenever Stalker is configured — not only when a `users` row exists (PHP still loads `get_package` from plan id). */
    customPackagePlanId = await getStalkerCustomPackagePlanId();
    if (customPackagePlanId) {
      addonPackages = await listStalkerPackagesForPlan(customPackagePlanId);
      if (stalkerUserId) {
        subscribedPackageIds = await listStalkerUserSubscribedPackageIds(stalkerUserId);
      }
    }
    if (stalkerUserId != null && stalkerUserId > 0) {
      messageEvents = await listStalkerEventsForUid(stalkerUserId, 30);
    }
  }

  const stb = buildStbSnapshotFromStalkerUserRow(stalkerUserRow, r.expires);

  const tx = await listTransactionsByAccount(String(r.account), 50);
  return {
    id: String(r.account),
    name: String(r.full_name ?? ""),
    username: ownerLogin,
    password: String(r.password ?? ""),
    mac: r.mac != null ? String(r.mac) : "",
    ip: r.ip != null ? String(r.ip) : "",
    phone: r.phone != null ? String(r.phone) : "",
    status: Number(r.status) === ACCOUNT_STATUS_ON ? ("ACTIVE" as const) : ("INACTIVE" as const),
    statusCode: Number(r.status),
    reseller: resellerForForm,
    dealer: dealerForForm,
    isDealer,
    isReseller,
    tariffPlanId,
    parentPin,
    packageLabel,
    stalkerUserId,
    customPackagePlanId,
    addonPackages,
    subscribedPackageIds,
    messageEvents,
    comments: r.note != null ? String(r.note) : "",
    stb,
    transactions: tx,
  };
}

/**
 * Lightweight account edit payload for inline CRUD paths.
 * Avoids heavy modal-only joins/queries (transactions, events, package metadata).
 */
export async function getUserForInlineEdit(account: string) {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT account, full_name, password, mac, ip, phone, note, status
     FROM accounts
     WHERE account = :a
     LIMIT 1`,
    { a: account },
  );
  const r = row(rows);
  if (!r) return null;
  return {
    id: String(r.account),
    name: String(r.full_name ?? ""),
    password: String(r.password ?? ""),
    mac: r.mac != null ? String(r.mac) : "",
    ip: r.ip != null ? String(r.ip) : "",
    phone: r.phone != null ? String(r.phone) : "",
    comments: r.note != null ? String(r.note) : "",
    statusCode: Number(r.status),
  };
}

export async function canAccessAccountByRole(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  account: string;
}): Promise<boolean> {
  const pool = getBillingPool();
  const acc = input.account.trim();
  if (!acc) return false;
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account
     FROM accounts a
     LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
     LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
     LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
     WHERE a.account = ? AND (${scopeSql})
     LIMIT 1`,
    [acc, ...scopeParams],
  );
  return rows.length > 0;
}

export async function getUserForEditScoped(input: {
  ownerType: "ROOT" | "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  account: string;
}) {
  const ok = await canAccessAccountByRole(input);
  if (!ok) return null;
  return getUserForEdit(input.account);
}

/** Reseller (required) and optional dealer under that reseller → billing `accounts.username` value. */
export async function resolveValidatedAccountOwner(reseller: string, dealer: string): Promise<string | null> {
  const pool = getBillingPool();
  const r = reseller.trim();
  const d = dealer.trim();
  if (!r) return null;
  const [[rs]] = await pool.execute<RowDataPacket[]>(
    "SELECT username FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1",
    { u: r },
  );
  if (!rs) return null;
  if (d) {
    const [[dl]] = await pool.execute<RowDataPacket[]>(
      "SELECT username FROM users WHERE type = 'RSLR' AND username = :d AND username_owner = :r LIMIT 1",
      { d, r },
    );
    if (!dl) return null;
    return d;
  }
  return r;
}

/** Raw `periods` from DB — matches PHP `users/view` transaction table (not `get_all_admin` sign flip). */
export type AccountTransactionRow = {
  transaction: string;
  username: string;
  type: string;
  periods: number;
  amount: string | null;
  account: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  remarks: string | null;
  free_month: number | null;
  timestamp: string | null;
  created_by: string | null;
};

function mapAccountTransactionRow(r: RowDataPacket): AccountTransactionRow {
  return {
    transaction: String(r.transaction ?? ""),
    username: String(r.username ?? ""),
    type: String(r.type ?? "").toUpperCase(),
    periods: Number(r.periods ?? 0),
    amount: r.amount != null ? String(r.amount) : null,
    account: r.account != null ? String(r.account) : null,
    coverage_start: r.coverage_start != null ? String(r.coverage_start) : null,
    coverage_end: r.coverage_end != null ? String(r.coverage_end) : null,
    remarks: r.remarks != null ? String(r.remarks) : null,
    free_month: (() => {
      if (r.free_month == null || r.free_month === "") return null;
      const n = Number(r.free_month);
      return Number.isFinite(n) ? n : null;
    })(),
    timestamp: r.timestamp != null ? String(r.timestamp) : null,
    created_by: r.created_by != null ? String(r.created_by) : null,
  };
}

/** Sub-account (end user) rows: `transactions.account` = Stalker login / `accounts.account`. */
export async function listTransactionsByAccount(account: string, limit = 50): Promise<AccountTransactionRow[]> {
  const pool = getBillingPool();
  const lim = Math.min(200, Math.max(1, Math.floor(limit)));
  const sql = `SELECT \`transaction\`, username, type, periods, amount, account, coverage_start, coverage_end, remarks, free_month, \`timestamp\`, created_by
   FROM transactions WHERE account = :a ORDER BY \`timestamp\` DESC LIMIT ${lim}`;
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(sql, { a: account });
  } catch (err) {
    if (!isMissingCreatedByColumnError(err)) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(withoutCreatedByColumn(sql), { a: account });
  }
  return rows.map(mapAccountTransactionRow);
}

/** Operator (reseller/dealer) rows: `transactions.username` = billing user login. */
export async function listTransactionsByUsername(username: string, limit = 50): Promise<AccountTransactionRow[]> {
  const pool = getBillingPool();
  const lim = Math.min(200, Math.max(1, Math.floor(limit)));
  const sql = `SELECT \`transaction\`, username, type, periods, amount, account, coverage_start, coverage_end, remarks, free_month, \`timestamp\`, created_by
   FROM transactions WHERE username = :u ORDER BY \`timestamp\` DESC LIMIT ${lim}`;
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(sql, { u: username });
  } catch (err) {
    if (!isMissingCreatedByColumnError(err)) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(withoutCreatedByColumn(sql), { u: username });
  }
  return rows.map(mapAccountTransactionRow);
}

/** Stalker `events` rows for a device user (PHP `Stalker_model::get_events`). */
export type StalkerDeviceEventRow = {
  id: number;
  event: string;
  msg: string | null;
  priority: number | null;
  addtime: string | null;
  need_confirm: number | null;
  eventtime: string | null;
};

export async function listStalkerEventsForUid(uid: number, limit = 30): Promise<StalkerDeviceEventRow[]> {
  if (!Number.isFinite(uid) || uid <= 0) return [];
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const lim = Math.min(100, Math.max(1, Math.floor(limit)));
  try {
    const [rows] = await stalker.execute<RowDataPacket[]>(
      `SELECT id, event, msg, priority, addtime, need_confirm, eventtime FROM events WHERE uid = :u ORDER BY id DESC LIMIT ${lim}`,
      { u: uid },
    );
    return rows.map((ev) => ({
      id: Number(ev.id ?? 0),
      event: String(ev.event ?? ""),
      msg: ev.msg != null ? String(ev.msg) : null,
      priority: ev.priority != null ? Number(ev.priority) : null,
      addtime: ev.addtime != null ? String(ev.addtime) : null,
      need_confirm: ev.need_confirm != null ? Number(ev.need_confirm) : null,
      eventtime: ev.eventtime != null ? String(ev.eventtime) : null,
    }));
  } catch {
    return [];
  }
}

/** Stalker portal users for admin Message “Custom selection” (`Message::index` + `common/message`). */
export type StalkerMessageUserOption = { id: number; login: string };

export async function countStalkerUsers(): Promise<number> {
  const stalker = getStalkerPool();
  if (!stalker) return 0;
  try {
    const [rows] = await stalker.execute<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users");
    return Math.floor(Number(rows[0]?.c ?? 0));
  } catch {
    return 0;
  }
}

export type AdminStalkerMessageDashboardStats = {
  /** Distinct send batches today (same minute + same body counts as one send). */
  sendsToday: number;
  /** Total `send_msg` event rows (all time, device targets). */
  recipients30d: number;
  /** Share of rows with `need_confirm = 0` (all time), or null if none. */
  deliveryPct: number | null;
  /** True when some rows still have `need_confirm` set. */
  deliveryPending: boolean;
  /** Rows with `need_confirm = 0` (device acknowledged). */
  delivered: number;
  /** Queued rows still awaiting ack, by Stalker priority. */
  pendingHigh: number;
  pendingNormal: number;
  pendingLow: number;
  pendingOther: number;
};

export function emptyAdminStalkerMessageDashboardStats(): AdminStalkerMessageDashboardStats {
  return {
    sendsToday: 0,
    recipients30d: 0,
    deliveryPct: null,
    deliveryPending: false,
    delivered: 0,
    pendingHigh: 0,
    pendingNormal: 0,
    pendingLow: 0,
    pendingOther: 0,
  };
}

function mapAdminStalkerMessageDashboardRow(r: RowDataPacket, sendsToday: number): AdminStalkerMessageDashboardStats {
  const total = Math.floor(Number(r.total ?? 0));
  const delivered = Math.floor(Number(r.delivered ?? 0));
  const pendingHigh = Math.floor(Number(r.pending_high ?? 0));
  const pendingNormal = Math.floor(Number(r.pending_normal ?? 0));
  const pendingLow = Math.floor(Number(r.pending_low ?? 0));
  const pendingOther = Math.floor(Number(r.pending_other ?? 0));
  const deliveryPct = total > 0 ? Math.round((100 * delivered) / total) : null;
  return {
    sendsToday,
    recipients30d: total,
    deliveryPct,
    deliveryPending: total > 0 && delivered < total,
    delivered,
    pendingHigh,
    pendingNormal,
    pendingLow,
    pendingOther,
  };
}

export type AdminMessageRoleCounts = {
  admin: number;
  manager: number;
  reseller: number;
  dealer: number;
};

/** Stacked `send_msg` counts per calendar day (HUD message traffic chart). Mutually exclusive buckets. */
export type AdminMessageTrafficDayStack = {
  dayKey: string;
  dayLabel: string;
  delivered: number;
  highPending: number;
  normalPending: number;
  lowPending: number;
  otherPending: number;
};

function stalkerRowDateToYmd(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/**
 * Last `lastDays` calendar days (including today), zero-filled. Requires Stalker `events` + `send_msg` rows.
 * Buckets: delivered (`need_confirm=0`), pending split by `priority` (1 high / 2 normal / 3 low / other).
 */
export async function getAdminMessageTrafficDayStacks(lastDays = 8): Promise<AdminMessageTrafficDayStack[]> {
  const stalker = getStalkerPool();
  const emptySeries = (): AdminMessageTrafficDayStack[] => {
    const out: AdminMessageTrafficDayStack[] = [];
    for (let i = lastDays - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      const dayKey = `${y}-${mo}-${da}`;
      out.push({
        dayKey,
        dayLabel: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        delivered: 0,
        highPending: 0,
        normalPending: 0,
        lowPending: 0,
        otherPending: 0,
      });
    }
    return out;
  };

  if (!stalker || !(await stalkerHasEventsTable(stalker))) {
    return emptySeries();
  }

  const sendMsgWhere = `event = 'send_msg' AND uid > 0 AND msg IS NOT NULL AND TRIM(msg) <> ''`;
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT
         DATE(e.addtime) AS d,
         SUM(CASE WHEN COALESCE(e.need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 1 THEN 1 ELSE 0 END) AS high_p,
         SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 2 THEN 1 ELSE 0 END) AS norm_p,
         SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 3 THEN 1 ELSE 0 END) AS low_p,
         SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS oth_p
       FROM events e
       WHERE ${sendMsgWhere}
         AND e.addtime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(e.addtime)
       ORDER BY d ASC`,
      [lastDays],
    );

    const byDay = new Map<string, Omit<AdminMessageTrafficDayStack, "dayKey" | "dayLabel">>();
    for (const r of rows) {
      const key = stalkerRowDateToYmd(r.d);
      if (!key) continue;
      byDay.set(key, {
        delivered: Math.floor(Number(r.delivered ?? 0)),
        highPending: Math.floor(Number(r.high_p ?? 0)),
        normalPending: Math.floor(Number(r.norm_p ?? 0)),
        lowPending: Math.floor(Number(r.low_p ?? 0)),
        otherPending: Math.floor(Number(r.oth_p ?? 0)),
      });
    }

    const out: AdminMessageTrafficDayStack[] = [];
    for (let i = lastDays - 1; i >= 0; i--) {
      const dt = new Date();
      dt.setHours(0, 0, 0, 0);
      dt.setDate(dt.getDate() - i);
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      const dayKey = `${y}-${mo}-${da}`;
      const row = byDay.get(dayKey);
      out.push({
        dayKey,
        dayLabel: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        delivered: row?.delivered ?? 0,
        highPending: row?.highPending ?? 0,
        normalPending: row?.normalPending ?? 0,
        lowPending: row?.lowPending ?? 0,
        otherPending: row?.otherPending ?? 0,
      });
    }
    return out;
  } catch {
    return emptySeries();
  }
}

export async function getAdminStalkerMessageDashboardStats(): Promise<AdminStalkerMessageDashboardStats> {
  const stalker = getStalkerPool();
  if (!stalker || !(await stalkerHasEventsTable(stalker))) {
    return emptyAdminStalkerMessageDashboardStats();
  }
  const sendMsgWhere = `event = 'send_msg' AND uid > 0 AND msg IS NOT NULL AND TRIM(msg) <> ''`;
  try {
    const [r1] = await stalker.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM (
         SELECT 1 AS x FROM events
         WHERE ${sendMsgWhere} AND DATE(\`addtime\`) = CURDATE()
         GROUP BY DATE_FORMAT(\`addtime\`, '%Y-%m-%d %H:%i'), \`msg\`
       ) t`,
    );
    const sendsToday = Math.floor(Number(r1[0]?.c ?? 0));
    const [r3] = await stalker.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN COALESCE(need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN COALESCE(need_confirm, 1) <> 0 AND COALESCE(priority, 2) = 1 THEN 1 ELSE 0 END) AS pending_high,
         SUM(CASE WHEN COALESCE(need_confirm, 1) <> 0 AND COALESCE(priority, 2) = 2 THEN 1 ELSE 0 END) AS pending_normal,
         SUM(CASE WHEN COALESCE(need_confirm, 1) <> 0 AND COALESCE(priority, 2) = 3 THEN 1 ELSE 0 END) AS pending_low,
         SUM(CASE WHEN COALESCE(need_confirm, 1) <> 0 AND COALESCE(priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS pending_other
       FROM events
       WHERE ${sendMsgWhere}`,
    );
    return mapAdminStalkerMessageDashboardRow(r3[0] ?? {}, sendsToday);
  } catch {
    return emptyAdminStalkerMessageDashboardStats();
  }
}

export async function getAdminMessageRoleCounts(): Promise<AdminMessageRoleCounts> {
  const pool = getBillingPool();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'ROOT'  AND UPPER(TRIM(status)) = 'A' THEN 1 ELSE 0 END), 0) AS admin_n,
         COALESCE(SUM(CASE WHEN type = 'MNGR'  AND UPPER(TRIM(status)) = 'A' THEN 1 ELSE 0 END), 0) AS manager_n,
         COALESCE(SUM(CASE WHEN type = 'SRSLR' AND UPPER(TRIM(status)) = 'A' THEN 1 ELSE 0 END), 0) AS reseller_n,
         COALESCE(SUM(CASE WHEN type = 'RSLR'  AND UPPER(TRIM(status)) = 'A' THEN 1 ELSE 0 END), 0) AS dealer_n
       FROM users`,
    );
    const r = rows[0];
    const admin = Math.floor(Number(r?.admin_n ?? 0));
    return {
      admin: admin > 0 ? admin : 1,
      manager: Math.floor(Number(r?.manager_n ?? 0)),
      reseller: Math.floor(Number(r?.reseller_n ?? 0)),
      dealer: Math.floor(Number(r?.dealer_n ?? 0)),
    };
  } catch {
    return { admin: 1, manager: 0, reseller: 0, dealer: 0 };
  }
}

export type AdminRecentStalkerSendMessageRow = {
  uid: number;
  login: string | null;
  title: string | null;
  msg: string | null;
  priority: number | null;
  addtime: string | null;
  need_confirm: number | null;
};

function mapAdminRecentStalkerSendMessageRow(r: RowDataPacket): AdminRecentStalkerSendMessageRow {
  return {
    uid: Math.floor(Number(r.uid ?? 0)),
    login: r.login != null && String(r.login).trim() !== "" ? String(r.login) : null,
    title: r.title != null && String(r.title).trim() !== "" ? String(r.title) : null,
    msg: r.msg != null ? String(r.msg) : null,
    priority: r.priority != null ? Number(r.priority) : null,
    addtime: r.addtime != null ? String(r.addtime) : null,
    need_confirm: r.need_confirm != null ? Number(r.need_confirm) : null,
  };
}

/** Default cap for admin message history (pass `limit <= 0` to use this). */
export const ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT = 200;

export async function listAdminRecentStalkerSendMessages(
  limit = ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT,
): Promise<AdminRecentStalkerSendMessageRow[]> {
  const stalker = getStalkerPool();
  if (!stalker || !(await stalkerHasEventsTable(stalker))) return [];
  const lim = Math.max(1, Math.min(10000, Math.floor(limit) || ADMIN_STALKER_MESSAGE_HISTORY_DEFAULT_LIMIT));
  const sqlLimit = `LIMIT ${lim}`;
  try {
    const [rows] = await stalker.execute<RowDataPacket[]>(
      `SELECT e.uid, e.title, e.msg, e.priority, e.addtime, e.need_confirm, u.login
       FROM events e
       LEFT JOIN users u ON u.id = e.uid
       WHERE e.event = 'send_msg'
         AND e.uid > 0
         AND e.msg IS NOT NULL
         AND TRIM(e.msg) <> ''
       ORDER BY e.addtime DESC, e.id DESC
       ${sqlLimit}`,
    );
    return rows.map(mapAdminRecentStalkerSendMessageRow);
  } catch {
    try {
      const [rows] = await stalker.execute<RowDataPacket[]>(
        `SELECT e.uid, e.msg, e.priority, e.addtime, e.need_confirm, u.login
         FROM events e
         LEFT JOIN users u ON u.id = e.uid
         WHERE e.event = 'send_msg'
           AND e.uid > 0
           AND e.msg IS NOT NULL
           AND TRIM(e.msg) <> ''
         ORDER BY e.addtime DESC, e.id DESC
         ${sqlLimit}`,
      );
      return rows.map((r) => mapAdminRecentStalkerSendMessageRow({ ...r, title: null }));
    } catch {
      return [];
    }
  }
}

/** Approximate audience sizes for admin Messages UI (billing vs Stalker totals). */
export type AdminMessageAudiencePreviewCounts = {
  /** Every row in Stalker `users` (broadcast “all”). */
  all: number;
  active: number;
  expired: number;
  expiring: number;
  inactive: number;
};

async function countBillingDistinctSubscriberAccounts(): Promise<number> {
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT TRIM(a.account)) AS c
     FROM accounts a
     WHERE a.account IS NOT NULL AND TRIM(a.account) <> ''`,
  );
  return Math.floor(Number(rows[0]?.c ?? 0));
}

/**
 * Audience sizes for Messages UI.
 * `accurateMappedTotal` runs billing→Stalker mapping (slow on remote DB); default uses billing account count only.
 */
export async function getAdminMessageAudiencePreviewCounts(opts?: {
  accurateMappedTotal?: boolean;
}): Promise<AdminMessageAudiencePreviewCounts> {
  const [mappedTotal, summary, expiring] = await Promise.all([
    opts?.accurateMappedTotal ? countAdminMappableStalkerUsers() : countBillingDistinctSubscriberAccounts(),
    getUsersSummary(),
    getAdminExpiringSoonCount(7),
  ]);
  return {
    all: mappedTotal,
    active: summary.active,
    expired: summary.expired,
    expiring,
    inactive: summary.inactive,
  };
}

async function listAdminAccountLogins(limit = 20000): Promise<string[]> {
  const pool = getBillingPool();
  const lim = Math.min(50000, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct
     FROM accounts a
     WHERE a.account IS NOT NULL AND TRIM(a.account) <> ''
     ORDER BY a.account ASC
     LIMIT ?`,
    [lim],
  );
  return rows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
}

export async function resolveAdminAccountLoginsToStalkerUids(logins: string[]): Promise<number[]> {
  if (!logins.length) return [];
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  const chunk = 400;
  for (let i = 0; i < logins.length; i += chunk) {
    const part = logins.slice(i, i + chunk);
    const ph = part.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE login IN (${ph})`,
      part,
    );
    for (const r of rows) {
      const id = Number(r.id ?? 0);
      if (id > 0 && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

async function countAdminMappableStalkerUsers(): Promise<number> {
  const logins = await listAdminAccountLogins(25000);
  if (!logins.length) return 0;
  const uids = await resolveAdminAccountLoginsToStalkerUids(logins);
  return uids.length;
}

const ADMIN_MESSAGE_ACCOUNT_FROM = `FROM accounts a
  LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
  LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
  LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL`;

/**
 * Resolve Stalker `users.id` values for a billing-driven audience (max `maxUids` matches).
 * Does not handle `all` (use broadcast) or `custom` (form posts `users[]`).
 */
export async function resolveAdminMessageStalkerUids(
  audience: string,
  opts?: { maxUids?: number },
): Promise<{ uids: number[]; sourceLogins: number }> {
  const requestedCap = opts?.maxUids;
  const maxUids = requestedCap == null ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(requestedCap));
  const a = audience.trim().toLowerCase();
  if (a === "all" || a === "custom") return { uids: [], sourceLogins: 0 };

  const pool = getBillingPool();

  async function mapLoginsToUids(logins: string[]): Promise<{ uids: number[]; sourceLogins: number }> {
    const uids: number[] = [];
    const seen = new Set<number>();
    for (const login of logins) {
      if (uids.length >= maxUids) break;
      const uid = await getStalkerUserDbIdByLogin(login);
      if (uid != null && uid > 0 && !seen.has(uid)) {
        seen.add(uid);
        uids.push(uid);
      }
    }
    return { uids, sourceLogins: logins.length };
  }

  if (a === "active" || a === "expired" || a === "expiring" || a === "inactive") {
    const { sql: filterSql, params: filterParams } = accountListWhereClause(a, null, null);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT a.account AS acct ${ADMIN_MESSAGE_ACCOUNT_FROM} WHERE (${filterSql}) ORDER BY a.account ASC LIMIT 15000`,
      filterParams,
    );
    const logins = rows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
    return mapLoginsToUids(logins);
  }

  return { uids: [], sourceLogins: 0 };
}

export async function listStalkerUsersForMessageSelect(limit = 8000): Promise<StalkerMessageUserOption[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const lim = Math.min(20000, Math.max(1, Math.floor(limit)));
  const mapRows = (rows: RowDataPacket[]) =>
    rows.map((r) => ({
      id: Number(r.id ?? 0),
      login: r.login != null && String(r.login).trim() !== "" ? String(r.login) : `id:${r.id}`,
    }));
  try {
    const [rows] = await stalker.execute<RowDataPacket[]>(
      `SELECT id, login FROM users ORDER BY fname ASC, login ASC LIMIT ${lim}`,
    );
    return mapRows(rows).filter((u) => u.id > 0);
  } catch {
    try {
      const [rows] = await stalker.execute<RowDataPacket[]>(
        `SELECT id, login FROM users ORDER BY login ASC LIMIT ${lim}`,
      );
      return mapRows(rows).filter((u) => u.id > 0);
    } catch {
      return [];
    }
  }
}

/** Distinct billing `accounts.account` values under portal hierarchy (PHP Message index user list). */
export async function listScopedAccountLogins(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  limit?: number;
}): Promise<string[]> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const lim = Math.min(10000, Math.max(1, Math.floor(input.limit ?? 8000)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct
     FROM accounts a
     LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
     LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
     LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
     WHERE (${scopeSql})
     ORDER BY a.account ASC
     LIMIT ?`,
    [...scopeParams, lim],
  );
  return rows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
}

/** Stalker rows for accounts visible to manager, reseller, or dealer (custom selection). */
export async function listStalkerUsersForMessageSelectScoped(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  limit?: number;
}): Promise<StalkerMessageUserOption[]> {
  const logins = await listScopedAccountLogins(input);
  if (!logins.length) return [];
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const maxOut = Math.min(8000, Math.max(1, Math.floor(input.limit ?? 8000)));
  const out: StalkerMessageUserOption[] = [];
  const seen = new Set<number>();
  const chunk = 400;
  for (let i = 0; i < logins.length; i += chunk) {
    const part = logins.slice(i, i + chunk);
    const ph = part.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT id, login FROM users WHERE login IN (${ph}) ORDER BY login ASC`,
      part,
    );
    for (const r of rows) {
      const id = Number(r.id ?? 0);
      if (id <= 0 || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        login: r.login != null && String(r.login).trim() !== "" ? String(r.login) : `id:${id}`,
      });
      if (out.length >= maxOut) return out;
    }
  }
  return out;
}

/** Count billing accounts under operator scope for a message audience segment. */
async function countOperatorScopedAccountsForMessageAudience(
  input: { ownerType: "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string },
  audience: "all" | "active" | "expired" | "expiring" | "inactive",
): Promise<number> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const statusFilter =
    audience === "all" ? { sql: "1=1", params: [] as unknown[] } : accountListWhereClause(audience, null, null);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT a.account) AS c
     ${ACCOUNTS_HIERARCHY_FROM_SQL}
     WHERE (${scopeSql}) AND (${statusFilter.sql})
       AND a.account IS NOT NULL AND TRIM(a.account) <> ''`,
    [...scopeParams, ...statusFilter.params],
  );
  return Math.floor(Number(rows[0]?.c ?? 0));
}

async function listOperatorScopedAccountLoginsForMessageAudience(
  input: { ownerType: "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string },
  audience: string,
  limit = 15000,
): Promise<string[]> {
  const a = audience.trim().toLowerCase();
  if (a === "all" || a === "custom") {
    return listScopedAccountLogins({ ...input, limit });
  }
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = accountScopeWhereClause({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
  });
  const { sql: filterSql, params: filterParams } = accountListWhereClause(a, null, null);
  const lim = Math.min(50000, Math.max(1, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct
     ${ACCOUNTS_HIERARCHY_FROM_SQL}
     WHERE (${scopeSql}) AND (${filterSql})
       AND a.account IS NOT NULL AND TRIM(a.account) <> ''
     ORDER BY a.account ASC
     LIMIT ?`,
    [...scopeParams, ...filterParams, lim],
  );
  return rows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
}

/**
 * Resolve Stalker `users.id` for operator-scoped billing audiences (not `all` / `custom`).
 */
export async function resolveOperatorMessageStalkerUids(
  input: { ownerType: "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string },
  audience: string,
  opts?: { maxUids?: number },
): Promise<{ uids: number[]; sourceLogins: number }> {
  const requestedCap = opts?.maxUids;
  const maxUids = requestedCap == null ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(requestedCap));
  const a = audience.trim().toLowerCase();
  if (a === "all" || a === "custom") return { uids: [], sourceLogins: 0 };

  const logins = await listOperatorScopedAccountLoginsForMessageAudience(input, a);
  if (!logins.length) return { uids: [], sourceLogins: 0 };

  const stalker = getStalkerPool();
  if (!stalker) return { uids: [], sourceLogins: logins.length };

  const uids: number[] = [];
  const seen = new Set<number>();
  const chunk = 400;
  for (let i = 0; i < logins.length; i += chunk) {
    if (uids.length >= maxUids) break;
    const part = logins.slice(i, i + chunk);
    const ph = part.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(`SELECT id FROM users WHERE login IN (${ph})`, part);
    for (const r of rows) {
      const id = Number(r.id ?? 0);
      if (id > 0 && !seen.has(id)) {
        seen.add(id);
        uids.push(id);
        if (uids.length >= maxUids) break;
      }
    }
  }
  return { uids, sourceLogins: logins.length };
}

/** Audience sizes for portal message UI (scoped to operator hierarchy). */
export async function getOperatorMessageAudiencePreviewCounts(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
}): Promise<AdminMessageAudiencePreviewCounts> {
  const [all, active, expired, expiring, inactive] = await Promise.all([
    listStalkerUsersForMessageSelectScoped(input).then((users) => users.length),
    countOperatorScopedAccountsForMessageAudience(input, "active"),
    countOperatorScopedAccountsForMessageAudience(input, "expired"),
    countOperatorScopedAccountsForMessageAudience(input, "expiring"),
    countOperatorScopedAccountsForMessageAudience(input, "inactive"),
  ]);
  return { all, active, expired, expiring, inactive };
}

/** Stalker `send_msg` stats limited to subscribers under the operator hierarchy. */
export async function getOperatorStalkerMessageDashboardStats(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
}): Promise<AdminStalkerMessageDashboardStats> {
  const logins = await listScopedAccountLogins({ ...input, ownerUsername: input.ownerUsername.trim(), limit: 12000 });
  if (!logins.length) {
    return emptyAdminStalkerMessageDashboardStats();
  }
  const stalker = getStalkerPool();
  if (!stalker || !(await stalkerHasEventsTable(stalker))) {
    return emptyAdminStalkerMessageDashboardStats();
  }
  const chunk = 280;
  let sendsToday = 0;
  let total = 0;
  let delivered = 0;
  let pendingHigh = 0;
  let pendingNormal = 0;
  let pendingLow = 0;
  let pendingOther = 0;
  try {
    for (let i = 0; i < logins.length; i += chunk) {
      const part = logins.slice(i, i + chunk);
      const ph = part.map(() => "?").join(",");
      const [r1] = await stalker.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM events e
         INNER JOIN users u ON u.id = e.uid
         WHERE e.event = 'send_msg' AND DATE(e.addtime) = CURDATE() AND u.login IN (${ph})`,
        part,
      );
      sendsToday += Math.floor(Number(r1[0]?.c ?? 0));
      const [r2] = await stalker.query<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN COALESCE(e.need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
           SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 1 THEN 1 ELSE 0 END) AS pending_high,
           SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 2 THEN 1 ELSE 0 END) AS pending_normal,
           SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 3 THEN 1 ELSE 0 END) AS pending_low,
           SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS pending_other
         FROM events e
         INNER JOIN users u ON u.id = e.uid
         WHERE e.event = 'send_msg' AND e.msg IS NOT NULL AND TRIM(e.msg) <> '' AND u.login IN (${ph})`,
        part,
      );
      const row = r2[0] ?? {};
      total += Math.floor(Number(row.total ?? 0));
      delivered += Math.floor(Number(row.delivered ?? 0));
      pendingHigh += Math.floor(Number(row.pending_high ?? 0));
      pendingNormal += Math.floor(Number(row.pending_normal ?? 0));
      pendingLow += Math.floor(Number(row.pending_low ?? 0));
      pendingOther += Math.floor(Number(row.pending_other ?? 0));
    }
    const deliveryPct = total > 0 ? Math.round((100 * delivered) / total) : null;
    return {
      sendsToday,
      recipients30d: total,
      deliveryPct,
      deliveryPending: total > 0 && delivered < total,
      delivered,
      pendingHigh,
      pendingNormal,
      pendingLow,
      pendingOther,
    };
  } catch {
    return emptyAdminStalkerMessageDashboardStats();
  }
}

export async function listOperatorRecentStalkerSendMessages(
  input: { ownerType: "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string },
  limit = 30,
): Promise<AdminRecentStalkerSendMessageRow[]> {
  const logins = (await listScopedAccountLogins({
    ...input,
    ownerUsername: input.ownerUsername.trim(),
    limit: 12000,
  }))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!logins.length) return [];
  const stalker = getStalkerPool();
  if (!stalker || !(await stalkerHasEventsTable(stalker))) return [];
  const lim = Math.min(500, Math.max(1, Math.floor(limit)));
  const chunk = 280;
  const merged: AdminRecentStalkerSendMessageRow[] = [];
  try {
    for (let i = 0; i < logins.length; i += chunk) {
      const part = logins.slice(i, i + chunk);
      const ph = part.map(() => "?").join(",");
      const [rows] = await stalker.query<RowDataPacket[]>(
        `SELECT e.uid, e.title, e.msg, e.priority, e.addtime, e.need_confirm, u.login
         FROM events e
         INNER JOIN users u ON u.id = e.uid
         WHERE e.event = 'send_msg'
           AND e.uid > 0
           AND e.msg IS NOT NULL
           AND TRIM(e.msg) <> ''
           AND u.login IN (${ph})
         ORDER BY e.addtime DESC, e.id DESC
         LIMIT ?`,
        [...part, lim],
      );
      for (const r of rows) {
        merged.push(mapAdminRecentStalkerSendMessageRow(r));
      }
    }
    merged.sort((a, b) => {
      const tb = String(b.addtime ?? "");
      const ta = String(a.addtime ?? "");
      if (tb !== ta) return tb.localeCompare(ta);
      return (b.uid ?? 0) - (a.uid ?? 0);
    });
    return merged.slice(0, lim);
  } catch {
    return [];
  }
}

/** PHP portal Message “To All”: `send_msg` to every Stalker user whose login is a scoped billing account. */
export async function broadcastStalkerMessageScoped(
  message: string,
  input: { ownerType: "MNGR" | "SRSLR" | "RSLR"; ownerUsername: string },
  priority = 2,
  title = "",
): Promise<number> {
  const msg = message.trim();
  if (!msg) return 0;
  const pr = Number.isFinite(priority) && priority >= 1 && priority <= 3 ? Math.floor(priority) : 2;
  const logins = await listScopedAccountLogins({ ...input, limit: 10000 });
  if (!logins.length) return 0;
  const stalker = getStalkerPool();
  if (!stalker) return 0;
  const uids: number[] = [];
  const seen = new Set<number>();
  const chunk = 400;
  for (let i = 0; i < logins.length; i += chunk) {
    const part = logins.slice(i, i + chunk);
    const ph = part.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(`SELECT id FROM users WHERE login IN (${ph})`, part);
    for (const r of rows) {
      const id = Number(r.id ?? 0);
      if (id > 0 && !seen.has(id)) {
        seen.add(id);
        uids.push(id);
      }
    }
  }
  if (!uids.length) return 0;
  return sendStalkerMessageToUserIds(uids, msg, pr, title);
}

export async function isStalkerUidInOperatorScope(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
  uid: number;
}): Promise<boolean> {
  const uid = Math.floor(Number(input.uid));
  if (!Number.isFinite(uid) || uid <= 0) return false;
  const stalker = getStalkerPool();
  if (!stalker) return false;
  const [rows] = await stalker.execute<RowDataPacket[]>("SELECT login FROM users WHERE id = :id LIMIT 1", { id: uid });
  const login = rows[0]?.login != null ? String(rows[0].login).trim() : "";
  if (!login) return false;
  return canAccessAccountByRole({
    ownerType: input.ownerType,
    ownerUsername: input.ownerUsername,
    account: login,
  });
}

export async function getTransactionsForAccount(account: string): Promise<AccountTransactionRow[]> {
  return listTransactionsByAccount(account, 50);
}

export async function updateAccountBasics(input: {
  account: string;
  full_name: string;
  mac: string;
  ip?: string;
  phone: string;
  note: string;
  status: number;
  password: string;
  owner_username?: string;
}) {
  const pool = getBillingPool();
  const owner = input.owner_username?.trim();
  const ip = input.ip !== undefined ? input.ip : undefined;
  if (owner) {
    const [res] = await pool.execute<ResultSetHeader>(
      ip !== undefined
        ? `UPDATE accounts SET full_name = :full_name, mac = :mac, ip = :ip, phone = :phone, note = :note, status = :status, password = :password, username = :username WHERE account = :account`
        : `UPDATE accounts SET full_name = :full_name, mac = :mac, phone = :phone, note = :note, status = :status, password = :password, username = :username WHERE account = :account`,
      {
        account: input.account,
        full_name: input.full_name,
        mac: input.mac,
        ...(ip !== undefined ? { ip } : {}),
        phone: input.phone,
        note: input.note,
        status: input.status,
        password: input.password,
        username: owner,
      },
    );
    return res.affectedRows === 1;
  }
  const [res] = await pool.execute<ResultSetHeader>(
    ip !== undefined
      ? `UPDATE accounts SET full_name = :full_name, mac = :mac, ip = :ip, phone = :phone, note = :note, status = :status, password = :password WHERE account = :account`
      : `UPDATE accounts SET full_name = :full_name, mac = :mac, phone = :phone, note = :note, status = :status, password = :password WHERE account = :account`,
    ip !== undefined ? { ...input, ip } : input,
  );
  return res.affectedRows === 1;
}

/**
 * Update billing `accounts` and mirror PHP `Users_model::update` + `change_status` into Stalker `users` / `events`.
 * If Stalker is not configured or the login row is missing, falls back to {@link updateAccountBasics} only.
 */
export async function updateAccountWithStalkerSync(input: {
  account: string;
  full_name: string;
  mac: string;
  ip?: string;
  phone: string;
  note: string;
  status: number;
  password: string;
  owner_username?: string;
  tariff_plan_id?: number;
  parent_password?: string;
}): Promise<boolean> {
  const stalker = getStalkerPool();
  const pool = getBillingPool();
  const macNorm = normalizeMacForStalker(input.mac);

  const [accRows] = await pool.execute<RowDataPacket[]>("SELECT expires FROM accounts WHERE account = :a LIMIT 1", {
    a: input.account,
  });
  if (!accRows.length) return false;
  const expired = isBillingAccountExpired(accRows[0].expires != null ? String(accRows[0].expires) : null);

  const billingPayload = (statusVal: number) => ({
    account: input.account,
    full_name: input.full_name,
    mac: macNorm,
    ...(input.ip !== undefined ? { ip: input.ip } : {}),
    phone: input.phone,
    note: input.note,
    status: statusVal,
    password: input.password,
    ...(input.owner_username?.trim() ? { owner_username: input.owner_username.trim() } : {}),
  });

  if (!stalker) {
    return updateAccountBasics(billingPayload(input.status));
  }

  const [su] = await stalker.execute<RowDataPacket[]>(
    "SELECT id, status, tariff_plan_id, parent_password FROM users WHERE login = :l LIMIT 1",
    { l: input.account },
  );
  if (!su.length) {
    return updateAccountBasics(billingPayload(input.status));
  }

  const uid = Number(su[0].id);
  const stalkerPrevStatus = Number(su[0].status ?? 0);
  const rowTariff = su[0].tariff_plan_id != null ? Number(su[0].tariff_plan_id) : 0;
  const rowParent =
    su[0].parent_password != null && String(su[0].parent_password) !== "" ? String(su[0].parent_password) : "9090";
  const tariffId =
    input.tariff_plan_id !== undefined && Number.isFinite(input.tariff_plan_id) && input.tariff_plan_id > 0
      ? Math.floor(input.tariff_plan_id)
      : rowTariff;
  const parentPin =
    input.parent_password !== undefined && String(input.parent_password).trim() !== ""
      ? String(input.parent_password).trim()
      : rowParent;

  const statusForRow = expired ? stalkerPrevStatus : input.status;
  const formStatus = input.status;

  try {
    if (!(expired && formStatus === ACCOUNT_STATUS_ON) && stalkerPrevStatus !== formStatus) {
      if (formStatus === ACCOUNT_STATUS_ON) {
        await stalkerCutOnOff(stalker, uid, "on");
      } else if (formStatus === ACCOUNT_STATUS_OFF) {
        await stalkerCutOnOff(stalker, uid, "off");
      }
    }

    const pwdHash = stalkerPasswordDigest(input.password, uid);
    await stalker.execute(
      `UPDATE users SET fname = :fn, mac = :mac, status = :st, phone = :phone, comment = :cm, tariff_plan_id = :tp, parent_password = :pp, password = :pw WHERE id = :id`,
      {
        fn: input.full_name || input.account,
        mac: macNorm,
        st: statusForRow,
        phone: input.phone,
        cm: input.note,
        tp: tariffId,
        pp: parentPin,
        pw: pwdHash,
        id: uid,
      },
    );
  } catch {
    return false;
  }

  return updateAccountBasics(billingPayload(statusForRow));
}

/**
 * PHP `manager/Users::activate` / `::block` and `reseller/Dealers_users::activate` / `::block` parity:
 * - deny status changes for expired accounts
 * - deny when target status is already set
 * - update billing + Stalker `cut_on` / `cut_off`
 */
export async function setManagerEndUserStatusLikePhp(input: {
  account: string;
  mode: "activate" | "block";
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const account = input.account.trim();
  if (!account) return { ok: false, code: "invalid" };
  const targetStatus = input.mode === "activate" ? ACCOUNT_STATUS_ON : ACCOUNT_STATUS_OFF;
  const pool = getBillingPool();

  const [accRows] = await pool.execute<RowDataPacket[]>(
    "SELECT status, expires FROM accounts WHERE account = :a LIMIT 1",
    { a: account },
  );
  if (!accRows.length) return { ok: false, code: "no_account" };

  const currentStatus = Number(accRows[0].status);
  const expires = accRows[0].expires != null ? String(accRows[0].expires) : null;
  if (isBillingAccountExpired(expires)) {
    return { ok: false, code: input.mode === "activate" ? "expired_activate" : "expired_change" };
  }
  if (currentStatus === targetStatus) {
    return { ok: false, code: targetStatus === ACCOUNT_STATUS_ON ? "already_active" : "already_blocked" };
  }

  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "no_stalker" };
  const [stRows] = await stalker.execute<RowDataPacket[]>(
    "SELECT id FROM users WHERE login = :l LIMIT 1",
    { l: account },
  );
  if (!stRows.length) return { ok: false, code: "no_stalker_user" };
  const uid = Number(stRows[0].id);
  if (!Number.isFinite(uid) || uid <= 0) return { ok: false, code: "no_stalker_user" };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("UPDATE accounts SET status = :s WHERE account = :a", {
      s: targetStatus,
      a: account,
    });
    await conn.commit();
  } catch {
    await conn.rollback();
    return { ok: false, code: "billing_db" };
  } finally {
    conn.release();
  }

  try {
    await stalkerCutOnOff(stalker, uid, input.mode === "activate" ? "on" : "off");
  } catch {
    return { ok: false, code: "stalker_db" };
  }
  return { ok: true };
}

/**
 * PHP `reseller/Dealers_users::delete` — only when billing `accounts.expires` is in the past; deletes Stalker `users` then `accounts`.
 */
export async function deleteExpiredEndUserAccount(
  accountLogin: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const pool = getBillingPool();
  const stalker = getStalkerPool();
  const acct = accountLogin.trim();
  if (!acct) return { ok: false, code: "invalid" };
  const [accRows] = await pool.execute<RowDataPacket[]>("SELECT expires FROM accounts WHERE account = :a LIMIT 1", {
    a: acct,
  });
  if (!accRows.length) return { ok: false, code: "no_account" };
  const exp = accRows[0].expires != null ? String(accRows[0].expires) : null;
  if (!isBillingAccountExpired(exp)) return { ok: false, code: "not_expired" };
  if (!stalker) return { ok: false, code: "no_stalker" };
  try {
    const [dr] = await stalker.execute<ResultSetHeader>("DELETE FROM users WHERE login = :l LIMIT 1", { l: acct });
    if (dr.affectedRows < 1) return { ok: false, code: "no_stalker_user" };
  } catch {
    return { ok: false, code: "stalker_db" };
  }
  try {
    const [br] = await pool.execute<ResultSetHeader>("DELETE FROM accounts WHERE account = :a LIMIT 1", { a: acct });
    if (br.affectedRows < 1) return { ok: false, code: "no_account_del" };
  } catch {
    return { ok: false, code: "billing_db" };
  }
  return { ok: true };
}

/**
 * PHP `admin/Users_model::delete` — delete Stalker `users` by `login`, then billing `accounts` (admin may delete active or expired; UI confirms when not expired).
 */
export async function deleteAdminEndUserAccount(
  accountLogin: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "no_stalker" };
  const pool = getBillingPool();
  const acct = accountLogin.trim();
  if (!acct) return { ok: false, code: "invalid" };
  const [accRows] = await pool.execute<RowDataPacket[]>("SELECT 1 FROM accounts WHERE account = :a LIMIT 1", { a: acct });
  if (!accRows.length) return { ok: false, code: "no_account" };
  try {
    const [dr] = await stalker.execute<ResultSetHeader>("DELETE FROM users WHERE login = :l LIMIT 1", { l: acct });
    if (dr.affectedRows < 1) return { ok: false, code: "no_stalker_user" };
  } catch {
    return { ok: false, code: "stalker_db" };
  }
  try {
    const [br] = await pool.execute<ResultSetHeader>("DELETE FROM accounts WHERE account = :a LIMIT 1", { a: acct });
    if (br.affectedRows < 1) return { ok: false, code: "no_account_del" };
  } catch {
    return { ok: false, code: "billing_db" };
  }
  return { ok: true };
}

export type RenewAccountResult =
  | { ok: true; mode: "months" | "trial" | "recover" }
  | {
      ok: false;
      code:
        | "invalid"
        | "no_account"
        | "no_stalker"
        | "no_stalker_user"
        | "no_summarize"
        | "insufficient_credits"
        | "insufficient_recoverable"
        | "recover_disabled"
        | "trial_used"
        | "trial_limit"
        | "auto_renew_failed"
        | "db";
      balance?: number;
      required?: number;
    };

async function getConfigInt(pool: ReturnType<typeof getBillingPool>, key: string, fallback: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT value FROM configs WHERE `key` = :k LIMIT 1", { k: key });
  const raw = rows[0]?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

async function isRecoverBonusCreditEnabled(pool: ReturnType<typeof getBillingPool>): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT value FROM configs WHERE `key` = 'is_recover_bonus_credit' LIMIT 1",
  );
  return Boolean(Number(rows[0]?.value ?? 0));
}

let summarizeBonusColumnKnown: boolean | null = null;

async function summarizeHasBonusRecoverableColumn(pool: ReturnType<typeof getBillingPool>): Promise<boolean> {
  if (summarizeBonusColumnKnown != null) return summarizeBonusColumnKnown;
  try {
    await pool.execute("SELECT max_bonus_recoverable FROM user_credit_summarize LIMIT 0");
    summarizeBonusColumnKnown = true;
  } catch {
    summarizeBonusColumnKnown = false;
  }
  return summarizeBonusColumnKnown;
}

async function inferBonusRecoverableFromTransactions(
  pool: ReturnType<typeof getBillingPool>,
  account: string,
): Promise<number> {
  try {
    const [debitRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(free_month), 0) AS bonus_added FROM transactions WHERE account = :a AND type IN ('DBIT', '${SUBSCRIBER_TX_DEBIT}')`,
      { a: account },
    );
    const [creditRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(free_month), 0) AS bonus_rev FROM transactions WHERE account = :a AND type IN ('CRDT', '${SUBSCRIBER_TX_CREDIT}') AND periods = 0`,
      { a: account },
    );
    const added = Math.max(0, Number(debitRows[0]?.bonus_added ?? 0));
    const rev = Math.max(0, Number(creditRows[0]?.bonus_rev ?? 0));
    return Math.max(0, added - rev);
  } catch {
    return 0;
  }
}

async function readSummarizeRowForRecover(
  pool: ReturnType<typeof getBillingPool>,
  account: string,
): Promise<{
  start_date: string | null;
  expiry_date: string | null;
  max_credit_recoverable: number;
  max_bonus_recoverable: number;
} | null> {
  const hasBonus = await summarizeHasBonusRecoverableColumn(pool);
  const bonusCol = hasBonus ? ", s.max_bonus_recoverable" : "";
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT s.start_date, s.expiry_date, s.max_credit_recoverable${bonusCol}
     FROM user_credit_summarize s WHERE s.account = :a LIMIT 1`,
    { a: account },
  );
  if (!rows.length) return null;
  const r = rows[0];
  let maxBonus = hasBonus ? Math.max(0, Number(r.max_bonus_recoverable ?? 0)) : 0;
  if (!hasBonus) {
    maxBonus = await inferBonusRecoverableFromTransactions(pool, account);
  }
  return {
    start_date: r.start_date != null ? String(r.start_date) : null,
    expiry_date: r.expiry_date != null ? String(r.expiry_date) : null,
    max_credit_recoverable: Math.max(0, Number(r.max_credit_recoverable ?? 0)),
    max_bonus_recoverable: maxBonus,
  };
}

function parseMysqlDateTimeLike(raw: string | null): Date | null {
  if (raw == null || raw === "") return null;
  const d = new Date(raw.replace(" ", "T"));
  return Number.isFinite(d.getTime()) ? d : null;
}

async function readLatestSubscriberCoverageStart(
  pool: ReturnType<typeof getBillingPool>,
  account: string,
): Promise<string | null> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT coverage_start FROM transactions WHERE account = :a AND type IN ('DBIT', '${SUBSCRIBER_TX_DEBIT}') ORDER BY \`timestamp\` DESC LIMIT 1`,
      { a: account },
    );
    const raw = rows[0]?.coverage_start;
    return raw != null && String(raw).trim() !== "" ? String(raw) : null;
  } catch {
    return null;
  }
}

/** Period anchor for recovery: latest renew coverage_start, else summarize start_date. */
async function resolveRecoverPeriodStart(
  pool: ReturnType<typeof getBillingPool>,
  account: string,
  summarizeStart: string | null,
): Promise<Date | null> {
  const fromSummarize = parseMysqlDateTimeLike(summarizeStart);
  const fromTx = parseMysqlDateTimeLike(await readLatestSubscriberCoverageStart(pool, account));
  if (fromTx && (!fromSummarize || fromTx.getTime() >= fromSummarize.getTime())) return fromTx;
  return fromSummarize;
}

/** Effective recoverable pools after time consumes paid months before bonus. */
export async function getSubscriberRecoverPools(account: string): Promise<{
  creditMonths: number;
  bonusMonths: number;
} | null> {
  const a = account.trim();
  if (!a) return null;
  const pool = getBillingPool();
  const row = await readSummarizeRowForRecover(pool, a);
  if (!row) return null;
  const now = new Date();
  const periodStart = await resolveRecoverPeriodStart(pool, a, row.start_date);
  return effectiveRecoverPools({
    creditMonthsNet: row.max_credit_recoverable,
    bonusMonthsGross: row.max_bonus_recoverable,
    startDate: periodStart,
    expiryDate:
      parseMysqlDateTimeLike(row.expiry_date) ??
      parseMysqlDateTimeLike(row.start_date),
    now,
  });
}

/** PHP `Creditsummarize_model::before_update` — month drift on `max_credit_recoverable`. */
export async function creditSummarizeBeforeUpdate(account: string): Promise<void> {
  const a = account.trim();
  if (!a) return;
  const pool = getBillingPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT start_date, expiry_date, max_credit_recoverable, updated_at FROM user_credit_summarize WHERE account = :ac LIMIT 1",
      { ac: a },
    );
    if (!rows.length) return;
    const r = rows[0];
    const now = new Date();
    const updatedRaw = r.updated_at;
    if (updatedRaw != null && String(updatedRaw) !== "") {
      const upd = new Date(String(updatedRaw).replace(" ", "T"));
      if (Number.isFinite(upd.getTime())) {
        if (
          upd.getFullYear() === now.getFullYear() &&
          upd.getMonth() === now.getMonth() &&
          upd.getDate() === now.getDate()
        ) {
          return;
        }
      }
    }

    let maxCredit = Math.max(0, Number(r.max_credit_recoverable ?? 0));
    const exp = r.expiry_date != null ? new Date(String(r.expiry_date).replace(" ", "T")) : new Date(0);
    const start = r.start_date != null ? new Date(String(r.start_date).replace(" ", "T")) : now;

    if (!Number.isFinite(exp.getTime()) || exp < now) {
      maxCredit = 0;
    } else {
      const invert = start.getTime() > now.getTime();
      const earlier = invert ? now : start;
      const later = invert ? start : now;
      let y = later.getFullYear() - earlier.getFullYear();
      let m = later.getMonth() - earlier.getMonth();
      if (m < 0) {
        y -= 1;
        m += 12;
      }
      const totalMonths = Math.max(0, y * 12 + m);
      maxCredit = Math.max(0, maxCredit - totalMonths);
    }

    await pool.execute(
      "UPDATE user_credit_summarize SET max_credit_recoverable = :mx, updated_at = NOW() WHERE account = :ac",
      { mx: maxCredit, ac: a },
    );
  } catch {
    // missing columns / legacy schema
  }
}

/** Billing `accounts.username` — staff login that owns the subscriber account. */
export async function getSubscriberAccountOwnerUsername(account: string): Promise<string | null> {
  const a = String(account ?? "").trim();
  if (!a) return null;
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT username FROM accounts WHERE account = :a LIMIT 1", { a });
  if (!rows.length || rows[0]?.username == null) return null;
  const u = String(rows[0].username).trim();
  return u || null;
}

export async function getAccountRenewRecoveryAvailability(account: string): Promise<{
  expiresAt: string | null;
  recoverPeriodStartAt: string | null;
  recoverableCredits: number | null;
  recoverableBonusMonths: number | null;
  debitUsername: string | null;
  debitCredits: number | null;
  autoRenewEnabled: boolean;
  autoRenewCyclesRemaining: number;
}> {
  const a = String(account ?? "").trim();
  if (!a) {
    return {
      expiresAt: null,
      recoverPeriodStartAt: null,
      recoverableCredits: null,
      recoverableBonusMonths: null,
      debitUsername: null,
      debitCredits: null,
      autoRenewEnabled: false,
      autoRenewCyclesRemaining: 0,
    };
  }
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    const [r] = await pool.execute<RowDataPacket[]>(
      `SELECT a.expires, a.username, a.mark, a.credit, s.max_credit_recoverable, s.start_date, s.expiry_date AS sum_expiry
       FROM accounts a
       LEFT JOIN user_credit_summarize s ON s.account = a.account
       WHERE a.account = :a
       LIMIT 1`,
      { a },
    );
    rows = r;
  } catch {
    const [r] = await pool.execute<RowDataPacket[]>(
      `SELECT a.expires, a.username, a.mark, s.max_credit_recoverable, s.start_date, s.expiry_date AS sum_expiry
       FROM accounts a
       LEFT JOIN user_credit_summarize s ON s.account = a.account
       WHERE a.account = :a
       LIMIT 1`,
      { a },
    );
    rows = r;
  }
  if (!rows.length) {
    return {
      expiresAt: null,
      recoverPeriodStartAt: null,
      recoverableCredits: null,
      recoverableBonusMonths: null,
      debitUsername: null,
      debitCredits: null,
      autoRenewEnabled: false,
      autoRenewCyclesRemaining: 0,
    };
  }
  const debitUsername = rows[0].username != null ? String(rows[0].username) : null;
  const debitCredits = debitUsername ? await getCreditBalance(debitUsername) : null;
  const recoverOn = await isRecoverBonusCreditEnabled(pool);
  const sumRow = await readSummarizeRowForRecover(pool, a);
  const periodStart =
    sumRow != null ? await resolveRecoverPeriodStart(pool, a, sumRow.start_date) : null;
  const expiryForPools =
    parseMysqlDateTimeLike(sumRow?.expiry_date ?? null) ??
    parseMysqlDateTimeLike(rows[0].expires != null ? String(rows[0].expires) : null);
  const pools =
    recoverOn && sumRow
      ? effectiveRecoverPools({
          creditMonthsNet: sumRow.max_credit_recoverable,
          bonusMonthsGross: sumRow.max_bonus_recoverable,
          startDate: periodStart,
          expiryDate: expiryForPools,
          now: new Date(),
        })
      : { creditMonths: 0, bonusMonths: 0 };
  return {
    expiresAt: rows[0].expires != null ? String(rows[0].expires) : null,
    recoverPeriodStartAt:
      periodStart != null ? formatMysqlDateTime(periodStart) : sumRow?.start_date ?? null,
    recoverableCredits: recoverOn ? pools.creditMonths : 0,
    recoverableBonusMonths: recoverOn ? pools.bonusMonths : 0,
    debitUsername,
    debitCredits,
    autoRenewEnabled: parseAccountAutoRenewMark(rows[0].mark),
    autoRenewCyclesRemaining: parseAccountAutoRenewCyclesRemaining(rows[0].credit) ?? 0,
  };
}

export type SubscriberAutoRenewSettings = {
  enabled: boolean;
  /** Total months of service including the month applied on this renew. */
  totalCycles: number;
};

/** Persist auto-renew flag (`accounts.mark`) + remaining cycles (`accounts.credit`). */
export async function applySubscriberAutoRenewSettings(
  account: string,
  settings: SubscriberAutoRenewSettings,
): Promise<{ ok: boolean }> {
  const a = account.trim();
  if (!a) return { ok: false };
  const pool = getBillingPool();
  const enabled = Boolean(settings.enabled);
  const total = clampAutoRenewTotalCycles(settings.totalCycles);
  const mark = enabled ? ACCOUNT_AUTO_RENEW_MARK_ON : ACCOUNT_AUTO_RENEW_MARK_OFF;
  const cyclesRemaining = enabled ? Math.max(0, total - 1) : 0;

  try {
    await pool.execute("UPDATE accounts SET mark = :mark, credit = :credit WHERE account = :a", {
      mark,
      credit: cyclesRemaining,
      a,
    });
    return { ok: true };
  } catch {
    // Column missing — run scripts/sql/accounts-auto-renew-credit.sql
  }

  try {
    await pool.execute("UPDATE accounts SET mark = :mark WHERE account = :a", { mark, a });
    return { ok: enabled ? false : true };
  } catch {
    return { ok: false };
  }
}

export async function disableSubscriberAutoRenew(account: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const a = account.trim();
  if (!a) return { ok: false, code: "no_account" };
  const r = await applySubscriberAutoRenewSettings(a, { enabled: false, totalCycles: 0 });
  return r.ok ? { ok: true } : { ok: false, code: "update_failed" };
}

export async function renewSubscriberAccountWithAutoRenew(input: {
  account: string;
  validity: string;
  debitUsername?: string;
  autoRenew?: SubscriberAutoRenewSettings | null;
}): Promise<RenewAccountResult> {
  const account = input.account.trim();
  const validityRaw = String(input.validity ?? "").trim();
  const validityUpper = validityRaw.toUpperCase();
  const auto = input.autoRenew;

  if (isCreateOnlyValidityValue(validityUpper)) {
    return { ok: false, code: "invalid" };
  }

  let validityForRenew = validityRaw;
  if (auto?.enabled) {
    validityForRenew = "1";
  }

  const r = await renewAccountByOperatorValidity({
    account,
    validity: validityForRenew,
    debitUsername: input.debitUsername,
  });
  if (!r.ok) return r;

  if (auto != null) {
    const ar = await applySubscriberAutoRenewSettings(account, {
      enabled: auto.enabled,
      totalCycles: auto.enabled ? auto.totalCycles : 0,
    });
    if (!ar.ok) return { ok: false, code: "auto_renew_failed" };
  }

  return r;
}

function bulkRenewFailureMessage(
  account: string,
  validityLabel: string,
  r: Extract<RenewAccountResult, { ok: false }>,
): string {
  switch (r.code) {
    case "no_account":
      return `Account ${account} cannot be processed because the user was not found.`;
    case "no_stalker":
    case "no_stalker_user":
      return `Account ${account}: Stalker user missing or Stalker not configured.`;
    case "no_summarize":
      return `Account ${account}: missing user_credit_summarize row.`;
    case "insufficient_credits":
      return `Account ${account} cannot add ${validityLabel} because the operator does not have enough credits (remaining: ${r.balance ?? 0}, required: ${r.required ?? "?"}).`;
    case "insufficient_recoverable":
      return `Account ${account}: insufficient recoverable credits (remaining: ${r.balance ?? 0}, required: ${r.required ?? "?"}).`;
    case "trial_used":
      return `Account ${account} cannot add ${validityLabel} because this MAC has already used a free trial.`;
    case "trial_limit":
      return `Account ${account} cannot add ${validityLabel} because this MAC has exceeded the free trial usage limit.`;
    case "invalid":
      return `Account ${account}: invalid renewal option.`;
    case "db":
    default:
      return `Account ${account}: renewal failed. Try again or contact support.`;
  }
}

export type BulkRenewAccountResult = { account: string; ok: boolean; message: string };

/**
 * Admin bulk renew (`Users::renew_one_month_bulk`): same pre-checks as PHP, then `renewAccountByOperatorValidity`.
 */
export async function bulkRenewAccountsByOperator(input: {
  accounts: string[];
  validity: string;
}): Promise<BulkRenewAccountResult[]> {
  const validityTrim = String(input.validity ?? "").trim();
  const validityUpper = validityTrim.toUpperCase();
  if (isCreateOnlyValidityValue(validityUpper)) {
    return [{ account: "—", ok: false, message: "Free trial and free month are not supported in bulk renew." }];
  }

  const validityInt = Number.parseInt(validityTrim, 10);
  const needsCreditCheck = Number.isFinite(validityInt) && validityInt > 0;

  const unique = [...new Set(input.accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  const out: BulkRenewAccountResult[] = [];
  const pool = getBillingPool();

  const [dedRows] = await pool.execute<RowDataPacket[]>(
    "SELECT month, month_deduction FROM credit_deductions ORDER BY month ASC",
  );
  const deductionMap = buildMonthDeductionChargedMap(
    dedRows.map((d) => ({ month: Number(d.month), month_deduction: Number(d.month_deduction) })),
  );
  const chargedForValidity = needsCreditCheck ? monthRenewChargedCredits(validityInt, deductionMap) : 0;

  type AdminBulkEntry = { account: string; debitUsername: string };
  const entries: AdminBulkEntry[] = [];

  for (const account of unique) {
    const [accRows] = await pool.execute<RowDataPacket[]>("SELECT username FROM accounts WHERE account = :a LIMIT 1", { a: account });
    if (!accRows.length) {
      out.push({
        account,
        ok: false,
        message: `Account ${account} cannot be processed because the user was not found.`,
      });
      continue;
    }
    entries.push({ account, debitUsername: String(accRows[0].username ?? "").trim() });
  }

  const byWallet = new Map<string, string[]>();
  for (const entry of entries) {
    const wallet = entry.debitUsername || "—";
    const group = byWallet.get(wallet) ?? [];
    group.push(entry.account);
    byWallet.set(wallet, group);
  }

  for (const [debitUsername, walletAccounts] of byWallet) {
    const walletCount = walletAccounts.length;
    const walletRequired = needsCreditCheck ? chargedForValidity * walletCount : 0;

    if (needsCreditCheck) {
      const balance = await getCreditBalance(debitUsername);
      if (balance < walletRequired) {
        const skipMessage = `Wallet ${debitUsername}: skipped ${walletCount} account${walletCount === 1 ? "" : "s"} — insufficient credits (balance: ${balance}, required: ${walletRequired} for ${validityTrim}).`;
        for (const account of walletAccounts) {
          out.push({ account, ok: false, message: skipMessage });
        }
        continue;
      }
    }

    for (const account of walletAccounts) {
      await creditSummarizeBeforeUpdate(account);

      const r = await renewAccountByOperatorValidity({ account, validity: validityTrim });
      if (!r.ok) {
        out.push({ account, ok: false, message: bulkRenewFailureMessage(account, validityTrim, r) });
        continue;
      }
      out.push({
        account,
        ok: true,
        message: `Success: ${validityTrim} applied to account ${account}.`,
      });
    }
  }

  return out;
}

/**
 * PHP `manager|reseller|dealer/Users::renew_one_month_bulk`: same per-account renew as single portal renew
 * (`debitUsername` = logged-in operator), with `canAccessAccountByRole` and PHP-style credit gate
 * (`remain_credits > intval(validity)` each iteration; free trial uses `intval` 0 so requires `> 0`).
 */
export async function bulkRenewPortalAccountsByOperator(input: {
  accounts: string[];
  validity: string;
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  ownerUsername: string;
}): Promise<BulkRenewAccountResult[]> {
  const validityTrim = String(input.validity ?? "").trim();
  const validityUpper = validityTrim.toUpperCase();
  if (!operatorRenewValidityFormatLikePhp(validityTrim)) {
    return [{ account: "—", ok: false, message: "Invalid validity for bulk renew." }];
  }
  if (isCreateOnlyValidityValue(validityUpper)) {
    return [{ account: "—", ok: false, message: "Free trial and free month are not supported in bulk renew." }];
  }

  const validityInt = Number.parseInt(validityTrim, 10);

  const unique = [...new Set(input.accounts.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(0, 250);
  const out: BulkRenewAccountResult[] = [];
  const portalDebitUser = input.ownerUsername.trim();
  if (input.ownerType === "RSLR" && !portalDebitUser) {
    return [{ account: "—", ok: false, message: "Missing operator username." }];
  }

  const pool = getBillingPool();
  const [dedRows] = await pool.execute<RowDataPacket[]>(
    "SELECT month, month_deduction FROM credit_deductions ORDER BY month ASC",
  );
  const deductionMap = buildMonthDeductionChargedMap(
    dedRows.map((d) => ({ month: Number(d.month), month_deduction: Number(d.month_deduction) })),
  );
  const chargedPerRenew = monthRenewChargedCredits(validityInt, deductionMap);

  type PortalBulkEntry = { account: string; debitUsername: string };
  const entries: PortalBulkEntry[] = [];

  for (const account of unique) {
    const inScope = await canAccessAccountByRole({
      ownerType: input.ownerType,
      ownerUsername: input.ownerUsername,
      account,
    });
    if (!inScope) {
      out.push({
        account,
        ok: false,
        message: `Account ${account} cannot be processed (outside your access scope).`,
      });
      continue;
    }

    const debitUsername =
      input.ownerType === "MNGR" || input.ownerType === "SRSLR"
        ? (await getSubscriberAccountOwnerUsername(account)) ?? ""
        : portalDebitUser;
    if (!debitUsername) {
      out.push({ account, ok: false, message: `Account ${account} cannot be processed (missing dealer owner).` });
      continue;
    }
    entries.push({ account, debitUsername });
  }

  const byWallet = new Map<string, string[]>();
  for (const entry of entries) {
    const group = byWallet.get(entry.debitUsername) ?? [];
    group.push(entry.account);
    byWallet.set(entry.debitUsername, group);
  }

  for (const [debitUsername, walletAccounts] of byWallet) {
    const walletCount = walletAccounts.length;
    const walletRequired = chargedPerRenew * walletCount;
    const balance = await getCreditBalance(debitUsername);

    if (balance < walletRequired) {
      const skipMessage = `Wallet ${debitUsername}: skipped ${walletCount} account${walletCount === 1 ? "" : "s"} — insufficient credits (balance: ${balance}, required: ${walletRequired} for ${validityTrim}).`;
      for (const account of walletAccounts) {
        out.push({ account, ok: false, message: skipMessage });
      }
      continue;
    }

    for (const account of walletAccounts) {
      await creditSummarizeBeforeUpdate(account);
      const r = await renewAccountByOperatorValidity({
        account,
        validity: validityTrim,
        debitUsername,
      });
      if (!r.ok) {
        out.push({ account, ok: false, message: bulkRenewFailureMessage(account, validityTrim, r) });
        continue;
      }
      out.push({
        account,
        ok: true,
        message: `Success: ${validityTrim} applied to account ${account}.`,
      });
    }
  }

  return out;
}

/**
 * Renew an existing subscriber by paid month count (`1..N` from credit deductions config).
 * Free trial and free month are create-only — rejected here.
 */
export async function renewAccountByOperatorValidity(input: {
  account: string;
  validity: string;
  /** When set, debits this user (PHP portal `renew(..., $this->userinfo['username'])`). Otherwise debits `accounts.username`. */
  debitUsername?: string;
}): Promise<RenewAccountResult> {
  const account = input.account.trim();
  const validity = String(input.validity ?? "").trim().toUpperCase();
  if (!account) return { ok: false, code: "no_account" };
  if (isCreateOnlyValidityValue(validity)) return { ok: false, code: "invalid" };

  const months = Number.parseInt(validity, 10);
  return renewAccountByOperatorMonths({ account, months, debitUsername: input.debitUsername });
}

function subtractMonthsPhp(datetimeLike: string, months: number): string {
  const dt = new Date(datetimeLike.replace(" ", "T"));
  if (!Number.isFinite(dt.getTime())) return formatMysqlDateTime(new Date());
  dt.setMonth(dt.getMonth() - months);
  return formatMysqlDateTime(dt);
}

/**
 * Calendar span in whole months matching PHP `($a->diff($b)->y * 12) + $a->diff($b)->m`
 * for `Users::check_renew_validity` (reseller RCDT), verified against PHP for sample dates.
 */
export function phpCalendarYearMonthsBetween(dateA: Date, dateB: Date): number {
  const t1 = dateA.getTime();
  const t2 = dateB.getTime();
  const dEarly = t1 <= t2 ? dateA : dateB;
  const dLate = t1 <= t2 ? dateB : dateA;
  let y = dLate.getFullYear() - dEarly.getFullYear();
  let m = dLate.getMonth() - dEarly.getMonth();
  const day = dLate.getDate() - dEarly.getDate();
  if (day < 0) m -= 1;
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return y * 12 + m;
}

/** PHP reseller/dealer `check_validity_format`: FREE_TRIAL, 1_MONTH_FREE, or months 1..60 (5 years). */
export function operatorRenewValidityFormatLikePhp(validity: string): boolean {
  const v = validity.trim().toUpperCase();
  if (v === "FREE_TRIAL" || v === "1_MONTH_FREE") return true;
  const n = Number.parseInt(validity.trim(), 10);
  return Number.isFinite(n) && n >= 1 && n <= CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS;
}

export type PortalOperatorRcdtPrecheckResult =
  | { ok: true }
  | { ok: false; code: "reseller_months"; maxMonths: number; required: number }
  | { ok: false; code: "insufficient_recoverable"; balance: number; required: number }
  | { ok: false; code: "recover_disabled" }
  | { ok: false; code: "no_summarize" }
  | { ok: false; code: "no_account" };

/**
 * PHP portal `check_renew_validity` for RCDT only (form branch):
 * - **Reseller**: months between `accounts.expires` and now, same y/m formula as PHP `DateTime::diff`.
 * - **Dealer / manager**: `users_model->get_balance(account)` i.e. `max_credit_recoverable` vs credits (dealer controller; manager has no RCDT route — same rule as dealer when RCDT is used).
 */
export async function portalOperatorRcdtPrecheckLikePhp(input: {
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  account: string;
  /** Paid credit months to recover (wallet refund). */
  creditMonths?: number;
  /** Bonus months to recover (expiry only). */
  bonusMonths?: number;
  /** @deprecated use creditMonths */
  credits?: number;
}): Promise<PortalOperatorRcdtPrecheckResult> {
  const account = input.account.trim();
  const creditMonths = Math.floor(Number(input.creditMonths ?? input.credits ?? 0));
  const bonusMonths = Math.floor(Number(input.bonusMonths ?? 0));
  if (!account) {
    return { ok: false, code: "no_account" };
  }
  if (
    (!Number.isFinite(creditMonths) || creditMonths < 0 || creditMonths > 2000) ||
    (!Number.isFinite(bonusMonths) || bonusMonths < 0 || bonusMonths > 2000) ||
    (creditMonths < 1 && bonusMonths < 1)
  ) {
    return { ok: false, code: "no_account" };
  }

  const pool = getBillingPool();

  if (!(await isRecoverBonusCreditEnabled(pool))) {
    return { ok: false, code: "recover_disabled" };
  }

  const totalMonths = creditMonths + bonusMonths;

  if (input.ownerType === "SRSLR") {
    const [accRows] = await pool.execute<RowDataPacket[]>("SELECT expires FROM accounts WHERE account = :a LIMIT 1", { a: account });
    if (!accRows.length) return { ok: false, code: "no_account" };
    const expStr = accRows[0].expires != null ? String(accRows[0].expires) : "";
    const exp = new Date(expStr.replace(" ", "T"));
    const now = new Date();
    if (!Number.isFinite(exp.getTime())) {
      return { ok: false, code: "reseller_months", maxMonths: 0, required: totalMonths };
    }
    const sumRow = await readSummarizeRowForRecover(pool, account);
    const periodStart =
      sumRow != null ? await resolveRecoverPeriodStart(pool, account, sumRow.start_date) : null;
    const monthSpan = maxTotalRecoverableMonthsOff(exp, periodStart, now);
    if (monthSpan < totalMonths) {
      return { ok: false, code: "reseller_months", maxMonths: monthSpan, required: totalMonths };
    }
    return { ok: true };
  }

  const pools = await getSubscriberRecoverPools(account);
  if (!pools) return { ok: false, code: "no_summarize" };
  if (creditMonths > pools.creditMonths) {
    return {
      ok: false,
      code: "insufficient_recoverable",
      balance: pools.creditMonths,
      required: creditMonths,
    };
  }
  if (bonusMonths > pools.bonusMonths) {
    return {
      ok: false,
      code: "insufficient_recoverable",
      balance: pools.bonusMonths,
      required: bonusMonths,
    };
  }
  return { ok: true };
}

async function calculateRecoverDateLikePhp(
  conn: PoolConnection,
  account: string,
  creditsBase: number,
  userExpired: string,
): Promise<{ expiry_date: string; freeMonth: number; walletChargedRefund: number }> {
  let freeMonth = 0;
  let credits = creditsBase;
  let walletChargedRefund = 0;
  let walletNeed = creditsBase;

  const [recoverRows] = await conn.execute<RowDataPacket[]>(
    `SELECT COALESCE(SUM(periods), 0) AS credit_recover FROM transactions WHERE account = :a AND type IN ('CRDT', '${SUBSCRIBER_TX_CREDIT}')`,
    { a: account },
  );
  credits += Number(recoverRows[0]?.credit_recover ?? 0);

  let txRows: RowDataPacket[] = [];
  let hasSubtractFlag = true;
  try {
    [txRows] = await conn.execute<RowDataPacket[]>(
      `SELECT \`transaction\`, periods, free_month, is_subtract_free_month FROM transactions WHERE account = :a AND type IN ('DBIT', '${SUBSCRIBER_TX_DEBIT}') ORDER BY \`timestamp\` DESC`,
      { a: account },
    );
  } catch {
    hasSubtractFlag = false;
    [txRows] = await conn.execute<RowDataPacket[]>(
      `SELECT \`transaction\`, periods, free_month FROM transactions WHERE account = :a AND type IN ('DBIT', '${SUBSCRIBER_TX_DEBIT}') ORDER BY \`timestamp\` DESC`,
      { a: account },
    );
  }

  for (const tx of txRows) {
    const wasSubtracted = Number(tx.is_subtract_free_month ?? 0) === 1;
    if (!wasSubtracted) {
      freeMonth += Number(tx.free_month ?? 0);
      if (hasSubtractFlag) {
        await conn.execute(
          "UPDATE transactions SET is_subtract_free_month = 1 WHERE account = :a AND `transaction` = :t",
          { a: account, t: Number(tx.transaction ?? 0) },
        );
      }
    }
    const txPeriods = Math.max(0, Number(tx.periods ?? 0));
    if (walletNeed > 0) {
      if (walletNeed <= txPeriods) {
        walletChargedRefund += walletNeed;
        walletNeed = 0;
      } else {
        walletChargedRefund += txPeriods;
        walletNeed -= txPeriods;
      }
    }
    if (credits <= txPeriods) break;
    credits -= txPeriods;
  }

  const expiry_date = subtractMonthsPhp(userExpired, freeMonth + creditsBase);
  return { expiry_date, freeMonth, walletChargedRefund: Math.max(0, walletChargedRefund) };
}

async function insertRecoverCreditLikePhp(
  conn: PoolConnection,
  input: {
    ownerUsername: string;
    account: string;
    credits: number;
    expiry_date: string;
    coverageStart: string;
    freeMonth: number;
    /** Calendar months pulled from subscription (may exceed wallet `credits` when bonus months are stripped). */
    monthsReversed?: number;
  },
) {
  const [[row]] = await conn.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(`transaction`), 0) + 1 AS n FROM transactions WHERE username = :u",
    { u: input.ownerUsername },
  );
  const tx = Number(row?.n ?? 1);
  const monthsRev = Math.max(0, Math.floor(input.monthsReversed ?? input.credits));
  const walletCredits = Math.max(0, Math.floor(input.credits));
  const bonusStripped = Math.max(0, monthsRev - walletCredits);
  const remarks =
    bonusStripped > 0
      ? `${input.ownerUsername} reversed ${walletCredits} credits to ${input.account} (${monthsRev} mo service, ${bonusStripped} bonus stripped)`
      : `${input.ownerUsername} reversed ${walletCredits} credits to ${input.account}`;
  const base = {
    username: input.ownerUsername,
    transaction: tx,
    periods: walletCredits,
    timestamp: formatMysqlDateTime(new Date()),
    coverage_start: input.coverageStart,
    coverage_end: input.expiry_date,
    remarks,
    free_month: input.freeMonth + monthsRev,
    account: input.account,
  };
  const sqlUserTx = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, account)
     VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, 1, :account)`;
  const sqlLegacy = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, account)
     VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, :account)`;
  const sqlAmount = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, amount, account)
     VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, 1, :amount, :account)`;
  try {
    await conn.execute(sqlUserTx, base);
  } catch (e) {
    if (isMysqlUnknownColumn(e, "user_transaction") || isMysqlUnknownColumn(e, "'user_transaction'")) {
      await conn.execute(sqlLegacy, base);
    } else if (isMysqlNoDefaultForField(e, "amount") || isMysqlNoDefaultForField(e, "'amount'")) {
      try {
        await conn.execute(sqlAmount, { ...base, amount: input.credits });
      } catch (e2) {
        if (isMysqlUnknownColumn(e2, "user_transaction") || isMysqlUnknownColumn(e2, "'user_transaction'")) {
          await conn.execute(
            `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, amount, account)
             VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, :amount, :account)`,
            { ...base, amount: input.credits },
          );
        } else {
          throw e2;
        }
      }
    } else {
      throw e;
    }
  }
}

async function insertRecoverBonusOnlyLikePhp(
  conn: PoolConnection,
  input: {
    ownerUsername: string;
    account: string;
    bonusMonths: number;
    expiry_date: string;
    coverageStart: string;
  },
) {
  const [[row]] = await conn.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(`transaction`), 0) + 1 AS n FROM transactions WHERE username = :u",
    { u: input.ownerUsername },
  );
  const tx = Number(row?.n ?? 1);
  const bonus = Math.max(0, Math.floor(input.bonusMonths));
  const remarks = `${input.ownerUsername} reversed ${bonus} bonus month${bonus === 1 ? "" : "s"} on ${input.account} (no credits refunded)`;
  const base = {
    username: input.ownerUsername,
    transaction: tx,
    periods: 0,
    timestamp: formatMysqlDateTime(new Date()),
    coverage_start: input.coverageStart,
    coverage_end: input.expiry_date,
    remarks,
    free_month: bonus,
    account: input.account,
  };
  const sqlUserTx = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, account)
     VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, 1, :account)`;
  const sqlLegacy = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, account)
     VALUES (:username, '${SUBSCRIBER_TX_CREDIT}', :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, :account)`;
  try {
    await conn.execute(sqlUserTx, base);
  } catch (e) {
    if (isMysqlUnknownColumn(e, "user_transaction") || isMysqlUnknownColumn(e, "'user_transaction'")) {
      await conn.execute(sqlLegacy, base);
    } else {
      throw e;
    }
  }
}

/** Recover paid credit months (wallet refund) and/or bonus months (expiry only) from a subscriber. */
export async function recoverAccountCreditsByOperator(input: {
  account: string;
  creditMonths?: number;
  bonusMonths?: number;
  /** @deprecated use creditMonths */
  credits?: number;
}): Promise<RenewAccountResult> {
  const creditMonths = Math.floor(Number(input.creditMonths ?? input.credits ?? 0));
  const bonusMonths = Math.floor(Number(input.bonusMonths ?? 0));
  if (
    (!Number.isFinite(creditMonths) || creditMonths < 0 || creditMonths > 2000) ||
    (!Number.isFinite(bonusMonths) || bonusMonths < 0 || bonusMonths > 2000) ||
    (creditMonths < 1 && bonusMonths < 1)
  ) {
    return { ok: false, code: "invalid" };
  }
  const account = input.account.trim();
  if (!account) return { ok: false, code: "no_account" };

  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "no_stalker" };
  const pool = getBillingPool();

  if (!(await isRecoverBonusCreditEnabled(pool))) {
    return { ok: false, code: "recover_disabled" };
  }

  const pools = await getSubscriberRecoverPools(account);
  if (!pools) return { ok: false, code: "no_summarize" };
  if (creditMonths > pools.creditMonths) {
    return {
      ok: false,
      code: "insufficient_recoverable",
      balance: pools.creditMonths,
      required: creditMonths,
    };
  }
  if (bonusMonths > pools.bonusMonths) {
    return {
      ok: false,
      code: "insufficient_recoverable",
      balance: pools.bonusMonths,
      required: bonusMonths,
    };
  }

  const [stUsers] = await stalker.execute<RowDataPacket[]>("SELECT id FROM users WHERE login = :l LIMIT 1", { l: account });
  if (!stUsers.length) return { ok: false, code: "no_stalker_user" };

  const [accRows] = await pool.execute<RowDataPacket[]>("SELECT username, expires FROM accounts WHERE account = :a LIMIT 1", { a: account });
  if (!accRows.length) return { ok: false, code: "no_account" };
  const ownerUsername = String(accRows[0].username ?? "");
  const userExpired = accRows[0].expires != null ? String(accRows[0].expires) : formatMysqlDateTime(new Date());

  const sumRow = await readSummarizeRowForRecover(pool, account);
  if (!sumRow) return { ok: false, code: "no_summarize" };
  const periodStart = await resolveRecoverPeriodStart(pool, account, sumRow.start_date);
  const coverageStart =
    periodStart != null ? formatMysqlDateTime(periodStart) : sumRow.start_date ?? formatMysqlDateTime(new Date());
  const userExpiredDt = new Date(userExpired.replace(" ", "T"));
  const requestedMonthsOff = creditMonths + bonusMonths;
  const now = new Date();
  const { expiry: expiryAfterRecover, monthsRemoved } = applyRecoverToExpiry(
    userExpiredDt,
    requestedMonthsOff,
    periodStart,
    now,
  );
  const expiry_date = formatMysqlDateTime(expiryAfterRecover);
  if (
    monthsRemoved < requestedMonthsOff ||
    !isRecoverAllowedForMonths(userExpiredDt, requestedMonthsOff, periodStart, now) ||
    !isSubscriptionExpiryActive(expiryAfterRecover, now)
  ) {
    return {
      ok: false,
      code: "insufficient_recoverable",
      balance: monthsRemoved,
      required: requestedMonthsOff,
    };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (creditMonths > 0) {
      await insertRecoverCreditLikePhp(conn, {
        ownerUsername,
        account,
        credits: creditMonths,
        expiry_date,
        coverageStart,
        freeMonth: bonusMonths,
        monthsReversed: monthsRemoved,
      });
    } else {
      await insertRecoverBonusOnlyLikePhp(conn, {
        ownerUsername,
        account,
        bonusMonths,
        expiry_date,
        coverageStart,
      });
    }

    await conn.execute("UPDATE accounts SET expires = :e WHERE account = :a", { e: expiry_date, a: account });

    const hasBonusCol = await summarizeHasBonusRecoverableColumn(pool);
    if (creditMonths > 0 && bonusMonths > 0) {
      if (hasBonusCol) {
        await conn.execute(
          `UPDATE user_credit_summarize SET expiry_date = :e, max_credit_recoverable = max_credit_recoverable - :c, max_bonus_recoverable = GREATEST(0, max_bonus_recoverable - :b) WHERE account = :a`,
          { e: expiry_date, c: creditMonths, b: bonusMonths, a: account },
        );
      } else {
        await conn.execute(
          "UPDATE user_credit_summarize SET expiry_date = :e, max_credit_recoverable = max_credit_recoverable - :c WHERE account = :a",
          { e: expiry_date, c: creditMonths, a: account },
        );
      }
    } else if (creditMonths > 0) {
      await conn.execute(
        "UPDATE user_credit_summarize SET expiry_date = :e, max_credit_recoverable = max_credit_recoverable - :c WHERE account = :a",
        { e: expiry_date, c: creditMonths, a: account },
      );
    } else if (hasBonusCol) {
      await conn.execute(
        "UPDATE user_credit_summarize SET expiry_date = :e, max_bonus_recoverable = GREATEST(0, max_bonus_recoverable - :b) WHERE account = :a",
        { e: expiry_date, b: bonusMonths, a: account },
      );
    } else {
      await conn.execute("UPDATE user_credit_summarize SET expiry_date = :e WHERE account = :a", {
        e: expiry_date,
        a: account,
      });
    }

    await conn.commit();
    bustWalletDashboardCacheAfterCreditMutation();
  } catch {
    await conn.rollback();
    return { ok: false, code: "db" };
  } finally {
    conn.release();
  }

  try {
    await stalker.execute("UPDATE users SET expire_billing_date = :e WHERE login = :l", { e: expiry_date, l: account });
  } catch {
    return { ok: false, code: "db" };
  }

  return { ok: true, mode: "recover" };
}

/**
 * Add paid months to an account (PHP `Users_model::renew` non–free-trial path): debit operator,
 * extend `accounts.expires`, update `user_credit_summarize`, Stalker `expire_billing_date`, activate + `cut_on`.
 */
export async function renewAccountByOperatorMonths(input: {
  account: string;
  months: number;
  debitUsername?: string;
}): Promise<RenewAccountResult> {
  const months = Math.floor(Number(input.months));
  if (!Number.isFinite(months) || months < 1 || months > CREDIT_DEDUCTION_MAX_VALIDITY_MONTHS) {
    return { ok: false, code: "invalid" };
  }

  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "no_stalker" };

  const pool = getBillingPool();
  const account = input.account.trim();

  const [stUsers] = await stalker.execute<RowDataPacket[]>("SELECT id, status FROM users WHERE login = :l LIMIT 1", { l: account });
  if (!stUsers.length) return { ok: false, code: "no_stalker_user" };
  const stalkerUid = Number(stUsers[0].id);

  const [accRows] = await pool.execute<RowDataPacket[]>(
    "SELECT username, expires FROM accounts WHERE account = :a LIMIT 1",
    { a: account },
  );
  if (!accRows.length) return { ok: false, code: "no_account" };
  const accountOwnerUsername = String(accRows[0].username ?? "");
  const debitUsername = String(input.debitUsername ?? "").trim() || accountOwnerUsername;
  const expiresStr = accRows[0].expires != null ? String(accRows[0].expires) : "";
  const expired = isBillingAccountExpired(expiresStr);

  const [dedRows] = await pool.execute<RowDataPacket[]>(
    "SELECT month, month_deduction FROM credit_deductions ORDER BY month ASC",
  );
  const deductionMap = buildMonthDeductionChargedMap(
    dedRows.map((d) => ({ month: Number(d.month), month_deduction: Number(d.month_deduction) })),
  );
  const chargedCredits = monthRenewChargedCredits(months, deductionMap);

  const balance = await getCreditBalance(debitUsername);
  if (balance < chargedCredits) {
    return { ok: false, code: "insufficient_credits", balance, required: chargedCredits };
  }

  const recoverBonusEnabled = await isRecoverBonusCreditEnabled(pool);

  const [sumRows] = await pool.execute<RowDataPacket[]>(
    "SELECT start_date, max_credit_recoverable FROM user_credit_summarize WHERE account = :a LIMIT 1",
    { a: account },
  );
  if (!sumRows.length) return { ok: false, code: "no_summarize" };

  const nowStr = formatMysqlDateTime(new Date());
  const coverageStart = expired ? nowStr : expiresStr;
  const expiry_date = expired
    ? computeExpiryDatePhp(String(months))
    : computeExpiryDatePhp(String(months), new Date(expiresStr.replace(" ", "T")));

  const creditsSummarizeBase = chargedCredits;

  const startDateStr = sumRows[0].start_date != null ? String(sumRows[0].start_date) : nowStr;
  let maxRec = Number(sumRows[0].max_credit_recoverable ?? 0);
  let cAdj = creditsSummarizeBase;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await insertDebitLikePhp(conn, {
      username: debitUsername,
      account,
      expires: expiry_date,
      coverageStart,
      credits: months,
      numberFree: 0,
      deductionMap,
    });

    await conn.execute(
      `UPDATE accounts SET expires = :e, status = :st WHERE account = :a`,
      { e: expiry_date, st: ACCOUNT_STATUS_ON, a: account },
    );

    const addBonus = recoverBonusEnabled ? Math.max(0, months - chargedCredits) : 0;
    const hasBonusCol = await summarizeHasBonusRecoverableColumn(pool);

    if (startDateStr > nowStr) {
      if (hasBonusCol) {
        await conn.execute(
          `UPDATE user_credit_summarize SET start_date = :sd, max_credit_recoverable = 0, max_bonus_recoverable = 0, updated_at = :u WHERE account = :a`,
          { sd: nowStr, u: nowStr, a: account },
        );
      } else {
        await conn.execute(
          `UPDATE user_credit_summarize SET start_date = :sd, max_credit_recoverable = 0, updated_at = :u WHERE account = :a`,
          { sd: nowStr, u: nowStr, a: account },
        );
      }
      maxRec = 0;
    }

    const addRecoverable = recoverBonusEnabled ? Math.floor(cAdj) : 0;

    const periodStartForSummarize = expired ? nowStr : coverageStart;
    if (hasBonusCol) {
      await conn.execute(
        `UPDATE user_credit_summarize SET start_date = :sd, expiry_date = :ed, max_credit_recoverable = max_credit_recoverable + :add, max_bonus_recoverable = max_bonus_recoverable + :bonus, updated_at = :u WHERE account = :a`,
        { sd: periodStartForSummarize, ed: expiry_date, add: addRecoverable, bonus: addBonus, u: nowStr, a: account },
      );
    } else {
      await conn.execute(
        `UPDATE user_credit_summarize SET start_date = :sd, expiry_date = :ed, max_credit_recoverable = max_credit_recoverable + :add, updated_at = :u WHERE account = :a`,
        { sd: periodStartForSummarize, ed: expiry_date, add: addRecoverable, u: nowStr, a: account },
      );
    }

    await conn.commit();
    bustWalletDashboardCacheAfterCreditMutation();
  } catch {
    await conn.rollback();
    conn.release();
    return { ok: false, code: "db" };
  }
  conn.release();

  try {
    await stalker.execute("UPDATE users SET expire_billing_date = :e WHERE login = :l", { e: expiry_date, l: account });

    const [stAfter] = await stalker.execute<RowDataPacket[]>("SELECT status FROM users WHERE login = :l LIMIT 1", { l: account });
    const stNow = Number(stAfter[0]?.status ?? 0);

    const [accFresh] = await pool.execute<RowDataPacket[]>("SELECT expires FROM accounts WHERE account = :a LIMIT 1", { a: account });
    const freshExp = accFresh[0]?.expires != null ? String(accFresh[0].expires) : "";
    const stillExpiredForChangeStatus = isBillingAccountExpired(freshExp);

    // PHP `change_status(ACCOUNT_STATUS_ON, …)` when not (billing expired && requesting ON).
    if (!stillExpiredForChangeStatus && stNow !== ACCOUNT_STATUS_ON) {
      await stalkerCutOnOff(stalker, stalkerUid, "on");
    }
    await stalkerCutOnOff(stalker, stalkerUid, "on");
  } catch {
    return { ok: false, code: "db" };
  }

  return { ok: true, mode: "months" };
}

/** Signed-in billing user profile (self-service account modal). */
export type SessionUserProfile = {
  username: string;
  name: string;
  type: string;
  status: string;
  comments: string;
  usernameOwner: string | null;
  lastLoginTime: string;
  currentLoginTime: string;
  /** Wallet balance for operators; null for ROOT admin. */
  credits: number | null;
  ticketsEnabled: boolean | null;
};

export async function getSessionUserProfile(username: string): Promise<SessionUserProfile | null> {
  const u = username.trim();
  if (!u) return null;
  const pool = getBillingPool();
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, type, status, comments, username_owner, last_login_time, current_login_time, tickets_enable
       FROM users WHERE username = :u LIMIT 1`,
      { u },
    );
  } catch (err) {
    if (!isMysqlUnknownColumn(err, "tickets_enable")) throw err;
    [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT username, name, type, status, comments, username_owner, last_login_time, current_login_time
       FROM users WHERE username = :u LIMIT 1`,
      { u },
    );
  }
  const r = row(rows);
  if (!r) return null;
  const type = String(r.type ?? "");
  const un = String(r.username);
  let credits: number | null = null;
  if (type !== "ROOT") {
    const [balRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ${TX_WALLET_BALANCE_SUM_SQL} AS balance
       FROM transactions WHERE username = :u`,
      { u: un },
    );
    credits = Number(balRows[0]?.balance ?? 0);
  }
  const te = r.tickets_enable != null ? Number(r.tickets_enable) : null;
  return {
    username: un,
    name: r.name != null ? String(r.name) : "",
    type,
    status: String(r.status ?? "A"),
    comments: r.comments != null ? String(r.comments) : "",
    usernameOwner: r.username_owner != null ? String(r.username_owner) : null,
    lastLoginTime: r.last_login_time != null ? String(r.last_login_time) : "",
    currentLoginTime: r.current_login_time != null ? String(r.current_login_time) : "",
    credits,
    ticketsEnabled: te != null ? te > 0 : null,
  };
}

export async function updateSessionUserProfile(input: {
  username: string;
  name: string;
  comments: string;
}): Promise<boolean> {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET name = :name, comments = :comments WHERE username = :username`,
    { name: input.name, comments: input.comments, username: input.username },
  );
  return res.affectedRows === 1;
}

export async function verifyUserPassword(username: string, oldPassword: string): Promise<boolean> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT password FROM users WHERE username = :u LIMIT 1`,
    { u: username },
  );
  const p = rows[0]?.password;
  return verifyPassword(oldPassword, p != null ? String(p) : "");
}

export async function setUserPassword(username: string, newPassword: string) {
  const pool = getBillingPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET password = :p WHERE username = :u`,
    { p: newPassword, u: username },
  );
  return res.affectedRows === 1;
}

async function insertStalkerEventMessage(
  stalker: ReturnType<typeof getStalkerPool>,
  uid: number,
  message: string,
  priority = 2,
  title = "",
): Promise<boolean> {
  if (!stalker || !Number.isFinite(uid) || uid <= 0) return false;
  const pri = Math.min(3, Math.max(1, Math.floor(priority)));
  const date = new Date();
  const addtime = formatMysqlDateTime(date);
  const future = new Date(date.getTime() + 60 * 24 * 1000);
  const eventtime = formatMysqlDateTime(future);
  const msgTitle = String(title ?? "").trim().slice(0, 200);
  const attempts = [
    {
      sql: `INSERT INTO events (uid, event, title, msg, priority, addtime, need_confirm, eventtime) VALUES (:uid, 'send_msg', :title, :msg, :pri, :addtime, 1, :eventtime)`,
      params: { uid, title: msgTitle, msg: message, pri, addtime, eventtime },
    },
    {
      sql: `INSERT INTO events (uid, event, msg, priority, addtime, need_confirm, eventtime) VALUES (:uid, 'send_msg', :msg, :pri, :addtime, 1, :eventtime)`,
      params: { uid, msg: message, pri, addtime, eventtime },
    },
  ] as const;

  for (const attempt of attempts) {
    try {
      await stalker.execute(attempt.sql, attempt.params);
      return true;
    } catch {
      /* try next schema variant */
    }
  }

  return false;
}

/** PHP `Message::index` branch when `type != 'All'`: one `send_msg` row per posted Stalker `users` id. */
export async function sendStalkerMessageToUserIds(
  uids: number[],
  message: string,
  priority?: number,
  title = "",
): Promise<number> {
  const msg = message.trim();
  if (!msg) return 0;
  const stalker = getStalkerPool();
  if (!stalker) return 0;
  if (!(await stalkerHasEventsTable(stalker))) return 0;
  const pri = priority === undefined ? 2 : Math.min(3, Math.max(1, Math.floor(priority)));
  const unique = [...new Set(uids.map((u) => Math.floor(Number(u))).filter((u) => Number.isFinite(u) && u > 0))];
  let n = 0;
  for (const uid of unique) {
    if (await insertStalkerEventMessage(stalker, uid, msg, pri, title)) n++;
  }
  return n;
}

export type SendUserMessageResult =
  | { ok: true }
  | { ok: false; code: "stalker" | "no_user" | "no_events" | "db" };

/** PHP `Users::message` parity for one user (stalker event insert by login). */
export async function sendStalkerMessageToAccount(
  account: string,
  message: string,
  title = "",
): Promise<SendUserMessageResult> {
  const a = account.trim();
  const msg = message.trim();
  if (!a || !msg) return { ok: false, code: "no_user" };
  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "stalker" };
  if (!(await stalkerHasEventsTable(stalker))) return { ok: false, code: "no_events" };
  const [rows] = await stalker.execute<RowDataPacket[]>("SELECT id FROM users WHERE login = :l LIMIT 1", { l: a });
  if (!rows.length) return { ok: false, code: "no_user" };
  const uid = Number(rows[0]?.id ?? 0);
  const ok = await insertStalkerEventMessage(stalker, uid, msg, 2, title);
  return ok ? { ok: true } : { ok: false, code: "db" };
}

export async function broadcastStalkerMessage(message: string, priority?: number, title = ""): Promise<number> {
  const msg = message.trim();
  if (!msg) return 0;
  const stalker = getStalkerPool();
  if (!stalker) return 0;
  if (!(await stalkerHasEventsTable(stalker))) return 0;
  const pri = priority === undefined ? 2 : Math.min(3, Math.max(1, Math.floor(priority)));
  const [users] = await stalker.execute<RowDataPacket[]>("SELECT id FROM users ORDER BY id ASC");
  let n = 0;
  for (const u of users) {
    if (await insertStalkerEventMessage(stalker, Number(u.id), msg, pri, title)) n++;
  }
  return n;
}

/** Admin message “All users”: send to Stalker users mapped from billing subscriber accounts. */
export async function broadcastStalkerMessageAdminSubscribers(
  message: string,
  priority?: number,
  title = "",
): Promise<number> {
  const msg = message.trim();
  if (!msg) return 0;
  const stalker = getStalkerPool();
  if (!stalker) return 0;
  if (!(await stalkerHasEventsTable(stalker))) return 0;
  const pri = priority === undefined ? 2 : Math.min(3, Math.max(1, Math.floor(priority)));
  const logins = await listAdminAccountLogins(25000);
  if (!logins.length) return 0;
  const uids = await resolveAdminAccountLoginsToStalkerUids(logins);
  if (!uids.length) return 0;
  let n = 0;
  for (const uid of uids) {
    if (await insertStalkerEventMessage(stalker, uid, msg, pri, title)) n++;
  }
  return n;
}
