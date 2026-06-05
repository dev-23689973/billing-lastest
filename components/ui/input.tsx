import * as React from "react";
import { managersToolbarFormInputClass } from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

export type InputProps = React.ComponentProps<"input">;

/** HUD-aligned single-line control (same height / border / fill as resellers toolbar search). */
function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        managersToolbarFormInputClass,
        "selection:bg-primary selection:text-primary-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/35 dark:aria-invalid:ring-destructive/45",
        type === "number" &&
          "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
