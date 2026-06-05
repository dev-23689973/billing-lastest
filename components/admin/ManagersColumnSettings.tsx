"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import {
  managersToolbarIconButtonClass,
  managersToolbarMenuSurfaceClass,
} from "@/components/admin/managers-toolbar-icon-button";
import {
  floatingColumnPickerCheckBoxClass,
  floatingColumnPickerCheckClass,
  floatingColumnPickerMenuHeaderClass,
  floatingColumnPickerMenuItemClass,
  floatingPopoverMenuPanelClass,
} from "@/lib/ui/floatingActionMenu";
import { staffListColsSearchParam } from "@/lib/adminStaffListColumns";
import { isAdminStaffListPageSize } from "@/lib/adminStaffListPageSize";

type Props = {
  selectedColumns: string[];
  labels: Record<string, string>;
  currentQuery: {
    q?: string;
    p?: number;
    ps?: number;
    type?: string;
    status?: string;
    sort?: string;
    dir?: string;
    quick?: string;
    bq?: string;
    bs?: string;
  };
};

function labelsFingerprint(labels: Record<string, string>): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}:${labels[key] ?? ""}`)
    .join("|");
}

export function ManagersColumnSettings({ selectedColumns, labels, currentQuery }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelsKey = labelsFingerprint(labels);
  const allColumns = useMemo(() => Object.keys(labels).sort(), [labelsKey]);
  const selectedKey = selectedColumns.join(",");
  const allColumnsKey = allColumns.join(",");
  /** Controlled from URL — stable fingerprints avoid remounting menu children when RSC passes new object refs. */
  const checked = useMemo(
    () => (selectedColumns.length > 0 ? selectedColumns : allColumns),
    [selectedKey, allColumnsKey],
  );
  const [open, setOpen] = useState(false);

  const applyColumns = (nextChecked: string[]) => {
    const params = new URLSearchParams();
    const q = (currentQuery.q ?? "").trim();
    if (q) params.set("q", q);
    if (currentQuery.ps && isAdminStaffListPageSize(currentQuery.ps)) params.set("ps", String(currentQuery.ps));
    if (currentQuery.type && ["manager", "reseller", "dealer"].includes(currentQuery.type)) params.set("type", currentQuery.type);
    if (currentQuery.status && ["active", "inactive"].includes(currentQuery.status)) params.set("status", currentQuery.status);
    if (currentQuery.sort) params.set("sort", currentQuery.sort);
    if (currentQuery.dir) params.set("dir", currentQuery.dir);
    if (currentQuery.quick === "1") params.set("quick", "1");
    const bq = (currentQuery.bq ?? "").trim();
    if (bq) params.set("bq", bq);
    if (currentQuery.bs && ["active", "inactive"].includes(currentQuery.bs)) params.set("bs", currentQuery.bs);
    if (currentQuery.p && currentQuery.p > 1) params.set("p", String(currentQuery.p));

    const colsParam = staffListColsSearchParam(nextChecked, allColumns);
    if (colsParam) params.set("cols", colsParam);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const onToggle = (col: string, enabled: boolean) => {
    const next = enabled ? [...checked, col] : checked.filter((x) => x !== col);
    if (next.length === 0) return;
    applyColumns(next);
  };

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!open) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={managersToolbarIconButtonClass}
        aria-label="Column settings"
        title="Column settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-current" strokeWidth={1.75} aria-hidden />
      </button>
      <FloatingMenuPortal
        open={open}
        onOpenChange={setOpen}
        anchorRef={buttonRef}
        hudCorners
        menuClassName={cn("px-1 py-1 text-xs leading-tight", floatingPopoverMenuPanelClass, managersToolbarMenuSurfaceClass)}
      >
        <p className={floatingColumnPickerMenuHeaderClass}>Visible columns</p>
        <div className="flex flex-col" role="menu">
          {allColumns.map((col) => {
            const isChecked = checked.includes(col);
            const soleVisibleLock = isChecked && checked.length === 1;
            return (
              <button
                key={col}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isChecked}
                disabled={soleVisibleLock}
                onClick={() => {
                  if (soleVisibleLock) return;
                  onToggle(col, !isChecked);
                }}
                className={cn(
                  floatingColumnPickerMenuItemClass,
                  soleVisibleLock && "cursor-not-allowed text-muted-foreground hover:bg-transparent",
                )}
              >
                <span className={cn("min-w-0 flex-1 truncate pr-1", soleVisibleLock && "text-muted-foreground")}>
                  {labels[col]}
                </span>
                <span className={floatingColumnPickerCheckBoxClass} aria-hidden>
                  {isChecked ? (
                    <Check
                      className={cn(
                        floatingColumnPickerCheckClass,
                        soleVisibleLock && "text-cyan-600/35 dark:text-cyan-400/35",
                      )}
                      strokeWidth={2.25}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </FloatingMenuPortal>
    </div>
  );
}
