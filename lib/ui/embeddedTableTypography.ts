import { cn } from "@/lib/cn";
import {
  rsTableBody,
  rsTableHeader,
  rsTablePillText,
  rsTableTdPad,
  rsTableThPad,
  rsTableTightTdPad,
  rsTableTightThPad,
} from "@/lib/ui/responsiveScale";

/** Base table font — mobile compact; scales up on wider viewports. */
export const embeddedTableTextClass = rsTableBody;

/** Sticky/header cell label typography. */
export const embeddedTableThTextClass = rsTableHeader;

/** Body cell typography. */
export const embeddedTableTdTextClass = cn(rsTableBody, "text-foreground");

/** Header cell padding — scales with breakpoint. */
export const embeddedTableThPaddingClass = rsTableThPad;

/** Body cell padding — scales with breakpoint. */
export const embeddedTableTdPaddingClass = rsTableTdPad;

/** Inline badges/pills inside embedded tables. */
export const embeddedTablePillTextClass = rsTablePillText;

/** Compact/tight tables (e.g. profile transaction lists). */
export const embeddedTableTightThPaddingClass = rsTableTightThPad;
export const embeddedTableTightTdPaddingClass = rsTableTightTdPad;

export function embeddedTableThClass(extra?: string, density: "default" | "tight" = "default") {
  return cn(
    "whitespace-nowrap",
    density === "tight" ? embeddedTableTightThPaddingClass : embeddedTableThPaddingClass,
    embeddedTableThTextClass,
    extra,
  );
}

export function embeddedTableTdClass(extra?: string, density: "default" | "tight" = "default") {
  return cn(
    "whitespace-nowrap align-middle",
    density === "tight" ? embeddedTableTightTdPaddingClass : embeddedTableTdPaddingClass,
    embeddedTableTdTextClass,
    extra,
  );
}
