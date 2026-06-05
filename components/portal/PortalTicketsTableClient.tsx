"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Flag,
  FileText,
  MessageSquareText,
  MoreVertical,
  Plus,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TicketPlus,
  Trash2,
  X,
} from "lucide-react";
import { ResellersTablePagination } from "@/components/admin/ResellersTablePagination";
import {
  ticketPriorityBadgeClass,
  ticketPriorityLabel,
  ticketStatusBadgeClass,
  ticketStatusLabel,
} from "@/lib/ui/ticketBadges";
import {
  adminListTableToolbarSearchFieldEmbeddedClass,
  adminListTableToolbarSearchIconEmbeddedClass,
  adminListTableBulkMenuItemClass,
  adminListTableBulkMenuItemDestructiveClass,
  managersToolbarDropdownPanelClass,
  deductionsHudDividerClass,
  managersToolbarIconButtonClass,
  managersToolbarPrimaryButtonClass,
  managersToolbarMenuSurfaceClass,
  managersToolbarFormInputClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { MessageModalField, MessageModalShell } from "@/components/messages/MessageModalShell";
import {
  messageComposeSelectContentClass,
  messageComposeSelectItemClass,
  messageComposeSelectTriggerClass,
  messageModalComposeBodyScrollMaxHeightClass,
  messageModalComposeShellMaxHeightClass,
  messageModalGlassPanelClass,
  messageModalSectionLabelClass,
  messageModalTextareaClass,
} from "@/components/messages/messageModalChrome";
import { Button } from "@/components/ui/button";
import { FormSelect, type FormSelectOption } from "@/components/forms/form-select";
import { SearchableFormSelect } from "@/components/forms/SearchableFormSelect";
import { SearchableMultiFormSelect } from "@/components/forms/SearchableMultiFormSelect";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS } from "@/lib/subscriberFilterSelectOptions";
import {
  TicketsQueueExpandableRow,
} from "@/components/portal/TicketsQueueExpandableRow";
import { TicketsQueueRowDetailsPanel } from "@/components/portal/TicketsQueueRowDetailsPanel";
import { TicketsQueueTableScrollShell } from "@/components/portal/TicketsQueueTableScrollShell";
import {
  ticketsQueueHasExpandPanel,
  ticketsQueueTableColumnIds,
} from "@/components/portal/ticketsQueueBuildRowDetails";
import {
  renderTicketsQueueColumnCell,
  TICKETS_QUEUE_COL_ORDER,
  TICKETS_QUEUE_COLUMN_LABELS,
  type TicketsQueueColumnKey,
} from "@/components/portal/ticketsQueueTableCells";
import {
  ticketsQueueActionsHeaderCell,
  ticketsQueueDataCell,
  ticketsQueueHeaderCell,
} from "@/components/portal/ticketsQueueTableUi";
import { responsiveTableColumnHeader } from "@/lib/ui/responsiveTableColumnHeader";
import {
  floatingColumnPickerCheckBoxClass,
  floatingColumnPickerCheckClass,
  floatingColumnPickerMenuHeaderClass,
  floatingColumnPickerMenuItemClass,
  floatingPopoverMenuPanelClass,
  floatingRowActionMenuPanelClass,
} from "@/lib/ui/floatingActionMenu";
import type { ItvChannelRow, TicketDashboardTableRow, TvGenreRow } from "@/lib/repos/tickets";
import type { TicketsTablePageData } from "@/lib/server/loadTicketsTablePageData";
import {
  createTicketAction,
  loadTicketChannelsAction,
  loadTicketCommentsAction,
  loadTicketsTableAction,
  manageTicketAction,
  postTicketCommentAction,
} from "@/actions/clientData";
import {
  TICKETS_QUEUE_RESPONSIVE_TABLE_CLASS,
  TICKETS_QUEUE_TRAIL_FILL_COLUMN_ID,
} from "@/lib/ui/ticketsQueueResponsiveTable";

type ColumnKey =
  | "subject"
  | "category"
  | "channel"
  | "createdBy"
  | "assignedAgent"
  | "priority"
  | "status"
  | "content"
  | "comments"
  | "created"
  | "updated"
  | "actions";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  ...TICKETS_QUEUE_COL_ORDER.map((key) => ({
    key,
    label: TICKETS_QUEUE_COLUMN_LABELS[key],
  })),
  { key: "actions", label: "Actions" },
];

const COLUMN_SHORT_LABELS: Record<ColumnKey, string> = {
  subject: "Subj",
  category: "Cat",
  channel: "Ch",
  createdBy: "By",
  assignedAgent: "Agnt",
  priority: "Pri",
  status: "St",
  content: "Body",
  comments: "Cmt",
  created: "Cr",
  updated: "Up",
  actions: "Act",
};

function ticketColumnLabel(key: ColumnKey) {
  const full = COLUMNS.find((c) => c.key === key)?.label ?? key;
  return responsiveTableColumnHeader(COLUMN_SHORT_LABELS[key], full);
}

function cellTitle(value: string | null | undefined): string | undefined {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : undefined;
}

const STATUS_OPTIONS: FormSelectOption[] = [
  { value: "", label: "Status: All" },
  { value: "1", label: "In progress" },
  { value: "2", label: "Fixed" },
  { value: "3", label: "Re-opened" },
];

const PRIORITY_OPTIONS: FormSelectOption[] = [
  { value: "", label: "Priority: All" },
  { value: "1", label: "High" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Low" },
];

const VIEW_OPTIONS: FormSelectOption[] = PAGE_SIZE_OPTIONS.map((o) => ({
  value: o.value,
  label: `View: ${o.label}`,
}));

const ticketFilterSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[8.5rem] shrink-0 sm:min-w-[9rem]",
);

const ticketViewSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[6.25rem] shrink-0 sm:min-w-[6.5rem]",
);

function ticketPageSizeNumber(pageSize: string): number {
  const n = Number.parseInt(pageSize, 10);
  return PAGE_SIZE_OPTIONS.some((o) => o.value === pageSize) && Number.isFinite(n) ? n : 25;
}

function formatTicketTs(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Date(n * 1000).toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TicketDetailCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 bg-background/30 px-3 py-2.5 dark:bg-slate-950/35", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/90">{label}</p>
      <div className="mt-1 min-w-0 text-sm leading-snug text-foreground">{children}</div>
    </div>
  );
}

function TicketStatusPill({ statusId }: { statusId: number }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        ticketStatusBadgeClass(statusId),
      )}
    >
      {ticketStatusLabel(statusId)}
    </span>
  );
}

function TicketPriorityPill({ priorityId }: { priorityId: number }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        ticketPriorityBadgeClass(priorityId),
      )}
    >
      {ticketPriorityLabel(priorityId)}
    </span>
  );
}

function TicketInformationPanel({ ticket }: { ticket: TicketDashboardTableRow }) {
  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-border/50 shadow-sm", "dark:border-white/[0.08]")}
      aria-label="Ticket details"
    >
      <div className="border-b border-border/40 bg-muted/20 px-3 py-1.5 dark:bg-white/[0.04]">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
      </div>
      <div className="grid divide-y divide-border/40">
        <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:divide-y-0">
        <TicketDetailCell label="Channel">
          <span className="block truncate font-medium">{ticket.channelName || "—"}</span>
        </TicketDetailCell>
        <TicketDetailCell label="Created by">
          <span className="block truncate font-medium">{ticket.creatorUsername || "—"}</span>
        </TicketDetailCell>
        <TicketDetailCell label="Agent">
          <span className="block truncate font-medium">{ticket.agentUsername || "—"}</span>
        </TicketDetailCell>
        <TicketDetailCell label="Status">
          <TicketStatusPill statusId={ticket.status_id} />
        </TicketDetailCell>
        <TicketDetailCell label="Priority" className="sm:col-span-2 lg:col-span-1">
          <TicketPriorityPill priorityId={ticket.priority_id} />
        </TicketDetailCell>
        </div>
        <TicketDetailCell label="Timeline">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-snug tabular-nums text-muted-foreground">
            <span>
              <span className="text-foreground/90">Created</span> {formatTicketTs(ticket.created_at)}
            </span>
            <span className="hidden text-border/60 sm:inline" aria-hidden>
              ·
            </span>
            <span>
              <span className="text-foreground/90">Updated</span> {formatTicketTs(ticket.updated_at)}
            </span>
          </p>
        </TicketDetailCell>
      </div>
    </section>
  );
}

type Props = {
  portalBase: "/manager" | "/reseller" | "/dealer" | "/admin";
  genres: TvGenreRow[];
  initialSearch?: string;
  initialStatusFilter?: string;
  initialPriorityFilter?: string;
  sortFilter: string;
  /** When set (admin dashboard), opens the ticket details modal for this id. */
  initialTicketId?: number;
  headerSortHrefs: {
    subject: string;
    category: string;
    priority: string;
    status: string;
    comments: string;
    created: string;
    updated: string;
  };
  /** When set, first paint uses server-loaded rows (no initial `/api/tickets/table` fetch). */
  initialTable?: TicketsTablePageData;
  initialPage?: number;
  initialPageSize?: string;
  /** Portal staff only; admin always false. */
  canCreateTickets?: boolean;
};

type TicketTableApiResponse = {
  rows: TicketDashboardTableRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  focusRow?: TicketDashboardTableRow | null;
  error?: string;
};

export function PortalTicketsTableClient({
  portalBase,
  genres,
  initialSearch = "",
  initialStatusFilter = "",
  initialPriorityFilter = "",
  sortFilter,
  headerSortHrefs,
  initialTicketId,
  initialTable,
  initialPage = 1,
  initialPageSize = "25",
  canCreateTickets = false,
}: Props) {
  type CreateFieldErrors = Partial<Record<"category" | "channel" | "subject" | "priority" | "description", string>>;
  const router = useRouter();
  const useServerTableNav = initialTable != null;
  const skipInitialTableFetchRef = useRef(initialTable != null);
  const searchNavReadyRef = useRef(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => new Set(COLUMNS.map((c) => c.key)));
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState(initialPriorityFilter);
  const [commentsModalTicket, setCommentsModalTicket] = useState<TicketDashboardTableRow | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentsRows, setCommentsRows] = useState<Array<{ id: number; html: string; author: string; updated_at: number }>>([]);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [statusModalTicket, setStatusModalTicket] = useState<TicketDashboardTableRow | null>(null);
  const [priorityModalTicket, setPriorityModalTicket] = useState<TicketDashboardTableRow | null>(null);
  const [statusDraft, setStatusDraft] = useState("1");
  const [priorityDraft, setPriorityDraft] = useState("2");
  const [deleteModalTicket, setDeleteModalTicket] = useState<TicketDashboardTableRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState("2");
  const [createCategoryId, setCreateCategoryId] = useState(String(genres[0]?.id ?? ""));
  const [createChannelIds, setCreateChannelIds] = useState<string[]>([]);
  const [createChannels, setCreateChannels] = useState<ItvChannelRow[]>([]);
  const [createChannelLoadError, setCreateChannelLoadError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<CreateFieldErrors>({});
  const [createFlags, setCreateFlags] = useState({
    no_audio: false,
    no_video: false,
    stream_error: false,
    no_epg: false,
    catch_up_needed: false,
    epg_needed: false,
    file_missing: false,
    wrong_channel_name: false,
  });
  const [actionMenuTicketId, setActionMenuTicketId] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(initialPage);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [rows, setRows] = useState<TicketDashboardTableRow[]>(initialTable?.rows ?? []);
  const [total, setTotal] = useState(initialTable?.total ?? 0);
  const [totalPages, setTotalPages] = useState(initialTable?.totalPages ?? 1);
  const [tableLoading, setTableLoading] = useState(initialTable == null);
  const [tableError, setTableError] = useState("");
  const [focusRow, setFocusRow] = useState<TicketDashboardTableRow | null>(initialTable?.focusRow ?? null);
  const columnsTriggerRef = useRef<HTMLButtonElement>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const deepLinkOpenedRef = useRef(false);

  const isAdminPortal = portalBase === "/admin";
  const isTicketFixed = (statusId: number) => statusId === 2;
  const hasColumn = (key: ColumnKey) => visibleColumns.has(key);

  const displayedCount = visibleColumns.size;
  const allSelected = displayedCount === COLUMNS.length;

  const buildTableHref = useCallback(
    (patch: {
      q?: string;
      status?: string;
      priority?: string;
      page?: number;
      pageSize?: string;
    }) => {
      const sp = new URLSearchParams();
      const nextQ = (patch.q ?? debouncedSearch).trim();
      const nextStatus = patch.status ?? statusFilter;
      const nextPriority = patch.priority ?? priorityFilter;
      const nextPage = patch.page ?? page;
      const nextPageSize = patch.pageSize ?? pageSize;
      if (nextQ) sp.set("q", nextQ);
      if (nextStatus) sp.set("status", nextStatus);
      if (nextPriority) sp.set("priority", nextPriority);
      if (sortFilter) sp.set("sort", sortFilter);
      if (nextPage > 1) sp.set("page", String(nextPage));
      if (nextPageSize !== "25") sp.set("pageSize", nextPageSize);
      if (initialTicketId && !deepLinkOpenedRef.current) sp.set("ticket", String(initialTicketId));
      const qs = sp.toString();
      return `${portalBase}/tickets/dashboard${qs ? `?${qs}` : ""}`;
    },
    [debouncedSearch, statusFilter, priorityFilter, sortFilter, page, pageSize, portalBase, initialTicketId],
  );

  const navigateTable = useCallback(
    (patch: Parameters<typeof buildTableHref>[0]) => {
      setTableLoading(true);
      router.push(buildTableHref(patch));
    },
    [router, buildTableHref],
  );

  useEffect(() => {
    setSearch(initialSearch);
    setStatusFilter(initialStatusFilter);
    setPriorityFilter(initialPriorityFilter);
    setDebouncedSearch(initialSearch);
    setPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialSearch, initialStatusFilter, initialPriorityFilter, initialPage, initialPageSize]);

  useEffect(() => {
    if (!initialTable) return;
    setRows(initialTable.rows);
    setTotal(initialTable.total);
    setTotalPages(initialTable.totalPages);
    setPage(initialTable.page);
    setFocusRow(initialTable.focusRow ?? null);
    setTableLoading(false);
    setTableError(
      initialTable.loadError
        ? "Could not load tickets. Try again or contact support."
        : "",
    );
  }, [initialTable]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!useServerTableNav) return;
    if (!searchNavReadyRef.current) {
      searchNavReadyRef.current = true;
      return;
    }
    if (debouncedSearch === initialSearch.trim()) return;
    navigateTable({ q: debouncedSearch, page: 1 });
  }, [debouncedSearch, initialSearch, useServerTableNav, navigateTable]);

  useEffect(() => {
    const categoryId = Number(createCategoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setCreateChannels([]);
      setCreateChannelIds([]);
      setCreateChannelLoadError("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setCreateChannelLoadError("");
        const result = await loadTicketChannelsAction(categoryId);
        if (!result.ok) throw new Error("load_channels_failed");
        const data = result.channels;
        if (cancelled) return;
        const deduped: ItvChannelRow[] = [];
        const seen = new Set<number>();
        for (const ch of data) {
          const id = Number(ch.id ?? 0);
          if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
          seen.add(id);
          deduped.push({
            id,
            name: String(ch.name ?? ""),
            number: Number(ch.number ?? 0),
            tv_genre_id: Number(ch.tv_genre_id ?? 0),
          });
        }
        setCreateChannels(deduped);
        if (!deduped.length) {
          setCreateChannelIds([]);
          return;
        }
        setCreateChannelIds((prev) => {
          const valid = new Set(deduped.map((c) => String(c.id)));
          return prev.filter((id) => valid.has(id));
        });
      } catch {
        if (cancelled) return;
        setCreateChannels([]);
        setCreateChannelIds([]);
        setCreateChannelLoadError("Channels could not be loaded. You can still create the ticket without a channel.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createCategoryId]);

  const reloadTable = useCallback(async () => {
    if (useServerTableNav) {
      router.refresh();
      return;
    }
    if (skipInitialTableFetchRef.current) {
      skipInitialTableFetchRef.current = false;
      return;
    }
    setTableLoading(true);
    setTableError("");
    try {
      const data = await loadTicketsTableAction({
        q: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sort: sortFilter || undefined,
        page,
        pageSize: ticketPageSizeNumber(pageSize),
        ticketId: initialTicketId && !deepLinkOpenedRef.current ? initialTicketId : undefined,
      });
      if (!data.ok) {
        setTableError(data.error === "forbidden" ? "You do not have access to tickets." : "Could not load tickets.");
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total ?? 0));
      setTotalPages(Math.max(1, Number(data.totalPages ?? 1)));
      if (typeof data.page === "number" && data.page >= 1 && data.page !== page) {
        setPage(data.page);
      }
      setFocusRow(data.focusRow ?? null);
    } catch {
      setTableError("Could not load tickets.");
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setTableLoading(false);
    }
  }, [debouncedSearch, statusFilter, priorityFilter, sortFilter, page, pageSize, initialTicketId, useServerTableNav, router]);

  useEffect(() => {
    if (useServerTableNav) return;
    void reloadTable();
  }, [reloadTable, useServerTableNav]);

  const onCreateTicket = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (createBusy) return;
    setCreateError("");
    const selectedChannels = createChannelIds
      .map((id) => createChannels.find((c) => String(c.id) === id))
      .filter((c): c is ItvChannelRow => Boolean(c));
    const payloadBase = {
      subject: createSubject.trim(),
      description: createDescription,
      priority: Number(createPriority),
      category_id: Number(createCategoryId),
      flags: createFlags,
    };
    const nextErrors: CreateFieldErrors = {};
    if (!Number.isFinite(payloadBase.category_id) || payloadBase.category_id <= 0) nextErrors.category = "Please select category.";
    const channelsAvailable = createChannels.length > 0;
    if (channelsAvailable && !selectedChannels.length) {
      nextErrors.channel = "Please select at least one channel.";
    }
    const invalidChannel = selectedChannels.find((c) => !Number.isFinite(Number(c.number)) || Number(c.number) <= 0);
    if (selectedChannels.length && invalidChannel) {
      nextErrors.channel = "One or more selected channels have no valid number.";
    }
    if (!payloadBase.subject || payloadBase.subject.length < 3) nextErrors.subject = "Subject must be at least 3 characters.";
    if (!Number.isFinite(payloadBase.priority) || payloadBase.priority < 1 || payloadBase.priority > 3) {
      nextErrors.priority = "Please select priority.";
    }
    if (!payloadBase.description.trim()) nextErrors.description = "Description is required.";
    setCreateFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCreateError("Please fix the highlighted fields.");
      return;
    }
    setCreateBusy(true);
    try {
      const result = await createTicketAction({
        ...payloadBase,
        channels: selectedChannels.map((channel) => ({
          channel_id: Number(channel.id),
          channel_number: Number(channel.number),
        })),
      });
      if (!result.ok) {
        const reason =
          "detail" in result && result.detail
            ? result.detail
            : result.error || "create_failed";
        setCreateError(`Create failed: ${reason}`);
        return;
      }
      setCreateOpen(false);
      setCreateChannelIds([]);
      setCreateDescription("");
      setCreateFlags({
        no_audio: false,
        no_video: false,
        stream_error: false,
        no_epg: false,
        catch_up_needed: false,
        epg_needed: false,
        file_missing: false,
        wrong_channel_name: false,
      });
      await reloadTable();
    } catch {
      setCreateError("Create failed. Please try again.");
    } finally {
      setCreateBusy(false);
    }
  };

  const sortArrow = (ascKey: string, descKey: string) => {
    if (sortFilter === ascKey) return " ↑";
    if (sortFilter === descKey) return " ↓";
    return "";
  };

  const formatTs = formatTicketTs;
  const toPlain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const shorten = (text: string, max = 120) => (text.length > max ? `${text.slice(0, max)}…` : text);

  const tableColumnIds = useMemo(() => ticketsQueueTableColumnIds(visibleColumns), [visibleColumns]);
  const forceExpandColumn = useMemo(
    () => ticketsQueueHasExpandPanel(visibleColumns, []),
    [visibleColumns],
  );
  const trailFillColId = tableColumnIds.includes(TICKETS_QUEUE_TRAIL_FILL_COLUMN_ID)
    ? TICKETS_QUEUE_TRAIL_FILL_COLUMN_ID
    : null;
  const emptyColSpan = Math.max(1, tableColumnIds.length + 1);

  const dataTh = (col: TicketsQueueColumnKey, extra?: string) =>
    ticketsQueueHeaderCell(col, extra, col === trailFillColId);
  const dataTd = (col: TicketsQueueColumnKey, extra?: string) => {
    const center = col === "priority" || col === "status" || col === "comments";
    return ticketsQueueDataCell(col, cn(center && "text-center", extra), col === trailFillColId);
  };
  const actionMenuTicket = useMemo(
    () => (actionMenuTicketId == null ? null : rows.find((row) => row.id === actionMenuTicketId) ?? null),
    [actionMenuTicketId, rows],
  );
  const pageSafe = Math.min(page, totalPages);
  const pagedRows = rows;

  function renderTicketQueueHeader(col: TicketsQueueColumnKey) {
    const label = ticketColumnLabel(col);
    switch (col) {
      case "subject":
        return (
          <Link href={headerSortHrefs.subject} className="hover:text-foreground/90">
            {label}
            {sortArrow("subject_asc", "subject_desc")}
          </Link>
        );
      case "category":
        return (
          <Link href={headerSortHrefs.category} className="hover:text-foreground/90">
            {label}
            {sortArrow("category_asc", "category_desc")}
          </Link>
        );
      case "priority":
        return (
          <Link href={headerSortHrefs.priority} className="hover:text-foreground/90">
            {label}
            {sortArrow("priority_asc", "priority_desc")}
          </Link>
        );
      case "status":
        return (
          <Link href={headerSortHrefs.status} className="hover:text-foreground/90">
            {label}
            {sortArrow("status_asc", "status_desc")}
          </Link>
        );
      case "comments":
        return (
          <Link href={headerSortHrefs.comments} className="hover:text-foreground/90">
            {label}
            {sortArrow("comments_asc", "comments_desc")}
          </Link>
        );
      case "created":
        return (
          <Link href={headerSortHrefs.created} className="hover:text-foreground/90">
            {label}
            {sortArrow("created_asc", "created_desc")}
          </Link>
        );
      case "updated":
        return (
          <Link href={headerSortHrefs.updated} className="hover:text-foreground/90">
            {label}
            {sortArrow("updated_asc", "updated_desc")}
          </Link>
        );
      default:
        return label;
    }
  }

  const deepLinkTicketId = initialTicketId ?? 0;
  const focusRowId = focusRow?.id ?? 0;
  const visibleTicketIds = useMemo(() => rows.map((r) => r.id).join(","), [rows]);

  async function loadComments(ticketId: number) {
    const data = await loadTicketCommentsAction(ticketId);
    if (!data.ok) throw new Error("Failed to load comments");
    setCommentsRows(Array.isArray(data.comments) ? data.comments : []);
  }

  async function openCommentsModal(ticket: TicketDashboardTableRow, focusReply = false) {
    const allowReply = isAdminPortal || !isTicketFixed(ticket.status_id);
    setCommentsModalTicket(ticket);
    setCommentsOpen(true);
    setCommentsError("");
    setReplyError("");
    if (focusReply && allowReply) setReplyText("");
    setCommentsLoading(true);
    try {
      await loadComments(ticket.id);
    } catch {
      setCommentsRows([]);
      setCommentsError("Could not load comments for this ticket.");
    } finally {
      setCommentsLoading(false);
      if (focusReply && allowReply) {
        requestAnimationFrame(() => replyTextareaRef.current?.focus());
      }
    }
  }

  useEffect(() => {
    if (deepLinkTicketId <= 0 || deepLinkOpenedRef.current) return;
    const ticket =
      rows.find((r) => r.id === deepLinkTicketId) ??
      (focusRowId === deepLinkTicketId ? focusRow : null);
    if (!ticket || ticket.id !== deepLinkTicketId) return;
    deepLinkOpenedRef.current = true;
    void openCommentsModal(ticket);
    // Primitives only — keeps dependency array length stable (avoids HMR / rows ref churn warnings).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkTicketId, focusRowId, visibleTicketIds]);

  async function submitReply() {
    if (!commentsModalTicket) return;
    if (!isAdminPortal && isTicketFixed(commentsModalTicket.status_id)) {
      setReplyError("This ticket is fixed. Reopen it before replying.");
      return;
    }
    const comment = replyText.trim();
    if (!comment) {
      setReplyError("Please write a reply.");
      return;
    }
    setReplyBusy(true);
    setReplyError("");
    try {
      const result = await postTicketCommentAction(commentsModalTicket.id, comment);
      if (!result.ok) throw new Error("Failed to post reply");
      setReplyText("");
      await loadComments(commentsModalTicket.id);
    } catch {
      setReplyError("Could not send reply. Please try again.");
    } finally {
      setReplyBusy(false);
    }
  }

  async function submitTicketUpdate(ticketId: number, status: number, priority: number) {
    setActionBusy(true);
    try {
      const result = await manageTicketAction(ticketId, { action: "update", status, priority });
      if (!result.ok) throw new Error("update_failed");
      setStatusModalTicket(null);
      setPriorityModalTicket(null);
      await reloadTable();
    } finally {
      setActionBusy(false);
    }
  }

  async function submitTicketDelete(ticketId: number) {
    setActionBusy(true);
    try {
      const result = await manageTicketAction(ticketId, { action: "delete" });
      if (!result.ok) throw new Error("delete_failed");
      setDeleteModalTicket(null);
      await reloadTable();
    } finally {
      setActionBusy(false);
    }
  }

  function openStatusModal(ticket: TicketDashboardTableRow) {
    setStatusModalTicket(ticket);
    setStatusDraft(String(ticket.status_id || 1));
  }

  function openPriorityModal(ticket: TicketDashboardTableRow) {
    setPriorityModalTicket(ticket);
    setPriorityDraft(String(ticket.priority_id || 2));
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/50 px-2 py-1.5 sm:px-2">
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 max-[1600px]:gap-1.5 sm:gap-2.5">
        <div
          className={cn(
            adminListTableToolbarSearchFieldEmbeddedClass,
            "min-w-0 flex-1 max-[1600px]:!min-w-[10rem] sm:max-[1600px]:!min-w-[12rem] lg:max-[1600px]:!min-w-[14rem]",
          )}
        >
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!useServerTableNav) setPage(1);
            }}
            placeholder="Search subject, channel, content..."
            className={cn(managersToolbarSearchInputClass, "relative z-0")}
            aria-label="Search tickets"
            autoComplete="off"
          />
          <Search className={adminListTableToolbarSearchIconEmbeddedClass} aria-hidden />
        </div>
        <FormSelect
          name="ticket-status-filter"
          id="ticket-status-filter"
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            if (useServerTableNav) navigateTable({ status: v, page: 1 });
            else setPage(1);
          }}
          options={STATUS_OPTIONS}
          className={ticketFilterSelectTriggerClass}
          contentClassName={managersToolbarDropdownPanelClass}
          contentHudCorners
          itemClassName={managersToolbarSelectItemClass}
          itemShowCheck={false}
          clampMenuToTrigger
        />
        <FormSelect
          name="ticket-priority-filter"
          id="ticket-priority-filter"
          value={priorityFilter}
          onValueChange={(v) => {
            setPriorityFilter(v);
            if (useServerTableNav) navigateTable({ priority: v, page: 1 });
            else setPage(1);
          }}
          options={PRIORITY_OPTIONS}
          className={ticketFilterSelectTriggerClass}
          contentClassName={managersToolbarDropdownPanelClass}
          contentHudCorners
          itemClassName={managersToolbarSelectItemClass}
          itemShowCheck={false}
          clampMenuToTrigger
        />
        <FormSelect
          name="ticket-view-size"
          id="ticket-view-size"
          value={pageSize}
          onValueChange={(v) => {
            setPageSize(v);
            if (useServerTableNav) navigateTable({ pageSize: v, page: 1 });
            else setPage(1);
          }}
          options={VIEW_OPTIONS}
          className={ticketViewSelectTriggerClass}
          contentClassName={managersToolbarDropdownPanelClass}
          contentHudCorners
          itemClassName={managersToolbarSelectItemClass}
          itemShowCheck={false}
          clampMenuToTrigger
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!isAdminPortal && canCreateTickets ? (
            <button
              type="button"
              onClick={() => {
                setCreateError("");
                setCreateOpen(true);
              }}
              className={managersToolbarPrimaryButtonClass}
              aria-label="Create new ticket"
              title="Create new ticket"
            >
              <TicketPlus className="h-3.5 w-3.5 shrink-0 text-current" strokeWidth={1.75} aria-hidden />
              <span>New ticket</span>
            </button>
          ) : null}
          <div className="relative">
            <button
              ref={columnsTriggerRef}
              type="button"
              onClick={() => setColumnsOpen((v) => !v)}
              className={managersToolbarIconButtonClass}
              aria-label="Column settings"
              title="Visible columns"
              aria-haspopup="menu"
              aria-expanded={columnsOpen}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
            </button>
            <FloatingMenuPortal
              open={columnsOpen}
              onOpenChange={setColumnsOpen}
              anchorRef={columnsTriggerRef}
              hudCorners
              menuClassName={cn("z-[380] px-1 py-1 text-xs leading-tight", floatingPopoverMenuPanelClass, managersToolbarMenuSurfaceClass)}
            >
              <p className={floatingColumnPickerMenuHeaderClass}>Visible columns</p>
              <div className="flex flex-col" role="menu">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={allSelected}
                  onClick={() => {
                    if (allSelected) {
                      setVisibleColumns(new Set<ColumnKey>(["subject", "status", "updated"]));
                    } else {
                      setVisibleColumns(new Set(COLUMNS.map((c) => c.key)));
                    }
                  }}
                  className={floatingColumnPickerMenuItemClass}
                >
                  <span className="min-w-0 flex-1 truncate pr-1">All columns</span>
                  <span className={floatingColumnPickerCheckBoxClass} aria-hidden>
                    {allSelected ? (
                      <Check className={floatingColumnPickerCheckClass} strokeWidth={2.25} />
                    ) : null}
                  </span>
                </button>
                {COLUMNS.map((col) => {
                  const isChecked = visibleColumns.has(col.key);
                  const soleVisibleLock = isChecked && visibleColumns.size === 1;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={isChecked}
                      disabled={soleVisibleLock}
                      onClick={() => {
                        if (soleVisibleLock) return;
                        setVisibleColumns((prev) => {
                          const next = new Set(prev);
                          if (isChecked) next.delete(col.key);
                          else next.add(col.key);
                          if (next.size === 0) next.add("subject");
                          return next;
                        });
                      }}
                      className={cn(
                        floatingColumnPickerMenuItemClass,
                        soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                      )}
                    >
                      <span className={cn("min-w-0 flex-1 truncate pr-1", soleVisibleLock && "text-muted-foreground")}>
                        {col.label}
                      </span>
                      <span className={floatingColumnPickerCheckBoxClass} aria-hidden>
                        {isChecked ? (
                          <Check
                            className={cn(
                              floatingColumnPickerCheckClass,
                              soleVisibleLock && "text-cyan-600/35 dark:text-cyan-400/35",
                            )}
                            strokeWidth={2.25}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FloatingMenuPortal>
          </div>
        </div>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TicketsQueueTableScrollShell
          columnIds={tableColumnIds}
          forceExpandColumn={forceExpandColumn}
          className="app-data-table-scroll min-h-0 flex-1 [--app-data-table-max-h:100%]"
        >
          <table className={TICKETS_QUEUE_RESPONSIVE_TABLE_CLASS}>
            <thead>
              <tr>
                {tableColumnIds.map((col) => (
                  <th key={col} className={dataTh(col)} title={TICKETS_QUEUE_COLUMN_LABELS[col]}>
                    {renderTicketQueueHeader(col)}
                  </th>
                ))}
                <th className={ticketsQueueActionsHeaderCell()}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableError ? (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-destructive">
                    {tableError}
                  </td>
                </tr>
              ) : null}
              {!tableError && tableLoading && pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading tickets…
                  </td>
                </tr>
              ) : null}
              {!tableError && !tableLoading && total === 0 ? (
                <tr>
                  <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No matching tickets.
                  </td>
                </tr>
              ) : null}
              {pagedRows.map((r, idx) => (
                <TicketsQueueExpandableRow
                  key={`${String(r.id ?? idx)}`}
                  colSpan={emptyColSpan}
                  expandPersistId={r.id != null ? `ticket-${r.id}` : undefined}
                  details={
                    <TicketsQueueRowDetailsPanel
                      row={r}
                      visibleColumns={visibleColumns}
                      cellOpts={{
                        onOpenComments: (ticket: TicketDashboardTableRow) => void openCommentsModal(ticket),
                      }}
                    />
                  }
                  actions={
                    hasColumn("actions") ? (
                      isAdminPortal ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            const btn = e.currentTarget;
                            if (actionMenuTicketId === r.id) {
                              setActionMenuTicketId(null);
                              return;
                            }
                            actionMenuAnchorRef.current = btn;
                            setActionMenuTicketId(r.id);
                          }}
                          className={cn(managersToolbarIconButtonClass, "!h-7 !w-7")}
                          aria-label="Ticket actions"
                          title="Ticket actions"
                          aria-haspopup="menu"
                          aria-expanded={actionMenuTicketId === r.id}
                        >
                          <MoreVertical className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void openCommentsModal(r, !isTicketFixed(r.status_id))}
                          disabled={isTicketFixed(r.status_id)}
                          className={cn(
                            managersToolbarIconButtonClass,
                            "!h-7 !w-7",
                            isTicketFixed(r.status_id) && "cursor-not-allowed opacity-40",
                          )}
                          aria-label={
                            isTicketFixed(r.status_id)
                              ? `Ticket #${r.id} is fixed`
                              : `Reply to ticket #${r.id}`
                          }
                          title={isTicketFixed(r.status_id) ? "Ticket is fixed" : "Reply"}
                        >
                          <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )
                    ) : null
                  }
                >
                  {tableColumnIds.map((col) => (
                    <td
                      key={col}
                      className={dataTd(
                        col,
                        cn(
                          col === "subject" && "text-foreground",
                          (col === "content" || col === "created" || col === "updated") && "text-muted-foreground",
                        ),
                      )}
                      title={
                        col === "subject"
                          ? cellTitle(r.subject)
                          : col === "category"
                            ? cellTitle(r.categoryTitle)
                            : col === "channel"
                              ? cellTitle(r.channelName)
                              : col === "createdBy"
                                ? cellTitle(r.creatorUsername)
                                : col === "assignedAgent"
                                  ? cellTitle(r.agentUsername)
                                  : col === "content"
                                    ? cellTitle((r.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
                                    : col === "created"
                                      ? cellTitle(formatTs(r.created_at))
                                      : col === "updated"
                                        ? cellTitle(formatTs(r.updated_at))
                                        : undefined
                      }
                    >
                      {renderTicketsQueueColumnCell(col, r, {
                        onOpenComments: (ticket: TicketDashboardTableRow) => void openCommentsModal(ticket),
                      })}
                    </td>
                  ))}
                </TicketsQueueExpandableRow>
              ))}
            </tbody>
          </table>
        </TicketsQueueTableScrollShell>
        <div className="flex shrink-0 items-center justify-center border-t border-border/50 px-2 py-1 text-xs sm:justify-between sm:gap-2 sm:px-3">
        <ResellersTablePagination
          totalPages={totalPages}
          currentPage={pageSafe}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            if (useServerTableNav) navigateTable({ page: nextPage });
          }}
          ariaLabel="Ticket list pages"
          className="sm:justify-self-start"
        />
        <p className="hidden shrink-0 text-right text-[11px] leading-snug text-muted-foreground sm:block">
          Showing <span className="font-medium">{pagedRows.length}</span> of{" "}
          <span className="font-medium">{total}</span> ticket{total === 1 ? "" : "s"}
          {totalPages > 1 ? (
            <>
              {" "}
              · page <span className="font-medium">{pageSafe}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </>
          ) : null}
        </p>
        </div>
      </div>
      {createOpen && !isAdminPortal && canCreateTickets ? (
        <MessageModalShell
          titleId="create-ticket-modal-title"
          title="Create new ticket"
          titleIcon={Plus}
          onClose={() => !createBusy && setCreateOpen(false)}
          maxWidthClassName="max-w-3xl"
          maxHeightClassName={messageModalComposeShellMaxHeightClass}
          bodyScrollMaxHeightClassName={messageModalComposeBodyScrollMaxHeightClass}
          zIndexClassName="z-[350]"
          headerToolbar={
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={createBusy}
              className={managersToolbarIconButtonClass}
              aria-label="Close create ticket modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          <form onSubmit={onCreateTicket} className="space-y-4">
            <div>
              <p className={messageModalSectionLabelClass}>Channel & category</p>
              <div className={cn("mt-2 grid gap-3 p-4 sm:grid-cols-2", managersToolbarModalInsetPanelClass)}>
                <MessageModalField bare icon={Radio} label="Category">
                  <SearchableFormSelect
                    name="create-ticket-category"
                    id="create-ticket-category"
                    value={createCategoryId}
                    onValueChange={(v) => {
                      setCreateCategoryId(v);
                      setCreateFieldErrors((prev) => ({ ...prev, category: undefined }));
                    }}
                    options={genres.map((g) => ({ value: String(g.id), label: g.title }))}
                    placeholder="Select category"
                    searchPlaceholder="Search category..."
                    className="w-full"
                  />
                  {createFieldErrors.category ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.category}</p> : null}
                </MessageModalField>
                <MessageModalField bare icon={Radio} label="Channel">
                  <SearchableMultiFormSelect
                    name="create-ticket-channel"
                    id="create-ticket-channel"
                    value={createChannelIds}
                    onValueChange={(ids) => {
                      setCreateChannelIds(ids);
                      setCreateFieldErrors((prev) => ({ ...prev, channel: undefined }));
                      if (ids.length === 1 && !createSubject.trim()) {
                        const only = createChannels.find((c) => String(c.id) === ids[0]);
                        if (only) setCreateSubject(String(only.name ?? ""));
                      }
                    }}
                    options={createChannels.map((c) => ({ value: String(c.id), label: c.name }))}
                    placeholder={createChannels.length ? "Select channel(s)" : "No channels"}
                    searchPlaceholder="Search channel..."
                    className="w-full"
                    disabled={!createChannels.length}
                  />
                  {createChannelLoadError ? <p className="mt-1 text-xs text-destructive">{createChannelLoadError}</p> : null}
                  {!createChannelLoadError && !createChannels.length && createCategoryId ? (
                    <p className="mt-1 text-xs text-muted-foreground">No channels for this category — you can still create the ticket.</p>
                  ) : null}
                  {createFieldErrors.channel ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.channel}</p> : null}
                </MessageModalField>
              </div>
            </div>
            <div>
              <p className={messageModalSectionLabelClass}>Ticket details</p>
              <div className={cn("mt-2 space-y-3 p-4", managersToolbarModalInsetPanelClass)}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MessageModalField bare icon={FileText} label="Subject" className="sm:col-span-2">
                    <input
                      value={createSubject}
                      onChange={(e) => {
                        setCreateSubject(e.target.value);
                        setCreateFieldErrors((prev) => ({ ...prev, subject: undefined }));
                      }}
                      className={managersToolbarFormInputClass}
                      required
                    />
                    {createFieldErrors.subject ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.subject}</p> : null}
                  </MessageModalField>
                  <MessageModalField bare icon={Flag} label="Priority">
                    <FormSelect
                      name="create-ticket-priority"
                      id="create-ticket-priority"
                      value={createPriority}
                      onValueChange={(v) => {
                        setCreatePriority(v);
                        setCreateFieldErrors((prev) => ({ ...prev, priority: undefined }));
                      }}
                      options={[
                        { value: "1", label: "High" },
                        { value: "2", label: "Normal" },
                        { value: "3", label: "Low" },
                      ]}
                      placeholder="Select priority"
                      className={messageComposeSelectTriggerClass}
                      contentClassName={messageComposeSelectContentClass}
                      contentHudCorners
                      itemClassName={messageComposeSelectItemClass}
                      clampMenuToTrigger
                    />
                    {createFieldErrors.priority ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.priority}</p> : null}
                  </MessageModalField>
                </div>
                <MessageModalField bare icon={FileText} label="Description">
                  <textarea
                    value={createDescription}
                    onChange={(e) => {
                      setCreateDescription(e.target.value);
                      setCreateFieldErrors((prev) => ({ ...prev, description: undefined }));
                    }}
                    className={messageModalTextareaClass}
                    placeholder="Describe the issue…"
                  />
                  {createFieldErrors.description ? <p className="mt-1 text-xs text-destructive">{createFieldErrors.description}</p> : null}
                </MessageModalField>
              </div>
            </div>
            <div>
              <p className={messageModalSectionLabelClass}>Issue flags</p>
              <div className={cn("mt-2 grid gap-2 p-4 sm:grid-cols-2", managersToolbarModalInsetPanelClass)}>
                {(
                  [
                    ["no_audio", "No audio"],
                    ["no_video", "No video"],
                    ["stream_error", "Stream error"],
                    ["no_epg", "No EPG"],
                    ["catch_up_needed", "Catch up needed"],
                    ["epg_needed", "EPG needed"],
                    ["file_missing", "File missing"],
                    ["wrong_channel_name", "Wrong channel name"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border/70 accent-cyan-500"
                      checked={createFlags[key]}
                      onChange={(e) => setCreateFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={createBusy}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createBusy}>
                {createBusy ? "Creating…" : "Create ticket"}
              </Button>
            </div>
          </form>
        </MessageModalShell>
      ) : null}
      {isAdminPortal ? (
      <FloatingMenuPortal
        open={actionMenuTicketId != null && actionMenuTicket != null}
        onOpenChange={(open) => {
          if (!open) setActionMenuTicketId(null);
        }}
        anchorRef={actionMenuAnchorRef}
        hudCorners
        align="end"
        menuClassName={cn(
          "z-[380] px-0.5 py-0.5 text-xs leading-tight",
          floatingRowActionMenuPanelClass,
          managersToolbarMenuSurfaceClass,
        )}
      >
        {actionMenuTicket ? (
          <>
            <button
              type="button"
              role="menuitem"
              className={adminListTableBulkMenuItemClass}
              onClick={() => {
                setActionMenuTicketId(null);
                void openCommentsModal(actionMenuTicket, true);
              }}
            >
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
              <span className="min-w-0 whitespace-nowrap">Reply</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={adminListTableBulkMenuItemClass}
              onClick={() => {
                setActionMenuTicketId(null);
                openStatusModal(actionMenuTicket);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
              <span className="min-w-0 whitespace-nowrap">Set status</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={adminListTableBulkMenuItemClass}
              onClick={() => {
                setActionMenuTicketId(null);
                openPriorityModal(actionMenuTicket);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
              <span className="min-w-0 whitespace-nowrap">Set priority</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={adminListTableBulkMenuItemDestructiveClass}
              onClick={() => {
                setActionMenuTicketId(null);
                setDeleteModalTicket(actionMenuTicket);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
              <span className="min-w-0 whitespace-nowrap">Delete</span>
            </button>
          </>
        ) : null}
      </FloatingMenuPortal>
      ) : null}
      {commentsOpen && commentsModalTicket ? (
        <MessageModalShell
          title={`Ticket #${commentsModalTicket.id} details`}
          titleIcon={MessageSquareText}
          subtitle={commentsModalTicket.subject || "—"}
          titleId="ticket-comments-modal-title"
          onClose={() => setCommentsOpen(false)}
          maxWidthClassName="max-w-4xl"
          maxHeightClassName="max-h-[min(92vh,880px)]"
          bodyScrollMaxHeightClassName="max-h-[calc(min(92vh,880px)-4.5rem)]"
          zIndexClassName="z-[340]"
          headerToolbar={
            <button
              type="button"
              onClick={() => setCommentsOpen(false)}
              className={managersToolbarIconButtonClass}
              aria-label="Close ticket details"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          <div className="space-y-5">
            <TicketInformationPanel ticket={commentsModalTicket} />

            {commentsModalTicket.content ? (
              <div>
                <p className={cn(messageModalSectionLabelClass, "inline-flex items-center gap-1.5")}>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Description
                </p>
                <div className={cn("mt-2", messageModalGlassPanelClass)}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{commentsModalTicket.content}</p>
                </div>
              </div>
            ) : null}

            <div>
              <p className={messageModalSectionLabelClass}>Conversation</p>
              {commentsLoading ? (
                <div className={cn("mt-2 space-y-2", messageModalGlassPanelClass)}>
                  <p className="text-sm text-muted-foreground">Loading replies…</p>
                  <div className="h-10 animate-pulse rounded-md bg-muted/40" />
                  <div className="h-16 animate-pulse rounded-md bg-muted/30" />
                </div>
              ) : null}
              {!commentsLoading && commentsError ? (
                <p className="mt-2 text-sm text-destructive">{commentsError}</p>
              ) : null}
              {!commentsLoading && !commentsError && commentsRows.length === 0 ? (
                <div className={cn("mt-2 text-sm text-muted-foreground", messageModalGlassPanelClass)}>
                  No replies yet. Be the first to respond below.
                </div>
              ) : null}
              {!commentsLoading && !commentsError && commentsRows.length > 0 ? (
                <div className={cn("mt-2 overflow-hidden p-0", messageModalGlassPanelClass)}>
                  <div className="thin-scrollbar max-h-[36vh] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <colgroup>
                        <col className="w-[7rem]" />
                        <col />
                        <col className="w-[8.5rem]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                            Author
                          </th>
                          <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                            Message
                          </th>
                          <th className="sticky top-0 z-[1] bg-muted/30 px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                            Sent
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {commentsRows.map((c) => (
                          <tr key={c.id} className="border-t border-border/40 align-top">
                            <td className="max-w-0 px-3 py-2.5">
                              <span className="block truncate text-sm font-medium text-foreground">{c.author}</span>
                            </td>
                            <td className="max-w-0 px-3 py-2.5 text-sm text-foreground" title={toPlain(c.html)}>
                              <span className="block truncate">{shorten(toPlain(c.html))}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                              {formatTs(c.updated_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {isAdminPortal || !isTicketFixed(commentsModalTicket.status_id) ? (
              <div id="modal-reply-box" className={cn(managersToolbarModalInsetPanelClass, "p-4 sm:p-5")}>
              <p className={cn("mb-3", messageModalSectionLabelClass)}>Your reply</p>
              <textarea
                ref={replyTextareaRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Write your reply…"
                className={messageModalTextareaClass}
              />
              {replyError ? <p className="mt-2 text-xs text-destructive">{replyError}</p> : null}
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setReplyText("")} disabled={replyBusy || !replyText.trim()}>
                  Clear
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void submitReply()} disabled={replyBusy || !replyText.trim()}>
                  {replyBusy ? "Sending…" : "Reply"}
                </Button>
              </div>
              </div>
            ) : (
              <div className={cn("p-3 text-sm text-muted-foreground", messageModalGlassPanelClass)}>
                This ticket is fixed. Reopen it to add a reply.
              </div>
            )}
          </div>

        </MessageModalShell>
      ) : null}
      {isAdminPortal && statusModalTicket ? (
        <MessageModalShell
          titleId="ticket-set-status-title"
          title={`Set status for ticket #${statusModalTicket.id}`}
          titleIcon={Flag}
          onClose={() => setStatusModalTicket(null)}
          maxWidthClassName="max-w-md"
          zIndexClassName="z-[350]"
          headerToolbar={
            <button
              type="button"
              onClick={() => setStatusModalTicket(null)}
              className={managersToolbarIconButtonClass}
              aria-label="Close status modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitTicketUpdate(statusModalTicket.id, Number(statusDraft), statusModalTicket.priority_id);
            }}
          >
            <input type="hidden" name="ticket_id" value={statusModalTicket.id} />
            <input type="hidden" name="priority" value={String(statusModalTicket.priority_id)} />
            <MessageModalField bare icon={Flag} label="Status">
              <FormSelect
                name="status"
                value={statusDraft}
                onValueChange={setStatusDraft}
                options={[
                  { value: "1", label: "In progress" },
                  { value: "2", label: "Fixed" },
                  { value: "3", label: "Re-opened" },
                ]}
                className={messageComposeSelectTriggerClass}
                contentClassName={messageComposeSelectContentClass}
                contentHudCorners
                itemClassName={messageComposeSelectItemClass}
                clampMenuToTrigger
              />
            </MessageModalField>
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStatusModalTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={actionBusy}>
                {actionBusy ? "Saving…" : "Save status"}
              </Button>
            </div>
          </form>
        </MessageModalShell>
      ) : null}
      {isAdminPortal && priorityModalTicket ? (
        <MessageModalShell
          titleId="ticket-set-priority-title"
          title={`Set priority for ticket #${priorityModalTicket.id}`}
          titleIcon={Flag}
          onClose={() => setPriorityModalTicket(null)}
          maxWidthClassName="max-w-md"
          zIndexClassName="z-[350]"
          headerToolbar={
            <button
              type="button"
              onClick={() => setPriorityModalTicket(null)}
              className={managersToolbarIconButtonClass}
              aria-label="Close priority modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitTicketUpdate(priorityModalTicket.id, priorityModalTicket.status_id, Number(priorityDraft));
            }}
          >
            <input type="hidden" name="ticket_id" value={priorityModalTicket.id} />
            <input type="hidden" name="status" value={String(priorityModalTicket.status_id)} />
            <MessageModalField bare icon={Flag} label="Priority">
              <FormSelect
                name="priority"
                value={priorityDraft}
                onValueChange={setPriorityDraft}
                options={[
                  { value: "1", label: "High" },
                  { value: "2", label: "Normal" },
                  { value: "3", label: "Low" },
                ]}
                className={messageComposeSelectTriggerClass}
                contentClassName={messageComposeSelectContentClass}
                contentHudCorners
                itemClassName={messageComposeSelectItemClass}
                clampMenuToTrigger
              />
            </MessageModalField>
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPriorityModalTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={actionBusy}>
                {actionBusy ? "Saving…" : "Save priority"}
              </Button>
            </div>
          </form>
        </MessageModalShell>
      ) : null}
      {isAdminPortal && deleteModalTicket ? (
        <MessageModalShell
          titleId="ticket-delete-title"
          title={`Delete ticket #${deleteModalTicket.id}?`}
          titleIcon={Trash2}
          subtitle="This action cannot be undone."
          onClose={() => setDeleteModalTicket(null)}
          maxWidthClassName="max-w-md"
          zIndexClassName="z-[350]"
          headerToolbar={
            <button
              type="button"
              onClick={() => setDeleteModalTicket(null)}
              className={managersToolbarIconButtonClass}
              aria-label="Close delete modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitTicketDelete(deleteModalTicket.id);
            }}
          >
            <input type="hidden" name="ticket_id" value={deleteModalTicket.id} />
            <p className="text-sm text-muted-foreground">This will permanently delete this ticket and all of its comments.</p>
            <div className={cn(messageModalGlassPanelClass, "text-sm font-medium text-foreground")}>
              {deleteModalTicket.subject || "—"}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteModalTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" size="sm" disabled={actionBusy}>
                {actionBusy ? "Deleting…" : "Delete ticket"}
              </Button>
            </div>
          </form>
        </MessageModalShell>
      ) : null}
    </div>
  );
}

