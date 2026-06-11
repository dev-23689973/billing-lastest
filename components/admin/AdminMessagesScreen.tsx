"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type FormEvent } from "react";
import { MessageSquarePlus, Search } from "lucide-react";
import type {
  AdminMessageAudiencePreviewCounts,
  AdminMessageRoleCounts,
  AdminRecentStalkerSendMessageRow,
  AdminStalkerMessageDashboardStats,
} from "@/lib/repos/billing";
import type {
  AdminPortalStaffMessageDashboardStats,
  BillingSubscriberMessageOption,
  PortalStaffAudiencePreviewCounts,
  PortalStaffMessageRow,
  PortalStaffRoleMessageStatus,
  PortalStaffUserOption,
} from "@/lib/repos/portalStaffMessages";
import { ComposeChannelTabs } from "@/components/messages/ComposeChannelTabs";
import { usePortalStaffMessages } from "@/components/messages/portal-staff-messages-context";
import { PortalStaffMessageHistoryTable } from "@/components/portal/PortalStaffMessageHistoryTable";
import { StbMessageHistoryTable } from "@/components/admin/StbMessageHistoryTable";
import { PortalOperatorPortalInboxHistory } from "@/components/portal/PortalOperatorPortalInboxHistory";
import { buildPortalInboxRows, filterPortalInboxRows } from "@/components/portal/PortalStaffInboxTable";
import { FormSelect } from "@/components/forms/form-select";
import { ResellersTablePagination } from "@/components/admin/ResellersTablePagination";
import {
  adminListTableToolbarSearchFieldEmbeddedClass,
  adminListTableToolbarSearchIconEmbeddedClass,
  adminListTableToolbarShellClass,
  adminListTableToolbarShellEmbeddedClass,
  managersToolbarDropdownPanelClass,
  managersToolbarPrimaryButtonClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { ComposeMessageModal, type ComposeMessageAudience } from "@/components/messages/ComposeMessageModal";
import {
  ComposeStaffMessageModal,
  type ComposeStaffAudience,
} from "@/components/messages/ComposeStaffMessageModal";
import { ComposeOperatorStaffMessageModal } from "@/components/messages/ComposeOperatorStaffMessageModal";
import { Alert } from "@/components/ui/alert";
import type { PortalBase } from "@/lib/portal-nav";
import type { PortalOperatorStaffAudiencePreviewCounts, PortalOperatorStaffAudienceType } from "@/lib/repos/portalStaffMessages";
import { useAdminMessageStalkerShell } from "@/components/admin/AdminMessageStalkerShellLoader";
import { MessageDeliveryKpiCollapsible } from "@/components/messages/MessageDeliveryKpiCollapsible";
import { PortalStaffInboxKpiSummary } from "@/components/messages/PortalStaffInboxKpiSummary";
import { MessageDetailModal } from "@/components/messages/MessageDetailModal";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS } from "@/lib/subscriberFilterSelectOptions";

const LARGE_SEND_CONFIRM_THRESHOLD = 500;

const HISTORY_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS.map((o) => ({
  value: o.value,
  label: `View: ${o.label}`,
}));

type MessageStatusFilter = "all" | "delivered" | "queued";

const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "delivered", label: "Delivered" },
  { value: "queued", label: "Queued" },
] as const;

const HISTORY_PRIORITY_OPTIONS = [
  { value: "all", label: "Priority: All" },
  { value: "1", label: "High" },
  { value: "2", label: "Normal" },
  { value: "3", label: "Low" },
] as const;

type PortalInboxStatusFilter = "all" | "active" | "dismiss" | "read";

const historyFilterSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[8.5rem] shrink-0 sm:min-w-[9rem]",
);

const historyPerPageSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[6.25rem] shrink-0 sm:min-w-[6.5rem]",
);

function historyPageSizeNumber(pageSize: string): number {
  const n = Number.parseInt(pageSize, 10);
  return PAGE_SIZE_OPTIONS.some((o) => o.value === pageSize) && Number.isFinite(n) ? n : 25;
}

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

type ComposeChannel = "staff" | "subscribers";

export type MessagesScreenPortalConfig = {
  portalBase: PortalBase;
  ownerType: "MNGR" | "SRSLR" | "RSLR";
  canSendStaff: boolean;
  canSendSubscriber: boolean;
  operatorStaffAudiencePreview: PortalOperatorStaffAudiencePreviewCounts;
};

export function AdminMessagesScreen({
  staffUsers,
  staffAudiencePreview,
  subscriberAccounts,
  audiencePreview,
  roleCounts,
  stats: statsProp,
  staffStats,
  staffMessageByRole,
  recent: recentProp,
  recentStaff,
  sentByLabel,
  portal,
  deferStalkerShell = false,
}: {
  staffUsers: PortalStaffUserOption[];
  staffAudiencePreview: PortalStaffAudiencePreviewCounts;
  subscriberAccounts: BillingSubscriberMessageOption[];
  audiencePreview: AdminMessageAudiencePreviewCounts;
  roleCounts: AdminMessageRoleCounts;
  stats: AdminStalkerMessageDashboardStats;
  staffStats: AdminPortalStaffMessageDashboardStats;
  staffMessageByRole: PortalStaffRoleMessageStatus[];
  recent: AdminRecentStalkerSendMessageRow[];
  recentStaff?: PortalStaffMessageRow[];
  sentByLabel: string;
  portal?: MessagesScreenPortalConfig;
  /** Admin only: load Stalker KPI + STB history after paint (remote DB). */
  deferStalkerShell?: boolean;
}) {
  void roleCounts;
  const stalkerShell = useAdminMessageStalkerShell(
    statsProp,
    recentProp,
    deferStalkerShell,
    deferStalkerShell && portal ? "operator" : "admin",
  );
  const stats = deferStalkerShell ? stalkerShell.stats : statsProp;
  const recent = deferStalkerShell ? stalkerShell.recent : recentProp;
  const stalkerShellLoading = deferStalkerShell && stalkerShell.loading;

  const isPortal = Boolean(portal);
  const showAdminStaffHistory = !portal && recentStaff != null;
  const showPortalInbox = isPortal;
  const {
    messages: portalActiveMessages,
    dismissMessages: portalDismissMessages,
    readMessages: portalReadMessages,
    count: portalActiveCount,
  } = usePortalStaffMessages();
  const messageBase = portal?.portalBase ? `${portal.portalBase}/message` : "/admin/message";
  const kpiStaffAudience: PortalStaffAudiencePreviewCounts = portal
    ? {
        all_staff: portal.operatorStaffAudiencePreview.downstream_all,
        managers: 0,
        resellers: portal.operatorStaffAudiencePreview.downstream_resellers,
        dealers: portal.operatorStaffAudiencePreview.downstream_dealers,
      }
    : staffAudiencePreview;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTab: "compose" | "history" = searchParams.get("tab") === "compose" ? "compose" : "history";
  const composeChannel: ComposeChannel =
    searchParams.get("channel") === "subscribers" || (portal && !portal.canSendStaff)
      ? "subscribers"
      : "staff";
  const historyChannel: ComposeChannel =
    showPortalInbox || showAdminStaffHistory
      ? searchParams.get("channel") === "subscribers"
        ? "subscribers"
        : "staff"
      : "subscribers";

  function goTab(next: "compose" | "history", channel?: ComposeChannel) {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "compose") {
      p.set("tab", "compose");
      p.set("channel", channel ?? composeChannel);
    } else {
      p.delete("tab");
      p.delete("channel");
    }
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function goComposeChannel(channel: ComposeChannel) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", "compose");
    p.set("channel", channel);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function goHistoryChannel(channel: ComposeChannel) {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tab");
    p.set("channel", channel);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const [staffAudience, setStaffAudience] = useState<ComposeStaffAudience | PortalOperatorStaffAudienceType>(
    portal ? "downstream_all" : "all_staff",
  );
  const [staffPriority, setStaffPriority] = useState("2");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffSelected, setStaffSelected] = useState<Set<string>>(() => new Set());
  const [staffMessageTitle, setStaffMessageTitle] = useState("");
  const [staffMessageBody, setStaffMessageBody] = useState("");

  const [audience, setAudience] = useState<ComposeMessageAudience>(portal ? "all" : "custom");

  function portalAudienceCount(a: ComposeMessageAudience): number {
    if (a === "custom") return subscriberAccounts.length;
    return audiencePreview[a];
  }

  function firstEnabledPortalAudience(): ComposeMessageAudience {
    const order: ComposeMessageAudience[] = ["all", "active", "inactive", "expired", "expiring", "custom"];
    for (const a of order) {
      if (a === "custom") return "custom";
      if (portalAudienceCount(a) > 0) return a;
    }
    return "custom";
  }

  useEffect(() => {
    if (!portal) return;
    if (audience === "custom") return;
    if (portalAudienceCount(audience) === 0) {
      const timer = window.setTimeout(() => setAudience(firstEnabledPortalAudience()), 0);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when scoped counts change
  }, [portal, audiencePreview, subscriberAccounts.length]);
  const [priority, setPriority] = useState("2");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<MessageStatusFilter>("all");
  const [portalInboxStatus, setPortalInboxStatus] = useState<PortalInboxStatusFilter>("all");
  const [historyPriority, setHistoryPriority] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState("25");
  const [detailRow, setDetailRow] = useState<AdminRecentStalkerSendMessageRow | null>(null);
  const historyPageSizeNum = historyPageSizeNumber(historyPageSize);

  /** Subscribers table / row menu: `?account=LOGIN` or `accounts=` → custom billing accounts + compose subscribers tab. */
  useLayoutEffect(() => {
    const fromBulk = searchParams.getAll("accounts").flatMap((s) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean));
    const single = (searchParams.get("account") ?? "").trim();
    const tokens = [...new Set([...fromBulk, ...(single ? [single] : [])])];
    if (!tokens.length) return;

    const matched = new Set<string>();
    for (const raw of tokens) {
      const hit = subscriberAccounts.find((u) => u.account.trim().toLowerCase() === raw.toLowerCase());
      if (hit) matched.add(hit.account);
    }
    const timer = window.setTimeout(() => {
      setAudience("custom");
      setSelected(matched);
      if (matched.size === 1) {
        setSearch([...matched][0] ?? "");
      } else if (matched.size > 1) {
        setSearch("");
      } else {
        setSearch(single || fromBulk[0] || "");
      }
    }, 0);

    const p = new URLSearchParams(searchParams.toString());
    p.delete("account");
    p.delete("accounts");
    p.set("tab", "compose");
    p.set("channel", "subscribers");
    const next = p.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    return () => window.clearTimeout(timer);

  }, [searchParams, subscriberAccounts, router, pathname]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffUsers;
    return staffUsers.filter(
      (u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
    );
  }, [staffUsers, staffSearch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscriberAccounts;
    return subscriberAccounts.filter((u) => u.account.toLowerCase().includes(q));
  }, [subscriberAccounts, search]);

  const staffSelectedCount = staffSelected.size;
  const staffRecipientPreviewCount = useMemo(() => {
    if (staffAudience === "custom") return staffSelectedCount;
    if (portal) {
      const op = portal.operatorStaffAudiencePreview;
      if (staffAudience === "downstream_resellers") return op.downstream_resellers;
      if (staffAudience === "downstream_dealers") return op.downstream_dealers;
      return op.downstream_all;
    }
    if (staffAudience === "all_staff") return staffAudiencePreview.all_staff;
    if (staffAudience === "managers") return staffAudiencePreview.managers;
    if (staffAudience === "resellers") return staffAudiencePreview.resellers;
    if (staffAudience === "dealers") return staffAudiencePreview.dealers;
    return 0;
  }, [staffAudience, staffSelectedCount, staffAudiencePreview, portal]);

  const selectedCount = selected.size;
  const recipientPreviewCount = useMemo(() => {
    if (audience === "custom") return selectedCount;
    if (audience === "all") return audiencePreview.all;
    if (audience === "active" || audience === "expired" || audience === "expiring" || audience === "inactive") {
      return audiencePreview[audience];
    }
    return 0;
  }, [audience, selectedCount, audiencePreview]);
  function toggleStaff(username: string) {
    setStaffSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  function addVisibleStaff() {
    setStaffSelected((prev) => {
      const next = new Set(prev);
      for (const u of filteredStaff) next.add(u.username);
      return next;
    });
  }

  function clearStaffSelection() {
    setStaffSelected(new Set());
  }

  function lookupStaff() {
    const raw = staffSearch.trim();
    if (!raw) return;
    const hit = staffUsers.find(
      (u) => u.username.toLowerCase() === raw.toLowerCase() || u.name.toLowerCase() === raw.toLowerCase(),
    );
    if (!hit) return;
    setStaffSelected((prev) => {
      const next = new Set(prev);
      next.add(hit.username);
      return next;
    });
  }

  function resetStaffForm() {
    setStaffAudience(portal ? "downstream_all" : "all_staff");
    setStaffPriority("2");
    setStaffSearch("");
    clearStaffSelection();
    setStaffMessageTitle("");
    setStaffMessageBody("");
  }

  function confirmLargeStaffSend(e: FormEvent<HTMLFormElement>) {
    if (staffRecipientPreviewCount <= LARGE_SEND_CONFIRM_THRESHOLD) return;
    const ok = window.confirm(`This send targets ${formatInt(staffRecipientPreviewCount)} portal staff. Continue?`);
    if (!ok) e.preventDefault();
  }

  const staffRecipientSummaryReadOnly = useMemo(() => {
    if (portal) {
      const op = portal.operatorStaffAudiencePreview;
      if (staffAudience === "downstream_all") {
        return `All downstream staff (${formatInt(staffRecipientPreviewCount)} recipients)`;
      }
      if (staffAudience === "downstream_resellers") {
        return `${formatInt(op.downstream_resellers)} active resellers`;
      }
      if (staffAudience === "downstream_dealers") {
        return `${formatInt(op.downstream_dealers)} active dealers`;
      }
      return "";
    }
    if (staffAudience === "all_staff") {
      return `All active portal staff (${formatInt(staffRecipientPreviewCount)} recipients)`;
    }
    if (staffAudience === "managers") return `${formatInt(staffAudiencePreview.managers)} active managers`;
    if (staffAudience === "resellers") return `${formatInt(staffAudiencePreview.resellers)} active resellers`;
    if (staffAudience === "dealers") return `${formatInt(staffAudiencePreview.dealers)} active dealers`;
    return "";
  }, [staffAudience, staffRecipientPreviewCount, staffAudiencePreview, portal]);

  function toggle(account: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(account)) next.delete(account);
      else next.add(account);
      return next;
    });
  }

  function addVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of filtered) next.add(u.account);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function lookupCustomer() {
    const raw = search.trim();
    if (!raw) return;
    const hit = subscriberAccounts.find((u) => u.account.toLowerCase() === raw.toLowerCase());
    if (!hit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(hit.account);
      return next;
    });
  }

  function resetForm() {
    setAudience(portal ? "all" : "custom");
    setPriority("2");
    setSearch("");
    clearSelection();
    setMessageTitle("");
    setMessageBody("");
  }

  function confirmLargeSend(e: FormEvent<HTMLFormElement>) {
    if (recipientPreviewCount <= LARGE_SEND_CONFIRM_THRESHOLD) return;
    const ok = window.confirm(`This send targets ${formatInt(recipientPreviewCount)} STB recipients. Continue?`);
    if (!ok) e.preventDefault();
  }

  const recipientSummaryReadOnly = useMemo(() => {
    if (audience === "all") {
      return portal
        ? `All users under your access (${formatInt(recipientPreviewCount)} STB rows)`
        : `All billing accounts mapped to STB (${formatInt(recipientPreviewCount)} recipients)`;
    }
    if (audience === "active") {
      return portal
        ? `${formatInt(audiencePreview.active)} active subscribers in your hierarchy`
        : `${formatInt(audiencePreview.active)} active subscribers`;
    }
    if (audience === "expired") {
      return portal
        ? `${formatInt(audiencePreview.expired)} expired subscribers in your hierarchy`
        : `${formatInt(audiencePreview.expired)} expired subscribers`;
    }
    if (audience === "expiring") {
      return portal
        ? `${formatInt(audiencePreview.expiring)} subscribers expiring within 7 days in your hierarchy`
        : `${formatInt(audiencePreview.expiring)} subscribers expiring within 7 days`;
    }
    if (audience === "inactive") {
      return portal
        ? `${formatInt(audiencePreview.inactive)} inactive subscribers in your hierarchy`
        : `${formatInt(audiencePreview.inactive)} inactive subscribers`;
    }
    return "";
  }, [audience, recipientPreviewCount, audiencePreview, portal]);
  const filteredStaffRecent = useMemo(() => {
    if (!recentStaff?.length) return [];
    const q = historySearch.trim().toLowerCase();
    return recentStaff.filter((row) => {
      if (historyPriority !== "all" && String(row.priority ?? 2) !== historyPriority) return false;
      if (!q) return true;
      const audience = row.audienceType.replace(/_/g, " ").toLowerCase();
      return (
        (row.body ?? "").toLowerCase().includes(q) ||
        (row.sentBy ?? "").toLowerCase().includes(q) ||
        audience.includes(q) ||
        (row.createdAt ?? "").toLowerCase().includes(q)
      );
    });
  }, [recentStaff, historySearch, historyPriority]);

  const filteredRecent = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return recent.filter((row) => {
      const delivered = row.need_confirm === 0;
      if (historyStatus === "delivered" && !delivered) return false;
      if (historyStatus === "queued" && delivered) return false;
      if (historyPriority !== "all" && String(row.priority ?? 2) !== historyPriority) return false;
      if (!q) return true;
      const login = (row.login ?? "").toLowerCase();
      const msg = (row.msg ?? "").toLowerCase();
      const uid = String(row.uid ?? "");
      const addtime = (row.addtime ?? "").toLowerCase();
      return login.includes(q) || msg.includes(q) || uid.includes(q) || addtime.includes(q);
    });
  }, [recent, historySearch, historyStatus, historyPriority]);
  const historyTotalPages = Math.max(1, Math.ceil(filteredRecent.length / historyPageSizeNum));
  const historyPageSafe = Math.min(historyPage, historyTotalPages);
  const historyPageRows = useMemo(() => {
    const start = (historyPageSafe - 1) * historyPageSizeNum;
    return filteredRecent.slice(start, start + historyPageSizeNum);
  }, [filteredRecent, historyPageSafe, historyPageSizeNum]);

  const staffHistoryTotalPages = Math.max(1, Math.ceil(filteredStaffRecent.length / historyPageSizeNum));
  const staffHistoryPageSafe = Math.min(historyPage, staffHistoryTotalPages);
  const historyStaffPageRows = useMemo(() => {
    const start = (staffHistoryPageSafe - 1) * historyPageSizeNum;
    return filteredStaffRecent.slice(start, start + historyPageSizeNum);
  }, [filteredStaffRecent, staffHistoryPageSafe, historyPageSizeNum]);

  const portalInboxAllRows = useMemo(
    () => buildPortalInboxRows(portalActiveMessages, portalDismissMessages, portalReadMessages),
    [portalActiveMessages, portalDismissMessages, portalReadMessages],
  );
  const filteredPortalInbox = useMemo(
    () => filterPortalInboxRows(portalInboxAllRows, historySearch, portalInboxStatus),
    [portalInboxAllRows, historySearch, portalInboxStatus],
  );
  const portalInboxTotalPages = Math.max(1, Math.ceil(filteredPortalInbox.length / historyPageSizeNum));
  const portalInboxPageSafe = Math.min(historyPage, portalInboxTotalPages);
  const portalInboxPageRows = useMemo(() => {
    const start = (portalInboxPageSafe - 1) * historyPageSizeNum;
    return filteredPortalInbox.slice(start, start + historyPageSizeNum);
  }, [filteredPortalInbox, portalInboxPageSafe, historyPageSizeNum]);

  const historyChannelTabs = (
    <ComposeChannelTabs
      channel={historyChannel}
      onChannelChange={goHistoryChannel}
      showStaffChannel={showAdminStaffHistory || showPortalInbox}
      variant={showPortalInbox ? "portal" : "admin"}
      staffActiveCount={showPortalInbox ? portalActiveCount : undefined}
    />
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <section className="shrink-0 space-y-2.5 min-w-0 rounded-lg border border-border/60 bg-card p-2.5 transition-colors duration-200">
        {showPortalInbox ? (
          <PortalStaffInboxKpiSummary
            activeCount={portalActiveCount}
            dismissCount={portalDismissMessages.length}
            readCount={portalReadMessages.length}
          />
        ) : null}
        {showPortalInbox && !portal?.canSendSubscriber ? null : (
          <MessageDeliveryKpiCollapsible
            mode={showPortalInbox ? "stb-only" : "admin"}
            stats={stats}
            stalkerKpiLoading={stalkerShellLoading}
            staffStats={staffStats}
            staffAudience={kpiStaffAudience}
            staffMessageByRole={staffMessageByRole}
            subscriberReach={audiencePreview.all}
          />
        )}
      </section>
      <section
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-2xl bg-transparent shadow-sm ring-1 ring-black/[0.04] transition-colors duration-200 dark:ring-white/[0.06]",
          mainTab === "history" && "min-h-0 flex-1",
        )}
      >
        {mainTab === "compose" ? (
          composeChannel === "staff" && portal && portal.canSendStaff ? (
            <ComposeOperatorStaffMessageModal
              ownerType={portal.ownerType as "MNGR" | "SRSLR"}
              onClose={() => goTab("history")}
              composeChannel={composeChannel}
              onComposeChannelChange={goComposeChannel}
              audience={staffAudience as PortalOperatorStaffAudienceType}
              onAudienceChange={setStaffAudience}
              priority={staffPriority}
              onPriorityChange={setStaffPriority}
              selected={staffSelected}
              onToggleUser={toggleStaff}
              onApplySelection={setStaffSelected}
              onClearSelection={clearStaffSelection}
              onLookupStaff={lookupStaff}
              messageTitle={staffMessageTitle}
              onMessageTitleChange={setStaffMessageTitle}
              messageBody={staffMessageBody}
              onMessageBodyChange={setStaffMessageBody}
              onReset={resetStaffForm}
              onConfirmLargeSend={confirmLargeStaffSend}
              staffUsers={staffUsers}
              selectedCount={staffSelectedCount}
              recipientPreviewCount={staffRecipientPreviewCount}
              recipientSummaryReadOnly={staffRecipientSummaryReadOnly}
              staffAudiencePreview={portal.operatorStaffAudiencePreview}
            />
          ) : composeChannel === "staff" && !portal ? (
            <ComposeStaffMessageModal
              onClose={() => goTab("history")}
              composeChannel={composeChannel}
              onComposeChannelChange={goComposeChannel}
              audience={staffAudience as ComposeStaffAudience}
              onAudienceChange={(a) => setStaffAudience(a)}
              priority={staffPriority}
              onPriorityChange={setStaffPriority}
              selected={staffSelected}
              onToggleUser={toggleStaff}
              onApplySelection={setStaffSelected}
              onClearSelection={clearStaffSelection}
              onLookupStaff={lookupStaff}
              messageTitle={staffMessageTitle}
              onMessageTitleChange={setStaffMessageTitle}
              messageBody={staffMessageBody}
              onMessageBodyChange={setStaffMessageBody}
              onReset={resetStaffForm}
              onConfirmLargeSend={confirmLargeStaffSend}
              staffUsers={staffUsers}
              selectedCount={staffSelectedCount}
              recipientPreviewCount={staffRecipientPreviewCount}
              recipientSummaryReadOnly={staffRecipientSummaryReadOnly}
              staffAudiencePreview={staffAudiencePreview}
            />
          ) : portal && !portal.canSendSubscriber ? (
            <div className="p-5 sm:p-6">
              <Alert className="border-amber-500/30 bg-amber-500/10 text-foreground">
                <p className="font-medium">Subscriber messaging disabled</p>
                <p className="mt-1 text-muted-foreground">
                  Your reseller has turned off STB messages for this account. Contact them if you need access restored.
                </p>
              </Alert>
            </div>
          ) : (
            <ComposeMessageModal
              onClose={() => goTab("history")}
              composeChannel={composeChannel}
              onComposeChannelChange={goComposeChannel}
              audience={audience}
              onAudienceChange={setAudience}
              priority={priority}
              onPriorityChange={setPriority}
              selected={selected}
              onToggleUser={toggle}
              onApplySelection={setSelected}
              onClearSelection={clearSelection}
              onLookupCustomer={lookupCustomer}
              messageTitle={messageTitle}
              onMessageTitleChange={setMessageTitle}
              messageBody={messageBody}
              onMessageBodyChange={setMessageBody}
              onReset={resetForm}
              onConfirmLargeSend={confirmLargeSend}
              subscriberAccounts={subscriberAccounts}
              selectedCount={selectedCount}
              recipientPreviewCount={recipientPreviewCount}
              recipientSummaryReadOnly={recipientSummaryReadOnly}
              portalMode={isPortal}
              showStaffChannel={!portal}
              audiencePreview={audiencePreview}
            />
          )
        ) : (
          <>
            {showPortalInbox && historyChannel === "staff" ? (
              <PortalOperatorPortalInboxHistory
                historySearch={historySearch}
                onHistorySearchChange={(v) => {
                  setHistorySearch(v);
                  setHistoryPage(1);
                }}
                portalInboxStatus={portalInboxStatus}
                onPortalInboxStatusChange={(v) => {
                  setPortalInboxStatus(v);
                  setHistoryPage(1);
                }}
                historyPageSize={historyPageSize}
                onHistoryPageSizeChange={(v) => {
                  setHistoryPageSize(v);
                  setHistoryPage(1);
                }}
                historyPageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
                historyChannelTabs={historyChannelTabs}
                portalInboxPageRows={portalInboxPageRows}
                portalInboxTotalPages={portalInboxTotalPages}
                portalInboxPageSafe={portalInboxPageSafe}
                onHistoryPageChange={setHistoryPage}
                filteredPortalInboxLength={filteredPortalInbox.length}
                portalInboxAllRowsLength={portalInboxAllRows.length}
                portalActiveCount={portalActiveCount}
              />
            ) : showAdminStaffHistory && historyChannel === "staff" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    adminListTableToolbarShellClass,
                    adminListTableToolbarShellEmbeddedClass,
                    "min-w-0 shrink-0 flex-col items-stretch gap-2",
                  )}
                >
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                    <div
                      className={cn(
                        adminListTableToolbarSearchFieldEmbeddedClass,
                        "w-full sm:min-w-[12rem] sm:max-w-[min(100%,28rem)] sm:flex-1",
                      )}
                    >
                      <input
                        value={historySearch}
                        onChange={(e) => {
                          setHistorySearch(e.target.value);
                          setHistoryPage(1);
                        }}
                        placeholder="Search message, audience, sender, time..."
                        className={cn(managersToolbarSearchInputClass, "relative z-0 w-full")}
                        aria-label="Search staff messages"
                        autoComplete="off"
                      />
                      <Search className={adminListTableToolbarSearchIconEmbeddedClass} aria-hidden />
                    </div>

                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
                      <FormSelect
                        id="history-staff-priority-filter"
                        value={historyPriority}
                        onValueChange={(v) => {
                          setHistoryPriority(v);
                          setHistoryPage(1);
                        }}
                        options={[...HISTORY_PRIORITY_OPTIONS]}
                        className={cn(historyFilterSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[8.5rem]")}
                        contentClassName={managersToolbarDropdownPanelClass}
                        contentHudCorners
                        itemClassName={managersToolbarSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                      <FormSelect
                        id="history-staff-page-size"
                        value={historyPageSize}
                        onValueChange={(v) => {
                          setHistoryPageSize(v);
                          setHistoryPage(1);
                        }}
                        options={HISTORY_PAGE_SIZE_OPTIONS}
                        className={cn(historyPerPageSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[6.25rem]")}
                        contentClassName={managersToolbarDropdownPanelClass}
                        contentHudCorners
                        itemClassName={managersToolbarSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">{historyChannelTabs}</div>
                    <Link
                      href={`${messageBase}?tab=compose&channel=staff`}
                      className={managersToolbarPrimaryButtonClass}
                      title="Compose new staff message"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      <span>New message</span>
                    </Link>
                  </div>
                </div>
                <PortalStaffMessageHistoryTable rows={historyStaffPageRows} embedded />
                <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-3">
                  <ResellersTablePagination
                    totalPages={staffHistoryTotalPages}
                    currentPage={staffHistoryPageSafe}
                    onPageChange={setHistoryPage}
                    ariaLabel="Staff message history pages"
                    className="sm:justify-self-start"
                  />
                  <p className="hidden shrink-0 text-right text-[11px] leading-snug text-muted-foreground sm:block">
                    Showing <span className="font-medium">{historyStaffPageRows.length}</span> of{" "}
                    <span className="font-medium">{filteredStaffRecent.length}</span> filtered row
                    {filteredStaffRecent.length === 1 ? "" : "s"} ({recentStaff?.length ?? 0} total loaded)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    adminListTableToolbarShellClass,
                    adminListTableToolbarShellEmbeddedClass,
                    "min-w-0 shrink-0 flex-col items-stretch gap-2",
                  )}
                >
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                    <div
                      className={cn(
                        adminListTableToolbarSearchFieldEmbeddedClass,
                        "w-full sm:min-w-[12rem] sm:max-w-[min(100%,28rem)] sm:flex-1",
                      )}
                    >
                      <input
                        value={historySearch}
                        onChange={(e) => {
                          setHistorySearch(e.target.value);
                          setHistoryPage(1);
                        }}
                        placeholder="Search recipient, message, uid, time..."
                        className={cn(managersToolbarSearchInputClass, "relative z-0 w-full")}
                        aria-label="Search STB messages"
                        autoComplete="off"
                      />
                      <Search className={adminListTableToolbarSearchIconEmbeddedClass} aria-hidden />
                    </div>

                    <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
                      <FormSelect
                        id="history-status-filter"
                        value={historyStatus}
                        onValueChange={(v) => {
                          setHistoryStatus(v as MessageStatusFilter);
                          setHistoryPage(1);
                        }}
                        options={[...HISTORY_STATUS_OPTIONS]}
                        className={cn(historyFilterSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[8.5rem]")}
                        contentClassName={managersToolbarDropdownPanelClass}
                        contentHudCorners
                        itemClassName={managersToolbarSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                      <FormSelect
                        id="history-priority-filter"
                        value={historyPriority}
                        onValueChange={(v) => {
                          setHistoryPriority(v);
                          setHistoryPage(1);
                        }}
                        options={[...HISTORY_PRIORITY_OPTIONS]}
                        className={cn(historyFilterSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[8.5rem]")}
                        contentClassName={managersToolbarDropdownPanelClass}
                        contentHudCorners
                        itemClassName={managersToolbarSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                      <FormSelect
                        id="history-page-size"
                        value={historyPageSize}
                        onValueChange={(v) => {
                          setHistoryPageSize(v);
                          setHistoryPage(1);
                        }}
                        options={HISTORY_PAGE_SIZE_OPTIONS}
                        className={cn(historyPerPageSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[6.25rem]")}
                        contentClassName={managersToolbarDropdownPanelClass}
                        contentHudCorners
                        itemClassName={managersToolbarSelectItemClass}
                        itemShowCheck={false}
                        clampMenuToTrigger
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">{historyChannelTabs}</div>
                    <Link
                      href={`${messageBase}?tab=compose&channel=subscribers`}
                      className={managersToolbarPrimaryButtonClass}
                      title="Compose new subscriber message"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                      <span>New message</span>
                    </Link>
                  </div>
                </div>

                <StbMessageHistoryTable
                  embedded
                  rows={historyPageRows}
                  sentByLabel={sentByLabel}
                  stalkerShellLoading={stalkerShellLoading}
                  recentLoadedCount={recent.length}
                  recipients30d={stats.recipients30d}
                  filteredCount={filteredRecent.length}
                  onViewDetail={setDetailRow}
                />

                <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-3">
                  <ResellersTablePagination
                    totalPages={historyTotalPages}
                    currentPage={historyPageSafe}
                    onPageChange={setHistoryPage}
                    ariaLabel="Message history pages"
                    className="sm:justify-self-start"
                  />

                  <p className="hidden shrink-0 text-right text-[11px] leading-snug text-muted-foreground sm:block">
                    Showing <span className="font-medium">{historyPageRows.length}</span> of{" "}
                    <span className="font-medium">{filteredRecent.length}</span> filtered row
                    {filteredRecent.length === 1 ? "" : "s"} ({recent.length} total loaded)
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {detailRow ? (
        <MessageDetailModal row={detailRow} sentByLabel={sentByLabel} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  );
}
