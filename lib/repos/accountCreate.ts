import { createHash } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";
import { getCreditBalance } from "@/lib/repos/creditBalance";
import { SUBSCRIBER_TX_DEBIT } from "@/lib/billing/subscriberTransactionTypes";
import {
  buildMonthDeductionChargedMap,
  monthRenewChargedCredits,
} from "@/lib/creditDeductions";

export { buildMonthDeductionChargedMap, monthRenewChargedCredits };
import {
  getStalkerCustomPackagePlanId,
  listStalkerPackagesForPlan,
  setStalkerUserPackageSubscriptions,
} from "@/lib/repos/stalkerUserPackages";

const ACCOUNT_STATUS_ON = 0;
const ACCOUNT_STATUS_OFF = 1;

function formatMysqlDateTime(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function stalkerPasswordDigest(plain: string, userId: number) {
  const inner = createHash("md5").update(plain).digest("hex");
  return createHash("md5").update(`${inner}${userId}`).digest("hex");
}

/** Mirrors `datetime_helper::get_expiry_date` (PHP billing). */
export function computeExpiryDatePhp(validity: string, baseDate?: Date): string {
  const month = String(validity);
  const now = baseDate ?? new Date();
  const datetimeNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
  let datetime = baseDate ? new Date(baseDate) : new Date(datetimeNow);
  if (datetimeNow > datetime) {
    datetime = new Date(datetimeNow);
  }
  if (month !== "FREE_TRIAL") {
    const n = Number.parseInt(month, 10);
    if (Number.isFinite(n) && n > 0) {
      datetime.setMonth(datetime.getMonth() + n);
    }
  } else {
    datetime.setDate(datetime.getDate() + 2);
  }
  return formatMysqlDateTime(datetime);
}

export type TariffPlanRow = { id: number; name: string };

export async function listStalkerTariffPlans(): Promise<TariffPlanRow[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];
  const [rows] = await stalker.execute<RowDataPacket[]>(
    "SELECT id, name FROM tariff_plan ORDER BY name ASC",
  );
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name ?? "") }));
}

export async function getPinDefaultFromBilling(): Promise<string> {
  const pool = getBillingPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT value FROM configs WHERE `key` = 'pin_default' LIMIT 1");
  const v = rows[0]?.value;
  return v != null && String(v).trim() !== "" ? String(v) : "9090";
}

export type CreateEndUserInput = {
  full_name: string;
  account: string;
  password: string;
  mac: string;
  validity: string;
  status: number;
  /** Optional manager username (type = `MNGR`) when billing under a manager directly. */
  manager?: string;
  reseller: string;
  dealer: string;
  tariff_plan_id: number;
  monthFreeEnabled: boolean;
  /** When false, new accounts get no recoverable credit pool (`max_credit_recoverable` = 0). Default true. */
  recoverBonusEnabled?: boolean;
  /** PHP `packs[]` when tariff is Stalker “CUSTOM PACKAGE” plan — whitelisted to packages in that plan. */
  addonPackageIds?: number[];
  /** Portal staff: require ≥1 credit on debit wallet before any create (including trial). */
  requirePositiveWalletBalance?: boolean;
};

export type CreateEndUserResult =
  | { ok: true; account: string }
  | {
      ok: false;
      code:
        | "stalker_required"
        | "invalid"
        | "duplicate_login"
        | "duplicate_mac"
        | "bad_owner"
        | "bad_package"
        | "bad_validity"
        | "insufficient_credits"
        | "custom_packages_required"
        | "db";
      balance?: number;
      required?: number;
    };

const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
const LOGIN_RE = /^[a-z0-9]+$/;

function normalizeMac(mac: string): string {
  return mac.trim().toUpperCase().replace(/-/g, ":");
}

async function nextTransactionNumber(conn: PoolConnection, username: string): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT COALESCE(MAX(`transaction`), 0) + 1 AS n FROM transactions WHERE username = :u",
    { u: username },
  );
  return Number(rows[0]?.n ?? 1);
}

function mysqlErrno(err: unknown): number | undefined {
  return (err as { errno?: number })?.errno;
}

function mysqlMessage(err: unknown): string {
  return String((err as Error)?.message ?? err ?? "");
}

function isMysqlUnknownColumn(err: unknown, column: string): boolean {
  if (mysqlErrno(err) !== 1054) return false;
  return mysqlMessage(err).includes(column);
}

function isMysqlNoDefaultForField(err: unknown, column: string): boolean {
  if (mysqlErrno(err) !== 1364) return false;
  return mysqlMessage(err).includes(column);
}

/** ENUM/VARCHAR too short for `SUBDBIT` / `SUBCRDT` on legacy billing DBs. */
function isMysqlInvalidTransactionType(err: unknown): boolean {
  const errno = mysqlErrno(err);
  const msg = mysqlMessage(err).toLowerCase();
  if (errno === 1265 || errno === 1366 || errno === 1406) {
    return msg.includes("type") || msg.includes("subdbit") || msg.includes("subcrdt");
  }
  if (errno === 1064 && msg.includes("type")) return true;
  return false;
}

type SubscriberDebitInsertRow = {
  username: string;
  type: string;
  transaction: number;
  periods: number;
  timestamp: string;
  coverage_start: string;
  coverage_end: string;
  remarks: string | null;
  free_month: number;
  account: string;
};

async function executeSubscriberDebitInsert(conn: PoolConnection, row: SubscriberDebitInsertRow): Promise<void> {
  const typesToTry = row.type === SUBSCRIBER_TX_DEBIT ? [SUBSCRIBER_TX_DEBIT, "DBIT"] : [row.type];
  let lastErr: unknown;
  for (const type of typesToTry) {
    const payload = { ...row, type };
    try {
      await executeSubscriberDebitInsertOnce(conn, payload);
      return;
    } catch (e) {
      lastErr = e;
      if (type !== typesToTry[typesToTry.length - 1] && isMysqlInvalidTransactionType(e)) continue;
      throw e;
    }
  }
  throw lastErr;
}

async function executeSubscriberDebitInsertOnce(conn: PoolConnection, dbitBase: SubscriberDebitInsertRow): Promise<void> {
  const sqlUserTx = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, 1, :account)`;
  const sqlLegacy = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, :account)`;
  const sqlUserTxAmount = `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, user_transaction, amount, account)
     VALUES (:username, :type, :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, 1, :amount, :account)`;

  try {
    await conn.execute(sqlUserTx, dbitBase);
  } catch (e) {
    if (isMysqlUnknownColumn(e, "user_transaction") || isMysqlUnknownColumn(e, "'user_transaction'")) {
      await conn.execute(sqlLegacy, dbitBase);
    } else if (isMysqlNoDefaultForField(e, "amount") || isMysqlNoDefaultForField(e, "'amount'")) {
      try {
        await conn.execute(sqlUserTxAmount, { ...dbitBase, amount: dbitBase.periods });
      } catch (e2) {
        if (isMysqlUnknownColumn(e2, "user_transaction") || isMysqlUnknownColumn(e2, "'user_transaction'")) {
          await conn.execute(
            `INSERT INTO transactions (username, type, \`transaction\`, periods, \`timestamp\`, coverage_start, coverage_end, remarks, free_month, amount, account)
             VALUES (:username, :type, :transaction, :periods, :timestamp, :coverage_start, :coverage_end, :remarks, :free_month, :amount, :account)`,
            { ...dbitBase, amount: dbitBase.periods },
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

/** Some Ministra DBs add NOT NULL `users.domain` without a default — PHP OSS create supplies it implicitly. */
async function insertStalkerEndUserRow(
  conn: PoolConnection,
  row: {
    fname: string;
    login: string;
    mac: string;
    status: number;
    tariff_plan_id: number;
    created: string;
    expire_billing_date: string;
    parent_password: string;
  },
): Promise<number> {
  const withDomain = { ...row, domain: "" };
  const sqlWithDomain = `INSERT INTO users (fname, login, mac, status, tariff_plan_id, created, expire_billing_date, parent_password, domain)
     VALUES (:fname, :login, :mac, :status, :tariff_plan_id, :created, :expire_billing_date, :parent_password, :domain)`;
  const sqlBase = `INSERT INTO users (fname, login, mac, status, tariff_plan_id, created, expire_billing_date, parent_password)
     VALUES (:fname, :login, :mac, :status, :tariff_plan_id, :created, :expire_billing_date, :parent_password)`;

  try {
    const [ins] = await conn.execute<ResultSetHeader>(sqlWithDomain, withDomain);
    const id = Number(ins.insertId);
    if (!id) throw new Error("stalker_insert_id");
    return id;
  } catch (e) {
    if (isMysqlUnknownColumn(e, "domain") || isMysqlUnknownColumn(e, "'domain'")) {
      const [ins] = await conn.execute<ResultSetHeader>(sqlBase, row);
      const id = Number(ins.insertId);
      if (!id) throw new Error("stalker_insert_id");
      return id;
    }
    throw e;
  }
}

/**
 * Subscriber register/renew debit — one row per action; bonus months live in `free_month` only
 * (no second BONUS/BON row). Some billing DBs omit `user_transaction` or require NOT NULL `amount`.
 */
export async function insertDebitLikePhp(
  conn: PoolConnection,
  input: {
    username: string;
    account: string;
    expires: string;
    coverageStart: string;
    credits: number;
    numberFree: number;
    deductionMap: Record<number, number>;
  },
): Promise<void> {
  const { username, account, expires, coverageStart } = input;
  let credits = input.credits;
  let remarks: string | null = null;
  let freeMonth = input.numberFree;

  if (account && input.deductionMap[credits] !== undefined) {
    freeMonth = credits - input.deductionMap[credits];
    credits = input.deductionMap[credits];
  }

  if (account) {
    remarks =
      freeMonth > 0
        ? `Credit from ${username} to ${account} (${freeMonth} credits free)`
        : `Credit from ${username} to ${account}`;
  }

  const tx = await nextTransactionNumber(conn, username);

  await executeSubscriberDebitInsert(conn, {
    username,
    type: SUBSCRIBER_TX_DEBIT,
    transaction: tx,
    periods: credits,
    timestamp: coverageStart,
    coverage_start: coverageStart,
    coverage_end: expires,
    remarks,
    free_month: freeMonth,
    account,
  });
}

async function insertCreditSummarizeLikePhp(
  conn: PoolConnection,
  account: string,
  startDate: string,
  expiryDate: string,
  credits: number,
  deductionMap: Record<number, number>,
  recoverBonusEnabled: boolean,
) {
  let c = credits;
  if (c > 5) {
    c = deductionMap[c] ?? c;
  }
  const maxRec = recoverBonusEnabled ? Math.max(0, c - 1) : 0;
  await conn.execute(
    `INSERT INTO user_credit_summarize (account, start_date, max_credit_recoverable, expiry_date, updated_at)
     VALUES (:account, :start_date, :max_credit_recoverable, :expiry_date, :updated_at)`,
    {
      account,
      start_date: startDate,
      max_credit_recoverable: maxRec,
      expiry_date: expiryDate,
      updated_at: startDate,
    },
  );
}

/**
 * Create billing `accounts` row + Stalker `users` row (+ transactions / summarize) like PHP `Users_model::create`.
 */
export async function createEndUserAccount(raw: CreateEndUserInput): Promise<CreateEndUserResult> {
  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, code: "stalker_required" };

  const account = raw.account.trim().toLowerCase();
  const password = raw.password;
  const full_name = raw.full_name.trim();
  const mac = normalizeMac(raw.mac);
  const manager = (raw.manager ?? "").trim();
  const reseller = raw.reseller.trim();
  const dealer = raw.dealer.trim();
  const ownerUsername = dealer || reseller || manager;

  if (!account || !LOGIN_RE.test(account) || password.length < 4 || password.length > 100) {
    return { ok: false, code: "invalid" };
  }
  if (!MAC_RE.test(mac)) return { ok: false, code: "invalid" };
  if (!ownerUsername) return { ok: false, code: "bad_owner" };
  if (!Number.isFinite(raw.tariff_plan_id) || raw.tariff_plan_id <= 0) return { ok: false, code: "bad_package" };

  let validity = raw.validity.trim();
  if (validity === "1_MONTH_FREE" && !raw.monthFreeEnabled) return { ok: false, code: "bad_validity" };
  if (validity !== "FREE_TRIAL" && validity !== "1_MONTH_FREE") {
    const m = Number.parseInt(validity, 10);
    if (!Number.isFinite(m) || m < 1 || m > 24) return { ok: false, code: "bad_validity" };
    validity = String(m);
  }

  const accountStatus = raw.status === ACCOUNT_STATUS_OFF ? ACCOUNT_STATUS_OFF : ACCOUNT_STATUS_ON;
  const billing = getBillingPool();
  const recoverBonusEnabled = raw.recoverBonusEnabled !== false;

  const [[dupAccount], [dupMac], [tariff]] = await Promise.all([
    billing.execute<RowDataPacket[]>("SELECT account FROM accounts WHERE account = :a LIMIT 1", { a: account }),
    billing.execute<RowDataPacket[]>("SELECT account FROM accounts WHERE mac = :m LIMIT 1", { m: mac }),
    stalker.execute<RowDataPacket[]>("SELECT id FROM tariff_plan WHERE id = :id LIMIT 1", { id: raw.tariff_plan_id }),
  ]);
  if (dupAccount.length) return { ok: false, code: "duplicate_login" };
  if (dupMac.length) return { ok: false, code: "duplicate_mac" };
  if (!tariff.length) return { ok: false, code: "bad_package" };

  const [stDupLogin] = await stalker.execute<RowDataPacket[]>("SELECT id FROM users WHERE login = :l LIMIT 1", { l: account });
  const [stDupMac] = await stalker.execute<RowDataPacket[]>("SELECT id FROM users WHERE mac = :m LIMIT 1", { m: mac });
  if (stDupLogin.length) return { ok: false, code: "duplicate_login" };
  if (stDupMac.length) return { ok: false, code: "duplicate_mac" };

  // Owner validation:
  // - If reseller is set, validate it exists (SRSLR) and optionally validate dealer is under it.
  // - If reseller is empty but dealer is set, validate dealer exists (RSLR) and treat its owner reseller as the hierarchy parent.
  // - If both reseller and dealer are empty, allow billing directly under a manager (MNGR).
  if (reseller) {
    const [[rs]] = await billing.execute<RowDataPacket[]>(
      "SELECT username_owner AS manager FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1",
      { u: reseller },
    );
    if (!rs) return { ok: false, code: "bad_owner" };
    if (manager && String(rs.manager ?? "") !== manager) return { ok: false, code: "bad_owner" };

    if (dealer) {
      const [[dl]] = await billing.execute<RowDataPacket[]>(
        "SELECT username FROM users WHERE type = 'RSLR' AND username = :d AND username_owner = :r LIMIT 1",
        { d: dealer, r: reseller },
      );
      if (!dl) return { ok: false, code: "bad_owner" };
    }
  } else if (dealer) {
    const [[dl]] = await billing.execute<RowDataPacket[]>(
      "SELECT username_owner AS reseller FROM users WHERE type = 'RSLR' AND username = :d LIMIT 1",
      { d: dealer },
    );
    if (!dl) return { ok: false, code: "bad_owner" };
    if (manager) {
      const [[rs]] = await billing.execute<RowDataPacket[]>(
        "SELECT username_owner AS manager FROM users WHERE type = 'SRSLR' AND username = :u LIMIT 1",
        { u: String(dl.reseller ?? "") },
      );
      if (!rs) return { ok: false, code: "bad_owner" };
      if (String(rs.manager ?? "") !== manager) return { ok: false, code: "bad_owner" };
    }
  } else {
    const [[m]] = await billing.execute<RowDataPacket[]>(
      "SELECT username FROM users WHERE type = 'MNGR' AND username = :u LIMIT 1",
      { u: manager },
    );
    if (!m) return { ok: false, code: "bad_owner" };
  }

  const customPlanId = await getStalkerCustomPackagePlanId();
  if (customPlanId != null && raw.tariff_plan_id === customPlanId) {
    const packIds = (raw.addonPackageIds ?? [])
      .map((n) => Math.floor(Number(n)))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (packIds.length < 1) {
      return { ok: false, code: "custom_packages_required" };
    }
  }

  let filteredAddonIds: number[] = [];
  if (
    customPlanId != null &&
    raw.tariff_plan_id === customPlanId &&
    Array.isArray(raw.addonPackageIds) &&
    raw.addonPackageIds.length > 0
  ) {
    const allowed = await listStalkerPackagesForPlan(customPlanId);
    const allowedSet = new Set(allowed.map((p) => p.package_id));
    filteredAddonIds = [
      ...new Set(
        raw.addonPackageIds
          .map((n) => Math.floor(Number(n)))
          .filter((n) => Number.isFinite(n) && n > 0 && allowedSet.has(n)),
      ),
    ];
  }

  const [dedRows] = await billing.execute<RowDataPacket[]>(
    "SELECT month, month_deduction FROM credit_deductions ORDER BY month ASC",
  );
  const deductionMap = buildMonthDeductionChargedMap(
    dedRows.map((d) => ({ month: Number(d.month), month_deduction: Number(d.month_deduction) })),
  );

  const balance = await getCreditBalance(ownerUsername);
  if (raw.requirePositiveWalletBalance && balance < 1) {
    return { ok: false, code: "insufficient_credits", balance, required: 1 };
  }

  const skipMonthDebit = validity === "FREE_TRIAL" || validity === "1_MONTH_FREE";
  if (!skipMonthDebit) {
    const validityMonths = Number(validity);
    const chargedCredits = monthRenewChargedCredits(validityMonths, deductionMap);
    if (balance < chargedCredits) {
      return { ok: false, code: "insufficient_credits", balance, required: chargedCredits };
    }
  }

  const pinDefault = await getPinDefaultFromBilling();
  const created = formatMysqlDateTime(new Date());
  const usingFreeTrial = validity === "FREE_TRIAL";
  const expires = computeExpiryDatePhp(validity === "1_MONTH_FREE" ? "1" : validity);

  const stalkerConn = await stalker.getConnection();
  let stalkerUserId: number | null = null;
  try {
    stalkerUserId = await insertStalkerEndUserRow(stalkerConn, {
      fname: full_name || account,
      login: account,
      mac,
      status: accountStatus,
      tariff_plan_id: raw.tariff_plan_id,
      created,
      expire_billing_date: expires,
      parent_password: pinDefault,
    });

    const pwdHash = stalkerPasswordDigest(password, stalkerUserId);
    await stalkerConn.execute("UPDATE users SET password = :p WHERE id = :id", { p: pwdHash, id: stalkerUserId });
  } catch {
    return { ok: false, code: "db" };
  } finally {
    stalkerConn.release();
  }

  const billConn = await billing.getConnection();
  try {
    await billConn.beginTransaction();

    const [aRes] = await billConn.execute<ResultSetHeader>(
      `INSERT INTO accounts (full_name, account, mac, status, created, expires, username, password, phone, note)
       VALUES (:full_name, :account, :mac, :status, :created, :expires, :username, :password, :phone, :note)`,
      {
        full_name: full_name || account,
        account,
        mac,
        status: accountStatus,
        created,
        expires,
        username: ownerUsername,
        password,
        phone: "",
        note: "",
      },
    );
    if (aRes.affectedRows !== 1) throw new Error("accounts");

    if (usingFreeTrial) {
      await billConn.execute(
        "INSERT INTO free_trial_users (mac, free_trial_end_date) VALUES (:mac, :free_trial_end_date)",
        { mac, free_trial_end_date: expires },
      );
      await insertCreditSummarizeLikePhp(billConn, account, created, expires, 0, deductionMap, recoverBonusEnabled);
    } else {
      let txCredits = 0;
      let numberFree = 0;
      let summarizeCredits = 0;

      if (validity === "1_MONTH_FREE") {
        txCredits = 0;
        numberFree = 1;
        summarizeCredits = 0;
      } else {
        txCredits = Number(validity);
        summarizeCredits = txCredits;
      }

      await insertDebitLikePhp(billConn, {
        username: ownerUsername,
        account,
        expires,
        coverageStart: created,
        credits: txCredits,
        numberFree,
        deductionMap,
      });
      await insertCreditSummarizeLikePhp(billConn, account, created, expires, summarizeCredits, deductionMap, recoverBonusEnabled);
    }

    await billConn.commit();
  } catch {
    await billConn.rollback();
    billConn.release();
    await stalker.execute("DELETE FROM users WHERE id = :id", { id: stalkerUserId });
    return { ok: false, code: "db" };
  }
  billConn.release();

  if (filteredAddonIds.length > 0 && stalkerUserId) {
    await setStalkerUserPackageSubscriptions(stalkerUserId, filteredAddonIds);
  }

  return { ok: true, account };
}
