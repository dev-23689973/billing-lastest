import Link from "next/link";
import { buildResellersPaginationItems } from "@/lib/resellersTablePagination";
import { PAGE_SIZE_OPTIONS } from "@/lib/subscriberFilterSelectOptions";

function buildHref(path: string, parts: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

type Props = {
  actionPath: string;
  ariaLabel: string;
  baseQs: Record<string, string | undefined>;
  safePage: number;
  totalPages: number;
  pageSize: number;
  jumpInputId: string;
};

export function PortalStaffListPagination({
  actionPath,
  ariaLabel,
  baseQs,
  safePage,
  totalPages,
  pageSize,
  jumpInputId,
}: Props) {
  const pageBtnClass = (disabled: boolean) =>
    `inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium ${
      disabled ? "pointer-events-none border-border/40 text-muted-foreground opacity-50" : "border-border/70 hover:bg-muted/50"
    }`;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 bg-transparent px-4 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Per page</span>
        {PAGE_SIZE_OPTIONS.map((opt) =>
          opt.value === String(pageSize) ? (
            <span
              key={opt.value}
              className="inline-flex h-7 items-center rounded-md border border-primary/45 bg-primary/12 px-2 font-semibold text-primary"
            >
              {opt.label}
            </span>
          ) : (
            <Link
              key={opt.value}
              href={buildHref(actionPath, { ...baseQs, pageSize: opt.value, page: "1" })}
              className="inline-flex h-7 items-center rounded-md border border-border/70 px-2 hover:bg-muted/50"
            >
              {opt.label}
            </Link>
          ),
        )}
      </div>
      {totalPages > 1 ? (
        <nav className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:justify-end" aria-label={ariaLabel}>
          <Link
            href={buildHref(actionPath, { ...baseQs, page: String(safePage - 1) })}
            aria-disabled={safePage <= 1}
            className={pageBtnClass(safePage <= 1)}
          >
            Prev
          </Link>
          {buildResellersPaginationItems(totalPages, safePage, 2).map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="inline-flex min-w-8 items-center justify-center px-0.5 text-muted-foreground" aria-hidden>
                …
              </span>
            ) : item === safePage ? (
              <span
                key={item}
                aria-current="page"
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-primary/45 bg-primary/12 px-2 text-xs font-semibold text-primary"
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={buildHref(actionPath, { ...baseQs, page: String(item) })}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border/70 px-2 text-xs text-foreground hover:bg-muted/50"
              >
                {item}
              </Link>
            ),
          )}
          <form method="get" action={actionPath} className="ml-1 inline-flex items-center gap-1">
            {Object.entries(baseQs).map(([k, v]) =>
              v ? <input key={k} type="hidden" name={k} value={v} /> : null,
            )}
            <label htmlFor={jumpInputId} className="sr-only">
              Go to page
            </label>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pg</span>
            <input
              id={jumpInputId}
              name="page"
              type="number"
              min={1}
              max={totalPages}
              defaultValue={safePage}
              inputMode="numeric"
              className="h-8 w-14 appearance-none rounded-md border border-border/70 bg-background px-2 text-center text-xs font-semibold text-foreground outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ring-offset-background transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>
          <Link
            href={buildHref(actionPath, { ...baseQs, page: String(safePage + 1) })}
            aria-disabled={safePage >= totalPages}
            className={pageBtnClass(safePage >= totalPages)}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
