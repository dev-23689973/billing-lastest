"use client";

import { Trash2 } from "lucide-react";
import { deleteAdminEndUserAccountAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { InlineConfirmAction } from "@/components/ui/InlineConfirmAction";
import { cn } from "@/lib/cn";
import {
  floatingRowActionMenuIconClass,
  floatingRowActionMenuItemDestructiveClass,
} from "@/lib/ui/floatingActionMenu";

const MSG_ACTIVE =
  "This account is still active. Do you really want to delete this user account?";
const MSG_EXPIRED = "Permanently delete this user account? This cannot be undone.";

export function AdminDeleteEndUserAccountForm({
  account,
  redirectPath,
  subscriptionExpired,
  compact,
  menuItem = false,
  action = deleteAdminEndUserAccountAction,
  buttonLabel,
  onPanelOpenChange,
}: {
  account: string;
  redirectPath: string;
  subscriptionExpired: boolean;
  /** Table row: small destructive button. */
  compact?: boolean;
  /** Row ⋮ menu: icon + label (use with `compact`). */
  menuItem?: boolean;
  action?: typeof deleteAdminEndUserAccountAction;
  buttonLabel?: string;
  onPanelOpenChange?: (open: boolean) => void;
}) {
  const description = subscriptionExpired ? MSG_EXPIRED : MSG_ACTIVE;
  const label = buttonLabel ?? "Delete";
  return (
    <InlineConfirmAction
      action={action}
      title="Delete user account?"
      description={description}
      confirmLabel="Delete"
      panelStyle="smooth"
      className={cn(menuItem ? "block w-full" : compact ? "inline" : "block")}
      onPanelOpenChange={onPanelOpenChange}
      trigger={(onOpen) =>
        menuItem ? (
          <button
            type="button"
            role="menuitem"
            className={floatingRowActionMenuItemDestructiveClass}
            onClick={onOpen}
          >
            <Trash2 className={cn(floatingRowActionMenuIconClass, "opacity-80")} aria-hidden />
            {label}
          </button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size={compact ? "sm" : "default"}
            className={cn(compact && "px-2 text-xs")}
            onClick={onOpen}
          >
            {label}
          </Button>
        )
      }
    >
      <input type="hidden" name="account" value={account} />
      <input type="hidden" name="redirect" value={redirectPath} />
    </InlineConfirmAction>
  );
}
