import { cn } from "@/lib/cn";

/** Sticky `<th>` — opaque header so body rows never bleed through when scrolling. */
const stickyBase =
  "sticky top-0 z-10 border-b border-border/70 bg-white text-left text-[10px] sm:text-[11px] md:text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-[inset_0_-1px_0_0_rgb(15_23_42/0.08)] backdrop-blur-sm dark:bg-[hsl(222_47%_8%)] dark:text-muted-foreground dark:backdrop-blur-md dark:shadow-[inset_0_-1px_0_0_rgb(34_211_238/0.12)]";
/** Zebra rows for staff / portal data tables. */
export const dataTableZebraRowClass =
  "border-b border-border/60 transition-colors last:border-0 odd:bg-transparent even:bg-transparent hover:bg-accent/50 dark:border-border/40 dark:hover:bg-muted/15";

/**
 * Sticky `<th>` for tables inside `.app-data-table-scroll` (or any scroll container with max-height).
 * @param className — alignment (`text-right`), `whitespace-nowrap`, etc.
 * @param density — `default` px-3 py-2 (staff lists), `comfortable` px-4 py-3 (tickets-style)
 */
export function dataTableStickyTh(className?: string, density: "default" | "comfortable" = "default") {
  return cn(
    stickyBase,
    density === "comfortable"
      ? "px-3 py-2.5 sm:px-4 sm:py-3 md:text-sm"
      : "px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5",
    className,
  );
}
/** Narrow column for row-selection checkboxes (pairs with `DataTableSelectionCheckbox`). */
export const dataTableSelectionColumnClass = "w-11 !px-2 text-center";
