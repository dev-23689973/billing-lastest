"use client";

import type { SubscriberListClientRow } from "@/lib/dto/subscribers";
import { cn } from "@/lib/cn";

/** Admin-only Stalker `users.id`. */
export function SubscriberStalkerUserIdCell({
  row,
  className,
}: {
  row: Pick<SubscriberListClientRow, "stalkerUserId">;
  className?: string;
}) {
  const id = row.stalkerUserId;
  if (id == null || !Number.isFinite(id) || id <= 0) {
    return <span className={cn("block w-full text-left text-muted-foreground", className)}>—</span>;
  }
  return <span className={cn("block w-full text-left font-mono tabular-nums", className)}>{id}</span>;
}

/** Device login (`accounts.account`) — primary subscriber username in the grid. */
export function SubscriberAccountUsernameCell({
  row,
  className,
  linkClassName,
  onOpenDetail,
}: {
  row: Pick<SubscriberListClientRow, "account">;
  className?: string;
  linkClassName?: string;
  onOpenDetail?: () => void;
}) {
  const login = row.account?.trim() || "";
  if (!login) {
    return (
      <div className="flex w-full justify-center">
        <span className={cn("text-muted-foreground", className)}>—</span>
      </div>
    );
  }

  const linkClass = cn(
    "subscriber-account-username-link inline-block max-w-full truncate border-0 bg-transparent p-0 font-sans text-inherit leading-inherit",
    "font-semibold tabular-nums text-primary transition-colors hover:underline",
    linkClassName,
    className,
  );

  return (
    <div className="flex w-full justify-center">
      {onOpenDetail ? (
        <button type="button" onClick={onOpenDetail} className={linkClass} title={login}>
          {login}
        </button>
      ) : (
        <span
          className={cn(
            "subscriber-account-username-link inline-block max-w-full truncate font-sans text-inherit leading-inherit tabular-nums text-muted-foreground",
            className,
          )}
          title={login}
        >
          {login}
        </span>
      )}
    </div>
  );
}
