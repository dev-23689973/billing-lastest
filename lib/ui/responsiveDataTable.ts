import { cn } from "@/lib/cn";

/** Scroll shell: vertical scroll only; column visibility via container queries on the table. */
export function responsiveTableScrollShellClass(containerName: string, extra?: string | string[]) {
  return cn(
    "thin-scrollbar w-full max-w-full min-h-0 min-w-0",
    "max-h-[var(--app-data-table-max-h,none)] overflow-x-hidden overflow-y-auto",
    `@container/${containerName}`,
    extra,
  );
}

export const responsiveDataTableClass = cn(
  "w-full max-w-full table-fixed border-collapse text-left tabular-nums",
);

export const responsiveActionsColClass = "table-cell w-0 whitespace-nowrap text-center";

export function responsiveExpandTriggerClass(expandTriggerHiddenClass: string): string {
  return cn("inline-flex", expandTriggerHiddenClass);
}
