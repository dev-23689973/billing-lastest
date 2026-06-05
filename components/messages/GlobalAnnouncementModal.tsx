"use client";

import { useEffect, useMemo } from "react";
import { Megaphone, X } from "lucide-react";
import { AnnouncementSlideCarousel } from "@/components/messages/AnnouncementSlideCarousel";
import { AnnouncementFlashHeading } from "@/components/messages/AnnouncementFlashHeading";
import { Button } from "@/components/ui/button";
import { DataTableSelectionCheckbox } from "@/components/ui/DataTableSelectionCheckbox";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";
import { rsIconMd, rsTextCaption, rsTextKicker } from "@/lib/ui/responsiveScale";
import { formatAnnouncementHtmlForDisplay } from "@/lib/announcement-body-format";
import { isAnnouncementHtmlEmpty } from "@/lib/global-announcement-data";
import type { AnnouncementFlashHeading as AnnouncementFlashHeadingData } from "@/lib/announcement-flash";
import { hasAnnouncementFlashText } from "@/lib/announcement-flash";

type Props = {
  html: string;
  slides: string[];
  flash?: AnnouncementFlashHeadingData | null;
  dontShowUntilNew: boolean;
  onDontShowUntilNewChange: (v: boolean) => void;
  onClose: () => void;
  pending?: boolean;
};

export function GlobalAnnouncementModal({
  html,
  slides,
  flash = null,
  dontShowUntilNew,
  onDontShowUntilNewChange,
  onClose,
  pending = false,
}: Props) {
  const hasBody = !isAnnouncementHtmlEmpty(html);
  const hasFlash = hasAnnouncementFlashText(flash);
  const hasSlides = slides.length > 0;
  const showContent = hasBody || hasFlash;
  const bodyHtml = useMemo(() => formatAnnouncementHtmlForDisplay(html), [html]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <div
      className={cn(
        "announcement-modal-root fixed inset-0 z-[99] flex items-center justify-center p-3 sm:p-4",
        managersToolbarModalBackdropClass,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasFlash ? "announcement-flash-title" : "global-announcement-title"}
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className={cn(
          "billing-modal-panel announcement-modal-shell announcement-modal-shell--editorial pointer-events-auto relative flex w-full max-w-[42rem] flex-col overflow-hidden rounded-2xl",
          "max-h-[min(92dvh,820px)]",
          managersToolbarModalOpaqueShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
          <div className="announcement-modal-content relative z-[1] flex min-h-0 max-h-[inherit] flex-1 flex-col overflow-hidden rounded-[inherit] bg-white dark:bg-[hsl(222_47%_6%/0.98)]">
            <header className="announcement-modal-chrome flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-2 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-cyan-500/15 dark:text-cyan-300"
                  aria-hidden
                >
                  <Megaphone className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <p
                  id="global-announcement-title"
                  className={cn("truncate text-muted-foreground", rsTextKicker)}
                >
                  News &amp; announcements
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onClose}
                className="h-10 w-10 min-h-10 min-w-10 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11"
                aria-label="Close"
              >
                <X className={cn(rsIconMd, "sm:h-6 sm:w-6")} strokeWidth={2.25} />
              </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {hasSlides ? (
                <AnnouncementSlideCarousel slides={slides} className="shrink-0 border-b border-slate-200/70 px-5 py-4 dark:border-cyan-500/12 sm:px-6" />
              ) : null}

              {showContent ? (
                <div className="announcement-modal-content-flat flex min-h-0 flex-1 flex-col overflow-hidden">
                  {hasFlash ? (
                    <div className="announcement-modal-hero shrink-0 px-4 pb-2 pt-3 text-center sm:px-5 sm:pt-3.5">
                      <AnnouncementFlashHeading flash={flash} variant="hero" id="announcement-flash-title" />
                      {hasBody ? (
                        <div
                          className="mx-auto mt-2.5 h-px w-10 rounded-full bg-gradient-to-r from-transparent via-primary/45 to-transparent dark:via-cyan-400/40"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {hasBody ? (
                    <div
                      className={cn(
                        "announcement-modal-body-scroll thin-scrollbar scrollbar-surface-light announcement-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent",
                        hasFlash ? "px-4 pb-4 pt-0 sm:px-5 sm:pb-5" : "px-4 py-4 sm:px-5 sm:py-5",
                      )}
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  ) : !hasFlash ? (
                    <div className="min-h-[6rem] shrink-0" aria-hidden />
                  ) : null}
                </div>
              ) : hasSlides ? (
                <div className="min-h-1 shrink-0" aria-hidden />
              ) : null}
            </div>

            <footer className="announcement-modal-footer shrink-0 border-t border-slate-200/80 bg-white px-4 py-2 dark:border-cyan-500/12 dark:bg-[hsl(222_47%_6%/0.98)] sm:px-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <DataTableSelectionCheckbox
                  checked={dontShowUntilNew}
                  disabled={pending}
                  onChange={(e) => onDontShowUntilNewChange(e.target.checked)}
                  aria-label="Don't show again until there's a new announcement"
                  className="shrink-0"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDontShowUntilNewChange(!dontShowUntilNew)}
                  className={cn(
                    "min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    rsTextCaption,
                  )}
                >
                  Don&apos;t show again until new
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={onClose}
                  className={cn(
                    "shrink-0 border-slate-200 bg-white shadow-none hover:bg-slate-50 dark:border-cyan-500/25 dark:bg-slate-900/80 dark:hover:bg-slate-900",
                    "h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm",
                  )}
                >
                  {pending ? "Saving…" : "Dismiss"}
                </Button>
              </div>
            </footer>
          </div>
      </div>
    </div>
  );
}
