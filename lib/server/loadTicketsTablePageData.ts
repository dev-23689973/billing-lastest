import {
  getTicketTableRowById,
  listTicketsTablePaged,
  type TicketTablePagedInput,
  type TicketTablePagedResult,
} from "@/lib/repos/ticketsTablePaged";
import { portalTicketRoleFromSessionType } from "@/lib/repos/tickets";
import type { TicketDashboardTableRow } from "@/lib/repos/tickets";

export type TicketsTablePageData = TicketTablePagedResult & {
  focusRow: TicketDashboardTableRow | null;
  /** Set when the table query failed (SSR would otherwise show 0 rows with no message). */
  loadError?: string;
};

export type TicketsTablePageLoadInput = {
  viewer: { type: "ROOT" | "MNGR" | "SRSLR" | "RSLR"; username: string };
  q?: string;
  status?: string;
  priority?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  ticketId?: number;
};

function tableScope(viewer: TicketsTablePageLoadInput["viewer"]): TicketTablePagedInput["scope"] | null {
  if (viewer.type === "ROOT") return "admin";
  const role = portalTicketRoleFromSessionType(viewer.type);
  if (!role) return null;
  return { username: viewer.username.trim(), role };
}

export async function loadTicketsTablePageData(input: TicketsTablePageLoadInput): Promise<TicketsTablePageData> {
  const scope = tableScope(input.viewer);
  if (!scope) {
    return { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1, focusRow: null };
  }

  const tableInput: TicketTablePagedInput = {
    scope,
    q: input.q?.trim() || undefined,
    status: input.status?.trim() || undefined,
    priority: input.priority?.trim() || undefined,
    sort: input.sort?.trim() || undefined,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 25,
  };

  try {
    const result = await listTicketsTablePaged(tableInput);
    let focusRow: TicketDashboardTableRow | null = null;
    const ticketId = Number(input.ticketId ?? 0);
    if (Number.isFinite(ticketId) && ticketId > 0) {
      const onPage = result.rows.some((r) => r.id === ticketId);
      if (!onPage) {
        focusRow = await getTicketTableRowById(tableInput, ticketId);
      }
    }
    return { ...result, focusRow };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("loadTicketsTablePageData failed:", error);
    return {
      rows: [],
      total: 0,
      page: 1,
      pageSize: tableInput.pageSize ?? 25,
      totalPages: 1,
      focusRow: null,
      loadError: message,
    };
  }
}
