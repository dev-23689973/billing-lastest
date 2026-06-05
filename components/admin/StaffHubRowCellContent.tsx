"use client";

import type { ReactNode } from "react";
import { AdminListModalTrigger } from "@/components/admin/AdminListModalTrigger";
import { AdminStaffEditModalTrigger } from "@/components/admin/AdminStaffEditModalTrigger";
import { AdminUsersListModalTrigger } from "@/components/admin/AdminUsersListModalTrigger";
import { InlineEditableStaffCell } from "@/components/admin/InlineEditableStaffCell";
import { StaffHubStateCell, StaffHubStatusCell, StaffHubTypeCell } from "@/components/admin/staffHubResponsiveCells";
import type { StaffHubTableClientRow } from "@/lib/dto/staffList";
import { formatStaffCreatedAtDisplay } from "@/lib/staffDisplayFormat";
import { staffInlineStatusValue } from "@/lib/staffInlineStatus";

const linkBtnClass =
  "inline rounded-none border-0 bg-transparent p-0 font-medium text-foreground no-underline shadow-none outline-none ring-0 hover:bg-transparent hover:text-primary focus:bg-transparent focus-visible:bg-transparent active:bg-transparent";

function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

function hasPositiveCount(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0;
}

function branchCount(r: StaffHubTableClientRow): number {
  if (r.rowType === "MANAGER") return r.managerResellerCount ?? 0;
  if (r.rowType === "RESELLER") return r.dealerCount;
  return 0;
}

export type StaffHubRowCellContext = {
  portal: "admin" | "manager";
  branchHref?: string;
  parentModalType: "MANAGER" | "RESELLER" | "DEALER" | null;
  parentModalUsername: string;
  /** Manager portal dealer row — parent reseller login */
  dealerParentResellerUsername?: string;
  inlineApiPath?: string;
  editorApiBase?: string;
  branchesApiBase?: string;
  subscribersPortal?: "admin" | "manager" | "reseller";
  /** Expanded hidden-columns panel */
  inDetailPanel?: boolean;
};

export function StaffHubRowCellContent({
  columnId,
  row,
  ctx,
}: {
  columnId: string;
  row: StaffHubTableClientRow;
  ctx: StaffHubRowCellContext;
}): ReactNode {
  const inDetail = ctx.inDetailPanel === true;
  switch (columnId) {
    case "name":
      return (
        <InlineEditableStaffCell
          rowType={row.rowType}
          username={row.username}
          field="name"
          value={row.name || ""}
          inlineApiPath={ctx.inlineApiPath}
        />
      );
    case "username":
      return (
        <AdminStaffEditModalTrigger
          rowType={row.rowType}
          username={row.username}
          editorApiBase={ctx.editorApiBase}
          label={<span className="font-medium text-foreground hover:text-primary">{row.username}</span>}
          className="inline cursor-pointer bg-transparent p-0 text-left"
        />
      );
    case "credits":
      return <span className="tabular-nums text-muted-foreground">{formatInt(row.credits)}</span>;
    case "dealerCount": {
      const count = branchCount(row);
      if (count <= 0) return "—";
      if (ctx.portal === "manager" && row.rowType === "RESELLER") {
        return (
          <AdminListModalTrigger
            rowType="RESELLER"
            username={row.username}
            branchesApiBase={ctx.branchesApiBase ?? "/api/manager"}
            className={linkBtnClass}
            label={formatInt(count)}
          />
        );
      }
      if (ctx.branchHref) {
        return (
          <AdminListModalTrigger
            rowType={row.rowType === "MANAGER" ? "MANAGER" : "RESELLER"}
            username={row.username}
            className={linkBtnClass}
            label={formatInt(count)}
          />
        );
      }
      return formatInt(count);
    }
    case "parentReseller":
      if (ctx.portal === "manager" && row.rowType === "DEALER" && ctx.dealerParentResellerUsername) {
        return (
          <AdminStaffEditModalTrigger
            rowType="RESELLER"
            username={ctx.dealerParentResellerUsername}
            editorApiBase={ctx.editorApiBase}
            label={
              <span className="font-medium text-foreground hover:text-primary">{row.parentReseller || "—"}</span>
            }
            className="inline cursor-pointer bg-transparent p-0 text-center"
          />
        );
      }
      if (ctx.parentModalType && ctx.parentModalUsername) {
        return (
          <AdminStaffEditModalTrigger
            rowType={ctx.parentModalType}
            username={ctx.parentModalUsername}
            editorApiBase={ctx.editorApiBase}
            label={
              <span className="font-medium text-foreground hover:text-primary">{row.parentReseller || "—"}</span>
            }
            className="inline cursor-pointer bg-transparent p-0 text-center"
          />
        );
      }
      return <span className="text-foreground">{row.parentReseller || "—"}</span>;
    case "createdAt":
      return (
        <span className="tabular-nums text-muted-foreground">{formatStaffCreatedAtDisplay(row.createdAt)}</span>
      );
    case "status":
      return (
        <StaffHubStatusCell
          rowType={row.rowType}
          username={row.username}
          value={ctx.portal === "manager" ? staffInlineStatusValue(row.status) : row.status}
          inlineApiPath={ctx.inlineApiPath}
          inDetailPanel={inDetail}
        />
      );
    case "state":
      return (
        <StaffHubStateCell
          username={row.username}
          dbCurrentLogin={row.stateCurrentLogin}
          dbLastLogin={row.stateLastLogin}
          inDetailPanel={inDetail}
        />
      );
    case "type":
      return <StaffHubTypeCell rowType={row.rowType} />;
    case "activeUsers":
      return hasPositiveCount(row.activeUsers) ? (
        <AdminUsersListModalTrigger
          rowType={row.rowType}
          username={row.username}
          displayName={row.name || row.username}
          status="active"
          subscribersPortal={ctx.subscribersPortal}
          className={linkBtnClass}
          label={formatInt(row.activeUsers)}
        />
      ) : (
        <span className="text-muted-foreground">{formatInt(row.activeUsers)}</span>
      );
    case "expiredUsers":
      return hasPositiveCount(row.expiredUsers) ? (
        <AdminUsersListModalTrigger
          rowType={row.rowType}
          username={row.username}
          displayName={row.name || row.username}
          status="expired"
          subscribersPortal={ctx.subscribersPortal}
          className={linkBtnClass}
          label={formatInt(row.expiredUsers)}
        />
      ) : (
        <span className="text-muted-foreground">{formatInt(row.expiredUsers)}</span>
      );
    case "totalUsers":
      return hasPositiveCount(row.totalUsers) ? (
        <AdminUsersListModalTrigger
          rowType={row.rowType}
          username={row.username}
          displayName={row.name || row.username}
          status=""
          subscribersPortal={ctx.subscribersPortal}
          className={linkBtnClass}
          label={formatInt(row.totalUsers)}
        />
      ) : (
        <span>{formatInt(row.totalUsers)}</span>
      );
    default:
      return null;
  }
}
