import { isValidMacFormat, normalizeMacForLookup } from "@/lib/mac/macFormat";

/**
 * Owner login shown in the Users table Parents column — mirrors `subscriberBillingOwner`.
 * Dealer first, then reseller, then manager, then `accounts.username`.
 */
export const ACCOUNT_LIST_DISPLAYED_PARENT_SQL = `COALESCE(
  NULLIF(TRIM(ud.username), ''),
  NULLIF(TRIM(COALESCE(ur1.username, ur2.username)), ''),
  NULLIF(TRIM(COALESCE(ur1.username_owner, ur2.username_owner, um.username)), ''),
  NULLIF(TRIM(a.username), '')
)`;

/**
 * True when the user is likely searching by MAC (full, partial, or compact hex).
 * Avoids treating short numeric account ids (e.g. `228742`) as MAC.
 */
export function isMacLikeSearch(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (isValidMacFormat(s)) return true;
  if (/[0-9A-Fa-f]{2}[:\-][0-9A-Fa-f]{2}/.test(s)) return true;
  const hexOnly = s.replace(/[^0-9A-Fa-f]/g, "");
  if (!/^[0-9A-Fa-f]+$/.test(hexOnly)) return false;
  if (hexOnly.length >= 8 && hexOnly.length <= 12 && !s.includes(":") && !s.includes("-")) {
    return true;
  }
  return false;
}

/** DISTINCT LIKE patterns for mac / account (billing + stalker login shapes). */
export function macSearchLikePatterns(raw: string): string[] {
  const q = raw.trim();
  const patterns = new Set<string>();
  patterns.add(`%${q}%`);

  const norm = normalizeMacForLookup(q);
  if (norm) patterns.add(`%${norm}%`);

  const hyphen = norm.replace(/:/g, "-");
  if (hyphen !== norm) patterns.add(`%${hyphen}%`);

  const hexOnly = q.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (hexOnly.length >= 2) {
    patterns.add(`%${hexOnly}%`);
    patterns.add(`%${hexOnly.toLowerCase()}%`);
  }

  return [...patterns];
}

function buildMacColumnLikes(columns: readonly string[], patterns: string[]): { sqlParts: string[]; params: unknown[] } {
  const sqlParts: string[] = [];
  const params: unknown[] = [];
  for (const col of columns) {
    for (const p of patterns) {
      sqlParts.push(`${col} LIKE ?`);
      params.push(p);
    }
  }
  return { sqlParts, params };
}

/** LIKE search on fields that match visible Users table columns only. */
function accountTableFieldsLikeClause(likeTerm: string): { sql: string; params: unknown[] } {
  return {
    sql: `(
      a.full_name LIKE ? OR a.account LIKE ? OR a.mac LIKE ?
      OR ${ACCOUNT_LIST_DISPLAYED_PARENT_SQL} LIKE ?
    )`,
    params: [likeTerm, likeTerm, likeTerm, likeTerm],
  };
}

export type AccountListSearchOptions = {
  /** Admin: `accounts.account` values whose Stalker `users.id` matches the search digits. */
  stalkerIdAccountLogins?: string[];
  /** `accounts.account` values whose Stalker `users.domain` matches the search text. */
  stalkerDomainAccountLogins?: string[];
};

function appendStalkerAccountLogins(
  base: { sql: string; params: unknown[] },
  options: AccountListSearchOptions | undefined,
): { sql: string; params: unknown[] } {
  const logins = [
    ...new Set(
      [...(options?.stalkerIdAccountLogins ?? []), ...(options?.stalkerDomainAccountLogins ?? [])]
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
  if (logins.length < 1) return base;
  const ph = logins.map(() => "?").join(", ");
  return {
    sql: `(${base.sql} OR a.account IN (${ph}))`,
    params: [...base.params, ...logins],
  };
}

/**
 * Subscriber list search — limited to data shown in the Users table:
 * Name (`full_name`), Username (`account`), MAC, Parents (displayed owner login),
 * Stalker user id (admin User ID column), and Stalker domain.
 */
export function accountListSearchWhereClause(
  search: string | undefined | null,
  options?: AccountListSearchOptions,
): { sql: string; params: unknown[] } {
  const q = search?.trim() ?? "";
  if (!q) return { sql: "", params: [] };

  const likeTerm = `%${q}%`;

  let base: { sql: string; params: unknown[] };
  if (isMacLikeSearch(q)) {
    const patterns = macSearchLikePatterns(q);
    const { sqlParts: macParts, params: macParams } = buildMacColumnLikes(["a.mac", "a.account"], patterns);
    base = {
      sql: `(
        ${macParts.join(" OR ")}
        OR a.full_name LIKE ?
        OR ${ACCOUNT_LIST_DISPLAYED_PARENT_SQL} LIKE ?
      )`,
      params: [...macParams, likeTerm, likeTerm],
    };
  } else {
    base = accountTableFieldsLikeClause(likeTerm);
  }

  return appendStalkerAccountLogins(base, options);
}
