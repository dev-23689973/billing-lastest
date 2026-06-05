"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FormSelect, type FormSelectOption } from "@/components/forms/form-select";
import { cn } from "@/lib/cn";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";

type Props = {
  pageSize: string;
  options: FormSelectOption[];
  hrefByValue: Record<string, string>;
  triggerClassName?: string;
};

export function AdminUsersPerPageControl({ pageSize, options, hrefByValue, triggerClassName }: Props) {
  const router = useRouter();
  const showOptions = useMemo(
    () =>
      options.map((opt) => ({
        ...opt,
        label: opt.label.startsWith("View:")
          ? opt.label
          : opt.label.startsWith("Show:")
            ? opt.label.replace(/^Show:\s*/, "View: ")
            : `View: ${opt.label}`,
      })),
    [options],
  );
  const validValues = useMemo(() => new Set(showOptions.map((opt) => opt.value)), [showOptions]);
  const safePageSize = validValues.has(pageSize) ? pageSize : (showOptions[0]?.value ?? pageSize);

  return (
    <FormSelect
      id="admin-users-page-size"
      name="pageSize"
      value={safePageSize}
      options={showOptions}
      className={cn(
        managersToolbarSelectTriggerClass,
        "!w-max min-w-[6.25rem] shrink-0 sm:min-w-[6.5rem]",
        triggerClassName,
      )}
      contentClassName={managersToolbarDropdownPanelClass}
      contentHudCorners
      itemClassName={managersToolbarSelectItemClass}
      itemShowCheck={false}
      clampMenuToTrigger
      onValueChange={(next) => {
        const href = hrefByValue[next];
        if (href) router.push(href);
      }}
    />
  );
}
