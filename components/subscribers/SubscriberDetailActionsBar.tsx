"use client";

import { Eye, RefreshCw, Repeat, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { rsIconSm, rsTextBody, rsTextCaption } from "@/lib/ui/responsiveScale";

const actionLinkClass =
  "inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium underline-offset-2 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50";

export function SubscriberDetailActionsBar({
  onRenew,
  onAutoRenew,
  onEdit,
  onViewTransactions,
  onClose,
  disabled = false,
}: {
  onRenew: () => void;
  onAutoRenew: () => void;
  onEdit: () => void;
  onViewTransactions: () => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="border-t border-border/60 bg-muted/10 px-4 py-2.5 dark:bg-muted/5 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className={cn(rsTextCaption, "mr-1.5 font-semibold uppercase tracking-wide text-muted-foreground")}>
            Actions
          </span>
          <span className="hidden h-3 w-px bg-border/70 sm:inline-block" aria-hidden />
          <button
            type="button"
            disabled={disabled}
            className={cn(actionLinkClass, rsTextBody, "text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300")}
            onClick={onRenew}
          >
            <RefreshCw className={rsIconSm} aria-hidden />
            Renew
          </button>
          <span className={cn(rsTextCaption, "text-muted-foreground/50")} aria-hidden>
            ·
          </span>
          <button
            type="button"
            disabled={disabled}
            className={cn(actionLinkClass, rsTextBody, "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300")}
            onClick={onEdit}
          >
            <UserRound className={rsIconSm} aria-hidden />
            Edit
          </button>
          <span className={cn(rsTextCaption, "text-muted-foreground/50")} aria-hidden>
            ·
          </span>
          <button
            type="button"
            disabled={disabled}
            className={cn(actionLinkClass, rsTextBody, "text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300")}
            onClick={onAutoRenew}
          >
            <Repeat className={rsIconSm} aria-hidden />
            Auto renew
          </button>
          <span className={cn(rsTextCaption, "text-muted-foreground/50")} aria-hidden>
            ·
          </span>
          <button
            type="button"
            disabled={disabled}
            className={cn(actionLinkClass, rsTextBody, "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300")}
            onClick={onViewTransactions}
          >
            <Eye className={rsIconSm} aria-hidden />
            Transactions
          </button>
        </div>
        <button
          type="button"
          disabled={disabled}
          className={cn(actionLinkClass, rsTextBody, "text-muted-foreground hover:text-foreground")}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </section>
  );
}
