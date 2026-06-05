"use client";

import type { ReactNode } from "react";
import { ResponsiveDataTableExpandableRow } from "@/components/ui/ResponsiveDataTableExpandableRow";
import { embeddedTableTdClass } from "@/lib/ui/embeddedTableTypography";
import {
  subscribersFetchModalActionsColClass,
  subscribersFetchModalExpandTriggerClass,
} from "@/lib/ui/subscribersFetchModalResponsiveTable";
import { useSubscribersFetchModalTableContext } from "@/lib/ui/subscribersFetchModalTableContext";
import { cn } from "@/lib/cn";

type Props = {
  colSpan: number;
  details: ReactNode;
  children: ReactNode;
  expandPersistId?: string;
};

export function SubscribersFetchModalExpandableRow({
  colSpan,
  details,
  children,
  expandPersistId,
}: Props) {
  const { hasHiddenColumns } = useSubscribersFetchModalTableContext();

  return (
    <ResponsiveDataTableExpandableRow
      colSpan={colSpan}
      expandButtonClass={subscribersFetchModalExpandTriggerClass()}
      tdClassName={cn("text-center leading-none", embeddedTableTdClass(undefined, "tight"))}
      actionsColClass={subscribersFetchModalActionsColClass}
      actions={null}
      details={details}
      detailsEnabled={hasHiddenColumns}
      expandPersistId={expandPersistId}
      zebra={false}
      rowClassName="border-b border-border/35 transition-[background-color] duration-150 ease-out odd:bg-background/[0.06] hover:bg-muted/30"
    >
      {children}
    </ResponsiveDataTableExpandableRow>
  );
}
