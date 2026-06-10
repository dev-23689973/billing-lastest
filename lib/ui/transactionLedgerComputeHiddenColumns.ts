/** Min widths (rem) — keep in sync with `transaction-ledger-responsive-table.css`. */
export const TRANSACTION_LEDGER_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  timestamp: 7.25,
  user: 5,
  account: 5,
  type: 4.25,
  category: 4.5,
  amount: 5,
  bonusAmt: 4.5,
  totalAmt: 5,
  promo: 12,
  note: 14,
};

export const TRANSACTION_LEDGER_PINNED_COLUMN_IDS = new Set<string>(["type", "amount"]);

/** Hide first → last when the ledger table overflows (pinned columns never hide). */
export const TRANSACTION_LEDGER_COLUMN_HIDE_ORDER: readonly string[] = [
  "note",
  "promo",
  "totalAmt",
  "bonusAmt",
  "category",
  "user",
  "account",
  "timestamp",
];

const HIDE_FUDGE_PX = 4;

export function measureTransactionLedgerHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = TRANSACTION_LEDGER_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !TRANSACTION_LEDGER_PINNED_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-ledger-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-ledger-hidden", next);
    else scrollEl.removeAttribute("data-ledger-hidden");
  };

  applyHidden([]);
  scrollEl.scrollLeft = 0;

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
