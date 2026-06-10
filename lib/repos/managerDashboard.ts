/**
 * Manager-scoped dashboard queries (MNGR subtree: resellers, dealers, subscribers).
 * Mirrors admin dashboard data shapes; never includes global/system-wide totals.
 */
import type { RowDataPacket } from "mysql2";

import { TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL } from "@/lib/billing/transactionWalletSql";
import type { AdminReportPackageRow } from "@/lib/repos/packageDistribution";
import {
  type AdminAccountLifecycleRow,
  type AdminDayActivityAccountRow,
  type AdminDayActivityCounts,
  type AdminExpiringSubscriptionsBuckets,
  type AdminMessageTrafficDayStack,
  type AdminRecentStalkerSendMessageRow,
  type AdminTopOperatorsLeaderboards,
  type AdminTransactionRow,
  type DashboardDayCreditPoint,
  adminLocalYmd,
  getAdminTopOperatorsLeaderboards,
  getCreditFlowByDayForUsername,
  getOperatorDashboardStats,
  getOperatorSubscriberTrendSeries,
  getScopedExpiringSoonCount,
  getUsersSummaryScoped,
  listOperatorRecentStalkerSendMessages,
  listOperatorRecentSubscribers,
} from "@/lib/repos/billing";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";
import {
  PROMO_BONUS_REMARKS_SUM_EXPR,
  PROMO_GRANT_ISSUER_WHERE,
  PROMO_GRANT_RECIPIENT_WHERE,
} from "@/lib/promoGrantLedger";
import {
  listManagerSubtreeOperatorUsernames,
  listResellerSubtreeOperatorUsernames,
} from "@/lib/staffBranchPeers.server";

function escapeMySqlIdent(name: string): string {
  return "`" + String(name).replace(/`/g, "``") + "`";
}

const STALKER_KEEP_ALIVE_ONLINE_SEC = 240;

const ACCOUNT_STATUS_ON = 0;

const ACCOUNTS_SCOPED_FROM = `FROM accounts a
  LEFT JOIN users ud ON ud.username = a.username AND ud.type = 'RSLR'
  LEFT JOIN users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
  LEFT JOIN users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
  LEFT JOIN users um ON um.username = a.username AND um.type = 'MNGR'`;

function managerScopeWhere(managerUsername: string): { sql: string; params: string[] } {
  const owner = managerUsername.trim();
  if (!owner) return { sql: "1=0", params: [] };
  return {
    sql: "(a.username = ? OR ur1.username_owner = ? OR ur2.username_owner = ?)",
    params: [owner, owner, owner],
  };
}

function resellerScopeWhere(resellerUsername: string): { sql: string; params: string[] } {
  const owner = resellerUsername.trim();
  if (!owner) return { sql: "1=0", params: [] };
  return {
    sql: "(a.username = ? OR ur1.username = ? OR ur2.username = ?)",
    params: [owner, owner, owner],
  };
}

function rowDateToYmd(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return adminLocalYmd(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
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

/** Operator logins in manager subtree (manager + resellers + dealers). */
/** Stalker receivers online among billing accounts in the manager's hierarchy. */
export async function getManagerDevicesOnlineCount(managerUsername: string): Promise<number | null> {
  const stalkerDb = process.env.STALKER_DATABASE_NAME?.trim();
  if (!stalkerDb) return null;
  const billingDb = (process.env.DATABASE_NAME ?? "stalker_billing").trim();
  const pool = getBillingPool();
  const u = managerUsername.trim();
  if (!u) return null;
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(u);
  const s = escapeMySqlIdent(stalkerDb);
  const b = escapeMySqlIdent(billingDb);
  const sec = STALKER_KEEP_ALIVE_ONLINE_SEC;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM ${s}.users su
       INNER JOIN ${b}.accounts a ON a.account = su.login
       LEFT JOIN ${b}.users ud ON ud.username = a.username AND ud.type = 'RSLR'
       LEFT JOIN ${b}.users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
       LEFT JOIN ${b}.users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
       WHERE (${scopeSql})
         AND su.keep_alive IS NOT NULL
         AND TRIM(COALESCE(su.keep_alive, '')) <> ''
         AND su.keep_alive > '1970-01-01 00:00:00'
         AND su.keep_alive > DATE_SUB(NOW(), INTERVAL ${sec} SECOND)`,
      scopeParams,
    );
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

export async function getManagerSubscriberActivityByDayRange(
  managerUsername: string,
  from: Date,
  to: Date,
): Promise<Record<string, AdminDayActivityCounts>> {
  const pool = getBillingPool();
  const fromStr = adminLocalYmd(from);
  const toStr = adminLocalYmd(to);
  if (fromStr > toStr) return {};

  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const out: Record<string, AdminDayActivityCounts> = {};
  const todayStr = adminLocalYmd(new Date());

  const [createdRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.created) AS d, COUNT(*) AS c
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.created IS NOT NULL
       AND DATE(a.created) BETWEEN ? AND ?
       AND DATE(a.created) <= ?
     GROUP BY DATE(a.created)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of createdRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].newCount = Math.floor(Number(r.c ?? 0));
  }

  const [expRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.expires) AS d, COUNT(*) AS c
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) BETWEEN ? AND ?
       AND DATE(a.expires) <= ?
     GROUP BY DATE(a.expires)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of expRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].expiredCount = Math.floor(Number(r.c ?? 0));
  }

  return out;
}

export async function getManagerCreditFlowByDay(
  managerUsername: string,
  dayCount?: number,
): Promise<DashboardDayCreditPoint[]> {
  const pool = getBillingPool();
  const n = Math.min(366, Math.max(7, Math.floor(dayCount ?? 14)));
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) {
    return buildLastNDayKeys(n).map(({ key, label }) => ({ key, label, creditIn: 0, creditOut: 0 }));
  }
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(t.\`timestamp\`) AS d,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'CRDT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_in,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'DBIT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_out
     FROM transactions t
     WHERE t.username IN (${ph})
       AND t.\`timestamp\` IS NOT NULL
       AND t.\`timestamp\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(t.\`timestamp\`)
     ORDER BY d ASC`,
    [...operators, n - 1],
  );
  const map = new Map(
    rows.map((r) => {
      const key = rowDateToYmd(r.d) ?? "";
      return [key, { in: Number(r.credit_in ?? 0), out: Number(r.credit_out ?? 0) }];
    }),
  );
  return buildLastNDayKeys(n).map(({ key, label }) => {
    const v = map.get(key);
    return { key, label, creditIn: v?.in ?? 0, creditOut: v?.out ?? 0 };
  });
}

export async function getManagerRevenueThisMonth(managerUsername: string): Promise<number> {
  const pool = getBillingPool();
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) return 0;
  const ph = operators.map(() => "?").join(",");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username IN (${ph})
         AND \`timestamp\` >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''`,
      operators,
    );
    return Math.round(Number(rows[0]?.r ?? 0) * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getManagerPeakMonthlyRevenueLastNMonths(
  managerUsername: string,
  monthCount?: number,
): Promise<number> {
  const pool = getBillingPool();
  const mc = Math.min(24, Math.max(3, Math.floor(monthCount ?? 12)));
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) return 0;
  const ph = operators.map(() => "?").join(",");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(\`timestamp\`, '%Y-%m') AS ym,
              COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username IN (${ph})
         AND \`timestamp\` >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
       GROUP BY ym`,
      [...operators, mc - 1],
    );
    let peak = 0;
    for (const r of rows) {
      peak = Math.max(peak, Number(r.r ?? 0));
    }
    return Math.round(peak * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getManagerWalletCreditsTotal(managerUsername: string): Promise<number> {
  const pool = getBillingPool();
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) return 0;
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(bal), 0) AS t FROM (
       SELECT SUM(CASE WHEN UPPER(type) = 'CRDT' THEN periods ELSE -periods END) AS bal
       FROM transactions
       WHERE username IN (${ph})
       GROUP BY username
     ) s
     WHERE bal > 0`,
    operators,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

export async function getManagerPromoBonusCreditsTotal(managerUsername: string): Promise<number> {
  const pool = getBillingPool();
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) return 0;
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PROMO_BONUS_REMARKS_SUM_EXPR} AS t
     FROM transactions
     WHERE username IN (${ph})
       AND ${PROMO_GRANT_ISSUER_WHERE}`,
    operators,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

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

export async function listManagerRecentAccountsWithHierarchy(
  managerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username,
            u.type AS owner_type,
            u.username_owner AS owner_parent_username
       ${ACCOUNTS_SCOPED_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql})
      ORDER BY (a.created IS NULL) ASC, a.created DESC, (a.expires IS NULL) ASC, a.expires DESC, a.account DESC
      LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function listManagerRecentlyExpiredAccountsWithHierarchy(
  managerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username,
            u.type AS owner_type,
            u.username_owner AS owner_parent_username
       ${ACCOUNTS_SCOPED_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql})
        AND a.expires IS NOT NULL
        AND a.expires < NOW()
      ORDER BY a.expires DESC
      LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function getManagerExpiringSubscriptionBuckets(
  managerUsername: string,
): Promise<AdminExpiringSubscriptionsBuckets> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.expires
       ${ACCOUNTS_SCOPED_FROM}
      WHERE (${scopeSql})
        AND a.status = ?
        AND a.expires IS NOT NULL
        AND a.expires > NOW()
        AND a.expires <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY a.expires ASC
      LIMIT 1500`,
    [...scopeParams, ACCOUNT_STATUS_ON],
  );

  const now = Date.now();
  const day = 86_400_000;
  const buckets: Array<{ key: "24h" | "3d" | "7d" | "15d" | "30d"; label: string; withinDays: number; accounts: string[] }> = [
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
    const [revRows] = await pool.query<RowDataPacket[]>(
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

  const resultRows = buckets.map((b) => {
    const atRiskUsd = b.accounts.reduce((s, a) => s + (revByAccount.get(a) ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      withinDays: b.withinDays,
      count: b.accounts.length,
      atRiskUsd: Math.round(atRiskUsd * 100) / 100,
    };
  });

  return {
    totalWithin30Days: resultRows.reduce((s, r) => s + r.count, 0),
    totalAtRiskUsd: Math.round(resultRows.reduce((s, r) => s + r.atRiskUsd, 0) * 100) / 100,
    rows: resultRows,
  };
}

export async function listManagerRecentTransactions(
  managerUsername: string,
  limit: number,
): Promise<AdminTransactionRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const operators = await listManagerSubtreeOperatorUsernames(managerUsername);
  if (operators.length === 0) return [];
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`transaction\`, username, type,
            ${TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL} AS periods,
            amount, account, coverage_start, coverage_end, remarks, free_month,
            \`timestamp\`, created_by
       FROM transactions
      WHERE username IN (${ph})
      ORDER BY \`timestamp\` DESC
      LIMIT ${lim}`,
    operators,
  );
  return rows.map((r) => ({
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
  }));
}

export async function getManagerTopOperatorsLeaderboards(
  managerUsername: string,
  limit?: number,
): Promise<AdminTopOperatorsLeaderboards> {
  const pool = getBillingPool();
  const u = managerUsername.trim();
  const lim = Math.max(1, Math.min(20, Math.floor(limit ?? 5)));
  const [resellerRows] = await pool.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?`,
    [u],
  );
  const resellerSet = new Set(resellerRows.map((r) => String(r.username ?? "").trim()).filter(Boolean));
  const [dealerRows] = await pool.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'RSLR' AND username_owner IN (
       SELECT username FROM users WHERE type = 'SRSLR' AND username_owner = ?
     )`,
    [u],
  );
  const dealerSet = new Set(dealerRows.map((r) => String(r.username ?? "").trim()).filter(Boolean));

  const all = await getAdminTopOperatorsLeaderboards({ limit: lim * 3 });
  return {
    managers: [],
    resellers: all.resellers.filter((r) => resellerSet.has(r.username)).slice(0, lim),
    dealers: all.dealers.filter((r) => dealerSet.has(r.username)).slice(0, lim),
  };
}

export async function getManagerPackageDistribution(managerUsername: string): Promise<AdminReportPackageRow[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct
       ${ACCOUNTS_SCOPED_FROM}
      WHERE (${scopeSql})
      LIMIT 12000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return [];
  const slice = logins.slice(0, 2000);
  const ph = slice.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT x.nm AS plan_name, COUNT(*) AS c
       FROM (
         SELECT COALESCE(NULLIF(TRIM(tp.name), ''), CONCAT('Plan #', u.tariff_plan_id)) AS nm
         FROM users u
         LEFT JOIN tariff_plan tp ON tp.id = u.tariff_plan_id
         WHERE u.login IN (${ph})
       ) x
       GROUP BY x.nm
       ORDER BY c DESC
       LIMIT 10`,
      slice,
    );
    return rows.map((r) => ({
      name: String(r.plan_name ?? "Unknown"),
      count: Math.floor(Number(r.c ?? 0)),
    }));
  } catch {
    return [];
  }
}

/** Message traffic for manager subtree (Stalker send_msg events for scoped STB logins). */
export async function getManagerMessageTrafficDayStacks(
  managerUsername: string,
  lastDays = 8,
): Promise<AdminMessageTrafficDayStack[]> {
  const empty = (): AdminMessageTrafficDayStack[] => {
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

  const stalker = getStalkerPool();
  if (!stalker) return empty();

  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct ${ACCOUNTS_SCOPED_FROM} WHERE (${scopeSql}) LIMIT 8000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return empty();

  const slice = logins.slice(0, 1500);
  const ph = slice.map(() => "?").join(",");
  try {
    const [uidRows] = await stalker.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE login IN (${ph})`,
      slice,
    );
    const uids = uidRows.map((r) => Number(r.id)).filter((id) => id > 0);
    if (uids.length === 0) return empty();
    const uidPh = uids.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT DATE(e.addtime) AS d,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 1 THEN 1 ELSE 0 END) AS high_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 2 THEN 1 ELSE 0 END) AS norm_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 3 THEN 1 ELSE 0 END) AS low_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS oth_p
         FROM events e
        WHERE e.event = 'send_msg' AND e.uid IN (${uidPh})
          AND e.addtime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(e.addtime)`,
      [...uids, lastDays],
    );
    const byDay = new Map<string, Omit<AdminMessageTrafficDayStack, "dayKey" | "dayLabel">>();
    for (const r of rows) {
      const key = rowDateToYmd(r.d);
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
    return empty();
  }
}

export async function listManagerAccountsCreatedOnDay(
  managerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.created IS NOT NULL AND DATE(a.created) = ?
     ORDER BY a.created DESC, a.account ASC
     LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

export async function listManagerAccountsExpiredOnDay(
  managerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = managerScopeWhere(managerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) = ?
     ORDER BY a.expires DESC, a.account ASC
     LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

/** Reseller-scoped dashboard (SRSLR subtree: own login + dealers + their subscribers). */
export async function getResellerDevicesOnlineCount(resellerUsername: string): Promise<number | null> {
  const stalkerDb = process.env.STALKER_DATABASE_NAME?.trim();
  if (!stalkerDb) return null;
  const billingDb = (process.env.DATABASE_NAME ?? "stalker_billing").trim();
  const pool = getBillingPool();
  const u = resellerUsername.trim();
  if (!u) return null;
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(u);
  const s = escapeMySqlIdent(stalkerDb);
  const b = escapeMySqlIdent(billingDb);
  const sec = STALKER_KEEP_ALIVE_ONLINE_SEC;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM ${s}.users su
       INNER JOIN ${b}.accounts a ON a.account = su.login
       LEFT JOIN ${b}.users ud ON ud.username = a.username AND ud.type = 'RSLR'
       LEFT JOIN ${b}.users ur1 ON ur1.username = ud.username_owner AND ur1.type = 'SRSLR'
       LEFT JOIN ${b}.users ur2 ON ur2.username = a.username AND ur2.type = 'SRSLR' AND ud.username IS NULL
       WHERE (${scopeSql})
         AND su.keep_alive IS NOT NULL
         AND TRIM(COALESCE(su.keep_alive, '')) <> ''
         AND su.keep_alive > '1970-01-01 00:00:00'
         AND su.keep_alive > DATE_SUB(NOW(), INTERVAL ${sec} SECOND)`,
      scopeParams,
    );
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

export async function getResellerSubscriberActivityByDayRange(
  resellerUsername: string,
  from: Date,
  to: Date,
): Promise<Record<string, AdminDayActivityCounts>> {
  const pool = getBillingPool();
  const fromStr = adminLocalYmd(from);
  const toStr = adminLocalYmd(to);
  if (fromStr > toStr) return {};
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const out: Record<string, AdminDayActivityCounts> = {};
  const todayStr = adminLocalYmd(new Date());
  const [createdRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.created) AS d, COUNT(*) AS c
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.created IS NOT NULL
       AND DATE(a.created) BETWEEN ? AND ?
       AND DATE(a.created) <= ?
     GROUP BY DATE(a.created)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of createdRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].newCount = Math.floor(Number(r.c ?? 0));
  }
  const [expRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.expires) AS d, COUNT(*) AS c
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) BETWEEN ? AND ?
       AND DATE(a.expires) <= ?
     GROUP BY DATE(a.expires)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of expRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].expiredCount = Math.floor(Number(r.c ?? 0));
  }
  return out;
}

async function resellerCreditSubtree(resellerUsername: string) {
  return listResellerSubtreeOperatorUsernames(resellerUsername);
}

export async function getResellerCreditFlowByDay(
  resellerUsername: string,
  dayCount?: number,
): Promise<DashboardDayCreditPoint[]> {
  const n = Math.min(366, Math.max(7, Math.floor(dayCount ?? 14)));
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) {
    return buildLastNDayKeys(n).map(({ key, label }) => ({ key, label, creditIn: 0, creditOut: 0 }));
  }
  const pool = getBillingPool();
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(t.\`timestamp\`) AS d,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'CRDT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_in,
        COALESCE(SUM(CASE WHEN UPPER(t.type) = 'DBIT' THEN ABS(t.periods) ELSE 0 END), 0) AS credit_out
     FROM transactions t
     WHERE t.username IN (${ph})
       AND t.\`timestamp\` IS NOT NULL
       AND t.\`timestamp\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(t.\`timestamp\`)
     ORDER BY d ASC`,
    [...operators, n - 1],
  );
  const map = new Map(
    rows.map((r) => {
      const key = rowDateToYmd(r.d) ?? "";
      return [key, { in: Number(r.credit_in ?? 0), out: Number(r.credit_out ?? 0) }];
    }),
  );
  return buildLastNDayKeys(n).map(({ key, label }) => {
    const v = map.get(key);
    return { key, label, creditIn: v?.in ?? 0, creditOut: v?.out ?? 0 };
  });
}

export async function getResellerRevenueThisMonth(resellerUsername: string): Promise<number> {
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) return 0;
  const pool = getBillingPool();
  const ph = operators.map(() => "?").join(",");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username IN (${ph})
         AND \`timestamp\` >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''`,
      operators,
    );
    return Math.round(Number(rows[0]?.r ?? 0) * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getResellerPeakMonthlyRevenueLastNMonths(
  resellerUsername: string,
  monthCount?: number,
): Promise<number> {
  const mc = Math.min(24, Math.max(3, Math.floor(monthCount ?? 12)));
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) return 0;
  const pool = getBillingPool();
  const ph = operators.map(() => "?").join(",");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(\`timestamp\`, '%Y-%m') AS ym,
              COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username IN (${ph})
         AND \`timestamp\` >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
       GROUP BY ym`,
      [...operators, mc - 1],
    );
    let peak = 0;
    for (const r of rows) peak = Math.max(peak, Number(r.r ?? 0));
    return Math.round(peak * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getResellerWalletCreditsTotal(resellerUsername: string): Promise<number> {
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) return 0;
  const pool = getBillingPool();
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(bal), 0) AS t FROM (
       SELECT SUM(CASE WHEN UPPER(type) = 'CRDT' THEN periods ELSE -periods END) AS bal
       FROM transactions WHERE username IN (${ph}) GROUP BY username
     ) s WHERE bal > 0`,
    operators,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

export async function getResellerPromoBonusCreditsTotal(resellerUsername: string): Promise<number> {
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) return 0;
  const pool = getBillingPool();
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PROMO_BONUS_REMARKS_SUM_EXPR} AS t
     FROM transactions
     WHERE username IN (${ph}) AND ${PROMO_GRANT_ISSUER_WHERE}`,
    operators,
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

export async function listResellerRecentAccountsWithHierarchy(
  resellerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username, u.type AS owner_type, u.username_owner AS owner_parent_username
       ${ACCOUNTS_SCOPED_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql})
      ORDER BY (a.created IS NULL) ASC, a.created DESC, (a.expires IS NULL) ASC, a.expires DESC, a.account DESC
      LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function listResellerRecentlyExpiredAccountsWithHierarchy(
  resellerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username, u.type AS owner_type, u.username_owner AS owner_parent_username
       ${ACCOUNTS_SCOPED_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql}) AND a.expires IS NOT NULL AND a.expires < NOW()
      ORDER BY a.expires DESC LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function getResellerExpiringSubscriptionBuckets(
  resellerUsername: string,
): Promise<AdminExpiringSubscriptionsBuckets> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.expires
       ${ACCOUNTS_SCOPED_FROM}
      WHERE (${scopeSql})
        AND a.status = ?
        AND a.expires IS NOT NULL
        AND a.expires > NOW()
        AND a.expires <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY a.expires ASC
      LIMIT 1500`,
    [...scopeParams, ACCOUNT_STATUS_ON],
  );
  const now = Date.now();
  const day = 86_400_000;
  const buckets: Array<{ key: "24h" | "3d" | "7d" | "15d" | "30d"; label: string; withinDays: number; accounts: string[] }> = [
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
    const [revRows] = await pool.query<RowDataPacket[]>(
      `SELECT account AS acct, COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS rev
         FROM transactions
        WHERE account IN (${ph})
          AND \`timestamp\` >= DATE_SUB(NOW(), INTERVAL 180 DAY)
          AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
        GROUP BY account`,
      uniq,
    );
    for (const r of revRows) {
      const a = String(r.acct ?? "");
      if (a) revByAccount.set(a, Math.round(Number(r.rev ?? 0) * 100) / 100);
    }
  }
  const resultRows = buckets.map((b) => {
    const atRiskUsd = b.accounts.reduce((s, a) => s + (revByAccount.get(a) ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      withinDays: b.withinDays,
      count: b.accounts.length,
      atRiskUsd: Math.round(atRiskUsd * 100) / 100,
    };
  });
  return {
    totalWithin30Days: resultRows.reduce((s, r) => s + r.count, 0),
    totalAtRiskUsd: Math.round(resultRows.reduce((s, r) => s + r.atRiskUsd, 0) * 100) / 100,
    rows: resultRows,
  };
}

export async function listResellerRecentTransactions(
  resellerUsername: string,
  limit: number,
): Promise<AdminTransactionRow[]> {
  const operators = await resellerCreditSubtree(resellerUsername);
  if (operators.length === 0) return [];
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const ph = operators.map(() => "?").join(",");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`transaction\`, username, type,
            ${TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL} AS periods,
            amount, account, coverage_start, coverage_end, remarks, free_month,
            \`timestamp\`, created_by
       FROM transactions WHERE username IN (${ph})
      ORDER BY \`timestamp\` DESC LIMIT ${lim}`,
    operators,
  );
  return rows.map((r) => ({
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
  }));
}

export async function getResellerTopOperatorsLeaderboards(
  resellerUsername: string,
  limit?: number,
): Promise<AdminTopOperatorsLeaderboards> {
  const pool = getBillingPool();
  const u = resellerUsername.trim();
  const lim = Math.max(1, Math.min(20, Math.floor(limit ?? 5)));
  const [dealerRows] = await pool.query<RowDataPacket[]>(
    `SELECT username FROM users WHERE type = 'RSLR' AND username_owner = ?`,
    [u],
  );
  const dealerSet = new Set(dealerRows.map((r) => String(r.username ?? "").trim()).filter(Boolean));
  const all = await getAdminTopOperatorsLeaderboards({ limit: lim * 3 });
  return {
    managers: [],
    resellers: [],
    dealers: all.dealers.filter((r) => dealerSet.has(r.username)).slice(0, lim),
  };
}

export async function getResellerPackageDistribution(resellerUsername: string): Promise<AdminReportPackageRow[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct ${ACCOUNTS_SCOPED_FROM} WHERE (${scopeSql}) LIMIT 12000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return [];
  const slice = logins.slice(0, 2000);
  const ph = slice.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT x.nm AS plan_name, COUNT(*) AS c FROM (
         SELECT COALESCE(NULLIF(TRIM(tp.name), ''), CONCAT('Plan #', u.tariff_plan_id)) AS nm
         FROM users u LEFT JOIN tariff_plan tp ON tp.id = u.tariff_plan_id
         WHERE u.login IN (${ph})
       ) x GROUP BY x.nm ORDER BY c DESC LIMIT 10`,
      slice,
    );
    return rows.map((r) => ({ name: String(r.plan_name ?? "Unknown"), count: Math.floor(Number(r.c ?? 0)) }));
  } catch {
    return [];
  }
}

export async function getResellerMessageTrafficDayStacks(
  resellerUsername: string,
  lastDays = 8,
): Promise<AdminMessageTrafficDayStack[]> {
  const empty = (): AdminMessageTrafficDayStack[] => {
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
  const stalker = getStalkerPool();
  if (!stalker) return empty();
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct ${ACCOUNTS_SCOPED_FROM} WHERE (${scopeSql}) LIMIT 8000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return empty();
  const slice = logins.slice(0, 1500);
  const ph = slice.map(() => "?").join(",");
  try {
    const [uidRows] = await stalker.query<RowDataPacket[]>(`SELECT id FROM users WHERE login IN (${ph})`, slice);
    const uids = uidRows.map((r) => Number(r.id)).filter((id) => id > 0);
    if (uids.length === 0) return empty();
    const uidPh = uids.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT DATE(e.addtime) AS d,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 1 THEN 1 ELSE 0 END) AS high_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 2 THEN 1 ELSE 0 END) AS norm_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 3 THEN 1 ELSE 0 END) AS low_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS oth_p
         FROM events e
        WHERE e.event = 'send_msg' AND e.uid IN (${uidPh})
          AND e.addtime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(e.addtime)`,
      [...uids, lastDays],
    );
    const byDay = new Map<string, Omit<AdminMessageTrafficDayStack, "dayKey" | "dayLabel">>();
    for (const r of rows) {
      const key = rowDateToYmd(r.d);
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
    return empty();
  }
}

export async function listResellerAccountsCreatedOnDay(
  resellerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql}) AND a.created IS NOT NULL AND DATE(a.created) = ?
     ORDER BY a.created DESC, a.account ASC LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

export async function listResellerAccountsExpiredOnDay(
  resellerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = resellerScopeWhere(resellerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_SCOPED_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL AND a.expires > '1970-01-01' AND DATE(a.expires) = ?
     ORDER BY a.expires DESC, a.account ASC LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

/** Dealer-scoped dashboard (RSLR: subscribers where accounts.username = dealer login). */
function dealerScopeWhere(dealerUsername: string): { sql: string; params: string[] } {
  const owner = dealerUsername.trim();
  if (!owner) return { sql: "1=0", params: [] };
  return { sql: "a.username = ?", params: [owner] };
}

const ACCOUNTS_DEALER_FROM = `FROM accounts a`;

export async function getDealerDevicesOnlineCount(dealerUsername: string): Promise<number | null> {
  const stalkerDb = process.env.STALKER_DATABASE_NAME?.trim();
  if (!stalkerDb) return null;
  const billingDb = (process.env.DATABASE_NAME ?? "stalker_billing").trim();
  const pool = getBillingPool();
  const u = dealerUsername.trim();
  if (!u) return null;
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(u);
  const s = escapeMySqlIdent(stalkerDb);
  const b = escapeMySqlIdent(billingDb);
  const sec = STALKER_KEEP_ALIVE_ONLINE_SEC;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c
       FROM ${s}.users su
       INNER JOIN ${b}.accounts a ON a.account = su.login
       WHERE (${scopeSql})
         AND su.keep_alive IS NOT NULL
         AND TRIM(COALESCE(su.keep_alive, '')) <> ''
         AND su.keep_alive > '1970-01-01 00:00:00'
         AND su.keep_alive > DATE_SUB(NOW(), INTERVAL ${sec} SECOND)`,
      scopeParams,
    );
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

export async function getDealerSubscriberActivityByDayRange(
  dealerUsername: string,
  from: Date,
  to: Date,
): Promise<Record<string, AdminDayActivityCounts>> {
  const pool = getBillingPool();
  const fromStr = adminLocalYmd(from);
  const toStr = adminLocalYmd(to);
  if (fromStr > toStr) return {};
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const out: Record<string, AdminDayActivityCounts> = {};
  const todayStr = adminLocalYmd(new Date());
  const [createdRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.created) AS d, COUNT(*) AS c
     ${ACCOUNTS_DEALER_FROM}
     WHERE (${scopeSql})
       AND a.created IS NOT NULL
       AND DATE(a.created) BETWEEN ? AND ?
       AND DATE(a.created) <= ?
     GROUP BY DATE(a.created)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of createdRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].newCount = Math.floor(Number(r.c ?? 0));
  }
  const [expRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(a.expires) AS d, COUNT(*) AS c
     ${ACCOUNTS_DEALER_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL
       AND a.expires > '1970-01-01'
       AND DATE(a.expires) BETWEEN ? AND ?
       AND DATE(a.expires) <= ?
     GROUP BY DATE(a.expires)`,
    [...scopeParams, fromStr, toStr, todayStr],
  );
  for (const r of expRows) {
    const k = rowDateToYmd(r.d);
    if (!k) continue;
    if (!out[k]) out[k] = { newCount: 0, expiredCount: 0 };
    out[k].expiredCount = Math.floor(Number(r.c ?? 0));
  }
  return out;
}

export async function getDealerCreditFlowByDay(
  dealerUsername: string,
  dayCount?: number,
): Promise<DashboardDayCreditPoint[]> {
  return getCreditFlowByDayForUsername(dealerUsername.trim(), dayCount);
}

export async function getDealerRevenueThisMonth(dealerUsername: string): Promise<number> {
  const u = dealerUsername.trim();
  if (!u) return 0;
  const pool = getBillingPool();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username = ?
         AND \`timestamp\` >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''`,
      [u],
    );
    return Math.round(Number(rows[0]?.r ?? 0) * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getDealerPeakMonthlyRevenueLastNMonths(
  dealerUsername: string,
  monthCount?: number,
): Promise<number> {
  const mc = Math.min(24, Math.max(3, Math.floor(monthCount ?? 12)));
  const u = dealerUsername.trim();
  if (!u) return 0;
  const pool = getBillingPool();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(\`timestamp\`, '%Y-%m') AS ym,
              COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS r
       FROM transactions
       WHERE username = ?
         AND \`timestamp\` >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m-01')
         AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
       GROUP BY ym`,
      [u, mc - 1],
    );
    let peak = 0;
    for (const r of rows) peak = Math.max(peak, Number(r.r ?? 0));
    return Math.round(peak * 100) / 100;
  } catch {
    return 0;
  }
}

export async function getDealerWalletCreditsTotal(dealerUsername: string): Promise<number> {
  const u = dealerUsername.trim();
  if (!u) return 0;
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(bal), 0) AS t FROM (
       SELECT SUM(CASE WHEN UPPER(type) = 'CRDT' THEN periods ELSE -periods END) AS bal
       FROM transactions WHERE username = ? GROUP BY username
     ) s WHERE bal > 0`,
    [u],
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

export async function getDealerPromoBonusCreditsTotal(dealerUsername: string): Promise<number> {
  const u = dealerUsername.trim();
  if (!u) return 0;
  const pool = getBillingPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${PROMO_BONUS_REMARKS_SUM_EXPR} AS t
     FROM transactions
     WHERE username = ? AND ${PROMO_GRANT_RECIPIENT_WHERE}`,
    [u],
  );
  return Math.floor(Number(rows[0]?.t ?? 0));
}

export async function listDealerRecentAccountsWithHierarchy(
  dealerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username, u.type AS owner_type, u.username_owner AS owner_parent_username
       ${ACCOUNTS_DEALER_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql})
      ORDER BY (a.created IS NULL) ASC, a.created DESC, (a.expires IS NULL) ASC, a.expires DESC, a.account DESC
      LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function listDealerRecentlyExpiredAccountsWithHierarchy(
  dealerUsername: string,
  limit: number,
): Promise<AdminAccountLifecycleRow[]> {
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.status, a.expires, a.created,
            a.username AS owner_username, u.type AS owner_type, u.username_owner AS owner_parent_username
       ${ACCOUNTS_DEALER_FROM}
       LEFT JOIN users u ON u.username = a.username
      WHERE (${scopeSql}) AND a.expires IS NOT NULL AND a.expires < NOW()
      ORDER BY a.expires DESC LIMIT ${lim}`,
    scopeParams,
  );
  return rows.map(mapLifecycleRow);
}

export async function getDealerExpiringSubscriptionBuckets(
  dealerUsername: string,
): Promise<AdminExpiringSubscriptionsBuckets> {
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.expires
       ${ACCOUNTS_DEALER_FROM}
      WHERE (${scopeSql})
        AND a.status = ?
        AND a.expires IS NOT NULL
        AND a.expires > NOW()
        AND a.expires <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY a.expires ASC
      LIMIT 1500`,
    [...scopeParams, ACCOUNT_STATUS_ON],
  );
  const now = Date.now();
  const day = 86_400_000;
  const buckets: Array<{ key: "24h" | "3d" | "7d" | "15d" | "30d"; label: string; withinDays: number; accounts: string[] }> = [
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
    const [revRows] = await pool.query<RowDataPacket[]>(
      `SELECT account AS acct, COALESCE(SUM(ABS(CAST(amount AS DECIMAL(14,2)))), 0) AS rev
         FROM transactions
        WHERE account IN (${ph})
          AND \`timestamp\` >= DATE_SUB(NOW(), INTERVAL 180 DAY)
          AND amount IS NOT NULL AND TRIM(COALESCE(amount, '')) <> ''
        GROUP BY account`,
      uniq,
    );
    for (const r of revRows) {
      const a = String(r.acct ?? "");
      if (a) revByAccount.set(a, Math.round(Number(r.rev ?? 0) * 100) / 100);
    }
  }
  const resultRows = buckets.map((b) => {
    const atRiskUsd = b.accounts.reduce((s, a) => s + (revByAccount.get(a) ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      withinDays: b.withinDays,
      count: b.accounts.length,
      atRiskUsd: Math.round(atRiskUsd * 100) / 100,
    };
  });
  return {
    totalWithin30Days: resultRows.reduce((s, r) => s + r.count, 0),
    totalAtRiskUsd: Math.round(resultRows.reduce((s, r) => s + r.atRiskUsd, 0) * 100) / 100,
    rows: resultRows,
  };
}

export async function listDealerRecentTransactions(
  dealerUsername: string,
  limit: number,
): Promise<AdminTransactionRow[]> {
  const u = dealerUsername.trim();
  if (!u) return [];
  const pool = getBillingPool();
  const lim = Math.max(1, Math.min(25, Math.floor(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`transaction\`, username, type,
            ${TX_ADMIN_PERIODS_DISPLAY_FLIP_SQL} AS periods,
            amount, account, coverage_start, coverage_end, remarks, free_month,
            \`timestamp\`, created_by
       FROM transactions WHERE username = ?
      ORDER BY \`timestamp\` DESC LIMIT ${lim}`,
    [u],
  );
  return rows.map((r) => ({
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
  }));
}

export async function getDealerPackageDistribution(dealerUsername: string): Promise<AdminReportPackageRow[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct ${ACCOUNTS_DEALER_FROM} WHERE (${scopeSql}) LIMIT 12000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return [];
  const slice = logins.slice(0, 2000);
  const ph = slice.map(() => "?").join(",");
  try {
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT x.nm AS plan_name, COUNT(*) AS c FROM (
         SELECT COALESCE(NULLIF(TRIM(tp.name), ''), CONCAT('Plan #', u.tariff_plan_id)) AS nm
         FROM users u LEFT JOIN tariff_plan tp ON tp.id = u.tariff_plan_id
         WHERE u.login IN (${ph})
       ) x GROUP BY x.nm ORDER BY c DESC LIMIT 10`,
      slice,
    );
    return rows.map((r) => ({ name: String(r.plan_name ?? "Unknown"), count: Math.floor(Number(r.c ?? 0)) }));
  } catch {
    return [];
  }
}

export async function getDealerMessageTrafficDayStacks(
  dealerUsername: string,
  lastDays = 8,
): Promise<AdminMessageTrafficDayStack[]> {
  const empty = (): AdminMessageTrafficDayStack[] => {
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
  const stalker = getStalkerPool();
  if (!stalker) return empty();
  const pool = getBillingPool();
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [acctRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT a.account AS acct ${ACCOUNTS_DEALER_FROM} WHERE (${scopeSql}) LIMIT 8000`,
    scopeParams,
  );
  const logins = acctRows.map((r) => String(r.acct ?? "").trim()).filter(Boolean);
  if (logins.length === 0) return empty();
  const slice = logins.slice(0, 1500);
  const ph = slice.map(() => "?").join(",");
  try {
    const [uidRows] = await stalker.query<RowDataPacket[]>(`SELECT id FROM users WHERE login IN (${ph})`, slice);
    const uids = uidRows.map((r) => Number(r.id)).filter((id) => id > 0);
    if (uids.length === 0) return empty();
    const uidPh = uids.map(() => "?").join(",");
    const [rows] = await stalker.query<RowDataPacket[]>(
      `SELECT DATE(e.addtime) AS d,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) = 0 THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 1 THEN 1 ELSE 0 END) AS high_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 2 THEN 1 ELSE 0 END) AS norm_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) = 3 THEN 1 ELSE 0 END) AS low_p,
              SUM(CASE WHEN COALESCE(e.need_confirm, 1) <> 0 AND COALESCE(e.priority, 2) NOT IN (1, 2, 3) THEN 1 ELSE 0 END) AS oth_p
         FROM events e
        WHERE e.event = 'send_msg' AND e.uid IN (${uidPh})
          AND e.addtime >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(e.addtime)`,
      [...uids, lastDays],
    );
    const byDay = new Map<string, Omit<AdminMessageTrafficDayStack, "dayKey" | "dayLabel">>();
    for (const r of rows) {
      const key = rowDateToYmd(r.d);
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
    return empty();
  }
}

export async function listDealerAccountsCreatedOnDay(
  dealerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_DEALER_FROM}
     WHERE (${scopeSql}) AND a.created IS NOT NULL AND DATE(a.created) = ?
     ORDER BY a.created DESC, a.account ASC LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

export async function listDealerAccountsExpiredOnDay(
  dealerUsername: string,
  day: Date,
): Promise<AdminDayActivityAccountRow[]> {
  const pool = getBillingPool();
  const d = adminLocalYmd(day);
  if (d > adminLocalYmd(new Date())) return [];
  const { sql: scopeSql, params: scopeParams } = dealerScopeWhere(dealerUsername);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account, a.full_name, a.username, a.created, a.expires
     ${ACCOUNTS_DEALER_FROM}
     WHERE (${scopeSql})
       AND a.expires IS NOT NULL AND a.expires > '1970-01-01' AND DATE(a.expires) = ?
     ORDER BY a.expires DESC, a.account ASC LIMIT 300`,
    [...scopeParams, d],
  );
  return rows.map((r) => ({
    account: String(r.account ?? ""),
    full_name: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    created: r.created != null ? String(r.created) : null,
    expires: r.expires != null ? String(r.expires) : null,
  }));
}

export {
  getOperatorDashboardStats,
  getOperatorSubscriberTrendSeries,
  getUsersSummaryScoped,
  getScopedExpiringSoonCount,
  listOperatorRecentSubscribers,
  listOperatorRecentStalkerSendMessages,
  getCreditFlowByDayForUsername,
};
