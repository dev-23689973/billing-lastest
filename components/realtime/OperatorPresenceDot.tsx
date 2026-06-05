"use client";

import {
  OPERATOR_ROLE_DOT_CLASS,
  type OperatorRole,
} from "@/components/dashboard/operatorRoleColors";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import { useOnlineUsernameSet } from "@/components/realtime/useOnlineUsernames";
import { isUsernameOnlineInPanel } from "@/lib/adminStaffPresence";
import { cn } from "@/lib/cn";

const ROLE_GLOW: Record<OperatorRole, string> = {
  manager: "rgba(167, 139, 250, 0.55)",
  reseller: "rgba(34, 211, 238, 0.55)",
  dealer: "rgba(251, 113, 133, 0.55)",
};

/** Row status dot: blinking role color when user is in the billing panel, dim when offline. */
export function OperatorPresenceDot({
  username,
  role,
  className,
}: {
  username: string;
  role: OperatorRole;
  className?: string;
}) {
  const { enabled, presenceReady, presenceError } = useRealtime();
  const onlineSet = useOnlineUsernameSet();
  const live = enabled && presenceReady;
  const isOnline = live && isUsernameOnlineInPanel(username, onlineSet);

  return (
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        isOnline
          ? cn(
              OPERATOR_ROLE_DOT_CLASS[role],
              "animate-living-ticket-label-dot motion-reduce:animate-none",
            )
          : "bg-slate-600/90 shadow-none",
        className,
      )}
      style={
        isOnline
          ? ({ "--living-ticket-glow": ROLE_GLOW[role] } as React.CSSProperties)
          : undefined
      }
      title={
        live
          ? isOnline
            ? "Online in billing panel"
            : "Offline"
          : presenceError || "Live panel status unavailable"
      }
      aria-hidden
    />
  );
}
