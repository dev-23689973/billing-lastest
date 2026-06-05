export const TICKETS_QUEUE_PINNED_COLUMN_IDS = new Set<string>(["subject", "content", "status"]);
export const TICKETS_QUEUE_COLUMN_HIDE_ORDER: readonly string[] = [
  "updated",
  "created",
  "comments",
  "assignedAgent",
  "createdBy",
  "channel",
  "category",
  "priority",
];
const HIDE_FUDGE_PX = 4;

export function measureTicketsQueueHiddenColumns(scrollEl: HTMLElement, columnIds: readonly string[]): string[] {
  const order = TICKETS_QUEUE_COLUMN_HIDE_ORDER.filter(
    (id) => columnIds.includes(id) && !TICKETS_QUEUE_PINNED_COLUMN_IDS.has(id),
  );
  const hidden: string[] = [];
  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-tickets-queue-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-tickets-queue-hidden", next);
    else scrollEl.removeAttribute("data-tickets-queue-hidden");
  };
  applyHidden([]);
  scrollEl.scrollLeft = 0;
  for (const col of order) {
    if (scrollEl.scrollWidth <= scrollEl.clientWidth + HIDE_FUDGE_PX) break;
    hidden.push(col);
    applyHidden(hidden);
  }
  applyHidden(hidden);
  return hidden;
}
