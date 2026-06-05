"use client";

import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  generateCredentialValue,
  validateCredentialFormat,
  type CredentialKind,
} from "@/lib/credentials/credentialRules";

type Props = {
  kind: Extract<CredentialKind, "endUserPassword" | "staffPassword">;
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  disabled?: boolean;
};

export function CredentialPasswordWithRefresh({
  kind,
  id,
  name,
  value,
  onChange,
  className,
  inputClassName,
  required,
  disabled,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleRefresh = () => {
    if (disabled) return;
    setRefreshing(true);
    const next = generateCredentialValue(kind);
    onChange(next);
    const fmt = validateCredentialFormat(kind, next);
    setFormatError(fmt.ok ? null : fmt.message);
    setRefreshing(false);
  };

  const handleChange = (next: string) => {
    onChange(next);
    if (!next.trim()) {
      setFormatError(null);
      return;
    }
    const fmt = validateCredentialFormat(kind, next);
    setFormatError(fmt.ok ? null : fmt.message);
  };

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="relative flex min-w-0 items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            name={name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            required={required}
            disabled={disabled}
            className={cn("pr-10", inputClassName)}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 sm:h-9 sm:w-9",
              "bg-muted/20 text-primary transition-colors hover:bg-muted/40 disabled:opacity-50",
            )}
            aria-label="Generate random password"
            title="Generate random password"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
          </button>
        ) : null}
      </div>
      {formatError ? (
        <p className="text-[11px] leading-tight text-destructive" role="alert">
          {formatError}
        </p>
      ) : null}
    </div>
  );
}
