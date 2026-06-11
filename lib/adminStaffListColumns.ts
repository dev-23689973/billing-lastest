/**
 * Staff list column visibility in the URL (`cols` search param).
 * Always use a single comma-separated value — never repeated `cols` keys (Next.js
 * router cache can treat duplicate keys inconsistently on mobile).
 */

/** Full staff-list column set (admin managers page). Omitted `cols` shows all columns. */
export const STAFF_LIST_ALL_COLUMN_IDS = [
  "name",
  "username",
  "credits",
  "dealerCount",
  "parentReseller",
  "createdAt",
  "status",
  "state",
  "type",
  "activeUsers",
  "expiredUsers",
  "totalUsers",
] as const;

export function parseStaffListColsFromSearchParam<T extends string>(
  raw: string | string[] | undefined,
  allowedIds: readonly T[],
): Set<T> {
  const tokens =
    raw == null || raw === ""
      ? []
      : (Array.isArray(raw) ? raw : [raw]).flatMap((entry) => String(entry).split(","));

  const valid = tokens
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((id): id is T => (allowedIds as readonly string[]).includes(id));

  if (valid.length === 0) return new Set(allowedIds);
  return new Set(valid);
}

/** `undefined` when all columns are visible (omit param from URL). */
export function staffListColsSearchParam(visibleIds: string[], allIds: readonly string[]): string | undefined {
  if (visibleIds.length === 0 || visibleIds.length >= allIds.length) return undefined;
  return visibleIds.join(",");
}

/** Visible columns in canonical table order (stable keys for React children). */
export function staffListOrderedVisibleColumns<T extends string>(
  visible: Set<T>,
  order: readonly T[],
  hide: readonly T[] = [],
): T[] {
  const hidden = new Set(hide);
  return order.filter((id) => visible.has(id) && !hidden.has(id));
}

export function staffListColsQueryFromSet<T extends string>(
  visible: Set<T>,
  allIds: readonly T[],
): string | undefined {
  const ordered = staffListOrderedVisibleColumns(visible, allIds);
  return staffListColsSearchParam(ordered, allIds);
}
