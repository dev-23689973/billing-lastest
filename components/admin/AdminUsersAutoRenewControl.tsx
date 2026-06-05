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
  triggerClassName?: string;
};

export function AdminUsersAutoRenewControl({ value, options, hrefByValue, triggerClassName }: Props) {
  const router = useRouter();

  return (
    <FormSelect
      name="autoRenew"
      defaultValue={value}
      options={options}
      placeholder="Auto Renew"
      triggerTitle="Auto renew filter"
      className={cn(
        managersToolbarSelectTriggerClass,
        "!w-max min-w-[6.75rem] sm:min-w-[7.25rem]",
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
