/** Min widths (rem) — keep in sync with `admin-list-modal-responsive-table.css`. */
export const ADMIN_LIST_MODAL_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  username: 5.5,
  name: 4.75,
  credits: 3.5,
  dealerCount: 5.5,
  parentReseller: 4.75,
  status: 3.75,
  state: 7.5,
  type: 3.25,
  activeUsers: 3.75,
  expiredUsers: 4,
  totalUsers: 3.75,
};

/** Never hide — same role as `type` on the transactions modal (one identity column). */
export const ADMIN_LIST_MODAL_PINNED_COLUMN_IDS = new Set<string>(["username"]);

/** Hide first → last when the modal overflows (username + chevron stay visible). */
export const ADMIN_LIST_MODAL_COLUMN_HIDE_ORDER: readonly string[] = [
  "totalUsers",
  "expiredUsers",
  "activeUsers",
  "state",
  "dealerCount",
  "parentReseller",
  "name",
  "type",
  "status",
  "credits",
];

const HIDE_FUDGE_PX = 4;

export function measureAdminListModalHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = ADMIN_LIST_MODAL_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !ADMIN_LIST_MODAL_PINNED_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-list-modal-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-list-modal-hidden", next);
    else scrollEl.removeAttribute("data-list-modal-hidden");
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
