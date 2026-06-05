/** Min widths (rem) — keep in sync with `subscribers-fetch-modal-responsive-table.css`. */
export const SUBSCRIBERS_FETCH_MODAL_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  account: 5.5,
  user: 7,
  hierarchy: 8,
  package: 8,
  mac: 7,
  ip: 5,
  autoRenew: 9.5,
  status: 4.5,
  expires: 8,
  device: 7.5,
};

/** Primary row identifier — never hidden (same role as `account` / `type` on other modals). */
export const SUBSCRIBERS_FETCH_MODAL_PINNED_COLUMN_IDS = new Set<string>(["account"]);

/** Hide first → last when the modal table overflows. */
export const SUBSCRIBERS_FETCH_MODAL_COLUMN_HIDE_ORDER: readonly string[] = [
  "device",
  "autoRenew",
  "ip",
  "mac",
  "expires",
  "hierarchy",
  "user",
  "package",
  "status",
];

const HIDE_FUDGE_PX = 4;

export function measureSubscribersFetchModalHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = SUBSCRIBERS_FETCH_MODAL_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !SUBSCRIBERS_FETCH_MODAL_PINNED_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-subscribers-modal-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-subscribers-modal-hidden", next);
    else scrollEl.removeAttribute("data-subscribers-modal-hidden");
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
