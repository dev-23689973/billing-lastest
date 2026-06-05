"use client";

import Link from "next/link";
import { subscriberBillingOwner } from "@/lib/subscribers/subscribersTableModel";
import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { cn } from "@/lib/cn";

type Props = {
  row: SubscriberListClientRow;
  usersListPath: string;
  hierarchyRoles: ReadonlySet<"manager" | "reseller" | "dealer">;
  onHierarchyClick?: (role: "manager" | "reseller" | "dealer", username: string) => void;
  className?: string;
  truncate?: boolean;
  /** Plain text — no link or filter action (e.g. view-users modal). */
  readonly?: boolean;
};

export function SubscriberParentsCell({
  row,
  usersListPath,
  hierarchyRoles,
  onHierarchyClick,
  className,
  truncate = false,
  readonly = false,
}: Props) {
  const owner = subscriberBillingOwner(row);
  if (!owner) return <span className={cn("text-muted-foreground", className)}>—</span>;

  const label = owner.login;
  const textClass = cn(
    truncate ? "block min-w-0 max-w-full truncate" : "whitespace-nowrap",
    readonly ? "text-muted-foreground" : "font-medium text-foreground transition-colors hover:text-primary",
    className,
  );

  if (readonly) {
    return (
      <span className={textClass} title={label}>
        {label}
      </span>
    );
  }

  const linkClass = cn(
    "font-medium text-foreground transition-colors hover:text-primary",
    truncate ? "block max-w-full truncate" : "whitespace-nowrap",
  );

  if (hierarchyRoles.has(owner.role) && onHierarchyClick) {
    return (
      <button
        type="button"
        onClick={() => onHierarchyClick(owner.role, label)}
        className={cn(linkClass, className)}
        title={label}
      >
        {label}
      </button>
    );
  }

  const param = owner.role === "dealer" ? "dealer" : owner.role === "reseller" ? "reseller" : "manager";
  return (
    <Link
      href={`${usersListPath}?${param}=${encodeURIComponent(label)}`}
      className={cn(linkClass, className)}
      title={label}
    >
      {label}
    </Link>
  );
}
