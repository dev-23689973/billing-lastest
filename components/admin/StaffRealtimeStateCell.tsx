"use client";

import { useMemo } from "react";
import {
  deriveStaffPresenceFromCurrentLogin,
  deriveStaffPresenceFromRealtime,
  isUsernameOnlineInPanel,
} from "@/lib/adminStaffPresence";
import { formatStateLastSeen, formatStateShortDate, parseBillingDateTime, pickLastLoginDate } from "@/lib/staffStateDisplay";
import { StaffPresenceIconBadge } from "@/components/admin/HierarchyTableBadges";
import { useOnlineUsernameSet } from "@/components/realtime/useOnlineUsernames";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { cn } from "@/lib/cn";

type Props = {
  username: string;
  /** Shown as footnote when offline and realtime is active (not used for online/offline decision). */
  dbCurrentLogin?: string;
  dbLastLogin?: string;
  className?: string;
  /** Mobile: presence icon + short date only. */
  compact?: boolean;
};

/**
 * STATE column: live panel presence when Pusher is configured; otherwise falls back to DB last-login.
 */
export function StaffRealtimeStateCell({
  username,
  dbCurrentLogin = "",
  dbLastLogin = "",
  className,
  compact = false,
}: Props) {
  const { enabled: realtimeConfigured, presenceReady } = useRealtime();
  const onlineSet = useOnlineUsernameSet();
  const realtimeEnabled = realtimeConfigured && presenceReady;

  const isOnline = isUsernameOnlineInPanel(username, onlineSet);
  const currentLoginDate = useMemo(() => parseBillingDateTime(dbCurrentLogin), [dbCurrentLogin]);
  const lastLogin = useMemo(
    () => pickLastLoginDate(dbCurrentLogin, dbLastLogin),
    [dbCurrentLogin, dbLastLogin],
  );

  if (realtimeEnabled) {
    const presence = deriveStaffPresenceFromRealtime(isOnline);
    const displayDate = isOnline ? (currentLoginDate ?? lastLogin) : lastLogin;
    if (compact) {
      const shortDate = displayDate ? formatStateShortDate(displayDate) : null;
      return (
        <div className={cn("inline-flex min-w-0 items-center justify-center gap-1", className)}>
          <StaffPresenceIconBadge
            state={presence.state}
            badgeClass={presence.badgeClass}
            className="h-5 w-5"
            iconClassName="h-3 w-3"
          />
          {shortDate ? (
            <span
              className="text-[10px] tabular-nums text-muted-foreground"
              title={
                isOnline
                  ? `Logged in ${formatStateLastSeen(displayDate!)}`
                  : formatStateLastSeen(displayDate!)
              }
            >
              {shortDate}
            </span>
          ) : null}
        </div>
      );
    }
    return (
      <div className={cn("flex min-w-0 flex-col items-center gap-0.5 text-center", className)}>
        <div className="flex items-center justify-center gap-2">
          <StaffPresenceIconBadge state={presence.state} badgeClass={presence.badgeClass} />
          <span className={cn("text-xs font-semibold", presence.relativeClass)}>
            {isOnline ? "Online now" : "Offline"}
          </span>
        </div>
        {!isOnline && lastLogin ? (
          <span
            className="whitespace-nowrap text-[11px] tabular-nums text-slate-600 dark:text-muted-foreground"
            title={`Last sign-in: ${formatStateLastSeen(lastLogin)}`}
          >
            {formatStateShortDate(lastLogin)}
          </span>
        ) : isOnline && displayDate ? (
          <span
            className="whitespace-nowrap text-[11px] tabular-nums text-slate-600 dark:text-muted-foreground"
            title={`Logged in: ${formatStateLastSeen(displayDate)}`}
          >
            {formatStateShortDate(displayDate)}
          </span>
        ) : isOnline ? (
          <span className="text-[11px] text-slate-600 dark:text-muted-foreground">In billing panel</span>
        ) : (
          <span className="text-[11px] text-slate-600 dark:text-muted-foreground">Not in panel</span>
        )}
      </div>
    );
  }

  const currentDate = parseBillingDateTime(dbCurrentLogin);
  const effectiveDate = lastLogin;
  const presence = deriveStaffPresenceFromCurrentLogin(currentDate);
  const relative =
    effectiveDate != null
      ? formatRelativeFromDate(effectiveDate)
      : "No login";

  if (compact) {
    return (
      <div className={cn("inline-flex min-w-0 items-center justify-center gap-1", className)}>
        <StaffPresenceIconBadge
          state={presence.state}
          badgeClass={presence.badgeClass}
          className="h-5 w-5"
          iconClassName="h-3 w-3"
        />
        {effectiveDate ? (
          <span className="text-[10px] tabular-nums text-muted-foreground" title={formatStateLastSeen(effectiveDate)}>
            {formatStateShortDate(effectiveDate)}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-0.5 text-center", className)}>
      <div className="flex items-center justify-center gap-2">
        <StaffPresenceIconBadge state={presence.state} badgeClass={presence.badgeClass} />
        <span className={cn("text-xs font-semibold", presence.relativeClass)}>{relative}</span>
      </div>
      <span
        className="whitespace-nowrap text-[11px] tabular-nums text-slate-600 dark:text-muted-foreground"
        title={effectiveDate ? formatStateLastSeen(effectiveDate) : undefined}
      >
        {effectiveDate ? formatStateShortDate(effectiveDate) : "—"}
      </span>
    </div>
  );
}

function formatRelativeFromDate(d: Date): string {
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
