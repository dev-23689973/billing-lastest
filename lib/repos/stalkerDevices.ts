import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getStalkerPool } from "@/lib/db/pool";

/** Cleared binding values — Stalker `users.device_id` / `device_id2` are NOT NULL in most installs. */
const CLEARED_DEVICE_ID = "";
const CLEARED_ACCESS_TOKEN = "";

export type ClearStalkerDeviceResult =
  | { ok: true }
  | { ok: false; reason: "no_stalker_db" | "no_stalker_row" | "db_error" };

/**
 * PHP `Stalker_model::reset_data` / admin Users::reset — clear Stalker device pairing.
 * Clears device_id, device_id2, serial_number. MAC is unchanged.
 */
export async function clearStalkerUserDeviceTokensByLogin(login: string): Promise<ClearStalkerDeviceResult> {
  const l = String(login ?? "").trim();
  if (!l) return { ok: false, reason: "no_stalker_row" };

  const stalker = getStalkerPool();
  if (!stalker) return { ok: false, reason: "no_stalker_db" };

  const attempts = [
    "UPDATE users SET device_id = :d, device_id2 = :d, serial_number = :d, access_token = :t WHERE login = :l LIMIT 1",
    "UPDATE users SET device_id = :d, device_id2 = :d, serial_number = :d, access_token = NULL WHERE login = :l LIMIT 1",
    "UPDATE users SET device_id = :d, device_id2 = :d, serial_number = :d WHERE login = :l LIMIT 1",
    "UPDATE users SET device_id = :d, device_id2 = :d, access_token = :t WHERE login = :l LIMIT 1",
    "UPDATE users SET device_id = :d, device_id2 = :d, access_token = NULL WHERE login = :l LIMIT 1",
    "UPDATE users SET device_id = :d, device_id2 = :d WHERE login = :l LIMIT 1",
  ] as const;

  for (const sql of attempts) {
    try {
      const [res] = await stalker.execute<ResultSetHeader>(sql, {
        d: CLEARED_DEVICE_ID,
        t: CLEARED_ACCESS_TOKEN,
        l,
      });
      if (res.affectedRows >= 1) return { ok: true };
    } catch {
      /* try next SQL variant (nullable vs NOT NULL columns differ by Stalker version) */
    }
  }

  try {
    const [check] = await stalker.execute<RowDataPacket[]>("SELECT 1 FROM users WHERE login = :l LIMIT 1", { l });
    if (!check.length) return { ok: false, reason: "no_stalker_row" };
  } catch {
    return { ok: false, reason: "db_error" };
  }

  return { ok: false, reason: "db_error" };
}
