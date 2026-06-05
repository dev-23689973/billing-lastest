"use client";

import { getTransactionTypeBadgeClass, getTransactionTypeLabel } from "@/lib/transactionTypeDisplay";
import { cn } from "@/lib/cn";

type TransactionTypeBadgeProps = {
  type: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
};

const sizeClass = {
  sm: "rounded border px-1 py-px text-[10px] font-semibold leading-none",
  md: "rounded-md px-2 py-0.5 text-xs font-semibold",
} as const;

/** Unified type pill for ledger tables (hierarchy + subscriber types). */
export function TransactionTypeBadge({ type, size = "md", className }: TransactionTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block border",
        sizeClass[size],
        getTransactionTypeBadgeClass(type),
        className,
      )}
    >
      {getTransactionTypeLabel(type)}
    </span>
  );
}
