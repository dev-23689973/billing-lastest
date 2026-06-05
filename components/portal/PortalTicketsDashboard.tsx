import { PortalTicketsKpiCollapsible } from "@/components/portal/PortalTicketsKpiCollapsible";
import { getCachedAdminTicketStatusOverview } from "@/lib/dashboard/cachedDashboardQueries";
import { getCachedPortalTicketOverview } from "@/lib/dashboard/cachedPortalDashboardQueries";
import { getPortalTicketScope, getTicketDashboardStats, listTvGenres } from "@/lib/repos/tickets";
import { loadTicketsTablePageData } from "@/lib/server/loadTicketsTablePageData";
import { PortalTicketsTableClient } from "@/components/portal/PortalTicketsTableClient";

export async function PortalTicketsDashboard({
  portalBase,
  filters,
  viewer,
}: {
  portalBase: "/manager" | "/reseller" | "/dealer" | "/admin";
  viewer: { type: "ROOT" | "MNGR" | "SRSLR" | "RSLR"; username: string };
  filters?: {
    q?: string;
    status?: string;
    priority?: string;
    sort?: string;
    ticket?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const role =
    viewer.type === "MNGR" ? "MNGR" : viewer.type === "SRSLR" ? "SRSLR" : viewer.type === "RSLR" ? "RSLR" : null;
  const q = (filters?.q ?? "").trim();
  const statusFilter = (filters?.status ?? "").trim();
  const priorityFilter = (filters?.priority ?? "").trim();
  const sortFilter = (filters?.sort ?? "updated_desc").trim();
  const page = Math.max(1, Number.parseInt((filters?.page ?? "").trim(), 10) || 1);
  const pageSizeRaw = Number.parseInt((filters?.pageSize ?? "").trim(), 10);
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 25;
  const initialTicketId = Number((filters?.ticket ?? "").trim());
  const openTicketId =
    Number.isFinite(initialTicketId) && initialTicketId > 0 ? initialTicketId : undefined;

  const portalScope = role ? await getPortalTicketScope(viewer.username, role) : null;

  const [overview, genres, stats, initialTable] = await Promise.all([
    role
      ? getCachedPortalTicketOverview(viewer.username, role)
      : getCachedAdminTicketStatusOverview(),
    listTvGenres(),
    role ? Promise.resolve<{ totalTickets: number }>({ totalTickets: 0 }) : getTicketDashboardStats(),
    loadTicketsTablePageData({
      viewer,
      q,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      sort: sortFilter,
      page,
      pageSize,
      ticketId: openTicketId,
    }),
  ]);
  const displayTotal = role ? overview.grandTotal : stats.totalTickets;

  const buildSortHref = (nextSort: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (statusFilter) sp.set("status", statusFilter);
    if (priorityFilter) sp.set("priority", priorityFilter);
    if (page > 1) sp.set("page", String(page));
    if (pageSize !== 25) sp.set("pageSize", String(pageSize));
    sp.set("sort", nextSort);
    return `${portalBase}/tickets/dashboard?${sp.toString()}`;
  };
  const sortToggleHref = (ascKey: string, descKey: string) =>
    buildSortHref(sortFilter === descKey ? ascKey : descKey);
  const headerSortHrefs = {
    subject: sortToggleHref("subject_asc", "subject_desc"),
    category: sortToggleHref("category_asc", "category_desc"),
    priority: sortToggleHref("priority_asc", "priority_desc"),
    status: sortToggleHref("status_asc", "status_desc"),
    comments: sortToggleHref("comments_asc", "comments_desc"),
    created: sortToggleHref("created_asc", "created_desc"),
    updated: sortToggleHref("updated_asc", "updated_desc"),
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-none flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 pb-2 sm:gap-4 sm:px-5 sm:pt-5 sm:pb-3 lg:px-6 lg:pt-6 lg:pb-4">
      <section className="shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card p-2.5 transition-colors duration-200">
        <PortalTicketsKpiCollapsible
          overview={overview}
          displayTotal={displayTotal}
          portalBase={portalBase}
          activeStatusFilter={statusFilter}
          preservedQuery={{ q: q || undefined, priority: priorityFilter || undefined, sort: sortFilter || undefined }}
        />
      </section>
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-transparent transition-colors duration-200">
        <PortalTicketsTableClient
          portalBase={portalBase}
          genres={genres}
          canCreateTickets={portalScope?.canCreateTickets ?? false}
          initialSearch={q}
          initialStatusFilter={statusFilter}
          initialPriorityFilter={priorityFilter}
          sortFilter={sortFilter}
          headerSortHrefs={headerSortHrefs}
          initialTicketId={openTicketId}
          initialPage={page}
          initialPageSize={String(pageSize)}
          initialTable={initialTable}
        />
      </section>
    </div>
  );
}
