/** Page number list for resellers-style table footers (1 … n with ellipses). */
export function buildResellersPaginationItems(
  totalPages: number,
  currentPage: number,
  siblingDelta = 2,
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [];
  const left = currentPage - siblingDelta;
  const right = currentPage + siblingDelta;
  const items: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
      items.push(i);
      continue;
    }
    if (items[items.length - 1] !== "ellipsis") items.push("ellipsis");
  }
  return items;
}

export const resellersPaginationBtnClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors";

export const resellersPaginationBtnActiveClass =
  "border-primary/45 bg-primary/12 font-semibold text-primary";

export const resellersPaginationBtnIdleClass = "border-border/70 text-foreground hover:bg-muted/50";

export const resellersPaginationBtnDisabledClass =
  "pointer-events-none border-border/40 text-muted-foreground opacity-50";

export const resellersPaginationJumpInputClass =
  "h-8 w-14 appearance-none rounded-md border border-border/70 bg-background px-2 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring";
