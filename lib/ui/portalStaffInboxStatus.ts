import type { PortalStaffInboxStatus } from "@/lib/portalStaffInbox";
import { cn } from "@/lib/cn";
import { uiStatusPillClass } from "@/lib/ui/responsiveScale";

export const portalStaffInboxStatusLabel: Record<PortalStaffInboxStatus, string> = {
  active: "Active",
  dismiss: "Dismiss",
  read: "Read",
};

export function portalStaffInboxStatusBadgeClass(status: PortalStaffInboxStatus): string {
  switch (status) {
    case "active":
      return "border-destructive/50 bg-destructive text-destructive-foreground";
    case "dismiss":
      return "border-amber-500/45 bg-amber-500/20 text-amber-700 dark:text-amber-300";
    case "read":
      return "border-border/60 bg-muted/50 text-muted-foreground";
  }
}

export function portalStaffInboxCheckboxClass(status: PortalStaffInboxStatus, pending: boolean): string {
  if (pending) return "accent-cyan-600 disabled:cursor-wait disabled:opacity-60";
  switch (status) {
    case "active":
      return "accent-destructive focus-visible:ring-destructive/40";
    case "dismiss":
      return "accent-amber-500 focus-visible:ring-amber-500/40";
    case "read":
      return "accent-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";
  }
}

export function portalStaffInboxStatusPill(status: PortalStaffInboxStatus) {
  return uiStatusPillClass(
    cn("font-bold uppercase tracking-wide", portalStaffInboxStatusBadgeClass(status)),
  );
}
