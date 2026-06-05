"use client";

import { X } from "lucide-react";
import { StaffRowActionModal } from "@/components/admin/StaffRowActionModal";
import { PasswordInputWithToggle } from "@/components/forms/PasswordInputWithToggle";
import { Button } from "@/components/ui/button";
import { staffDetailsCloseButtonClass } from "@/components/admin/managers-toolbar-icon-button";

type Props = {
  open: boolean;
  onClose: () => void;
  username: string;
  formAction: (formData: FormData) => void | Promise<void>;
  idPrefix: string;
  redirectPath?: string;
};

export function StaffPasswordResetModal({ open, onClose, username, formAction, idPrefix, redirectPath }: Props) {
  return (
    <StaffRowActionModal open={open} onClose={onClose} dialogClassName="max-w-md" ariaLabel="Reset password">
      <div className="p-5 sm:p-6">
        <header className="flex items-start justify-between gap-3 border-b border-border/60 pb-4 dark:border-cyan-400/10">
          <div className="min-w-0 pr-2">
            <h3 className="text-lg font-semibold text-foreground">Reset password</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Set a new password for <span className="font-mono font-medium text-foreground">{username}</span>.
            </p>
          </div>
          <button type="button" onClick={onClose} className={staffDetailsCloseButtonClass} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="username" value={username} />
          {redirectPath ? <input type="hidden" name="redirect" value={redirectPath} /> : null}
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-password`} className="text-sm font-medium text-foreground">
              New password
            </label>
            <PasswordInputWithToggle
              id={`${idPrefix}-password`}
              name="password"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-password-confirm`} className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <PasswordInputWithToggle
              id={`${idPrefix}-password-confirm`}
              name="password_confirm"
              required
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-muted-foreground">Use 4 to 12 characters.</p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4 dark:border-cyan-400/10">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save password
            </Button>
          </div>
        </form>
      </div>
    </StaffRowActionModal>
  );
}
