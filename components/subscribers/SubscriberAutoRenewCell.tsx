"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleOff } from "lucide-react";
import { toast } from "sonner";
import { formatAutoRenewEnabledCellDisplay } from "@/lib/accountAutoRenew";
import { cn } from "@/lib/cn";
import { rsIconSm, rsTextCaption } from "@/lib/ui/responsiveScale";

type Props = {
  account: string;
  expires: string | null;
  autoRenew: boolean | null;
  autoRenewCyclesRemaining: number | null;
  /** Opens Set Auto Renew modal (disabled row click only). */
  onConfigure?: () => void;
  /** Disables auto renewal (enabled row icon). */
  onDisable?: (account: string) => Promise<{ ok: boolean; message?: string }>;
  className?: string;
};

const disabledPillClass =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-400/45 bg-slate-100/90 px-2.5 py-1 text-[10px] font-semibold leading-none text-slate-600 transition-colors hover:border-slate-500/55 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-500/45 dark:bg-slate-800/55 dark:text-slate-200 dark:hover:border-slate-400/60 dark:hover:bg-slate-700/70 dark:hover:text-white";

const enabledDateClass = "text-cyan-800 dark:text-cyan-200";
const enabledPeriodClass = "text-emerald-700 dark:text-emerald-300";

const enabledTextHoverClass =
  "rounded-md px-1.5 py-1 transition-colors hover:bg-muted/35 dark:hover:bg-muted/25";

function SubscriberAutoRenewEnabledCard({
  expires,
  cyclesRemaining,
  disablePending,
  onDisableClick,
  className,
}: {
  expires: string | null;
  cyclesRemaining: number;
  disablePending: boolean;
  onDisableClick?: () => void;
  className?: string;
}) {
  const display = formatAutoRenewEnabledCellDisplay(expires, cyclesRemaining);
  const title = display
    ? `Auto renewal enabled until ${display.untilDateLabel} ${display.periodMonthsLabel}`
    : "Auto renewal enabled";

  return (
    <div
      className={cn("inline-flex w-fit max-w-full items-center gap-0.5 py-0.5", className)}
      title={title}
    >
      <div className={cn("flex shrink-0 flex-col items-center text-center", enabledTextHoverClass)}>
        <span className={cn(rsTextCaption, "font-semibold leading-none", enabledDateClass)}>
          {display?.untilDateLabel ?? "—"}
        </span>
        <span className={cn(rsTextCaption, "mt-0.5 font-medium leading-none", enabledPeriodClass)}>
          {display?.periodMonthsLabel ?? "—"}
        </span>
      </div>
      {onDisableClick ? (
        <button
          type="button"
          disabled={disablePending}
          onClick={(e) => {
            e.stopPropagation();
            onDisableClick();
          }}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-rose-600 transition-colors",
            "hover:bg-rose-500/12 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:text-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300",
          )}
          title="Disable auto renewal"
          aria-label="Disable auto renewal"
        >
          <CircleOff className={rsIconSm} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function SubscriberAutoRenewCell({
  account,
  expires,
  autoRenew,
  autoRenewCyclesRemaining,
  onConfigure,
  onDisable,
  className,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [currentAutoRenew, setCurrentAutoRenew] = useState<boolean | null>(autoRenew);
  const [currentCyclesRemaining, setCurrentCyclesRemaining] = useState<number | null>(autoRenewCyclesRemaining);

  useEffect(() => {
    setCurrentAutoRenew(autoRenew);
    setCurrentCyclesRemaining(autoRenewCyclesRemaining);
  }, [autoRenew, autoRenewCyclesRemaining]);

  if (currentAutoRenew !== true) {
    if (currentAutoRenew === false && onConfigure) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConfigure();
          }}
          className={cn(disabledPillClass, className)}
          title="Set auto renewal"
        >
          Disabled
        </button>
      );
    }
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {currentAutoRenew === false ? "Disabled" : "—"}
      </span>
    );
  }

  const cyclesRemaining = Math.max(0, Math.floor(currentCyclesRemaining ?? 0));

  function handleDisable() {
    if (!onDisable || pending) return;
    startTransition(async () => {
      const res = await onDisable(account);
      if (!res.ok) {
        toast.error(res.message || "Could not disable auto renewal.");
        return;
      }
      toast.success("Auto renewal disabled.");
      setCurrentAutoRenew(false);
      setCurrentCyclesRemaining(0);
    });
  }

  return (
    <SubscriberAutoRenewEnabledCard
      expires={expires}
      cyclesRemaining={cyclesRemaining}
      disablePending={pending}
      onDisableClick={onDisable ? handleDisable : undefined}
      className={className}
    />
  );
}
