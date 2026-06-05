/** Min widths (rem) — keep in sync with `transactions-responsive-table.css`. */
export const TRANSACTIONS_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  type: 4.25,
  credits: 3.5,
  months: 3.25,
  account: 5.5,
  coverageStart: 5,
  coverageEnd: 5,
  remarks: 5,
  timestamp: 8.5,
};

export const TRANSACTIONS_ACTIONS_MIN_WIDTH_REM = 4.25;

/** Always visible in the row — same role as `username` on the staff hub table. */
export const TRANSACTIONS_PINNED_COLUMN_IDS = new Set<string>(["type", "credits"]);

/** Hide first → last when the modal table overflows (pinned + remarks never hide). */
export const TRANSACTIONS_COLUMN_HIDE_ORDER: readonly string[] = [
  "coverageEnd",
  "coverageStart",
  "months",
  "account",
  "timestamp",
];

export const TRANSACTIONS_NEVER_HIDE_COLUMN_IDS = new Set<string>([
  "type",
  "credits",
  "remarks",
]);

const HIDE_FUDGE_PX = 4;

export function measureTransactionsHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = TRANSACTIONS_COLUMN_HIDE_ORDER.filter(
    (id) =>
      columnIds.includes(id) &&
      !TRANSACTIONS_PINNED_COLUMN_IDS.has(id) &&
      !TRANSACTIONS_NEVER_HIDE_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-txn-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-txn-hidden", next);
    else scrollEl.removeAttribute("data-txn-hidden");
  };

  applyHidden([]);

  for (const col of order) {
    if (scrollEl.scrollWidth <= scrollEl.clientWidth + HIDE_FUDGE_PX) {
      break;
    }
    hidden.push(col);
    applyHidden(hidden);
  }

  applyHidden(hidden);
  return hidden;
}
