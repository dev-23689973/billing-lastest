"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";
import { checkCredentialAvailabilityAction } from "@/actions/credentialChecks";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  credentialKindChecksAvailability,
  generateCredentialValue,
  validateCredentialFormat,
  type CredentialKind,
} from "@/lib/credentials/credentialRules";

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

type Props = {
  kind: CredentialKind;
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
};

function availabilityMessage(state: AvailabilityState): string | null {
  if (state === "checking") return "Checking availability…";
  if (state === "available") return "Available";
  if (state === "taken") return "Already in use";
  if (state === "invalid") return "Invalid format";
  return null;
}

function availabilityClass(state: AvailabilityState): string {
  if (state === "available") return "text-emerald-600 dark:text-emerald-400";
  if (state === "taken" || state === "invalid") return "text-destructive";
  if (state === "checking") return "text-muted-foreground";
  return "text-muted-foreground";
}

/** Fixed height so idle → checking → available does not shift modal layout. */
const AVAILABILITY_HINT_SLOT_CLASS = "min-h-[1.125rem] text-[11px] leading-tight";

export function CredentialFieldWithRefresh({
  kind,
  id,
  name,
  value,
  onChange,
  className,
  inputClassName,
  required,
  readOnly,
  disabled,
  autoComplete,
  placeholder,
  type = "text",
  minLength,
  maxLength,
  pattern,
  title,
}: Props) {
  const hintId = useId();
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkGenRef = useRef(0);

  const checkAvailability = credentialKindChecksAvailability(kind);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runAvailabilityCheck = useCallback(
    async (next: string) => {
      if (!checkAvailability) {
        setAvailability("idle");
        return;
      }
      const fmt = validateCredentialFormat(kind, next);
      if (!fmt.ok) {
        setAvailability("invalid");
        return;
      }
      const gen = ++checkGenRef.current;
      setAvailability((prev) => (prev === "idle" ? "checking" : prev));
      try {
        const res = await checkCredentialAvailabilityAction({ kind, value: next });
        if (gen !== checkGenRef.current) return;
        if ("reason" in res && res.reason === "forbidden") {
          setAvailability("idle");
          return;
        }
        if (res.available) {
          setAvailability("available");
        } else {
          setAvailability(res.reason === "invalid" ? "invalid" : "taken");
        }
      } catch {
        if (gen === checkGenRef.current) setAvailability("idle");
      }
    },
    [checkAvailability, kind],
  );

  const handleRefresh = async () => {
    if (readOnly || disabled) return;
    setRefreshing(true);
    try {
      const next = generateCredentialValue(kind);
      onChange(next);
      if (checkAvailability) {
        await runAvailabilityCheck(next);
      } else {
        setAvailability("idle");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleChange = (next: string) => {
    onChange(next);
    if (!checkAvailability) {
      setAvailability("idle");
      return;
    }
    if (!next.trim()) {
      checkGenRef.current += 1;
      setAvailability("idle");
      return;
    }
    const fmt = validateCredentialFormat(kind, next);
    if (!fmt.ok) {
      checkGenRef.current += 1;
      setAvailability("invalid");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runAvailabilityCheck(next);
    }, 400);
  };

  const hint = availabilityMessage(availability);
  const showHintSlot = checkAvailability;

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          type={type}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          title={title}
          aria-describedby={showHintSlot ? hintId : undefined}
          className={cn("min-w-0 flex-1", inputClassName)}
        />
        {!readOnly && !disabled ? (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 sm:h-9 sm:w-9",
              "bg-muted/20 text-primary transition-colors hover:bg-muted/40 disabled:opacity-50",
            )}
            aria-label="Generate random value"
            title="Generate random value"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
          </button>
        ) : null}
      </div>
      {showHintSlot ? (
        <p
          id={hintId}
          className={cn(
            AVAILABILITY_HINT_SLOT_CLASS,
            availabilityClass(availability),
            !hint && "invisible",
          )}
          role="status"
          aria-live="polite"
        >
          {hint ?? "\u00a0"}
        </p>
      ) : null}
    </div>
  );
}
