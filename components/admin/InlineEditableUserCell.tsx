"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { updateUserInlineAction } from "@/actions/clientData";
import { invalidateAfterEndUserInlineFieldMutation } from "@/lib/client/invalidateAfterBillingMutation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ConfirmFieldUpdateModal } from "@/components/admin/ConfirmFieldUpdateModal";
import { SubscriberAccountStatusToggle } from "@/components/admin/SubscriberAccountStatusToggle";
import { cn } from "@/lib/cn";

type EditableField = "user" | "password" | "mac" | "ip" | "status";

export type InlineUserSavePayload = {
  account: string;
  field: EditableField;
  value: string;
};

function toCanonicalMac(raw: string): string | null {
  const hexOnly = raw.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hexOnly.length !== 12) return null;
  const parts = hexOnly.match(/.{1,2}/g);
  if (!parts || parts.length !== 6) return null;
  return parts.join(":");
}

function formatMacWhileTyping(raw: string): string {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12);
  const groups = hex.match(/.{1,2}/g);
  return groups ? groups.join(":") : "";
}

function macCursorPosition(raw: string, cursor: number): number {
  const before = raw.slice(0, cursor).replace(/[^0-9A-Fa-f]/g, "").slice(0, 12);
  return formatMacWhileTyping(before).length;
}

export function InlineEditableUserCell({
  account,
  field,
  value,
  expired = false,
  className,
  inlineApiPath = "/api/admin/users-inline",
  onInlineSave,
}: {
  account: string;
  field: EditableField;
  value: string;
  expired?: boolean;
  className?: string;
  /** Defaults to admin; manager users list uses `/api/manager/users-inline`. */
  inlineApiPath?: string;
  onInlineSave?: (payload: InlineUserSavePayload) => void;
}) {
  if (field === "status") {
    return (
      <SubscriberAccountStatusToggle
        account={account}
        value={value}
        expired={expired}
        inlineApiPath={inlineApiPath}
        className={className}
        onSaved={(nextValue) => onInlineSave?.({ account, field: "status", value: nextValue })}
      />
    );
  }

  return (
    <InlineEditableUserFieldCell
      account={account}
      field={field}
      value={value}
      className={className}
      inlineApiPath={inlineApiPath}
      onInlineSave={onInlineSave}
    />
  );
}

function InlineEditableUserFieldCell({
  account,
  field,
  value,
  className,
  inlineApiPath,
  onInlineSave,
}: {
  account: string;
  field: Exclude<EditableField, "status">;
  value: string;
  className?: string;
  inlineApiPath: string;
  onInlineSave?: (payload: InlineUserSavePayload) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [committedValue, setCommittedValue] = useState(value);
  const safeValue = field === "password" ? "" : committedValue;
  const [draft, setDraft] = useState(safeValue);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const confirmPendingRef = useRef(false);

  const visibleText = useMemo(() => {
    if (field === "password") {
      if (editing) return showPassword ? draft : "••••••••";
      return safeValue ? "••••••••" : "—";
    }
    return committedValue || "—";
  }, [field, safeValue, showPassword, editing, draft, committedValue]);

  useEffect(() => {
    setCommittedValue(value);
    if (!editing && !saving) {
      const nextSafe = field === "password" ? "" : value;
      setDraft(nextSafe);
    }
  }, [value, field]);

  async function save(nextValueRaw?: string) {
    const nextValue = (nextValueRaw ?? draft).trim();
    const finalValue = field === "mac" ? toCanonicalMac(nextValue) ?? "" : nextValue;
    setFieldError(null);
    if (nextValue === safeValue) {
      setEditing(false);
      setConfirmOpen(false);
      return;
    }
    if (field !== "ip" && !finalValue) {
      if (field === "mac") {
        setFieldError("Invalid MAC format. Use AA:BB:CC:DD:EE:FF.");
        setConfirmOpen(false);
        setEditing(true);
        return;
      }
      setEditing(false);
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    const prevValue = committedValue;
    const isOptimisticField = field === "user" || field === "mac" || field === "ip";
    if (isOptimisticField) {
      setCommittedValue(finalValue);
      setEditing(false);
      setConfirmOpen(false);
    }
    try {
      const result = await updateUserInlineAction(inlineApiPath, {
        account,
        field,
        value: finalValue,
      });
      if (!result.ok) {
        if (isOptimisticField) setCommittedValue(prevValue);
        if (result.error === "invalid_mac") {
          setFieldError("Invalid MAC format. Use AA:BB:CC:DD:EE:FF.");
          setConfirmOpen(false);
          setEditing(true);
          return;
        }
        if (result.error === "duplicate_mac") {
          setFieldError("This MAC already exists. MAC must be unique.");
          setConfirmOpen(false);
          setEditing(true);
          return;
        }
        toast.error("Failed to update value.");
        return;
      }
      if (field === "user" || field === "mac" || field === "ip") {
        toast.success(
          field === "user" ? "Name updated successfully." : field === "mac" ? "MAC updated successfully." : "IP updated successfully.",
        );
      }
      confirmPendingRef.current = false;
      if (!isOptimisticField) {
        setEditing(false);
        setConfirmOpen(false);
        setCommittedValue(finalValue);
      }
      onInlineSave?.({ account, field, value: finalValue });
      invalidateAfterEndUserInlineFieldMutation(account);
    } catch {
      if (isOptimisticField) setCommittedValue(prevValue);
      toast.error("Failed to update value.");
    } finally {
      setSaving(false);
    }
  }

  function openConfirm(nextValueRaw?: string) {
    const next = String(nextValueRaw ?? draft).trim();
    const prepared = field === "mac" ? toCanonicalMac(next) ?? "" : next;
    setFieldError(null);
    if (!prepared && field !== "ip") {
      if (field === "mac") {
        setFieldError("Invalid MAC format. Use AA:BB:CC:DD:EE:FF.");
      }
      return;
    }
    if (prepared === committedValue) {
      setEditing(false);
      return;
    }
    setConfirmValue(prepared);
    setConfirmOpen(true);
  }

  function closeFieldConfirm() {
    confirmPendingRef.current = false;
    setConfirmOpen(false);
  }

  const confirmOverlay = confirmOpen ? (
    <ConfirmFieldUpdateModal
      entityName={account}
      saving={saving}
      onCancel={closeFieldConfirm}
      onConfirm={() => void save(confirmValue)}
    />
  ) : null;

  if (!editing) {
    if (field === "password") {
      return (
        <>
          <div className={cn("inline-flex items-center gap-1.5", className)}>
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              className="inline-flex min-h-8 items-center rounded-md border border-border/50 bg-background/35 px-2 py-1 font-mono text-sm text-muted-foreground hover:bg-muted/25"
              title="Double click to edit"
            >
              {visibleText}
            </button>
            {committedValue ? (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
              </button>
            ) : null}
          </div>
          {confirmOverlay}
        </>
      );
    }
    return (
      <>
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className={cn(
            field === "user" || field === "mac" || field === "ip"
              ? "block w-full min-w-0 max-w-full truncate bg-transparent p-0 text-center text-sm"
              : "inline-flex min-h-8 max-w-full items-center rounded-md border border-border/50 bg-background/35 px-2 py-1 text-left text-sm hover:bg-muted/25 hover:underline",
            className,
          )}
          title={field === "user" ? "Double-click to edit display name" : "Double click to edit"}
        >
          {visibleText}
        </button>
        {confirmOverlay}
      </>
    );
  }

  const stackFieldError = field === "mac" || field === "ip";

  return (
    <>
      <div
        className={cn(
          "w-full min-w-0 max-w-full",
          stackFieldError && "flex flex-col items-center",
          className,
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/35 p-0.5",
            stackFieldError && "justify-center",
          )}
        >
        <input
          type={field === "password" && !showPassword ? "password" : "text"}
          value={draft}
          disabled={saving}
          onInput={(e) => {
            if (field !== "mac") return;
            const el = e.currentTarget;
            const raw = el.value;
            const cursor = el.selectionStart ?? raw.length;
            const formatted = formatMacWhileTyping(raw);
            if (formatted !== raw) {
              const nextCursor = macCursorPosition(raw, cursor);
              el.value = formatted;
              el.setSelectionRange(nextCursor, nextCursor);
            }
            setDraft(formatted);
            setFieldError(null);
          }}
          onChange={(e) => {
            if (field === "mac") {
              setDraft(formatMacWhileTyping(e.target.value));
              setFieldError(null);
              return;
            }
            setDraft(e.target.value);
          }}
          onBlur={() => {
            if (confirmOpen) return;
            setDraft(committedValue);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              openConfirm();
            }
            if (e.key === "Escape") {
              setDraft(committedValue);
              setEditing(false);
            }
          }}
          className={cn(
            "box-border h-8 min-w-0 w-full max-w-full flex-1 rounded-md border border-border/70 bg-background px-2 text-sm",
            field === "password" || field === "mac" || field === "ip" ? "font-mono" : "",
          )}
          inputMode={field === "mac" ? "text" : undefined}
          autoCapitalize={field === "mac" ? "characters" : undefined}
          autoComplete={field === "mac" ? "off" : undefined}
          spellCheck={field === "mac" ? false : undefined}
          maxLength={field === "mac" ? 17 : undefined}
          placeholder={field === "mac" ? "AA:AA:AA:AA:AA:AA" : undefined}
          title={field === "mac" ? "Format: AA:BB:CC:DD:EE:FF" : undefined}
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
        {fieldError ? (
          <p
            className={cn(
              "mt-1 text-xs leading-snug text-destructive",
              stackFieldError ? "w-full text-center" : "text-left",
            )}
            role="alert"
          >
            {fieldError}
          </p>
        ) : null}
      </div>
      {confirmOverlay}
    </>
  );
}
