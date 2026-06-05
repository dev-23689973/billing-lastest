"use client";

import {
  adminSegmentedTabActiveClass,
  adminSegmentedTabIdleClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { messageComposeSegmentFrameClass } from "@/components/messages/messageModalChrome";
import { cn } from "@/lib/cn";

export type ComposeChannel = "staff" | "subscribers";

const tabBaseClass =
  "relative rounded-[5px] px-3 py-1.5 text-xs tracking-tight transition-colors sm:px-3.5 sm:text-[13px]";

function tabClass(active: boolean) {
  return cn(tabBaseClass, active ? adminSegmentedTabActiveClass : adminSegmentedTabIdleClass);
}

export function ComposeChannelTabs({
  channel,
  onChannelChange,
  showStaffChannel = true,
  className,
  variant = "admin",
  staffActiveCount,
}: {
  channel: ComposeChannel;
  onChannelChange: (channel: ComposeChannel) => void;
  showStaffChannel?: boolean;
  className?: string;
  variant?: "admin" | "portal";
  staffActiveCount?: number;
}) {
  if (!showStaffChannel) return null;
  const staffLabel = variant === "portal" ? "Portal message" : "Staff";
  const subscribersLabel = variant === "portal" ? "Users message" : "Subscribers (STB)";
  const activeN = Math.max(0, staffActiveCount ?? 0);
  return (
    <div
      role="tablist"
      aria-label="Message channel"
      className={cn(messageComposeSegmentFrameClass, className)}
    >
      <button
        type="button"
        role="tab"
        aria-selected={channel === "staff"}
        onClick={() => onChannelChange("staff")}
        className={cn(tabClass(channel === "staff"), "inline-flex items-center gap-1.5")}
      >
        <span>{staffLabel}</span>
        {variant === "portal" && activeN > 0 ? (
          <span className="min-w-[1.125rem] rounded-full bg-destructive px-1 py-px text-[10px] font-bold tabular-nums leading-none text-destructive-foreground">
            {activeN > 99 ? "99+" : activeN}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={channel === "subscribers"}
        onClick={() => onChannelChange("subscribers")}
        className={tabClass(channel === "subscribers")}
      >
        <span className="sm:hidden">STB</span>
        <span className="hidden sm:inline">{subscribersLabel}</span>
      </button>
    </div>
  );
}
