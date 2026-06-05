"use client";

import { RotateCcw } from "lucide-react";
import { resetAdminEndUserStalkerDevicesAction, resetOperatorEndUserStalkerDevicesAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { InlineConfirmAction } from "@/components/ui/InlineConfirmAction";
import { cn } from "@/lib/cn";
import { floatingRowActionMenuIconClass, floatingRowActionMenuItemClass } from "@/lib/ui/floatingActionMenu";

const MSG =
  "Clear device ID, serial number, and access token for this account so the set-top box can be paired again? MAC address is unchanged.";

export function ResetStalkerDeviceBindingsForm({
  account,
  redirectPath,
  label,
  className,
  fullWidth,
  menuItem = false,
  action = resetAdminEndUserStalkerDevicesAction,
  onPanelOpenChange,
}: {
  account: string;
  redirectPath: string;
  label: string;
  className?: string;
  /** Wide layout for subscriber edit sidebar. */
  fullWidth?: boolean;
  /** Row ⋮ menu: full-width control aligned with other items. */
  menuItem?: boolean;
  action?: typeof resetAdminEndUserStalkerDevicesAction | typeof resetOperatorEndUserStalkerDevicesAction;
  onPanelOpenChange?: (open: boolean) => void;
}) {
  const wide = Boolean(fullWidth);

  return (
    <InlineConfirmAction
      action={action}
      title="Confirm device reset"
      description={MSG}
      confirmLabel="Confirm reset"
      cancelLabel="Cancel"
      confirmVariant="destructive"
      panelStyle="smooth"
      className={cn(menuItem ? "block w-full" : wide ? "block w-full max-w-full" : "inline", className)}
      onPanelOpenChange={onPanelOpenChange}
      trigger={(onOpen) =>
        menuItem ? (
          <button
            type="button"
            role="menuitem"
            className={floatingRowActionMenuItemClass}
            onClick={onOpen}
          >
            <RotateCcw className={floatingRowActionMenuIconClass} aria-hidden />
            {label}
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              wide ? "h-10 w-full rounded-lg border-primary/25 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10" : "px-2",
            )}
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
