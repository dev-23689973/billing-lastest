import {
  managersToolbarDropdownPanelClass,
  managersToolbarFormInputClass,
  managersToolbarGreyBorder,
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

/** Shared styling for admin message modals (detail + compose). */

export const messageModalBackdropClass = managersToolbarModalBackdropClass;

/** Compose / detail shell — white card on light; HUD glass on dark. */
export const messageModalShellGlassClass = managersToolbarModalShellClass;

export const messageModalHeaderGlassClass =
  "border-border/60 bg-muted/15 dark:border-cyan-400/10 dark:bg-white/[0.025]";

export const messageComposeSelectTriggerClass = cn(managersToolbarSelectTriggerClass, "w-full");

export const messageComposeSelectContentClass = managersToolbarDropdownPanelClass;

export const messageComposeSelectItemClass = cn(
  managersToolbarSelectItemClass,
  "!pl-7 !pr-2.5 sm:!pl-7 sm:!pr-2.5",
  "data-[state=checked]:[&>span.absolute]:text-cyan-600 dark:data-[state=checked]:[&>span.absolute]:text-cyan-400",
);

export const messageComposeSegmentFrameClass = cn(
  "inline-flex gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5",
  "dark:border-cyan-600/22 dark:bg-background/20 dark:backdrop-blur-md",
);

export const messageModalSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-muted-foreground";

export const messageModalMetaPanelClass = cn(
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-3",
  "dark:border-cyan-400/15 dark:bg-cyan-500/[0.03] dark:backdrop-blur-md",
);

export const messageModalGlassPanelClass = cn(
  "rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
  "dark:border-cyan-400/10 dark:bg-white/[0.03] dark:shadow-none dark:backdrop-blur-md",
);

export const messageModalFieldShellClass = cn(
  "rounded-md border border-slate-200 bg-white px-2.5 py-2 shadow-sm",
  "dark:border-cyan-400/8 dark:bg-white/[0.02] dark:shadow-none dark:backdrop-blur-md",
);

export const messageModalTextareaClass = cn(
  "flex min-h-[7.5rem] w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none shadow-sm transition-[color,box-shadow,border-color] duration-200 ease-out placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-cyan-600/50 focus-visible:ring-[2px] focus-visible:ring-cyan-500/15",
  "dark:border-cyan-400/10 dark:bg-white/[0.025] dark:shadow-none dark:backdrop-blur-md dark:focus-visible:border-cyan-500/40 dark:focus-visible:ring-cyan-500/20",
);

export const messageModalTextareaCompactClass = cn(messageModalTextareaClass, "min-h-[5.5rem]");

export const messageModalTitleInputClass = cn(
  managersToolbarFormInputClass,
  "h-11 w-full text-sm text-foreground placeholder:text-muted-foreground",
);

export const messageModalComposeShellMaxHeightClass = "max-h-[min(92vh,880px)]";
export const messageModalComposeBodyScrollMaxHeightClass = "max-h-[calc(min(92vh,880px)-4.5rem)]";

export const messageModalDefaultShellMaxHeightClass = "max-h-[min(88vh,720px)]";
export const messageModalDefaultBodyScrollMaxHeightClass = "max-h-[calc(min(88vh,720px)-4.5rem)]";

export const messageRecipientPickListScrollClass = cn(
  "thin-scrollbar max-h-[min(220px,32vh)] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-inner",
  "dark:border-cyan-400/15 dark:bg-white/[0.02]",
);

export const messageModalReadonlyInputClass = cn(
  managersToolbarFormInputClass,
  "font-mono font-medium tabular-nums read-only:cursor-default",
);

export const messageModalFieldBareClass = "min-w-0";

export const messageModalSendOptionsRowClass =
  "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between";

export const messageModalSendOptionsFieldClass =
  "w-full min-w-[10rem] sm:w-auto sm:min-w-[11.5rem] sm:max-w-[min(100%,17.5rem)] sm:flex-1";

/** Compose modal footer divider */
export const messageModalFooterDividerClass = "border-t border-border/60 dark:border-cyan-400/10";
