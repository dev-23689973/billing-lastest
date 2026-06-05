"use client";

import type { ReactNode } from "react";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

type RenewAccountModalFrameProps = {
  onClose: () => void;
  title: string;
  subtitle: ReactNode;
  stats: ReactNode;
  validitySection: ReactNode;
  footer: ReactNode;
  zClass?: string;
};

export function RenewAccountModalFrame({
  onClose,
  title,
  subtitle,
  stats,
  validitySection,
  footer,
  zClass = "z-[130]",
}: RenewAccountModalFrameProps) {
  return (
    <div
      className={cn("fixed inset-0 flex items-center justify-center p-3", managersToolbarModalBackdropClass, zClass)}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden shadow-xl",
          managersToolbarModalShellClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <HudCornerOverlay tone="bright" />
        <div className="relative z-[1] flex min-h-0 flex-col overflow-hidden rounded-[inherit] bg-inherit">
          <header className="shrink-0 border-b border-cyan-600/15 px-4 py-2.5 dark:border-cyan-400/10">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          </header>
          <div className="thin-scrollbar scrollbar-surface-light dark:scrollbar-surface-dark min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            <div className="px-4 py-3">{stats}</div>
            <section className="border-t border-slate-200 px-4 py-3 pb-8 dark:border-cyan-400/10">
              {validitySection}
            </section>
          </div>
          <footer className="flex shrink-0 items-center justify-end border-t border-cyan-600/15 px-4 py-2.5 dark:border-cyan-400/10">
            {footer}
          </footer>
        </div>
      </div>
    </div>
  );
}
