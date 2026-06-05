/** Min widths (rem) — keep in sync with `staff-hub-responsive-table.css`. */
export const STAFF_HUB_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  username: 6,
  name: 4.75,
  credits: 4.5,
  dealerCount: 6.5,
  parentReseller: 4.75,
  createdAt: 5.75,
  status: 5,
  state: 8.5,
  type: 3.25,
  activeUsers: 3.75,
  expiredUsers: 4,
  totalUsers: 3.75,
};

/** Actions column width (rem) — menu + chevron only. */
export const STAFF_HUB_ACTIONS_MIN_WIDTH_REM = 4.25;

/** Hide last → first priority when space runs out (username never hidden). */
export const STAFF_HUB_COLUMN_HIDE_ORDER: readonly string[] = [
  "activeUsers",
  "expiredUsers",
  "state",
  "dealerCount",
  "parentReseller",
  "name",
  "totalUsers",
  "status",
  "credits",
  "type",
  "createdAt",
];

const HIDE_FUDGE_PX = 4;

/**
 * Hide columns only until the table fits the scroll area (no overflow).
 * Uses live scrollWidth vs clientWidth after each hide (via `data-staff-hidden` on scrollEl).
 */
export function measureStaffHubHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = STAFF_HUB_COLUMN_HIDE_ORDER.filter((id) => columnIds.includes(id));
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-staff-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-staff-hidden", next);
    else scrollEl.removeAttribute("data-staff-hidden");
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
