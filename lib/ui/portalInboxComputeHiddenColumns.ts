const HIDE_FUDGE_PX = 4;

/** Min widths (rem) — keep in sync with `portal-inbox-responsive-table.css`. */
export const PORTAL_INBOX_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  title: 5.5,
  message: 6,
  from: 4.75,
  status: 5.25,
  sentAt: 6.25,
};

/** Actions: checkbox + view + expand chevron. */
export const PORTAL_INBOX_ACTIONS_MIN_WIDTH_REM = 5.5;

/** Hide last → first when the table overflows (message stays visible). */
export const PORTAL_INBOX_COLUMN_HIDE_ORDER: readonly string[] = ["sentAt", "from", "status"];

export const PORTAL_INBOX_PINNED = new Set<string>(["title", "message"]);

export const PORTAL_INBOX_COLUMN_IDS = ["title", "message", "from", "status", "sentAt"] as const;

export type PortalInboxColumnKey = (typeof PORTAL_INBOX_COLUMN_IDS)[number];

export function measurePortalInboxHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
): string[] {
  const order = PORTAL_INBOX_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !PORTAL_INBOX_PINNED.has(id),
  );
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-portal-inbox-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-portal-inbox-hidden", next);
    else scrollEl.removeAttribute("data-portal-inbox-hidden");
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
