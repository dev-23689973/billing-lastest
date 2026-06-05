const HIDE_FUDGE_PX = 4;

export function measureMessageHistoryHiddenColumns(
  scrollEl: HTMLElement,
  columnIds: readonly string[],
  hideOrder: readonly string[],
  pinnedColumnIds: ReadonlySet<string>,
): string[] {
  const order = hideOrder.filter((id) => columnIds.includes(id) && !pinnedColumnIds.has(id));
  const hidden: string[] = [];

  const applyHidden = (cols: string[]) => {
    const next = cols.length > 0 ? cols.join(" ") : null;
    const cur = scrollEl.getAttribute("data-message-history-hidden");
    if (next === cur || (next == null && cur == null)) return;
    if (next) scrollEl.setAttribute("data-message-history-hidden", next);
    else scrollEl.removeAttribute("data-message-history-hidden");
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

/** Staff message history — keep in sync with `message-history-responsive-table.css`. */
export const STAFF_MESSAGE_HISTORY_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  title: 7,
  message: 8,
  audience: 4.5,
  priority: 5.5,
  sentBy: 4.5,
  recipients: 3.25,
  dismissed: 3.25,
  read: 3.25,
  sentAt: 7,
};

export const STAFF_MESSAGE_HISTORY_PINNED = new Set<string>(["title", "message", "priority"]);

export const STAFF_MESSAGE_HISTORY_HIDE_ORDER: readonly string[] = [
  "sentAt",
  "read",
  "dismissed",
  "recipients",
  "sentBy",
  "audience",
];

export const STAFF_MESSAGE_HISTORY_COLUMN_IDS = [
  "title",
  "message",
  "audience",
  "priority",
  "sentBy",
  "recipients",
  "dismissed",
  "read",
  "sentAt",
] as const;

/** STB (subscriber) message history. */
export const STB_MESSAGE_HISTORY_COLUMN_MIN_WIDTH_REM: Record<string, number> = {
  recipient: 7.5,
  title: 7,
  message: 6,
  priority: 5.5,
  sentBy: 4.5,
  sentAt: 7,
  status: 4.5,
};

export const STB_MESSAGE_HISTORY_PINNED = new Set<string>(["recipient", "title", "message"]);

export const STB_MESSAGE_HISTORY_HIDE_ORDER: readonly string[] = [
  "sentAt",
  "status",
  "sentBy",
  "priority",
];

export const STB_MESSAGE_HISTORY_COLUMN_IDS = [
  "recipient",
  "title",
  "message",
  "priority",
  "sentBy",
  "sentAt",
  "status",
] as const;
