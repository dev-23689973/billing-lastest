import { Eye } from "lucide-react";
import type { AdminRecentStalkerSendMessageRow } from "@/lib/repos/billing";
import { MessageHistoryExpandableRow } from "@/components/admin/MessageHistoryExpandableRow";
import { MessageHistoryTableScrollShell } from "@/components/admin/MessageHistoryTableScrollShell";
import { StbMessageHistoryRowDetailsPanel } from "@/components/admin/StbMessageHistoryRowDetailsPanel";
import {
  messageHistoryActionsHeaderCell,
  messageHistoryHeaderCell,
  stbMessageTd,
} from "@/components/admin/messageHistoryTableUi";
import { renderStbMessageColumnCell, type StbMessageHistoryColumnKey } from "@/components/admin/stbMessageHistoryTableCells";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  messageHistoryEmbeddedRowClass,
  messageHistoryEmbeddedTd,
  messageHistoryEmbeddedTh,
} from "@/lib/ui/messageHistoryTableCompact";
import {
  STB_MESSAGE_HISTORY_COLUMN_IDS,
  STB_MESSAGE_HISTORY_HIDE_ORDER,
  STB_MESSAGE_HISTORY_PINNED,
} from "@/lib/ui/messageHistoryComputeHiddenColumns";
import { MESSAGE_HISTORY_RESPONSIVE_TABLE_CLASS } from "@/lib/ui/messageHistoryResponsiveTable";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import { cn } from "@/lib/cn";

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

type StbMessageHistoryTableProps = {
  rows: AdminRecentStalkerSendMessageRow[];
  sentByLabel: string;
  stalkerShellLoading: boolean;
  recentLoadedCount: number;
  recipients30d: number;
  filteredCount: number;
  embedded?: boolean;
  onViewDetail: (row: AdminRecentStalkerSendMessageRow) => void;
};

const STB_COLS = STB_MESSAGE_HISTORY_COLUMN_IDS;
/** Absorbs extra width on wide viewports — message text, not status pills. */
const STB_TRAIL_FILL_COL: StbMessageHistoryColumnKey = "message";

const STB_HEADER_SHORT: Record<StbMessageHistoryColumnKey, string> = {
  recipient: "To",
  title: "Title",
  message: "Msg",
  priority: "Pri",
  sentBy: "By",
  sentAt: "Time",
  status: "St",
};

const STB_HEADER_FULL: Record<StbMessageHistoryColumnKey, string> = {
  recipient: "Recipient",
  title: "Title",
  message: "Message",
  priority: "Priority",
  sentBy: "Sent by",
  sentAt: "Timestamp",
  status: "Status",
};

function StbTable({
  rows,
  sentByLabel,
  stalkerShellLoading,
  recentLoadedCount,
  recipients30d,
  filteredCount,
  embedded,
  onViewDetail,
}: StbMessageHistoryTableProps) {
  const th = (className?: string) =>
    embedded
      ? messageHistoryEmbeddedTh(className)
      : dataTableStickyTh(cn("whitespace-nowrap", className), "comfortable");
  const td = (className?: string, truncate = true) =>
    embedded ? messageHistoryEmbeddedTd(className, { truncate }) : cn("whitespace-nowrap px-4 py-2.5", className);

  const rowClass = embedded
    ? messageHistoryEmbeddedRowClass
    : "border-b border-border/45 transition-colors duration-150 hover:bg-muted/18 even:bg-muted/[0.03]";

  const emptyState = (
    <>
      {stalkerShellLoading ? (
        "Loading STB message history…"
      ) : recentLoadedCount === 0 && recipients30d > 0 ? (
        <span className="mx-auto block max-w-md space-y-1">
          <span className="block">
            The overview shows {formatInt(recipients30d)} device messages for your subscribers. None appear in this list — try refreshing the page or contact your administrator.
          </span>
        </span>
      ) : (
        "No messages match the current filters."
      )}
    </>
  );

  if (embedded) {
    const colSpan = STB_COLS.length + 1;
    return (
      <MessageHistoryTableScrollShell
        columnIds={STB_COLS}
        hideOrder={STB_MESSAGE_HISTORY_HIDE_ORDER}
        pinnedColumnIds={STB_MESSAGE_HISTORY_PINNED}
        layout="stb"
        className="app-data-table-scroll min-h-0 flex-1 [--app-data-table-max-h:100%]"
      >
        <table className={MESSAGE_HISTORY_RESPONSIVE_TABLE_CLASS}>
          <thead>
            <tr>
              {STB_COLS.map((col) => (
                <th key={col} className={messageHistoryHeaderCell(col, undefined, col === STB_TRAIL_FILL_COL)}>
                  {responsiveTableColumnHeader(STB_HEADER_SHORT[col], STB_HEADER_FULL[col])}
                </th>
              ))}
              <th className={messageHistoryActionsHeaderCell("text-center")}>
                <span className="sr-only">Actions</span>
                <Eye className="mx-auto inline h-3 w-3 opacity-60" aria-hidden />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCount === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-2 py-5 text-center text-[11px] text-muted-foreground">
                  {emptyState}
                </td>
              </tr>
            ) : null}
            {rows.map((row, i) => {
              const titlePreview = (row.title ?? "").trim();
              const preview = (row.msg ?? "").trim();
              return (
                <MessageHistoryExpandableRow
                  key={`${row.uid}-${row.addtime}-${i}`}
                  colSpan={colSpan}
                  expandPersistId={`stb-msg:${row.uid}:${row.addtime}:${i}`}
                  actions={
                    <button
                      type="button"
                      onClick={() => onViewDetail(row)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-background text-foreground transition hover:bg-muted/25"
                      aria-label="View detail"
                      title="View detail"
                    >
                      <Eye className="h-3 w-3" aria-hidden />
                    </button>
                  }
                  details={
                    <StbMessageHistoryRowDetailsPanel
                      row={row}
                      sentByLabel={sentByLabel}
                      tableColumnIds={STB_COLS}
                    />
                  }
                >
                  {STB_COLS.map((col) => {
                    const cellExtra =
                      col === "recipient"
                        ? "font-mono text-foreground"
                        : col === "sentBy" || col === "sentAt"
                          ? "text-muted-foreground"
                          : "text-foreground";
                    return (
                      <td
                        key={col}
                        className={stbMessageTd(col, cellExtra)}
                        title={
                          col === "recipient"
                            ? row.login ?? `uid:${row.uid}`
                            : col === "title"
                              ? titlePreview || undefined
                              : col === "message"
                                ? preview || undefined
                                : col === "sentBy"
                                  ? sentByLabel
                                  : col === "sentAt"
                                    ? row.addtime ?? undefined
                                    : undefined
                        }
                      >
                        {col === "title" || col === "message" ? (
                          <span className="message-history-cell-truncate">
                            {renderStbMessageColumnCell(col, row, sentByLabel)}
                          </span>
                        ) : (
                          renderStbMessageColumnCell(col, row, sentByLabel)
                        )}
                      </td>
                    );
                  })}
                </MessageHistoryExpandableRow>
              );
            })}
          </tbody>
        </table>
      </MessageHistoryTableScrollShell>
    );
  }

  return (
    <table className={cn("border-collapse", "w-full min-w-[720px] text-sm")}>
      <thead>
        <tr>
          <th className={th()}>Recipient</th>
          <th className={th()}>Title</th>
          <th className={th()}>Message</th>
          <th className={th()}>Priority</th>
          <th className={th()}>Sent by</th>
          <th className={th()}>Timestamp</th>
          <th className={th()}>Status</th>
          <th className={th("text-right !overflow-visible")}>Detail</th>
        </tr>
      </thead>
      <tbody>
        {filteredCount === 0 ? (
          <tr>
            <td colSpan={8} className="px-5 py-14 text-center text-sm text-muted-foreground sm:px-6">
              {emptyState}
            </td>
          </tr>
        ) : null}
        {rows.map((row, i) => {
          const titlePreview = (row.title ?? "").trim();
          const preview = (row.msg ?? "").trim();
          const shortTitle = titlePreview.length > 32 ? `${titlePreview.slice(0, 29)}…` : titlePreview;
          const short = preview.length > 48 ? `${preview.slice(0, 45)}…` : preview;
          const recipient = row.login ?? `uid:${row.uid}`;
          return (
            <tr key={`${row.uid}-${row.addtime}-${i}`} className={rowClass}>
              <td className={td("font-mono")} title={row.login ?? `uid:${row.uid}`}>
                {recipient}
              </td>
              <td className={td("text-foreground")} title={titlePreview || undefined}>
                {shortTitle || "—"}
              </td>
              <td className={td("text-foreground")} title={preview || undefined}>
                {short || "—"}
              </td>
              <td className={td(undefined, false)}>{renderStbMessageColumnCell("priority", row, sentByLabel)}</td>
              <td className={td("text-muted-foreground")} title={sentByLabel}>
                {sentByLabel}
              </td>
              <td className={td("text-muted-foreground")} title={row.addtime ?? undefined}>
                {row.addtime ?? "—"}
              </td>
              <td className={td(undefined, false)}>{renderStbMessageColumnCell("status", row, sentByLabel)}</td>
              <td className={td("text-right", false)}>
                <button
                  type="button"
                  onClick={() => onViewDetail(row)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background text-foreground transition hover:bg-muted/25"
                  aria-label="View detail"
                  title="View detail"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function StbMessageHistoryTable(props: StbMessageHistoryTableProps) {
  if (props.embedded) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StbTable {...props} />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <StbTable {...props} />
    </div>
  );
}
