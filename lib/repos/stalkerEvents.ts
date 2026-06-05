import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { formatMysqlDateTime } from "@/lib/billingAccountExpiry";
import { getStalkerPool } from "@/lib/db/pool";
import { getStalkerUserDbIdByLogin } from "@/lib/repos/stalkerUserPackages";

export type StalkerDeviceCommandResult =
  | { ok: true }
  | { ok: false; reason: "no_stalker_db" | "no_stalker_row" | "no_events" | "db_error" };

export function normalizeMacForStalker(mac: string): string {
  return mac.trim().toUpperCase().replace(/-/g, ":");
}

async function stalkerHasEventsTable(stalker: NonNullable<ReturnType<typeof getStalkerPool>>): Promise<boolean> {
  try {
    await stalker.execute("SELECT 1 FROM `events` LIMIT 1");
    return true;
  } catch {
    return false;
  }
}

/** PHP reboot — queue remote STB restart without clearing device bindings. */
export async function insertStalkerRebootEvent(uid: number): Promise<boolean> {
  const stalker = getStalkerPool();
  if (!stalker || !Number.isFinite(uid) || uid <= 0) return false;
  if (!(await stalkerHasEventsTable(stalker))) return false;

  const addtime = formatMysqlDateTime(new Date());
  const eventtime = formatMysqlDateTime(new Date(Date.now() + 240 * 1000));

  const attempts = [
    {
      sql: `INSERT INTO events (uid, event, sended, ended, reboot_after_ok, priority, addtime, eventtime, post_function)
            VALUES (:uid, 'reboot', '1', '1', '0', '1', :addtime, :eventtime, '')`,
      params: { uid, addtime, eventtime },
    },
    {
      sql: `INSERT INTO events (uid, event, priority, addtime, eventtime) VALUES (:uid, 'reboot', 1, :addtime, :eventtime)`,
      params: { uid, addtime, eventtime },
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

export async function rebootStalkerUserByLogin(login: string): Promise<StalkerDeviceCommandResult> {
  const l = String(login ?? "").trim();
  if (!l) return { ok: false, reason: "no_stalker_row" };

  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, reason: "no_stalker_db" };
  if (!(await stalkerHasEventsTable(stalker))) return { ok: false, reason: "no_events" };

  const uid = await getStalkerUserDbIdByLogin(l);
  if (uid == null || uid <= 0) return { ok: false, reason: "no_stalker_row" };

  const ok = await insertStalkerRebootEvent(uid);
  return ok ? { ok: true } : { ok: false, reason: "db_error" };
}

export type ResolveStalkerMessageTargetsResult = {
  uids: number[];
  skippedNoMac: string[];
  skippedNoProfile: string[];
};

/**
 * Resolve billing accounts to Stalker uids for device messaging.
 * Skips accounts with empty MAC (client: empty MAC must not receive send_msg).
 */
export async function resolveStalkerMessageTargetsByAccounts(
  accounts: string[],
  loadMacByAccount: (account: string) => Promise<string | null>,
): Promise<ResolveStalkerMessageTargetsResult> {
  const uids: number[] = [];
  const skippedNoMac: string[] = [];
  const skippedNoProfile: string[] = [];

  for (const account of accounts) {
    const acc = String(account ?? "").trim();
    if (!acc) continue;

    const mac = normalizeMacForStalker((await loadMacByAccount(acc)) ?? "");
    if (!mac) {
      skippedNoMac.push(acc);
      continue;
    }

    const uid = await getStalkerUserDbIdByLogin(acc);
    if (uid == null || uid <= 0) {
      skippedNoProfile.push(acc);
      continue;
    }

    uids.push(uid);
  }

  return { uids, skippedNoMac, skippedNoProfile };
}

/** Client bulk send: `SELECT id ... FROM users WHERE mac IN (...)`. */
export async function resolveStalkerUidsByMacs(macs: string[]): Promise<number[]> {
  const stalker = getStalkerPool();
  if (!stalker) return [];

  const normalized = [...new Set(macs.map(normalizeMacForStalker).filter(Boolean))];
  if (!normalized.length) return [];

  const ph = normalized.map((_, i) => `:m${i}`).join(", ");
  const params = Object.fromEntries(normalized.map((m, i) => [`m${i}`, m]));
  const [rows] = await stalker.execute<RowDataPacket[]>(
    `SELECT id FROM users WHERE mac IN (${ph})`,
    params,
  );

  return rows
    .map((r) => Number(r.id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export async function loadBillingMacByAccount(account: string): Promise<string | null> {
  const { getBillingPool } = await import("@/lib/db/pool");
  const pool = getBillingPool();
  const acc = String(account ?? "").trim();
  if (!acc) return null;
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT mac FROM accounts WHERE account = :a LIMIT 1", { a: acc });
  if (!rows.length) return null;
  const mac = String(rows[0]?.mac ?? "").trim();
  return mac || null;
}
