import type { RowDataPacket } from "mysql2/promise";
import { END_USER_LOGIN_RE, STAFF_USERNAME_RE } from "@/lib/credentials/credentialRules";
import { validateMacFormat } from "@/lib/mac/macFormat";
import { getBillingPool, getStalkerPool } from "@/lib/db/pool";
import { usernameExistsInUsers } from "@/lib/repos/managerPortal";

export type CredentialAvailabilityResult =
  | { available: true }
  | { available: false; reason: "invalid" | "taken" };

export async function checkEndUserLoginAvailable(login: string): Promise<CredentialAvailabilityResult> {
  const account = login.trim().toLowerCase();
  if (!account || !END_USER_LOGIN_RE.test(account)) {
    return { available: false, reason: "invalid" };
  }

  const billing = getBillingPool();
  const [accRows] = await billing.execute<RowDataPacket[]>(
    "SELECT account FROM accounts WHERE account = ? LIMIT 1",
    [account],
  );
  if (accRows.length) return { available: false, reason: "taken" };

  const stalker = getStalkerPool();
  if (stalker) {
    const [stRows] = await stalker.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE login = ? LIMIT 1",
      [account],
    );
    if (stRows.length) return { available: false, reason: "taken" };
  }

  if (await usernameExistsInUsers(account)) {
    return { available: false, reason: "taken" };
  }

  return { available: true };
}

export async function checkStaffUsernameAvailable(username: string): Promise<CredentialAvailabilityResult> {
  const u = username.trim().toLowerCase();
  if (!u || !STAFF_USERNAME_RE.test(u)) {
    return { available: false, reason: "invalid" };
  }

  if (await usernameExistsInUsers(u)) {
    return { available: false, reason: "taken" };
  }

  const billing = getBillingPool();
  const [accRows] = await billing.execute<RowDataPacket[]>(
    "SELECT account FROM accounts WHERE account = ? LIMIT 1",
    [u],
  );
  if (accRows.length) return { available: false, reason: "taken" };

  const stalker = getStalkerPool();
  if (stalker) {
    const [stRows] = await stalker.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE login = ? LIMIT 1",
      [u],
    );
    if (stRows.length) return { available: false, reason: "taken" };
  }

  return { available: true };
}

export async function checkEndUserMacAvailable(
  rawMac: string,
  excludeAccount?: string,
): Promise<CredentialAvailabilityResult> {
  const fmt = validateMacFormat(rawMac);
  if (!fmt.ok) return { available: false, reason: "invalid" };

  const mac = fmt.canonical;
  const billing = getBillingPool();
  const exclude = excludeAccount?.trim().toLowerCase();

  const [accRows] = await billing.execute<RowDataPacket[]>(
    `SELECT account FROM accounts
     WHERE UPPER(REPLACE(TRIM(COALESCE(mac, '')), '-', ':')) = ?
       ${exclude ? "AND account <> ?" : ""}
     LIMIT 1`,
    exclude ? [mac, exclude] : [mac],
  );
  if (accRows.length) return { available: false, reason: "taken" };

  const stalker = getStalkerPool();
  if (stalker) {
    const [stRows] = await stalker.execute<RowDataPacket[]>(
      `SELECT id FROM users
       WHERE UPPER(REPLACE(TRIM(COALESCE(mac, '')), '-', ':')) = ?
         ${exclude ? "AND LOWER(TRIM(login)) <> ?" : ""}
       LIMIT 1`,
      exclude ? [mac, exclude] : [mac],
    );
    if (stRows.length) return { available: false, reason: "taken" };
  }

  return { available: true };
}
