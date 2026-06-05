"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleOff } from "lucide-react";
import { toast } from "sonner";
import { formatAutoRenewUntilParts } from "@/lib/accountAutoRenew";
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

const compactDisabledPillClass =
  "inline-flex h-8 min-w-[2.35rem] shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-400/45 bg-slate-100/90 px-2 text-[10px] font-bold leading-none tracking-wide text-slate-600 transition-colors hover:border-slate-500/55 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-500/45 dark:bg-slate-800/55 dark:text-slate-200 dark:hover:border-slate-400/60 dark:hover:bg-slate-700/70 dark:hover:text-white";

const enabledDateClass = "text-cyan-800 dark:text-cyan-200";
const enabledStatusClass = "text-emerald-700 dark:text-emerald-300";

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
  const untilParts = formatAutoRenewUntilParts(expires, cyclesRemaining);
  const untilLabel = untilParts ? `${untilParts.month} ${untilParts.year}` : "—";

  return (
    <div
      className={cn("inline-flex w-fit max-w-full items-center gap-0.5 py-0.5", className)}
      title={`Auto renewal enabled until ${untilLabel}`}
    >
      <div className={cn("flex shrink-0 flex-col items-center text-center", enabledTextHoverClass)}>
        <span className={cn(rsTextCaption, "font-semibold leading-none", enabledDateClass)}>
          {untilParts ? (
            <>
              <span>{untilParts.month}</span> <span>{untilParts.year}</span>
            </>
          ) : (
            "—"
          )}
        </span>
        <span className={cn(rsTextCaption, "mt-0.5 font-medium leading-none", enabledStatusClass)}>
          Enabled
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

function SubscriberAutoRenewEnabledCompact({
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
  const untilParts = formatAutoRenewUntilParts(expires, cyclesRemaining);
  const untilLabel = untilParts ? `${untilParts.month} ${untilParts.year}` : "—";
  const shortYear = untilParts ? untilParts.year.slice(-2) : null;

  return (
    <div
      className={cn("inline-flex h-8 w-fit max-w-full items-center justify-center gap-0.5", className)}
      title={`Auto renewal enabled until ${untilLabel}`}
    >
      <div className="flex shrink-0 flex-col items-center justify-center text-center leading-none">
        <span className="text-[9px] font-semibold text-cyan-800 dark:text-cyan-200">
          {untilParts ? (
            <>
              {untilParts.month} &apos;{shortYear}
            </>
          ) : (
            "—"
          )}
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          On
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
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-rose-600 transition-colors",
            "hover:bg-rose-500/12 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:text-rose-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300",
          )}
          title="Disable auto renewal"
          aria-label="Disable auto renewal"
        >
          <CircleOff className="h-3.5 w-3.5" aria-hidden />
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
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
            className={cn(compactDisabledPillClass, "lg:hidden", className)}
            title="Set auto renewal"
          >
            Off
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
            className={cn(disabledPillClass, "hidden lg:inline-flex", className)}
            title="Set auto renewal"
          >
            Disabled
          </button>
        </>
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
    <>
      <SubscriberAutoRenewEnabledCompact
        expires={expires}
        cyclesRemaining={cyclesRemaining}
        disablePending={pending}
        onDisableClick={onDisable ? handleDisable : undefined}
        className={cn("lg:hidden", className)}
      />
      <SubscriberAutoRenewEnabledCard
        expires={expires}
        cyclesRemaining={cyclesRemaining}
        disablePending={pending}
        onDisableClick={onDisable ? handleDisable : undefined}
        className={cn("hidden lg:inline-flex", className)}
      />
    </>
  );
}
