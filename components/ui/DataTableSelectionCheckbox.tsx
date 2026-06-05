"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export const dataTableSelectionCheckboxTileClass = cn(
  "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-[border-color,background-color,box-shadow] duration-150",
  "border-slate-400/40 bg-background/70 text-transparent shadow-none",
  "dark:border-cyan-400/25 dark:bg-slate-950/55",
  "group-hover:border-cyan-500/45 group-hover:bg-cyan-500/[0.06]",
  "dark:group-hover:border-cyan-400/40",
);

export const dataTableSelectionCheckboxTileCheckedClass = cn(
  "border-cyan-500/70 bg-cyan-500 text-white shadow-[0_0_10px_-4px_rgba(34,211,238,0.45)]",
  "dark:border-cyan-400/65 dark:bg-cyan-400/90 dark:text-cyan-950",
);

export type DataTableSelectionCheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  indeterminate?: boolean;
};

/** Accessible row/header checkbox with HUD tile styling for data tables. */
export function DataTableSelectionCheckbox({
  className,
  checked,
  indeterminate = false,
  disabled,
  ...props
}: DataTableSelectionCheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const active = Boolean(checked) || indeterminate;

  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer items-center justify-center p-0.5",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        {...props}
      />
      <span
        className={cn(
          dataTableSelectionCheckboxTileClass,
          active && dataTableSelectionCheckboxTileCheckedClass,
        )}
        aria-hidden
      >
        {indeterminate && !checked ? (
          <Minus className="h-2.5 w-2.5 stroke-[3]" />
        ) : (
          <Check className={cn("h-2.5 w-2.5 stroke-[2.75]", !checked && "scale-75 opacity-0")} />
        )}
      </span>
    </label>
  );
}
