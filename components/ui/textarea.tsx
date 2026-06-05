import * as React from "react";
import { managersToolbarFormTextareaClass } from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";

export type TextareaProps = React.ComponentProps<"textarea">;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        managersToolbarFormTextareaClass,
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/35 dark:aria-invalid:ring-destructive/45",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
