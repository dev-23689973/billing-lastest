"use client";

import { useEffect } from "react";
import { ArrowUpRight, MessageSquareText, Users, X } from "lucide-react";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalInsetPanelClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  title: string;
  description: string;
  recipients: string[];
  message: string;
  maxLength?: number;
  pending?: boolean;
  submitLabel?: string;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function AdminSendMessageModal({
  open,
  title,
  description,
  recipients,
  message,
  maxLength = 1000,
  pending = false,
  submitLabel = "Send Messages",
  onMessageChange,
  onClose,
  onSubmit,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4", managersToolbarModalBackdropClass)}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-[min(96vw,720px)] flex-col overflow-hidden shadow-xl",
          managersToolbarModalShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-inherit">
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-cyan-600/15 px-4 py-2.5 dark:border-cyan-400/10">
            <div className="min-w-0">
              <h2 className="inline-flex items-center gap-1.5 text-base font-semibold tracking-tight text-foreground">
                <MessageSquareText className="h-4 w-4 shrink-0 text-primary/90" aria-hidden />
                {title}
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label="Close send message modal"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span>Recipients ({recipients.length})</span>
              </div>
              <div
                className={cn(
                  managersToolbarModalInsetPanelClass,
                  "thin-scrollbar max-h-24 overflow-x-auto overflow-y-auto whitespace-nowrap px-2.5 py-2 text-left text-sm text-foreground",
                )}
              >
                {recipients.join(", ")}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-send-message-body"
                className="block text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Message *
              </label>
              <textarea
                id="admin-send-message-body"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                maxLength={maxLength}
                rows={5}
                className={cn(
                  managersToolbarModalInsetPanelClass,
                  "thin-scrollbar min-h-[140px] w-full resize-y px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/90 focus-visible:border-cyan-500/38 focus-visible:ring-1 focus-visible:ring-cyan-400/14",
                )}
                placeholder="Enter your message content"
              />
              <p className="text-left text-[11px] tabular-nums text-muted-foreground">
                {message.length}/{maxLength} characters
              </p>
            </div>
          </div>

          <footer className="flex shrink-0 justify-end border-t border-cyan-600/15 px-4 py-2.5 dark:border-cyan-400/10">
            <Button
              type="button"
              variant="ctaLink"
              size="inline"
              className="gap-1 text-sm"
              onClick={onSubmit}
              disabled={pending || !message.trim() || recipients.length === 0}
            >
              {pending ? "Sending…" : submitLabel}
              {!pending ? <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
