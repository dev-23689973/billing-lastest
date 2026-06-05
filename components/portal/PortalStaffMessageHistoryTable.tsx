import type { PortalStaffMessageRow } from "@/lib/repos/portalStaffMessages";
import { MessageHistoryExpandableRow } from "@/components/admin/MessageHistoryExpandableRow";
import { MessageHistoryTableScrollShell } from "@/components/admin/MessageHistoryTableScrollShell";
import { StaffMessageHistoryRowDetailsPanel } from "@/components/admin/StaffMessageHistoryRowDetailsPanel";
import {
  messageHistoryActionsHeaderCell,
  messageHistoryHeaderCell,
  staffMessageTd,
} from "@/components/admin/messageHistoryTableUi";
import { renderStaffMessageColumnCell, type StaffMessageHistoryColumnKey } from "@/components/admin/staffMessageHistoryTableCells";
import { dataTableStickyTh } from "@/lib/ui/dataTableSticky";
import {
  messageHistoryEmbeddedRowClass,
  messageHistoryEmbeddedTd,
  messageHistoryEmbeddedTh,
} from "@/lib/ui/messageHistoryTableCompact";
import {
  STAFF_MESSAGE_HISTORY_COLUMN_IDS,
  STAFF_MESSAGE_HISTORY_HIDE_ORDER,
  STAFF_MESSAGE_HISTORY_PINNED,
} from "@/lib/ui/messageHistoryComputeHiddenColumns";
import { MESSAGE_HISTORY_RESPONSIVE_TABLE_CLASS } from "@/lib/ui/messageHistoryResponsiveTable";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import { cn } from "@/lib/cn";

const STAFF_COLS = STAFF_MESSAGE_HISTORY_COLUMN_IDS;
const STAFF_TRAIL_FILL_COL: StaffMessageHistoryColumnKey = "sentAt";

const STAFF_HEADER_SHORT: Record<StaffMessageHistoryColumnKey, string> = {
  title: "Title",
  message: "Msg",
  audience: "Aud",
  priority: "Pri",
  sentBy: "By",
  recipients: "#",
  dismissed: "Dis",
  read: "Rd",
  sentAt: "At",
};

const STAFF_HEADER_FULL: Record<StaffMessageHistoryColumnKey, string> = {
  title: "Title",
  message: "Message",
  audience: "Audience",
  priority: "Priority",
  sentBy: "Sent by",
  recipients: "Recipients",
  dismissed: "Dismissed",
  read: "Read",
  sentAt: "Sent at",
};

function audienceLabel(audienceType: string): string {
  switch (audienceType) {
    case "all_staff":
      return "All staff";
    case "managers":
      return "Managers";
    case "resellers":
      return "Resellers";
    case "dealers":
      return "Dealers";
    case "downstream_all":
      return "Downstream";
    case "downstream_resellers":
      return "Resellers";
    case "downstream_dealers":
      return "Dealers";
    case "custom":
      return "Custom";
    default:
      return audienceType.replace(/_/g, " ");
  }
}

function StaffMessageTable({ rows, embedded = false }: { rows: PortalStaffMessageRow[]; embedded?: boolean }) {
  const th = (className?: string) =>
    embedded
      ? messageHistoryEmbeddedTh(className)
      : dataTableStickyTh(cn("whitespace-nowrap", className), "comfortable");
  const td = (className?: string, truncate = true) =>
    embedded ? messageHistoryEmbeddedTd(className, { truncate }) : cn("whitespace-nowrap px-4 py-2.5", className);

  const rowClass = embedded
    ? messageHistoryEmbeddedRowClass
    : "border-b border-border/50 transition-colors hover:bg-muted/25";

  if (embedded) {
    const colSpan = STAFF_COLS.length + 1;
    return (
      <MessageHistoryTableScrollShell
        columnIds={STAFF_COLS}
        hideOrder={STAFF_MESSAGE_HISTORY_HIDE_ORDER}
        pinnedColumnIds={STAFF_MESSAGE_HISTORY_PINNED}
        layout="staff"
        className="app-data-table-scroll min-h-0 flex-1 [--app-data-table-max-h:100%]"
      >
        <table className={MESSAGE_HISTORY_RESPONSIVE_TABLE_CLASS}>
          <thead>
            <tr>
              {STAFF_COLS.map((col) => (
                <th
                  key={col}
                  className={messageHistoryHeaderCell(
                    col,
                    col === "recipients" || col === "dismissed" || col === "read" ? "text-center" : undefined,
                    col === STAFF_TRAIL_FILL_COL,
                  )}
                >
                  {responsiveTableColumnHeader(STAFF_HEADER_SHORT[col], STAFF_HEADER_FULL[col])}
                </th>
              ))}
              <th className={messageHistoryActionsHeaderCell("text-center")}>
                <span className="sr-only">Row details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-2 py-5 text-center text-[11px] text-muted-foreground">
                  No staff messages in this list.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const titleText = (row.title ?? "").trim();
              const bodyPreview = (row.body ?? "").trim();
              return (
                <MessageHistoryExpandableRow
                  key={row.id}
                  colSpan={colSpan}
                  expandPersistId={`staff-msg:${row.id}`}
                  details={
                    <StaffMessageHistoryRowDetailsPanel row={row} tableColumnIds={STAFF_COLS} />
                  }
                >
                  {STAFF_COLS.map((col) => {
                    const cellExtra =
                      col === "recipients" || col === "dismissed" || col === "read"
                        ? "text-center tabular-nums"
                        : col === "sentBy" || col === "sentAt"
                          ? "text-muted-foreground"
                          : "text-foreground";
                    return (
                      <td
                        key={col}
                        className={staffMessageTd(col, cellExtra)}
                        title={
                          col === "title"
                            ? titleText || undefined
                            : col === "message"
                              ? bodyPreview || undefined
                              : col === "audience"
                              ? audienceLabel(row.audienceType)
                              : col === "sentBy"
                                ? row.sentBy || undefined
                                : col === "sentAt"
                                  ? row.createdAt || undefined
                                  : undefined
                        }
                      >
                        {col === "message" || col === "title" ? (
                          <span className="message-history-cell-truncate">
                            {renderStaffMessageColumnCell(col, row)}
                          </span>
                        ) : (
                          renderStaffMessageColumnCell(col, row)
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
          <th className={th()}>Title</th>
          <th className={th()}>Message</th>
          <th className={th()}>Audience</th>
          <th className={th()}>Priority</th>
          <th className={th()}>Sent by</th>
          <th className={th("text-center")}>Recipients</th>
          <th className={th("text-center")}>Dismissed</th>
          <th className={th("text-center")}>Read</th>
          <th className={th()}>Sent at</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-5 py-14 text-center text-sm text-muted-foreground sm:px-6">
              No staff messages in this list.
            </td>
          </tr>
        ) : null}
        {rows.map((row) => {
          const titleText = (row.title ?? "").trim();
          const titleShort = titleText.length > 48 ? `${titleText.slice(0, 45)}…` : titleText;
          const bodyPreview = (row.body ?? "").trim();
          const bodyShort = bodyPreview.length > 48 ? `${bodyPreview.slice(0, 45)}…` : bodyPreview;
          return (
            <tr key={row.id} className={rowClass}>
              <td className={td("text-foreground")} title={titleText || undefined}>
                <span className="line-clamp-2">{titleShort || "—"}</span>
              </td>
              <td className={td("text-foreground")} title={bodyPreview || undefined}>
                <span className="line-clamp-2">{bodyShort || "—"}</span>
              </td>
              <td className={td("text-muted-foreground")} title={audienceLabel(row.audienceType)}>
                {audienceLabel(row.audienceType)}
              </td>
              <td className={td(undefined, false)}>{renderStaffMessageColumnCell("priority", row)}</td>
              <td className={td("text-muted-foreground")} title={row.sentBy || undefined}>
                {row.sentBy || "—"}
              </td>
              <td className={td("text-center tabular-nums text-foreground", false)}>
                {renderStaffMessageColumnCell("recipients", row)}
              </td>
              <td className={td("text-center tabular-nums text-muted-foreground", false)}>
                {renderStaffMessageColumnCell("dismissed", row)}
              </td>
              <td className={td("text-center tabular-nums text-muted-foreground", false)}>
                {renderStaffMessageColumnCell("read", row)}
              </td>
              <td className={td("text-muted-foreground")} title={row.createdAt || undefined}>
                {row.createdAt || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PortalStaffMessageHistoryTable({
  rows,
  embedded = false,
}: {
  rows: PortalStaffMessageRow[];
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StaffMessageTable rows={rows} embedded />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="border-b border-border/60 bg-muted/5 px-5 py-4 sm:px-7">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Staff messages</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Portal popups sent to staff in your hierarchy (newest first).
        </p>
      </div>
      <div className="app-data-table-scroll thin-scrollbar max-h-[min(70vh,720px)] overflow-auto p-2 pb-6 sm:p-0">
        <StaffMessageTable rows={rows} />
      </div>
    </div>
  );
}
