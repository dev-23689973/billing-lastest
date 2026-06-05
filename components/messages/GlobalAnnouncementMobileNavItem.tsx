"use client";

import { Megaphone } from "lucide-react";
import { cn } from "@/lib/cn";
import { useGlobalAnnouncement } from "@/components/messages/global-announcement-context";
import {
  mobileNavIconClass,
  mobileNavInnerClass,
  mobileNavLabelClassActive,
  mobileNavSlotClass,
} from "@/components/layout/mobileNavTab";

/** Mobile bottom nav — opens global announcement (lg+ uses header megaphone). */
export function GlobalAnnouncementMobileNavItem({ onOpen }: { onOpen?: () => void }) {
  const { hasAnnouncement, openAnnouncement } = useGlobalAnnouncement();

  if (!hasAnnouncement) return null;

  return (
    <button
      type="button"
      onClick={() => {
        openAnnouncement();
        onOpen?.();
      }}
      className={mobileNavSlotClass}
      aria-label="News and announcements"
    >
      <span className={mobileNavInnerClass(false)}>
        <Megaphone className={cn(mobileNavIconClass, "text-cyan-500/90")} aria-hidden />
        <span className={mobileNavLabelClassActive(false)}>News</span>
      </span>
    </button>
  );
}
