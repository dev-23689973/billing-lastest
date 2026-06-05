import * as React from "react";
import { cn } from "@/lib/cn";
import { rsTextLabel } from "@/lib/ui/responsiveScale";

export type LabelProps = React.ComponentProps<"label">;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "select-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        rsTextLabel,
        className,
      )}
      {...props}
    />
  );
}

export { Label };
