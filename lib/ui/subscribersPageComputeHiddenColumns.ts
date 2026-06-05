/** Min widths (rem) — keep in sync with `subscribers-page-responsive-table.css`. */
export const SUBSCRIBERS_PAGE_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  account: 6,
  name: 7,
  username: 6,
  mac: 7,
  parents: 6,
  status: 5,
  state: 9,
  created: 6.5,
  expiry: 7,
  autoRenew: 4.5,
};

export const SUBSCRIBERS_PAGE_PINNED_COLUMN_IDS = new Set<string>(["account"]);

/** Hide first → last when the users table overflows (account never hidden). */
export const SUBSCRIBERS_PAGE_COLUMN_HIDE_ORDER: readonly string[] = [
  "state",
  "created",
  "expiry",
  "autoRenew",
  "parents",
  "mac",
  "username",
  "name",
];

const HIDE_FUDGE_PX = 4;

export function measureSubscribersPageHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = SUBSCRIBERS_PAGE_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !SUBSCRIBERS_PAGE_PINNED_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-subscribers-page-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-subscribers-page-hidden", next);
    else scrollEl.removeAttribute("data-subscribers-page-hidden");
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
