"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  hudFormControlShellClass,
  hudFormInputInnerClass,
  managersToolbarFormInputClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

function formatMacAddress(raw: string): string {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 12);
  const groups = hex.match(/.{1,2}/g);
  return groups ? groups.join(":") : "";
}

function formattedCursor(raw: string, cursor: number): number {
  const before = raw.slice(0, cursor).replace(/[^0-9A-Fa-f]/g, "").slice(0, 12);
  return formatMacAddress(before).length;
}

const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

function isCompleteMac(formatted: string): boolean {
  return MAC_RE.test(formatted);
}

async function copyMacToClipboard(value: string): Promise<boolean> {
  const text = value.trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(isCompleteMac(text) ? "MAC address copied." : "Copied to clipboard.");
    return true;
  } catch {
    toast.error("Could not copy to clipboard.");
    return false;
  }
}

export type MacAddressInputProps = React.ComponentProps<"input"> & {
  /** `hud` — icon + single bordered shell (Check MAC, settings-style fields). */
  variant?: "default" | "hud";
  icon?: LucideIcon;
  shellClassName?: string;
  /** Click input or shell to copy the current value. */
  copyable?: boolean;
  /** Called when the formatted value changes (typing, blur, or controlled `value`). */
  onFormattedChange?: (formatted: string) => void;
};

/** Auto-formats MAC input to `AA:BB:CC:DD:EE:FF` while typing. */
export const MacAddressInput = React.forwardRef<HTMLInputElement, MacAddressInputProps>(function MacAddressInput(
  {
    variant = "default",
    icon: Icon,
    shellClassName,
    copyable = false,
    onFormattedChange,
    onInput,
    onBlur,
    onClick,
    className,
    ...props
  },
  ref,
) {
  const inputHandler = onInput as ((event: React.FormEvent<HTMLInputElement>) => void) | undefined;
  const hintId = React.useId();
  const [touched, setTouched] = React.useState(false);
  const [current, setCurrent] = React.useState(() =>
    formatMacAddress(String(props.defaultValue ?? props.value ?? "")),
  );

  React.useEffect(() => {
    if (props.value == null) return;
    const formatted = formatMacAddress(String(props.value));
    setCurrent(formatted);
    onFormattedChange?.(formatted);
  }, [props.value, onFormattedChange]);

  const showIncomplete = touched && current.length > 0 && !isCompleteMac(current);
  const helperText =
    current.length === 0 || showIncomplete
      ? showIncomplete
        ? "Incomplete MAC address. Expected AA:BB:CC:DD:EE:FF."
        : "Format: AA:BB:CC:DD:EE:FF"
      : null;

  const handleInput = React.useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const raw = el.value;
      const cursor = el.selectionStart ?? raw.length;
      const formatted = formatMacAddress(raw);
      if (formatted !== raw) {
        const nextCursor = formattedCursor(raw, cursor);
        el.value = formatted;
        el.setSelectionRange(nextCursor, nextCursor);
      }
      setCurrent(formatted);
      onFormattedChange?.(formatted);
      inputHandler?.(e);
    },
    [inputHandler, onFormattedChange],
  );

  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const formatted = formatMacAddress(e.currentTarget.value);
      e.currentTarget.value = formatted;
      setTouched(true);
      setCurrent(formatted);
      onFormattedChange?.(formatted);
      onBlur?.(e);
    },
    [onBlur, onFormattedChange],
  );

  const handleCopyClick = React.useCallback(
    (value: string) => {
      if (!copyable || !value.trim()) return;
      void copyMacToClipboard(value);
    },
    [copyable],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      onClick?.(e);
      handleCopyClick(e.currentTarget.value);
    },
    [handleCopyClick, onClick],
  );

  const inputEl = (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="text"
      autoCapitalize="characters"
      autoComplete={props.autoComplete ?? "off"}
      spellCheck={props.spellCheck ?? false}
      maxLength={17}
      pattern={props.pattern ?? "([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}"}
      title={
        props.title ??
        (copyable ? "Click to copy" : "Format: AA:BB:CC:DD:EE:FF")
      }
      className={cn(
        variant === "hud" ? hudFormInputInnerClass : managersToolbarFormInputClass,
        "font-mono uppercase tracking-wide",
        copyable && current.trim() && "cursor-copy",
        className,
      )}
      aria-invalid={showIncomplete || props["aria-invalid"] ? true : undefined}
      aria-describedby={helperText ? hintId : props["aria-describedby"]}
      onInput={handleInput}
      onBlur={handleBlur}
      onClick={copyable ? handleClick : onClick}
    />
  );

  const helperEl = helperText ? (
    <p id={hintId} className={showIncomplete ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
      {helperText}
    </p>
  ) : null;

  if (variant === "hud") {
    return (
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", shellClassName)}>
        <div
          className={cn(
            hudFormControlShellClass,
            "group/shell min-h-11 sm:min-h-[2.75rem]",
            "transition-all duration-200 ease-out",
            copyable &&
              current.trim() &&
              "cursor-copy hover:border-cyan-500/42 hover:shadow-[0_0_22px_-10px_rgba(34,211,238,0.4)] dark:hover:border-cyan-300/28",
          )}
          onClick={(e) => {
            if (!copyable || (e.target as HTMLElement).closest("input")) return;
            handleCopyClick(current);
          }}
        >
          {Icon ? (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 text-cyan-400/70 transition-colors duration-200",
                copyable && current.trim() && "group-hover/shell:text-cyan-300/90",
              )}
              aria-hidden
            />
          ) : null}
          {inputEl}
        </div>
        {helperEl}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {inputEl}
      {helperEl}
    </div>
  );
});
