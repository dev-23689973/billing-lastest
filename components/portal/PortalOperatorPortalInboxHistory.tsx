"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { ResellersTablePagination } from "@/components/admin/ResellersTablePagination";
import {
  adminListTableToolbarSearchFieldEmbeddedClass,
  adminListTableToolbarSearchIconEmbeddedClass,
  adminListTableToolbarShellClass,
  adminListTableToolbarShellEmbeddedClass,
  managersToolbarDropdownPanelClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { FormSelect } from "@/components/forms/form-select";
import { PortalStaffInboxTable, type PortalInboxRow } from "@/components/portal/PortalStaffInboxTable";
import { cn } from "@/lib/cn";

const PORTAL_INBOX_STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "active", label: "Active" },
  { value: "dismiss", label: "Dismiss" },
  { value: "read", label: "Read" },
] as const;

const historyFilterSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[8.5rem] shrink-0 sm:min-w-[9rem]",
);

const historyPerPageSelectTriggerClass = cn(
  managersToolbarSelectTriggerClass,
  "!w-max min-w-[6.25rem] shrink-0 sm:min-w-[6.5rem]",
);

export function PortalOperatorPortalInboxHistory({
  historySearch,
  onHistorySearchChange,
  portalInboxStatus,
  onPortalInboxStatusChange,
  historyPageSize,
  onHistoryPageSizeChange,
  historyPageSizeOptions,
  historyChannelTabs,
  portalInboxPageRows,
  portalInboxTotalPages,
  portalInboxPageSafe,
  onHistoryPageChange,
  filteredPortalInboxLength,
  portalInboxAllRowsLength,
  portalActiveCount,
}: {
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
  portalInboxStatus: "all" | "active" | "dismiss" | "read";
  onPortalInboxStatusChange: (value: "all" | "active" | "dismiss" | "read") => void;
  historyPageSize: string;
  onHistoryPageSizeChange: (value: string) => void;
  historyPageSizeOptions: readonly { value: string; label: string }[];
  historyChannelTabs: ReactNode;
  portalInboxPageRows: PortalInboxRow[];
  portalInboxTotalPages: number;
  portalInboxPageSafe: number;
  onHistoryPageChange: (page: number) => void;
  filteredPortalInboxLength: number;
  portalInboxAllRowsLength: number;
  portalActiveCount: number;
}) {
  return (
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
              onChange={(e) => onHistorySearchChange(e.target.value)}
              placeholder="Search message, sender, time..."
              className={cn(managersToolbarSearchInputClass, "relative z-0 w-full")}
              aria-label="Search portal messages"
              autoComplete="off"
            />
            <Search className={adminListTableToolbarSearchIconEmbeddedClass} aria-hidden />
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
            <FormSelect
              id="portal-inbox-status-filter"
              value={portalInboxStatus}
              onValueChange={(v) => onPortalInboxStatusChange(v as "all" | "active" | "dismiss" | "read")}
              options={[...PORTAL_INBOX_STATUS_OPTIONS]}
              className={cn(historyFilterSelectTriggerClass, "!w-full min-w-0 sm:!w-max sm:min-w-[8.5rem]")}
              contentClassName={managersToolbarDropdownPanelClass}
              contentHudCorners
              itemClassName={managersToolbarSelectItemClass}
              itemShowCheck={false}
              clampMenuToTrigger
            />
            <FormSelect
              id="portal-inbox-page-size"
              value={historyPageSize}
              onValueChange={onHistoryPageSizeChange}
              options={[...historyPageSizeOptions]}
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
          <div className="min-w-0 w-full">{historyChannelTabs}</div>
        </div>
      </div>

      <PortalStaffInboxTable rows={portalInboxPageRows} embedded />
      <div className="flex shrink-0 flex-col gap-1 border-t border-border/50 px-2 py-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-3">
        <ResellersTablePagination
          totalPages={portalInboxTotalPages}
          currentPage={portalInboxPageSafe}
          onPageChange={onHistoryPageChange}
          ariaLabel="Portal message pages"
          className="sm:justify-self-start"
        />
        <p className="hidden shrink-0 text-right text-[11px] leading-snug text-muted-foreground sm:block">
          Showing <span className="font-medium">{portalInboxPageRows.length}</span> of{" "}
          <span className="font-medium">{filteredPortalInboxLength}</span> filtered row
          {filteredPortalInboxLength === 1 ? "" : "s"} ({portalInboxAllRowsLength} total)
          {portalActiveCount > 0 ? (
            <>
              {" "}
              · <span className="font-medium text-destructive">{portalActiveCount}</span> active (alerts)
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
