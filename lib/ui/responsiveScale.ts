import { cn } from "@/lib/cn";

/**
 * Project-wide responsive UI scale (mobile → sm → md → lg).
 * Prefer these tokens over one-off `text-[11px]` / `h-8` pairs for fonts, spacing, icons, badges, and controls.
 */

/* —— Typography —— */
export const rsTextBody = "text-xs leading-relaxed sm:text-sm md:text-base";
export const rsTextBodyTight = "text-xs leading-snug sm:text-sm md:text-base";
export const rsTextCaption = "text-[10px] leading-tight sm:text-[11px] md:text-xs";
export const rsTextLabel = "text-xs font-medium leading-none sm:text-sm";
export const rsTextKicker =
  "text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] md:tracking-[0.14em]";
export const rsTextHeadingSm = "text-sm font-semibold sm:text-base md:text-lg";
export const rsTextHeadingMd = "text-base font-semibold sm:text-lg md:text-xl";

/* —— Icons —— */
export const rsIconXs = "h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5";
export const rsIconSm = "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4";
export const rsIconMd = "h-4 w-4 shrink-0 sm:h-5 sm:w-5";
export const rsIconLg = "h-5 w-5 shrink-0 sm:h-6 sm:w-6";
export const rsIconNav = "h-[22px] w-[22px] shrink-0 sm:h-6 sm:w-6";

/* —— Buttons (heights / padding) —— */
export const rsBtnSm = "h-8 min-h-8 gap-1.5 rounded-md px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm";
export const rsBtnDefault = "h-9 min-h-9 gap-2 rounded-md px-3 text-xs sm:h-10 sm:min-h-10 sm:px-4 sm:text-sm";
export const rsBtnLg = "h-10 min-h-10 gap-2 rounded-md px-4 text-sm sm:h-11 sm:px-6 sm:text-base";
export const rsBtnInline = "h-auto min-h-0 gap-1 px-0 py-1 text-xs font-semibold sm:text-sm";

/* —— Form controls —— */
export const rsInputHeight = "h-8 sm:h-9";
export const rsInputText = "text-xs sm:text-[13px]";
export const rsInputPad = "px-2 py-0 sm:px-2.5";
export const rsInputClass = cn(
  "w-full min-w-0 rounded-md leading-none outline-none ring-0",
  rsInputHeight,
  rsInputText,
  rsInputPad,
);

/* —— Badges / pills / tags —— */
export const rsBadgeText = "text-[10px] font-semibold leading-tight sm:text-[11px] md:text-xs";
export const rsBadgePad = "px-1.5 py-0.5 sm:px-2 sm:py-0.5";
export const rsBadgeBase = "inline-flex items-center justify-center rounded-full border";

export const uiBadgeClass = cn(rsBadgeBase, rsBadgeText, rsBadgePad);
export const uiBadgePillClass = cn(uiBadgeClass, "whitespace-nowrap");
export const uiBadgeTagClass = cn(rsBadgeBase, rsBadgeText, "rounded-md px-1.5 py-0.5 sm:px-2");

/** Icon-only badge (status dot, presence, etc.). */
export const rsBadgeIconBox = "inline-flex h-5 w-5 shrink-0 items-center justify-center sm:h-6 sm:w-6";
export const rsBadgeIconBoxSm = "inline-flex h-5 min-w-5 shrink-0 items-center justify-center sm:min-w-[1.375rem]";

export function uiStatusPillClass(colorClass: string, className?: string) {
  return cn(uiBadgePillClass, colorClass, className);
}

/* —— Spacing —— */
export const rsGapInline = "gap-1.5 sm:gap-2";
export const rsGapStack = "gap-2 sm:gap-3 md:gap-4";
export const rsGapSection = "gap-3 sm:gap-4 md:gap-6";
export const rsPadPage = "px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5";
export const rsPadCard = "p-3 sm:p-4 md:p-5";
export const rsPadPanelHeader = "px-3 py-3 sm:px-5 sm:py-4";
export const rsPadPanelBody = "px-3 py-4 sm:px-5 sm:py-6";

/* —— Data tables (embedded / responsive tables) —— */
export const rsTableBody = "text-[11px] leading-tight sm:text-xs md:text-sm";
export const rsTableHeader =
  "text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-[11px] md:text-xs";
export const rsTableThPad = "!px-2 !py-1 sm:!px-2.5 sm:!py-1.5 md:!px-3 md:!py-2";
export const rsTableTdPad = "px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2";
export const rsTableTightThPad = "!px-1.5 !py-1 sm:!px-2 sm:!py-1.5 md:!px-2.5 md:!py-2";
export const rsTableTightTdPad = "px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-2.5 md:py-2";
export const rsTablePillText = rsBadgeText;

/* —— Touch targets —— */
export const rsMinTouch = "min-h-9 min-w-9 sm:min-h-10 sm:min-w-10";
