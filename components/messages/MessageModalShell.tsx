"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalOpaqueShellClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cn";
import {
  messageModalBackdropClass,
  messageModalDefaultBodyScrollMaxHeightClass,
  messageModalDefaultShellMaxHeightClass,
  messageModalFieldBareClass,
  messageModalFieldShellClass,
  messageModalHeaderGlassClass,
  messageModalShellGlassClass,
} from "@/components/messages/messageModalChrome";

export function MessageModalField({
  icon: Icon,
  label,
  children,
  className,
  bare = false,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
  /** When true, omit the inset panel so dropdown/input borders match. */
  bare?: boolean;
}) {
  return (
    <div className={cn(!bare && messageModalFieldShellClass, bare && messageModalFieldBareClass, className)}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-cyan-400/85" aria-hidden />
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function MessageModalShell({
  title,
  titleIcon: TitleIcon,
  subtitle,
  onClose,
  children,
  titleId,
  maxWidthClassName = "max-w-2xl",
  maxHeightClassName = messageModalDefaultShellMaxHeightClass,
  bodyScrollMaxHeightClassName = messageModalDefaultBodyScrollMaxHeightClass,
  zIndexClassName = "z-[100]",
  headerToolbar,
  appearance = "glass",
}: {
  title: string;
  titleIcon: LucideIcon;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  titleId: string;
  maxWidthClassName?: string;
  maxHeightClassName?: string;
  /** Max height of the scrollable body (should pair with `maxHeightClassName` on the shell). */
  bodyScrollMaxHeightClassName?: string;
  zIndexClassName?: string;
  /** Rendered in the modal header (e.g. Staff | Subscribers channel tabs). */
  headerToolbar?: ReactNode;
  /** `solid` — more opaque shell, neutral header, no HUD corner brackets (detail / support views). */
  appearance?: "glass" | "solid";
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isSolid = appearance === "solid";
  const showHudCorners = !isSolid && !isLight;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-3 sm:p-4",
        zIndexClassName,
        isSolid ? managersToolbarModalBackdropClass : messageModalBackdropClass,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden shadow-xl",
          maxWidthClassName,
          maxHeightClassName,
          isSolid ? managersToolbarModalOpaqueShellClass : messageModalShellGlassClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showHudCorners ? <HudCornerOverlay tone="bright" /> : null}
        <div className="relative z-[1] flex min-h-0 flex-col overflow-hidden rounded-[inherit] bg-inherit">
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3",
              isSolid ? "border-border/60 bg-muted/15" : messageModalHeaderGlassClass,
            )}
          >
            <div className="min-w-0 flex-1 pr-2">
              <h2
                id={titleId}
                className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
              >
                <TitleIcon
                  className={cn("h-4 w-4 shrink-0", isSolid ? "text-muted-foreground" : "text-cyan-400/90")}
                  aria-hidden
                />
                {title}
              </h2>
              {subtitle ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerToolbar ? <div className="shrink-0">{headerToolbar}</div> : null}
            </div>
          </div>
          <div
            className={cn(
              "thin-scrollbar overflow-y-auto overscroll-contain px-4 py-4",
              bodyScrollMaxHeightClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
