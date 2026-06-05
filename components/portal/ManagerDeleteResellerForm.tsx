"use client";

import type { RefObject } from "react";
import { Trash2 } from "lucide-react";
import { deleteManagerResellerAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { InlineConfirmAction } from "@/components/ui/InlineConfirmAction";
import { cn } from "@/lib/cn";
import {
  floatingRowActionMenuIconClass,
  floatingRowActionMenuItemDestructiveClass,
  floatingRowActionMenuItemDisabledClass,
} from "@/lib/ui/floatingActionMenu";

export function ManagerDeleteResellerForm({
  username,
  canDelete,
  buttonLabel = "Delete reseller",
  className,
  menuItem = false,
  onPanelOpenChange,
  defaultConfirmOpen = false,
  positionAnchorRef,
}: {
  username: string;
  canDelete: boolean;
  buttonLabel?: string;
  className?: string;
  menuItem?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
  defaultConfirmOpen?: boolean;
  positionAnchorRef?: RefObject<HTMLElement | null>;
}) {
  if (!canDelete) {
    return (
      <span
        className={cn(
          "inline-flex cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground",
          menuItem && floatingRowActionMenuItemDisabledClass,
        )}
        title="You can't delete this reseller while they have dealers or subscriber accounts."
      >
        {menuItem ? <Trash2 className={cn(floatingRowActionMenuIconClass, "opacity-50")} aria-hidden /> : null}
        {buttonLabel}
      </span>
    );
  }
  const detached = defaultConfirmOpen;
  return (
    <InlineConfirmAction
      action={deleteManagerResellerAction}
      title="Delete reseller account?"
      description="Delete this reseller account? This cannot be undone."
      confirmLabel="Delete"
      defaultOpen={detached}
      positionSourceRef={positionAnchorRef}
      className={detached ? "sr-only" : "block w-full"}
      onPanelOpenChange={onPanelOpenChange}
      trigger={(onOpen) =>
        detached ? (
          <span className="sr-only">{buttonLabel}</span>
        ) : menuItem ? (
          <button
            type="button"
            role="menuitem"
            className={cn(floatingRowActionMenuItemDestructiveClass, className)}
            onClick={onOpen}
          >
            <Trash2 className={cn(floatingRowActionMenuIconClass, "opacity-80")} aria-hidden />
            {buttonLabel}
          </button>
        ) : (
          <Button type="button" variant="destructive" size="sm" className={className ?? "px-2 text-xs"} onClick={onOpen}>
            {buttonLabel}
          </Button>
        )
      }
    >
      <input type="hidden" name="username" value={username} />
    </InlineConfirmAction>
  );
}
