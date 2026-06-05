"use client";

import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updateUserInlineAction } from "@/actions/clientData";
import { ConfirmStatusChangePopover } from "@/components/admin/ConfirmStatusChangePopover";
import { invalidateAfterEndUserStatusMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { cn } from "@/lib/cn";

/** End-user account status: `0` = active, `1` = inactive (suspended). */
type AccountStatusCode = "0" | "1";

function normalizeStatus(value: string): AccountStatusCode {
  return value === "1" ? "1" : "0";
}

/** Toggle switch for subscriber status — same UX as staff hub (`StaffHubDetailStatusToggle`). */
export const SubscriberAccountStatusToggle = memo(function SubscriberAccountStatusToggle({
  account,
  value,
  expired = false,
  inlineApiPath = "/api/admin/users-inline",
  className,
  onSaved,
}: {
  account: string;
  value: string;
  expired?: boolean;
  inlineApiPath?: string;
  className?: string;
  onSaved?: (value: AccountStatusCode) => void;
}) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<AccountStatusCode>(() => normalizeStatus(value));
  const [pending, setPending] = useState<AccountStatusCode | null>(null);
  const [saving, setSaving] = useState(false);
  const isActive = status === "0";

  useEffect(() => {
    setStatus(normalizeStatus(value));
  }, [value]);

  const statusLabel = (code: AccountStatusCode) => (code === "0" ? "Active" : "Inactive");
  const currentLabel = statusLabel(status);
  const nextLabel = pending != null ? statusLabel(pending) : currentLabel;

  async function confirmSave() {
    if (pending == null || pending === status) {
      setPending(null);
      return;
    }
    if (expired && status === "1" && pending === "0") {
      toast.warning("Cannot activate expired user. Renew this account first.");
      setPending(null);
      return;
    }
    const prevStatus = status;
    const nextStatus = pending;
    setStatus(nextStatus);
    setPending(null);
    setSaving(true);
    try {
      const result = await updateUserInlineAction(inlineApiPath, {
        account,
        field: "status",
        value: nextStatus,
      });
      if (!result.ok) {
        setStatus(prevStatus);
        toast.error("Failed to update status.");
        return;
      }
      invalidateAfterEndUserStatusMutation(account);
      onSaved?.(nextStatus);
    } catch {
      setStatus(prevStatus);
      toast.error("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  function requestToggle() {
    const next: AccountStatusCode = isActive ? "1" : "0";
    if (next === status) return;
    if (expired && status === "1" && next === "0") {
      toast.warning("Cannot activate expired user. Renew this account first.");
      return;
    }
    setPending(next);
  }

  return (
    <span className={cn("relative inline-flex justify-center", className)}>
      <button
        ref={toggleRef}
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={`Status: ${currentLabel}. Click to change.`}
        aria-expanded={pending != null}
        disabled={saving}
        onClick={requestToggle}
        className="inline-flex min-w-0 items-center gap-1.5 text-left"
      >
        <span
          className={cn(
            "relative h-4 w-7 shrink-0 rounded-full transition-colors",
            isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "absolute top-0.5 block h-3 w-3 rounded-full bg-white shadow-sm transition-[left]",
              isActive ? "left-[0.875rem]" : "left-0.5",
            )}
          />
        </span>
      </button>
      {pending != null ? (
        <ConfirmStatusChangePopover
          anchorRef={toggleRef}
          entityName={account}
          currentStatusLabel={currentLabel}
          nextStatusLabel={nextLabel}
          saving={saving}
          titleId={`subscriber-status-${account}`}
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmSave()}
        />
      ) : null}
    </span>
  );
});
