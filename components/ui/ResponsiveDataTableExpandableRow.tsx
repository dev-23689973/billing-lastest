"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { dataTableZebraRowClass } from "@/lib/ui/dataTableSticky";
import { responsiveActionsColClass } from "@/lib/ui/responsiveDataTable";

type Props = {
  colSpan: number;
  expandButtonClass: string;
  tdClassName: string;
  actionsColClass?: string;
  actions: ReactNode;
  details: ReactNode;
  children: ReactNode;
  zebra?: boolean;
  rowClassName?: string;
  /** Keep row expanded across `router.refresh()` (staff hub). */
  expandPersistId?: string;
  /** When false, collapse and hide the details row (e.g. all table columns visible again). */
  detailsEnabled?: boolean;
  /** Optional — e.g. virtualized users table remeasures row height. */
  onExpandChange?: (open: boolean) => void;
};

/** Expandable row: action buttons, then chevron (rightmost). */
export function ResponsiveDataTableExpandableRow({
  colSpan,
  expandButtonClass,
  tdClassName,
  actionsColClass,
  actions,
  details,
  children,
  zebra = true,
  rowClassName,
  expandPersistId,
  detailsEnabled = true,
  onExpandChange,
}: Props) {
  const storageKey = expandPersistId ? `staff-hub-expand:${expandPersistId}` : null;

  const [open, setOpen] = useState(() => {
    if (!storageKey || typeof sessionStorage === "undefined") return false;
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const setOpenPersisted = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        if (storageKey) {
          try {
            if (value) sessionStorage.setItem(storageKey, "1");
            else sessionStorage.removeItem(storageKey);
          } catch {
            /* private mode */
          }
        }
        return value;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    if (!detailsEnabled && open) {
      setOpenPersisted(false);
    }
  }, [detailsEnabled, open, setOpenPersisted]);

  useEffect(() => {
    onExpandChange?.(open && detailsEnabled);
  }, [open, detailsEnabled, onExpandChange]);

  const showDetails = open && detailsEnabled;
  const showActionsCol = Boolean(actions) || detailsEnabled;

  return (
    <>
      <tr className={rowClassName ?? (zebra ? dataTableZebraRowClass : undefined)}>
        {children}
        {showActionsCol ? (
          <td className={cn(tdClassName, actionsColClass ?? responsiveActionsColClass)}>
            <div className="inline-flex items-center justify-center gap-0.5">
              {actions}
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                  expandButtonClass,
                )}
                aria-expanded={showDetails}
                aria-label={showDetails ? "Collapse row details" : "Show hidden columns"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!detailsEnabled) return;
                  setOpenPersisted((v) => !v);
                }}
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-200", showDetails && "rotate-180")}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </div>
          </td>
        ) : null}
      </tr>
      {showDetails ? (
        <tr className="staff-hub-expand-details-row border-b border-border/40">
          <td colSpan={colSpan} className="px-4 py-2 sm:px-4">
            <div className="min-w-0 w-full">{details}</div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
