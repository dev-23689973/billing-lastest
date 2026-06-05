"use client";

import { useRouter } from "next/navigation";
import { FormSelect, type FormSelectOption } from "@/components/forms/form-select";
import { cn } from "@/lib/cn";
import {
  managersToolbarDropdownPanelClass,
  managersToolbarSelectItemClass,
  managersToolbarSelectTriggerClass,
} from "@/components/admin/managers-toolbar-icon-button";

type Props = {
  value: string;
  options: FormSelectOption[];
  hrefByValue: Record<string, string>;
  /** Overrides trigger width (e.g. full-width cells in embedded users toolbar). */
  triggerClassName?: string;
};

export function AdminUsersStatusControl({ value, options, hrefByValue, triggerClassName }: Props) {
  const router = useRouter();

  return (
    <FormSelect
      name="status"
      defaultValue={value}
      options={options}
      placeholder="All status"
      className={cn(
        managersToolbarSelectTriggerClass,
        "!w-max min-w-[7.5rem] sm:min-w-[8rem]",
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
