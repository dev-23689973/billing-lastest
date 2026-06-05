"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updateStaffInlineAction } from "@/actions/clientData";
import { billingToast } from "@/lib/client/billingToast";
import {
  invalidateAfterStaffInlineStatusMutation,
  invalidateAfterStaffProfileMutation,
} from "@/lib/client/invalidateAfterBillingMutation";
import { Eye, EyeOff } from "lucide-react";
import { ConfirmStatusChangeModal } from "@/components/admin/ConfirmStatusChangeModal";
import {
  StaffStatusIconBadge,
  staffStatusBadgeClassName,
  staffStatusEditButtonClassName,
} from "@/components/admin/HierarchyTableBadges";
import { cn } from "@/lib/cn";

type StaffType = "MANAGER" | "RESELLER" | "DEALER";
type EditableField = "name" | "password" | "status";

export function InlineEditableStaffCell({
  rowType,
  username,
  field,
  value,
  className,
  inlineApiPath = "/api/admin/staff-inline",
  compact = false,
  responsiveInTable = false,
}: {
  rowType: StaffType;
  username: string;
  field: EditableField;
  value: string;
  className?: string;
  /** Defaults to admin inline API; manager hub uses `/api/manager/staff-inline`. */
  inlineApiPath?: string;
  /** Mobile: status shows icon only (still editable on double-click). */
  compact?: boolean;
  /** Staff hub table: md+ shows text badge; edit UI is portaled so it is never clipped. */
  responsiveInTable?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const statusPortalRef = useRef<HTMLDivElement>(null);
  const [statusEditAnchor, setStatusEditAnchor] = useState<{ top: number; left: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [committedValue, setCommittedValue] = useState(value);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"status" | null>(null);
  const [confirmValue, setConfirmValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nextStatusLabel = confirmValue === "A" ? "Active" : "Inactive";
  const currentStatusLabel = committedValue === "A" ? "Active" : "Inactive";

  useEffect(() => {
    if (!editing || field !== "status" || confirmOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      if (statusPortalRef.current?.contains(target)) return;
      setDraft(committedValue);
      setEditing(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [editing, field, confirmOpen, committedValue]);

  useEffect(() => {
    setCommittedValue(value);
    if (!editing && !saving) setDraft(value);
  }, [value, editing, saving]);

  useEffect(() => {
    if (!editing || field !== "status" || !responsiveInTable) {
      setStatusEditAnchor(null);
      return;
    }
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setStatusEditAnchor({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editing, field, responsiveInTable]);

  const statusLabel = committedValue === "A" ? "Active" : "Inactive";

  const statusPill = (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ring-1",
        staffStatusBadgeClassName(committedValue === "A"),
      )}
    >
      {statusLabel}
    </span>
  );
  const visibleText = useMemo(() => {
    if (field === "password") {
      if (editing) return showPassword ? draft : "••••••••";
      return committedValue ? "••••••••" : "—";
    }
    if (field === "status") return statusLabel;
    return committedValue || "—";
  }, [field, committedValue, statusLabel, showPassword, editing, draft]);

  async function save(nextValueRaw?: string) {
    const nextValue = (nextValueRaw ?? draft).trim();
    if (!nextValue) return;
    if (nextValue === committedValue) {
      setEditing(false);
      setConfirmOpen(false);
      setConfirmKind(null);
      return;
    }
    setSaving(true);
    const prevValue = committedValue;
    const isStatusSave = field === "status";
    const isNameSave = field === "name";
    if (isStatusSave || isNameSave) {
      setCommittedValue(nextValue);
      setEditing(false);
      setConfirmOpen(false);
      setConfirmKind(null);
    }
    try {
      const result = await updateStaffInlineAction(inlineApiPath, {
        rowType,
        username,
        field,
        value: nextValue,
      });
      if (!result.ok) {
        if (isStatusSave || isNameSave) setCommittedValue(prevValue);
        billingToast.error("Failed to update value.");
        return;
      }
      if (!isStatusSave && !isNameSave) {
        setEditing(false);
        setConfirmOpen(false);
        setConfirmKind(null);
        setCommittedValue(nextValue);
      }
      if (field === "name" || field === "password") {
        invalidateAfterStaffProfileMutation();
      } else if (isStatusSave) {
        invalidateAfterStaffInlineStatusMutation();
      }
      billingToast.success("Updated successfully.");
    } catch {
      if (isStatusSave || isNameSave) setCommittedValue(prevValue);
      billingToast.error("Failed to update value.");
    } finally {
      setSaving(false);
    }
  }

  function requestStatusChange(next: "A" | "S") {
    if (next === committedValue) {
      setEditing(false);
      setConfirmOpen(false);
      setConfirmKind(null);
      return;
    }
    setDraft(next);
    setConfirmValue(next);
    setConfirmKind("status");
    setConfirmOpen(true);
  }

  function closeStatusConfirm() {
    setConfirmOpen(false);
    setConfirmKind(null);
    setDraft(committedValue);
    setEditing(false);
  }

  const statusConfirmModal =
    confirmOpen && confirmKind === "status" ? (
      <ConfirmStatusChangeModal
        entityName={username}
        currentStatusLabel={currentStatusLabel}
        nextStatusLabel={nextStatusLabel}
        saving={saving}
        titleId="staff-status-confirm-title"
        onCancel={closeStatusConfirm}
        onConfirm={() => void save(confirmValue)}
      />
    ) : null;

  if (!editing) {
    if (field === "password") {
      return (
        <>
          <div
            className={cn(
              "inline-flex min-h-8 items-center gap-2 rounded-md border border-border/50 bg-background/35 px-2 py-1",
              className,
            )}
          >
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              className="text-left text-sm"
              title="Double click to edit"
            >
              {visibleText}
            </button>
            {committedValue ? (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
              </button>
            ) : null}
          </div>
        </>
      );
    }

    if (field === "status") {
      return (
        <>
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            className={cn("inline-flex shrink-0", className)}
            title={`${statusLabel} — double click to edit`}
            aria-label={statusLabel}
          >
            {responsiveInTable ? (
              <>
                <span className="hidden md:inline-flex">{statusPill}</span>
                <span className="md:hidden">
                  <span className="staff-hub-status-icon">
                    <StaffStatusIconBadge isActive={committedValue === "A"} />
                  </span>
                  <span className="staff-hub-status-pill-narrow">{statusPill}</span>
                </span>
              </>
            ) : compact ? (
              <StaffStatusIconBadge isActive={committedValue === "A"} />
            ) : (
              statusPill
            )}
          </button>
          {statusConfirmModal}
        </>
      );
    }
    return (
      <>
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={cn(
            "inline p-0 text-left text-sm text-foreground no-underline hover:text-primary",
            className,
          )}
          title="Double click to edit"
        >
          {visibleText}
        </button>
      </>
    );
  }

  if (field === "status") {
    const statusEditor = (
      <div
        role="group"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(committedValue);
            setEditing(false);
          }
        }}
        className="inline-flex min-w-max shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-md ring-1 ring-black/10 dark:border-border/70 dark:bg-background dark:ring-white/10"
      >
        <button
          type="button"
          disabled={saving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setDraft("A")}
          onDoubleClick={() => requestStatusChange("A")}
          className={cn(
            "h-7 shrink-0 rounded px-2 text-xs font-semibold transition-colors",
            staffStatusEditButtonClassName(draft === "A", "active"),
          )}
        >
          Active
        </button>
        <button
          type="button"
          disabled={saving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setDraft("S")}
          onDoubleClick={() => requestStatusChange("S")}
          className={cn(
            "h-7 shrink-0 rounded px-2 text-xs font-semibold transition-colors",
            staffStatusEditButtonClassName(draft === "S", "inactive"),
          )}
        >
          Inactive
        </button>
      </div>
    );

    const usePortal = responsiveInTable && statusEditAnchor && typeof document !== "undefined";

    return (
      <div ref={rootRef} className="inline-flex justify-center">
        {usePortal
          ? createPortal(
              <div
                ref={statusPortalRef}
                className="fixed z-[80]"
                style={{
                  top: statusEditAnchor.top,
                  left: statusEditAnchor.left,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {statusEditor}
              </div>,
              document.body,
            )
          : statusEditor}
        {statusConfirmModal}
      </div>
    );
  }

  const nameInputChars = Math.max(draft.length, committedValue.length, 3);

  if (field === "name") {
    return (
      <input
        type="text"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (confirmOpen) return;
          setDraft(committedValue);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
          if (e.key === "Escape") {
            setDraft(committedValue);
            setEditing(false);
          }
        }}
        className={cn(
          "box-border h-8 max-w-full rounded-md border border-border/70 bg-background px-2 text-sm",
          className,
        )}
        style={{ width: `${nameInputChars}ch` }}
        autoFocus
      />
    );
  }

  return (
    <>
      <div className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/35 p-1">
        <input
          type={field === "password" && !showPassword ? "password" : "text"}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (confirmOpen) return;
            setDraft(committedValue);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              setDraft(committedValue);
              setEditing(false);
            }
          }}
          className={cn(
            "box-border h-8 w-full min-w-[7rem] max-w-full rounded-md border border-border/70 bg-background px-2 text-sm",
            field === "password" ? "font-mono" : "",
          )}
          autoFocus
        />
        {field === "password" ? (
          <button
            type="button"
            disabled={saving}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword((prev) => !prev)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        ) : null}
      </div>
    </>
  );
}
