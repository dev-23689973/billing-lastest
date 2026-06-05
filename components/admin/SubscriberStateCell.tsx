"use client";

import { ReceiverOnlineIconBadge } from "@/components/admin/HierarchyTableBadges";
import { cn } from "@/lib/cn";

type Props = {
  online: boolean | null;
  nowPlaying: string | null;
  compact?: boolean;
  /** Extra-dense row (view-users modal). */
  dense?: boolean;
  className?: string;
};

export function SubscriberStateCell({ online, nowPlaying, compact = false, dense = false, className }: Props) {
  const playing = nowPlaying?.trim() || null;
  const onlineLabel = online === true ? "Online" : online === false ? "Offline" : "Unknown";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-center",
        dense
          ? "gap-1 flex-row whitespace-nowrap"
          : compact
            ? "gap-1.5 flex-row whitespace-nowrap"
            : "flex-col gap-1 sm:flex-row sm:gap-1.5 sm:whitespace-nowrap",
        className,
      )}
      title={playing ? `${onlineLabel} · ${playing}` : onlineLabel}
    >
      <ReceiverOnlineIconBadge
        online={online}
        className={cn("shrink-0", dense ? "h-4 w-4" : "h-5 w-5")}
        iconClassName={dense ? "h-2.5 w-2.5" : "h-3 w-3"}
      />
      <span
        className={cn(
          "min-w-0 truncate text-muted-foreground",
          dense ? "max-w-[6rem] text-[9px]" : compact ? "max-w-[8rem] text-[10px]" : "max-w-[12rem] text-[10px] sm:text-xs",
        )}
      >
        {playing ? playing : online === true ? "Online" : online === false ? "Offline" : "—"}
      </span>
    </div>
  );
}
