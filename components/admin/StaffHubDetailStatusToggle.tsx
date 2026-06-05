"use client";

import { memo, useEffect, useRef, useState } from "react";
import { updateStaffInlineAction } from "@/actions/clientData";
import { ConfirmStatusChangePopover } from "@/components/admin/ConfirmStatusChangePopover";
import { invalidateAfterStaffInlineStatusMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { cn } from "@/lib/cn";

type StaffType = "MANAGER" | "RESELLER" | "DEALER";

/** Single switch + label for status in the expanded row panel. */
export const StaffHubDetailStatusToggle = memo(function StaffHubDetailStatusToggle({
  rowType,
  username,
  value,
  inlineApiPath = "/api/admin/staff-inline",
}: {
  rowType: StaffType;
  username: string;
  value: string;
  inlineApiPath?: string;
}) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState(value);
  const [pending, setPending] = useState<"A" | "S" | null>(null);
  const [saving, setSaving] = useState(false);
  const isActive = status === "A";

  useEffect(() => {
    setStatus(value);
  }, [value]);

  const currentLabel = isActive ? "Active" : "Inactive";
  const nextLabel = pending === "A" ? "Active" : "Inactive";

  async function confirmSave() {
    if (!pending || pending === status) {
      setPending(null);
      return;
    }
    const prevStatus = status;
    const nextStatus = pending;
    setStatus(nextStatus);
    setPending(null);
    setSaving(true);
    try {
      const result = await updateStaffInlineAction(inlineApiPath, {
        rowType,
        username,
        field: "status",
        value: nextStatus,
      });
      if (!result.ok) {
        setStatus(prevStatus);
        alert("Failed to update status.");
        return;
      }
      invalidateAfterStaffInlineStatusMutation();
    } catch {
      setStatus(prevStatus);
      alert("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={toggleRef}
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={`Status: ${currentLabel}. Click to change.`}
        aria-expanded={pending != null}
        disabled={saving}
        onClick={() => setPending(isActive ? "S" : "A")}
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
      {pending ? (
        <ConfirmStatusChangePopover
          anchorRef={toggleRef}
          entityName={username}
          currentStatusLabel={currentLabel}
          nextStatusLabel={nextLabel}
          saving={saving}
          titleId={`staff-detail-status-${username}`}
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmSave()}
        />
      ) : null}
    </span>
  );
});
