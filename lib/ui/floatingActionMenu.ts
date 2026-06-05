import { cn } from "@/lib/cn";
import { rsIconSm, rsTextCaption } from "@/lib/ui/responsiveScale";

/**
 * Shared responsive sizing for row-action menus, column pickers, and popovers.
 * Mobile-first: narrower width, smaller type/icons; scales up from `sm` / `md`.
 * Typography/icons align with `lib/ui/responsiveScale.ts`.
 */

/** Row ⋮ menus (staff, subscribers). */
export const floatingRowActionMenuPanelClass = cn(
  "box-border w-[min(calc(100vw-1.5rem),11.25rem)] min-w-0 max-w-[min(calc(100vw-1.5rem),11.25rem)]",
  "sm:w-52 sm:min-w-[12rem] sm:max-w-[13rem]",
  "md:w-56 md:max-w-none",
);

/** Wider panels: column picker, mobile “More”, multi-line pickers. */
export const floatingPopoverMenuPanelClass = cn(
  "box-border w-[min(calc(100vw-1.5rem),16rem)] min-w-0 max-w-[min(calc(100vw-1.5rem),20rem)]",
  "sm:w-max sm:min-w-[12rem] sm:max-w-[20rem]",
);

/** Toolbar bulk / compact row menus (pairs with `managersToolbarMenuSurfaceClass`). */
export const floatingCompactMenuPanelClass = cn(
  floatingRowActionMenuPanelClass,
  "!py-0.5 min-w-0 px-0.5 text-xs leading-tight",
);

export const floatingRowActionMenuItemClass = cn(
  "flex w-full min-w-0 items-center gap-1.5 rounded-none px-2 py-2 text-left font-medium text-foreground",
  rsTextCaption,
  "transition-colors duration-150 sm:gap-2 sm:px-2.5 sm:py-2.5 sm:text-sm",
);

export const floatingRowActionMenuLinkClass = cn(
  floatingRowActionMenuItemClass,
  "text-foreground no-underline",
);

export const floatingRowActionMenuItemDestructiveClass = cn(
  floatingRowActionMenuItemClass,
  "text-destructive hover:bg-destructive/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/25",
);

export const floatingRowActionMenuIconClass = cn(rsIconSm, "opacity-70");

export const floatingRowActionMenuDividerClass = "border-t border-cyan-500/30 dark:border-cyan-400/35";

/** Column picker / checkbox menu rows. */
export const floatingColumnPickerMenuHeaderClass =
  "mb-1 whitespace-nowrap border-b border-border/50 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-b-cyan-400/10 sm:text-[11px]";

export const floatingColumnPickerMenuItemClass = cn(
  "flex w-full min-w-0 items-center justify-between gap-1.5 rounded-none px-1.5 py-1 text-left text-xs leading-tight text-foreground transition-colors hover:bg-muted/40",
  "first:pt-0.5 last:pb-0.5 sm:gap-2 sm:px-2 sm:py-1.5 sm:text-[13px]",
);

export const floatingColumnPickerCheckClass = "h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400 sm:h-4 sm:w-4";

export const floatingColumnPickerCheckBoxClass =
  "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center sm:h-4 sm:w-4";

/** Ghost ⋮ trigger in data tables (staff + subscribers). */
export const tableRowActionsTriggerClass =
  "h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-9";

/** Bordered ⋮ trigger (portal subscriber rows). */
export const tableRowActionsTriggerBorderedClass = cn(
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border/80 bg-card p-0",
  "text-foreground/85 shadow-sm transition hover:bg-muted/70 hover:text-foreground",
  "h-8 w-8 dark:bg-muted/30 dark:hover:bg-muted/50 sm:h-9 sm:w-9",
);

/** Square icon-only control (refresh, theme, toolbar). */
export const responsiveIconButtonSquareClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center sm:h-9 sm:w-9";

/** Disabled destructive menu row (can't delete). */
export const floatingRowActionMenuItemDisabledClass = cn(
  floatingRowActionMenuItemClass,
  "cursor-not-allowed border-0 bg-transparent text-muted-foreground opacity-60",
);

/** Nested block inside a row menu (status toggles, etc.). */
export const floatingRowActionMenuSubsectionClass = cn(
  "border-t border-border/50 px-2 py-2 sm:px-2.5 sm:py-2",
);

export const floatingRowActionMenuSubsectionLabelClass =
  "mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]";

export const floatingRowActionMenuInlineButtonClass =
  "w-full rounded-md border px-2 py-1.5 text-left text-[11px] font-medium sm:px-2.5 sm:py-2 sm:text-xs";
