"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormSelect } from "@/components/forms/form-select";
import { cn } from "@/lib/cn";
import { clampAdminStaffListPageSize, isAdminStaffListPageSize } from "@/lib/adminStaffListPageSize";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarSearchInputClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";

const STAFF_SEARCH_DEBOUNCE_MS = 350;

/** Radix panel: same shell as image-2 selects; rows use faint horizontal dividers (no per-row boxes). */
const managersSelectPanelCn = managersToolbarDropdownPanelClass;
function buildManagersHref(
  listPath: string,
  sp: {
  q?: string;
  ps?: number;
  type?: string;
  status?: string;
  sort?: string;
  dir?: string;
  cols?: string;
  quick?: string;
  bq?: string;
  bs?: string;
  },
  allowedTypes: string[] = ["manager", "reseller", "dealer"],
) {
  const params = new URLSearchParams();
  const q = (sp.q ?? "").trim();
  if (q) params.set("q", q);
  if (sp.ps && isAdminStaffListPageSize(sp.ps)) params.set("ps", String(sp.ps));
  if (sp.type && allowedTypes.includes(sp.type)) params.set("type", sp.type);
  if (sp.status && ["active", "inactive"].includes(sp.status)) params.set("status", sp.status);
  if (sp.sort) params.set("sort", sp.sort);
  if (sp.dir) params.set("dir", sp.dir);
  if (sp.cols) params.set("cols", sp.cols);
  if (sp.quick === "1") params.set("quick", "1");
  const bq = (sp.bq ?? "").trim();
  if (bq) params.set("bq", bq);
  if (sp.bs && ["active", "inactive"].includes(sp.bs)) params.set("bs", sp.bs);
  const query = params.toString();
  return query ? `${listPath}?${query}` : listPath;
}

export function ManagersFiltersBar({
  listPath = "/admin/managers",
  allowedTypes = ["manager", "reseller", "dealer"],
  q,
  type,
  status,
  ps,
  sort,
  dir,
  cols,
  quick,
  bq,
  bs,
  toolbarActions,
}: {
  listPath?: string;
  allowedTypes?: string[];
  q?: string;
  type?: string;
  status?: string;
  ps: number;
  sort?: string;
  dir?: string;
  cols?: string;
  quick?: string;
  bq?: string;
  bs?: "active" | "inactive";
  /** Column settings, add staff, etc. — same row as filter selects. */
  toolbarActions?: ReactNode;
}) {
  const router = useRouter();
  const STATUS_ALL = "STATUS_ALL";
  const statusForSelect = status === "active" || status === "inactive" ? status : STATUS_ALL;
  const rowTypeFromUrl = (type ?? "").trim().toLowerCase();
  const typeForSelect = allowedTypes.includes(rowTypeFromUrl) ? rowTypeFromUrl : "";
  const [qInput, setQInput] = useState(q ?? "");
  const [typeValue, setTypeValue] = useState(typeForSelect);
  const [statusValue, setStatusValue] = useState(statusForSelect);
  const [pageSizeValue, setPageSizeValue] = useState(String(ps));
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingQRef = useRef<string | null>(null);

  useEffect(() => {
    const nextQ = q ?? "";
    const nextQTrimmed = nextQ.trim();
    const pendingTrimmed = pendingQRef.current;

    // If we navigated to the pending query, we can consider it settled.
    if (pendingTrimmed != null && nextQTrimmed === pendingTrimmed) {
      pendingQRef.current = null;
    }

    // While the user is typing and a debounced navigation is in-flight,
    // don't let URL prop sync clobber their input.
    const searchIsFocused =
      typeof document !== "undefined" && document.activeElement === searchInputRef.current;
    if (searchIsFocused && pendingQRef.current != null) {
      // Still allow other controls to sync.
    } else {
      setQInput(nextQ);
    }

    const nextType = (type ?? "").trim().toLowerCase();
    setTypeValue(nextType === "manager" || nextType === "reseller" || nextType === "dealer" ? nextType : "");
    setStatusValue(status === "active" || status === "inactive" ? status : STATUS_ALL);
    setPageSizeValue(String(ps));
  }, [q, type, status, ps]);

  const apply = useCallback(
    (next: { q?: string; type?: string; status?: string; ps?: number }) => {
      const parsedPageSize = Number.parseInt(pageSizeValue, 10);
      const href = buildManagersHref(
        listPath,
        {
          q: next.q ?? qInput,
          ps: next.ps ?? clampAdminStaffListPageSize(parsedPageSize, ps),
          type: (next.type ?? typeValue) || "",
          status:
            (next.status ?? statusValue) === STATUS_ALL || (next.status ?? statusValue) === ""
              ? ""
              : (next.status ?? statusValue),
          sort,
          dir,
          cols,
          quick,
          bq,
          bs,
        },
        allowedTypes,
      );
      router.replace(href, { scroll: false });
    },
    [
      allowedTypes,
      bq,
      bs,
      cols,
      dir,
      listPath,
      pageSizeValue,
      ps,
      qInput,
      quick,
      router,
      sort,
      statusValue,
      typeValue,
    ],
  );

  useEffect(() => {
    const trimmed = qInput.trim();
    const urlQ = (q ?? "").trim();
    if (trimmed === urlQ) return;

    pendingQRef.current = trimmed;
    const timer = window.setTimeout(() => {
      apply({
        q: trimmed,
        type: typeValue,
        status: statusValue,
        ps: Number.parseInt(pageSizeValue, 10) || ps,
      });
    }, STAFF_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [apply, pageSizeValue, ps, q, qInput, statusValue, typeValue]);

  const filterSelectTriggerClass = cn(
    managersToolbarSelectTriggerClass,
    "w-full min-w-0 max-w-full sm:!w-max",
  );
  const pageSizeSelectClass = cn(filterSelectTriggerClass, "sm:min-w-[6.5rem]");
  const statusSelectClass = cn(filterSelectTriggerClass, "sm:min-w-[6rem]");
  const typeSelectClass = cn(filterSelectTriggerClass, "sm:min-w-[6.25rem]");

  const submitFilters = () => {
    apply({ q: qInput, type: typeValue, status: statusValue, ps: Number.parseInt(pageSizeValue, 10) || ps });
  };

  return (
    <div
      role="search"
      className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5"
    >
      <label htmlFor="staff-mgr-search" className="sr-only">
        Search staff
      </label>
      {/* Mobile row 1 / desktop: search grows (capped) */}
      <div className="flex min-w-0 w-full items-center gap-2 sm:min-w-[14rem] sm:max-w-[30rem] sm:flex-1">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80 sm:left-2.5" aria-hidden />
          <input
            id="staff-mgr-search"
            name="q"
            ref={searchInputRef}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitFilters();
              }
            }}
            placeholder="Search name, username, status..."
            className={cn(managersToolbarSearchInputClass, "w-full")}
          />
        </div>
        {toolbarActions ? (
          <div className="flex shrink-0 items-center gap-2 sm:hidden">{toolbarActions}</div>
        ) : null}
      </div>
      {/* Mobile row 2 / desktop: filter selects */}
      <div
        className={cn(
          "grid min-w-0 w-full shrink-0 gap-2",
          allowedTypes.length > 0 ? "grid-cols-3" : "grid-cols-2",
          "sm:flex sm:w-auto sm:items-center sm:gap-2.5",
        )}
      >
        <div className="min-w-0">
          <FormSelect
            id="staff-page-size"
            name="ps"
            value={pageSizeValue}
            onValueChange={(next) => {
              setPageSizeValue(next);
              const parsed = Number.parseInt(next, 10);
              apply({ ps: clampAdminStaffListPageSize(parsed, ps), q: qInput, type: typeValue, status: statusValue });
            }}
            options={[
              { value: "25", label: "View 25" },
              { value: "50", label: "View 50" },
              { value: "100", label: "View 100" },
            ]}
            contentClassName={managersSelectPanelCn}
            contentHudCorners
            itemClassName={managersToolbarSelectItemClass}
            itemShowCheck={false}
            clampMenuToTrigger
            className={pageSizeSelectClass}
          />
        </div>
        <div className="min-w-0">
          <FormSelect
            id="staff-status-filter"
            name="status"
            value={statusValue}
            onValueChange={(next) => {
              setStatusValue(next);
              apply({ status: next, q: qInput, type: typeValue, ps: Number.parseInt(pageSizeValue, 10) || ps });
            }}
            options={[
              { value: STATUS_ALL, label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            contentClassName={managersSelectPanelCn}
            contentHudCorners
            itemClassName={managersToolbarSelectItemClass}
            itemShowCheck={false}
            clampMenuToTrigger
            placeholder="Status"
            className={statusSelectClass}
          />
        </div>
        {allowedTypes.length > 0 ? (
          <div className="min-w-0">
            <FormSelect
              id="staff-row-type-filter"
              name="type"
              value={typeValue}
              onValueChange={(next) => {
                setTypeValue(next);
                apply({ type: next, q: qInput, status: statusValue, ps: Number.parseInt(pageSizeValue, 10) || ps });
              }}
              options={[
                { value: "", label: "All types" },
                ...(allowedTypes.includes("manager") ? [{ value: "manager", label: "Manager" }] : []),
                ...(allowedTypes.includes("reseller") ? [{ value: "reseller", label: "Reseller" }] : []),
                ...(allowedTypes.includes("dealer") ? [{ value: "dealer", label: "Dealer" }] : []),
              ]}
              contentClassName={managersSelectPanelCn}
              contentHudCorners
              itemClassName={managersToolbarSelectItemClass}
              itemShowCheck={false}
              clampMenuToTrigger
              placeholder="Type"
              className={typeSelectClass}
            />
          </div>
        ) : null}
      </div>
      {toolbarActions ? (
        <div className="hidden shrink-0 items-center gap-2 sm:ml-auto sm:flex">{toolbarActions}</div>
      ) : null}
    </div>
  );
}
