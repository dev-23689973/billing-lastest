"use client";

import { useId, type FormEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildManagersStaffPaginationItems,
  managersStaffPageBtnBaseClass,
} from "@/lib/adminManagersStaffPagination";
import { cn } from "@/lib/cn";

const managersStaffPageJumpInputClass =
  "h-7 w-11 appearance-none rounded-md border-x-1 border-border/70 bg-background px-1 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-ring";

type ResellersTablePaginationProps = {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  /** Accessible name for the nav region. */
  ariaLabel?: string;
  className?: string;
};

/** Client-side pagination controls matching managers/users list footers (chevrons, 1 2 … n). */
export function ResellersTablePagination({
  totalPages,
  currentPage,
  onPageChange,
  ariaLabel = "Table pages",
  className,
}: ResellersTablePaginationProps) {
  const jumpId = useId().replace(/:/g, "");
  const maxPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, currentPage), maxPages);

  function goToPage(page: number) {
    const next = Math.min(Math.max(1, page), maxPages);
    if (next !== currentPage) onPageChange(next);
  }

  function onJumpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = fd.get("page");
    const n = Number.parseInt(String(raw ?? ""), 10);
    if (Number.isFinite(n)) goToPage(n);
  }

  const items = buildManagersStaffPaginationItems(maxPages, safePage);

  return (
    <nav className={cn("flex flex-wrap items-center justify-center gap-1", className)} aria-label={ariaLabel}>
      <button
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        aria-label="Previous page"
        className={cn(
          managersStaffPageBtnBaseClass,
          "font-medium",
          safePage <= 1 ? "pointer-events-none border-border/40 text-muted-foreground opacity-50" : "border-border/70 hover:bg-muted/50",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex min-w-6 select-none items-center justify-center px-0.5 text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : item === safePage ? (
          <span
            key={item}
            aria-current="page"
            className={cn(
              managersStaffPageBtnBaseClass,
              "cursor-default border-primary/45 bg-primary/12 font-semibold text-primary",
            )}
          >
            {item}
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={cn(managersStaffPageBtnBaseClass, "border-border/70 text-foreground hover:bg-muted/50")}
          >
            {item}
          </button>
        ),
      )}
      <form onSubmit={onJumpSubmit} className="ml-0.5 inline-flex items-center gap-0.5">
        <label htmlFor={jumpId} className="sr-only">
          Go to page
        </label>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pg</span>
        <input
          id={jumpId}
          name="page"
          type="number"
          min={1}
          max={maxPages}
          defaultValue={safePage}
          key={safePage}
          inputMode="numeric"
          className={managersStaffPageJumpInputClass}
        />
      </form>
      <button
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= maxPages}
        aria-label="Next page"
        className={cn(
          managersStaffPageBtnBaseClass,
          "font-medium",
          safePage >= maxPages
            ? "pointer-events-none border-border/40 text-muted-foreground opacity-50"
            : "border-border/70 hover:bg-muted/50",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}
