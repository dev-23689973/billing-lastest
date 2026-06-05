"use client";

import { Megaphone } from "lucide-react";
import { useGlobalAnnouncement } from "@/components/messages/global-announcement-context";
import { cn } from "@/lib/cn";

export function GlobalAnnouncementNewsButton({ className }: { className?: string }) {
  const { hasAnnouncement, openAnnouncement } = useGlobalAnnouncement();

  if (!hasAnnouncement) return null;

  return (
    <button
      type="button"
      onClick={openAnnouncement}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/45 text-muted-foreground",
        "transition-[color,background-color,border-color] duration-200 hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
        className,
      )}
      title="News & announcements"
      aria-label="News and announcements"
    >
      <Megaphone className="h-4 w-4" aria-hidden />
    </button>
  );
}
