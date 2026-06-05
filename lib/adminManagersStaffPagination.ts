/** Fixed `L1 L2 … R1 R2` (four page slots) — same algorithm as `/admin/managers` staff list footer. */
export function buildManagersStaffPaginationItems(totalPages: number, currentPage: number): (number | "ellipsis")[] {
  if (totalPages <= 1) return [];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const n = totalPages;
  const p = currentPage;
  if (p <= 2 || p >= n - 1) {
    return [1, 2, "ellipsis", n - 1, n];
  }
  return [p - 1, p, "ellipsis", n - 1, n];
}

/** Square-ish page control cells (matches managers staff list footer). */
export const managersStaffPageBtnBaseClass =
  "inline-flex h-7 min-h-7 min-w-7 shrink-0 items-center justify-center rounded-md border-x-1 px-1.5 text-xs tabular-nums touch-manipulation transition-colors";
