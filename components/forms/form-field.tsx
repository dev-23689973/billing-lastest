import * as React from "react";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";

export type FormFieldProps = {
  id?: string;
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  /** Merges into the label (e.g. uppercase micro-labels on dense admin forms). */
  labelClassName?: string;
  /** Tighter vertical rhythm for dense admin / portal stacks. */
  density?: "default" | "compact";
  /** Field layout direction. */
  layout?: "stacked" | "horizontal";
  children: React.ReactNode;
};

/**
 * Vertical rhythm for label + control + helper text (mobile-first stack).
 */
export function FormField({
  id,
  label,
  htmlFor,
  hint,
  error,
  className,
  labelClassName,
  density = "default",
  layout = "stacked",
  children,
}: FormFieldProps) {
  const fid = htmlFor ?? id;
  const compact = density === "compact";
  const horizontal = layout === "horizontal";
  return (
    <div
      className={cn(
        horizontal
          ? compact
            ? "grid w-full min-w-0 grid-cols-[8rem_minmax(0,1fr)] items-start justify-items-stretch gap-x-2 gap-y-0.5"
            : "grid w-full min-w-0 grid-cols-[9rem_minmax(0,1fr)] items-start justify-items-stretch gap-x-2.5 gap-y-1.5"
          : compact
            ? "grid w-full min-w-0 gap-1"
            : "grid w-full min-w-0 gap-1.5",
        className,
      )}
    >
      <Label
        htmlFor={fid}
        className={cn(
          compact ? "text-xs font-semibold tracking-tight text-foreground" : "text-sm font-semibold tracking-tight text-foreground",
          horizontal ? (compact ? "col-start-1 row-start-1 justify-self-start self-start pt-1.5 text-left" : "col-start-1 row-start-1 justify-self-start self-start pt-2 text-left") : "",
          labelClassName,
        )}
      >
        {label}
      </Label>
      {horizontal ? (
        <>
          <div className="col-start-2 row-start-1 min-w-0 justify-self-stretch">{children}</div>
          {hint ? (
            <p
              className={cn(
                "col-start-2 row-start-2 min-w-0 max-w-full justify-self-stretch text-left break-words [overflow-wrap:anywhere] leading-snug text-muted-foreground",
                compact ? "text-[11px]" : "text-xs",
              )}
            >
              {hint}
            </p>
          ) : null}
          {error ? (
            <p
              className={cn(
                "col-start-2 row-start-2 min-w-0 max-w-full justify-self-stretch text-left break-words [overflow-wrap:anywhere] font-medium text-destructive",
                compact ? "text-[11px]" : "text-xs",
              )}
            >
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <>
          {children}
          {hint ? (
            <p className={cn("min-w-0 break-words leading-snug text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>{hint}</p>
          ) : null}
          {error ? <p className={cn("min-w-0 break-words font-medium text-destructive", compact ? "text-[11px]" : "text-xs")}>{error}</p> : null}
        </>
      )}
    </div>
  );
}
