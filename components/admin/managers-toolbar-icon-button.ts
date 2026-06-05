/**
 * Shared chrome for /admin/managers staff toolbar (search, page/status selects, icon buttons).
 * Image-2 style: very soft cyan/teal edges (low opacity), never a harsh black frame.
 */

import { cn } from "@/lib/cn";
import { rsIconSm, rsInputClass } from "@/lib/ui/responsiveScale";

/** Faint HUD edge — reads as “unclear” color, not black or heavy grey. */
export const managersToolbarGreyBorder =
  "border border-cyan-600/22 dark:border-cyan-400/[0.14]";

/** List / ledger panels — same transparent card shell as Users table (no glass wash or cyan fill). */
export const adminDataPanelShellClass =
  "overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

/** Segmented tabs (7d / 30d / chart range) — cyan active pill (readable in light + dark). */
export const adminSegmentedTabActiveClass =
  "bg-cyan-600 font-semibold text-white shadow-sm ring-1 ring-cyan-700/40 dark:bg-cyan-500/35 dark:text-cyan-50 dark:ring-cyan-400/45";
export const adminSegmentedTabIdleClass =
  "text-muted-foreground hover:bg-cyan-500/10 hover:text-foreground dark:hover:bg-cyan-400/10";

export const managersToolbarGreyBorderHover =
  "hover:border-cyan-500/32 dark:hover:border-cyan-300/[0.22]";

export const managersToolbarGreyFocus =
  "focus-visible:border-cyan-500/38 dark:focus-visible:border-cyan-200/[0.28] focus-visible:ring-1 focus-visible:ring-cyan-400/14 focus-visible:ring-offset-0";

export const managersToolbarIconButtonClass = [
  "inline-flex h-8 w-8 shrink-0 cursor-pointer list-none items-center justify-center rounded-md bg-background/45 text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow] duration-200 ease-out backdrop-blur-sm sm:h-9 sm:w-9",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  "hover:bg-muted/35 hover:text-foreground",
  managersToolbarGreyFocus,
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/** Compact primary CTA — same height as {@link managersToolbarIconButtonClass} (toolbar “New ticket”, etc.). */
export const managersToolbarPrimaryButtonClass = cn(
  "inline-flex h-8 min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold leading-none outline-none transition-[color,background-color,border-color,box-shadow] duration-200 ease-out sm:h-9 sm:min-h-9 sm:px-3",
  managersToolbarGreyBorder,
  managersToolbarGreyFocus,
  "border-cyan-800/55 bg-chart-2 text-white shadow-sm",
  "hover:border-cyan-600/50 hover:bg-cyan-700 hover:text-white",
  "disabled:pointer-events-none disabled:opacity-50",
);

/**
 * Managers status/page select panel (image 2): faint cyan frame, sharp corners, slightly glassy fill.
 */
export const managersToolbarDropdownPanelClass = [
  managersToolbarGreyBorder,
  "rounded-none bg-popover/95 text-popover-foreground shadow-none ring-0 backdrop-blur-md",
  "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]",
  "dark:bg-[hsl(222_47%_6%/0.88)] dark:text-popover-foreground",
].join(" ");

/** Image-2 HUD frame (row menus, announcement modal shell, slide strip). */
export const managersToolbarHudInsetFrameClass = [
  managersToolbarGreyBorder,
  "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]",
].join(" ");

/** Period-strip shell (image 2): thin cyan frame + corner notch accents on a `relative` parent. */
export const hudPeriodStripShellClass = [
  "relative overflow-hidden rounded-lg border border-cyan-500/20",
  "shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]",
].join(" ");

export const hudPeriodStripCornerTopLeftClass =
  "pointer-events-none absolute left-0 top-0 z-[2] h-2.5 w-2.5 border-l border-t border-cyan-400/40";

export const hudPeriodStripCornerBottomRightClass =
  "pointer-events-none absolute bottom-0 right-0 z-[2] h-2.5 w-2.5 border-b border-r border-cyan-400/28";

/**
 * Image-2 glass: semi-transparent — page/gradient shows through softly (staff profile editor).
 * Use on modals/dialogs instead of opaque `bg-transparent` shells.
 */
/** Light: crisp white panel. Dark: glass HUD fill. */
export const managersToolbarModalGlassClass = cn(
  "bg-white",
  "shadow-[inset_0_0_0_1px_rgb(15_23_42/0.04)]",
  "dark:bg-slate-950/40 dark:backdrop-blur-xl",
  "dark:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.1)]",
);

/** Credits / secondary modals — solid white on light (no frosted grey). */
export const managersToolbarModalGlassLightClass = cn(
  "bg-white",
  "shadow-[inset_0_0_0_1px_rgb(15_23_42/0.04)]",
  "dark:bg-slate-950/28 dark:backdrop-blur-xl",
  "dark:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.1)]",
);

/** Ultra-light glass — full-page HUD panels where the page grid should show through. */
export const managersToolbarModalGlassUltraLightClass = [
  "bg-white/16 backdrop-blur-sm",
  "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]",
  "dark:bg-slate-950/[0.04]",
].join(" ");

/** Modal overlay scrim (image 2). */
export const managersToolbarModalBackdropClass = "bg-black/45 backdrop-blur-[2px] dark:bg-black/40";

/** Full-screen HUD modal backdrop — Add user, announcements, bulk results, etc. */
export const adminHudModalBackdropClass = "bg-black/60 backdrop-blur-md dark:bg-black/55";

/** Opaque scrim without backdrop-filter — use on large forms / nested modals (blur is costly over big tables). */
export const adminHudModalBackdropPerfClass = "bg-black/60 dark:bg-black/55";

/**
 * Primary admin list / settings page panel shell (resellers, managers, settings).
 * Single `border-border/60` frame — not cyan HUD double-box chrome.
 */
export const adminListPanelShellClass =
  "overflow-hidden rounded-2xl border border-border/60 bg-transparent shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

/** Inset section inside a glass modal (profile fields block). */
export const managersToolbarModalInsetPanelClass = [
  "hud-modal-inset-panel rounded-md border border-border/60",
  "bg-slate-50/95 backdrop-blur-sm",
  "shadow-[inset_0_0_0_1px_rgb(226_232_240/0.9)]",
  "dark:border-cyan-400/12 dark:bg-white/[0.04] dark:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.05)]",
].join(" ");

/** Dialog / large panel — white card on light; HUD glass on dark. */
export const managersToolbarModalShellClass = cn(
  "hud-modal-shell rounded-xl border border-slate-200/90 text-foreground ring-0",
  "shadow-[0_8px_30px_rgb(15_23_42/0.12),0_2px_8px_rgb(15_23_42/0.06)]",
  managersToolbarModalGlassClass,
  "dark:border-cyan-400/[0.14] dark:shadow-xl dark:text-zinc-50",
);

/** Full-page HUD panel (e.g. credit deductions) — same glass + border as staff profile editor. */
export const deductionsHudPanelShellClass = cn(
  "relative overflow-hidden rounded-none text-foreground shadow-none ring-0",
  managersToolbarGreyBorder,
  managersToolbarModalGlassClass,
);

/** Section dividers inside deductions / staff-style HUD forms. */
export const deductionsHudDividerClass = "border-cyan-600/15 dark:border-cyan-400/10";

export const deductionsHudHeaderBarClass =
  "border-b border-cyan-600/15 bg-black/[0.03] backdrop-blur-md dark:border-b-cyan-400/10 dark:bg-white/[0.06]";

/** Opaque dialog shell — solid white on light; HUD glass on dark (not bg-card: transparent in light). */
export const managersToolbarModalOpaqueShellClass = [
  managersToolbarGreyBorder,
  "hud-modal-opaque-shell rounded-lg text-foreground shadow-xl ring-0",
  "bg-white backdrop-blur-md",
  "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]",
  "dark:bg-[hsl(222_47%_6%/0.82)] dark:backdrop-blur-xl",
  "dark:text-zinc-50",
].join(" ");

/** Floating menus that should match the same shell as the toolbar selects. */
export const managersToolbarMenuSurfaceClass = managersToolbarDropdownPanelClass;

/** Image-2 row menus + header alerts bell — brighter cyan frame, glass fill, L-corners. */
export const hudBrightDropdownShellClass = cn(
  "relative overflow-hidden rounded-sm border border-cyan-500/45 text-foreground shadow-none ring-0",
  "dark:border-cyan-300/48",
  "bg-white/[0.78] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)] backdrop-blur-xl backdrop-saturate-150",
  "dark:bg-[hsl(222_47%_8%/0.88)] dark:text-popover-foreground dark:shadow-[inset_0_0_0_1px_rgba(103,232,249,0.14)]",
);

/**
 * Single-line `<input>` / MAC fields — same HUD frame, height, fill, and type scale as toolbar search (no icon gutter).
 * Use for forms app-wide so controls match resellers/managers embedded search.
 */
export const managersToolbarFormInputClass = cn(
  rsInputClass,
  "bg-background/75 text-left text-foreground shadow-none backdrop-blur-sm transition-none placeholder:text-muted-foreground/90",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
);

/**
 * Settings / deductions HUD field — one outer border (icon + input share the same fill).
 * Inner input must use `hudFormInputInnerClass` (no border, no spinners).
 */
export const hudFormControlShellClass = cn(
  "flex h-10 w-full min-w-0 items-stretch gap-2.5 overflow-hidden rounded-lg px-3",
  managersToolbarGreyBorder,
  "bg-background/40 backdrop-blur-sm dark:bg-white/[0.05]",
  "transition-[border-color,box-shadow] duration-300 ease-out",
  managersToolbarGreyBorderHover,
  "focus-within:border-cyan-500/38 dark:focus-within:border-cyan-200/[0.28]",
  "focus-within:ring-1 focus-within:ring-cyan-400/14 focus-within:ring-offset-0",
);

export const hudFormInputInnerClass = cn(
  "h-full min-h-0 w-full min-w-0 flex-1 appearance-none",
  "!border-0 !border-transparent !bg-transparent px-0 py-0 !shadow-none !outline-none !ring-0",
  "!text-sm !leading-none text-foreground sm:!text-[13px]",
  "placeholder:text-muted-foreground/90",
  "focus:!border-transparent focus:!outline-none focus:!ring-0 focus-visible:!border-transparent focus-visible:!outline-none focus-visible:!ring-0",
  "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_transparent_inset] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_transparent_inset]",
);

/** `<textarea>` — same chrome as form inputs; minimum height for usable multi-line. */
export const managersToolbarFormTextareaClass = cn(
  "min-h-[4.5rem] w-full min-w-0 rounded-md bg-background/75 px-2.5 py-2 text-left text-xs leading-snug text-foreground shadow-none outline-none ring-0 backdrop-blur-sm transition-none placeholder:text-muted-foreground/90 sm:px-3 sm:text-[13px]",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
);

/** Native `<select>` — aligned with toolbar selects / search row height. */
export const managersToolbarNativeSelectClass = cn(
  "h-8 w-full min-w-0 cursor-pointer appearance-none rounded-md bg-background/75 bg-[length:0.875rem] bg-[right_0.5rem_center] bg-no-repeat py-0 pl-2.5 pr-8 text-xs font-medium text-foreground shadow-none outline-none ring-0 backdrop-blur-sm transition-none sm:pl-3 sm:pr-9 sm:text-[13px]",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "disabled:cursor-not-allowed disabled:opacity-50",
  "[&>option]:bg-popover [&>option]:text-popover-foreground",
);

/** Search field (managers / resellers toolbar): form input + left gutter for icon. */
export const managersToolbarSearchInputClass = cn(
  managersToolbarFormInputClass,
  "pl-8 pr-2 sm:pl-9 sm:pr-2.5",
);

/** Users / resellers embedded list toolbar — search field width (flex grow with upper cap). */
export const adminListTableToolbarSearchFieldEmbeddedClass =
  "relative min-w-0 flex-1 sm:min-w-[18rem] sm:max-w-none lg:min-w-[26rem] lg:max-w-[min(40rem,calc(100vw-28rem))]";

/** Magnifying glass for embedded toolbar search (pairs with `managersToolbarSearchInputClass`). */
export const adminListTableToolbarSearchIconEmbeddedClass =
  "pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 text-muted-foreground left-2 h-3.5 w-3.5 sm:left-2.5";

/** Flex row for select / searchable-select triggers (label left, chevron right). */
export const managersToolbarSelectTriggerLayoutClass =
  "flex w-full min-w-0 max-w-full items-center justify-between gap-2 text-left";

/** Radix / FormSelect trigger — same height and border as `hudFormControlShellClass`. */
export const hudFormSelectTriggerClass = cn(
  managersToolbarSelectTriggerLayoutClass,
  "h-10 min-h-10 w-full rounded-lg px-3 text-sm font-medium leading-none shadow-none",
  managersToolbarGreyBorder,
  "bg-background/40 backdrop-blur-sm dark:bg-white/[0.05]",
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "transition-[border-color,box-shadow] duration-300 ease-out",
  "hover:bg-muted/30",
  "[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:opacity-70",
);

/** Radix select trigger matching managers toolbar compact selects. */
export const managersToolbarSelectTriggerClass = cn(
  managersToolbarSelectTriggerLayoutClass,
  "h-8 min-h-0 shrink-0 rounded-md bg-background/75 px-2 py-0 text-xs font-medium leading-none text-foreground shadow-none backdrop-blur-sm",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "transition-[color,background-color,border-color,box-shadow] duration-150",
  "hover:bg-muted/25",
  "[&_svg]:h-3 [&_svg]:w-3 sm:px-2.5 sm:text-[13px]",
);

/** Item stack inside the inner list box (below search in searchable selects). */
export const managersToolbarSearchableDropdownListClass = "flex flex-col gap-0.5";

/** Inner bordered box — separates scrollable items from the outer select-panel border. */
export const managersToolbarSearchableDropdownListBoxClass = cn(
  managersToolbarGreyBorder,
  "rounded-md bg-background/40 p-2",
);

const managersToolbarSearchableDropdownScrollBaseClass = cn(
  "thin-scrollbar scrollbar-surface-light dark:scrollbar-surface-dark",
  "[scrollbar-gutter:stable]",
);

/** Scroll region inside the inner list box (fixed cap for inline dropdowns). */
export const managersToolbarSearchableDropdownScrollClass = cn(
  "max-h-56 overflow-y-auto",
  managersToolbarSearchableDropdownScrollBaseClass,
);

/** Scroll region fills portaled panel height (Add staff picker above search field). */
export const managersToolbarSearchableDropdownScrollFillClass = cn(
  "min-h-0 max-h-full flex-1 overflow-y-auto overscroll-contain",
  managersToolbarSearchableDropdownScrollBaseClass,
);

export const managersToolbarSearchableDropdownItemClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-left text-[13px] leading-snug text-foreground",
  "transition-colors hover:bg-primary/10",
  "disabled:cursor-not-allowed disabled:opacity-45",
);

export const managersToolbarSearchableDropdownItemCompactClass = cn(
  managersToolbarSearchableDropdownItemClass,
  "px-2 py-1 text-xs leading-snug",
);

/** Multi-select grids inside the inner list box (e.g. custom package add-ons). */
export const managersToolbarSearchableDropdownGridClass = "grid grid-cols-3 gap-0.5";

/** HUD checkbox tile for package / multi-select grids (pairs with sr-only native input). */
export const managersToolbarPackCheckboxTileClass = cn(
  "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-[border-color,background-color,box-shadow] duration-150",
  managersToolbarGreyBorder,
  "bg-background/50 text-transparent shadow-none",
);

export const managersToolbarPackCheckboxTileCheckedClass = cn(
  "border-cyan-500/60 bg-cyan-500 text-white shadow-[0_0_12px_-5px_rgba(34,211,238,0.55)]",
  "dark:border-cyan-400/55 dark:bg-cyan-400/90 dark:text-cyan-950",
);

/** Grid row for package pickers (checkbox + truncated label). */
export const managersToolbarPackGridRowClass = cn(
  managersToolbarSearchableDropdownItemCompactClass,
  "!justify-start items-center gap-2 cursor-pointer",
);

/** Select menu rows (faint cyan dividers; no per-row rounded boxes). */
export const managersToolbarSelectItemClass = cn(
  "relative max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-none px-1.5 py-1.5 text-xs font-medium leading-none antialiased sm:px-2 sm:py-2 sm:text-[13px]",
  "border-b border-cyan-600/15 last:border-b-0 dark:border-b-cyan-400/10",
  "text-muted-foreground transition-[color,background-color] duration-150",
  "data-[highlighted]:bg-cyan-500/[0.18] data-[highlighted]:font-semibold data-[highlighted]:text-foreground dark:data-[highlighted]:bg-cyan-400/[0.16] dark:data-[highlighted]:text-zinc-50",
  "data-[state=checked]:bg-muted/30 data-[state=checked]:font-semibold data-[state=checked]:text-foreground dark:data-[state=checked]:text-zinc-50",
);

/** Users / Resellers data-table toolbar row (same vertical rhythm as managers image-2). */
export const adminListTableToolbarShellClass = cn(
  "flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs sm:gap-2.5 sm:text-sm",
);

export const adminListTableToolbarShellEmbeddedClass =
  "mb-0 shrink-0 flex-nowrap justify-start rounded-none border-x-0 border-t-0";

/** Bulk actions trigger: compact height + faint cyan frame (matches toolbar selects). */
export const adminListTableToolbarBulkButtonClass = cn(
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-background/75 px-2 text-xs font-medium text-foreground shadow-none backdrop-blur-sm",
  managersToolbarGreyBorder,
  managersToolbarGreyBorderHover,
  managersToolbarGreyFocus,
  "transition-[color,background-color,border-color,box-shadow] duration-150 hover:bg-muted/25",
);

/** Menu rows for floating bulk menus (explicit hover — reliable vs. delegated `[&_role=menuitem]`). */
export const adminListTableBulkMenuItemClass = cn(
  "flex w-full min-w-0 items-center gap-1.5 rounded-none border-b border-cyan-600/15 px-1.5 py-1.5 text-left text-xs font-medium text-foreground last:border-b-0 dark:border-b-cyan-400/10",
  "transition-colors duration-150",
  "hover:bg-cyan-500/[0.16] hover:text-foreground dark:hover:bg-cyan-400/[0.14]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/35 dark:focus-visible:ring-cyan-300/28",
  "sm:gap-2 sm:px-2 sm:py-2 sm:text-[13px]",
);

export const adminListTableBulkMenuItemDestructiveClass = cn(
  "flex w-full min-w-0 items-center gap-1.5 rounded-none px-1.5 py-1.5 text-left text-xs font-medium text-destructive",
  "transition-colors duration-150",
  "hover:bg-rose-500/14 hover:text-destructive dark:hover:bg-rose-500/18",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400/40",
  "sm:gap-2 sm:px-2 sm:py-2 sm:text-[13px]",
);

/** Full-screen shell for staff details / password overlays — vertically centered on all viewports. */
export const staffDetailsOverlayShellClass =
  "fixed inset-0 z-[320] flex items-center justify-center overflow-y-auto p-4";

/** Nested picker/dialog above {@link staffDetailsOverlayShellClass} (e.g. custom package multi-select). */
export const nestedHudModalOverlayShellClass =
  "fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4";

export const staffDetailsOverlayBackdropClass = "absolute inset-0 bg-black/55 backdrop-blur-sm";

export const staffDetailsCloseButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground";

/** Stat tile body text — wrap instead of ellipsis in narrow modals. */
export const staffDetailsStatValueClass =
  "mt-0.5 whitespace-normal break-words text-sm font-medium leading-snug text-foreground";

/** Stat tiles in staff “details” modals (manager / reseller / dealer). */
export const staffDetailsStatTileClass = cn(
  "rounded-md border border-slate-200/80 px-3 py-2",
  "bg-slate-50 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_4px_12px_-3px_rgb(15_23_42/0.08)]",
  "dark:border-cyan-400/16 dark:bg-[hsl(222_47%_10%/0.7)] dark:shadow-none dark:backdrop-blur-sm",
);
