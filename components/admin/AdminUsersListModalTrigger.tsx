"use client";

import type { ReactNode, Ref } from "react";
import { useMemo, useState } from "react";
import { AdminSubscribersFetchModal } from "@/components/admin/AdminSubscribersFetchModal";
import { cn } from "@/lib/cn";

type RowType = "MANAGER" | "RESELLER" | "DEALER";
type StatusFilter = "active" | "expired" | "";

export function AdminUsersListModalTrigger({
  rowType,
  username,
  displayName,
  status,
  label,
  className,
  triggerRef,
  subscribersPortal = "admin",
}: {
  rowType: RowType;
  username: string;
  displayName?: string;
  status: StatusFilter;
  label: ReactNode;
  className?: string;
  triggerRef?: Ref<HTMLButtonElement>;
  /** `admin` (default), `manager`, or `reseller` scoped subscriber list APIs. */
  subscribersPortal?: "admin" | "manager" | "reseller";
}) {
  const [open, setOpen] = useState(false);

  const apiBaseUrl = useMemo(() => {
    const u = encodeURIComponent(username);
    const apiRoot =
      subscribersPortal === "manager"
        ? "/api/manager"
        : subscribersPortal === "reseller"
          ? "/api/reseller"
          : "/api/admin";
    if (rowType === "MANAGER") return `${apiRoot}/managers/${u}/subscribers`;
    if (rowType === "RESELLER") return `${apiRoot}/resellers/${u}/subscribers`;
    return `${apiRoot}/dealers/${u}/subscribers`;
  }, [rowType, username, subscribersPortal]);

  const scopeDescription = status === "active" ? "Showing active users in this scope." : status === "expired" ? "Showing expired users in this scope." : "Showing all users in this scope.";

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn("relative z-[2] inline cursor-pointer bg-transparent p-0 pointer-events-auto", className)}
      >
        {label}
      </button>
      <AdminSubscribersFetchModal
        open={open}
        onOpenChange={setOpen}
        apiBaseUrl={apiBaseUrl}
        fixedQuery={status ? { status } : undefined}
        entityDisplayName={displayName || username}
        entityLogin={username}
        scopeDescription={scopeDescription}
      />
    </>
  );
}
