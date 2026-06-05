"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { checkMacAvailabilityAction } from "@/actions/credentialChecks";
import { MacAddressInput } from "@/components/forms/MacAddressInput";
import { generateRandomMac, validateMacFormat } from "@/lib/credentials/macRules";
import { cn } from "@/lib/cn";

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

type Props = {
  id: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  /** When editing, ignore the current account's MAC in duplicate checks. */
  excludeAccount?: string;
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
  return "text-muted-foreground";
}

const MAC_COMPLETE_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

function isCompleteMac(formatted: string): boolean {
  return MAC_COMPLETE_RE.test(formatted);
}

export function MacAddressInputWithRefresh({
  id,
  name = "mac",
  required,
  disabled,
  readOnly,
  className,
  placeholder = "00:1A:79:00:00:01",
  defaultValue = "",
  excludeAccount,
}: Props) {
  const hintId = useId();
  const [mac, setMac] = useState(defaultValue);
  const [inputKey, setInputKey] = useState(0);
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runAvailabilityCheck = useCallback(
    async (next: string) => {
      if (!isCompleteMac(next)) {
        setAvailability("invalid");
        return;
      }
      const fmt = validateMacFormat(next);
      if (!fmt.ok) {
        setAvailability("invalid");
        return;
      }
      setAvailability("checking");
      try {
        const res = await checkMacAvailabilityAction({ mac: next, excludeAccount });
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
        setAvailability("idle");
      }
    },
    [excludeAccount],
  );

  const scheduleCheck = useCallback(
    (next: string) => {
      if (!next.trim()) {
        setAvailability("idle");
        return;
      }
      if (!isCompleteMac(next)) {
        setAvailability(next.length > 0 ? "invalid" : "idle");
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runAvailabilityCheck(next);
      }, 400);
    },
    [runAvailabilityCheck],
  );

  const handleFormattedChange = useCallback(
    (next: string) => {
      setMac(next);
      if (readOnly || disabled) return;
      scheduleCheck(next);
    },
    [disabled, readOnly, scheduleCheck],
  );

  const handleRefresh = async () => {
    if (readOnly || disabled) return;
    setRefreshing(true);
    try {
      const next = generateRandomMac();
      setMac(next);
      setInputKey((k) => k + 1);
      await runAvailabilityCheck(next);
    } finally {
      setRefreshing(false);
    }
  };

  const hint = availabilityMessage(availability);
  const showRefresh = !readOnly && !disabled;

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <MacAddressInput
            key={inputKey}
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            defaultValue={mac || defaultValue}
            placeholder={placeholder}
            className={className}
            onFormattedChange={handleFormattedChange}
            aria-describedby={hint ? hintId : undefined}
          />
        </div>
        {showRefresh ? (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 sm:h-9 sm:w-9",
              "bg-muted/20 text-primary transition-colors hover:bg-muted/40 disabled:opacity-50",
            )}
            aria-label="Generate random MAC address"
            title="Generate random MAC address"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className={cn("text-[11px] leading-tight", availabilityClass(availability))} role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
