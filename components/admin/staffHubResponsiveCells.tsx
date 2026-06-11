"use client";

import { StaffHubDetailStatusToggle } from "@/components/admin/StaffHubDetailStatusToggle";
import { StaffTypeBadge, StaffTypeLetterBadge, type StaffRowType } from "@/components/admin/HierarchyTableBadges";
import { StaffRealtimeStateCell } from "@/components/admin/StaffRealtimeStateCell";

export function StaffHubStatusCell({
  rowType,
  username,
  value,
  inlineApiPath,
}: {
  rowType: StaffRowType;
  username: string;
  value: string;
  inlineApiPath?: string;
}) {
  return (
    <div className="flex w-full min-w-0 justify-center">
      <StaffHubDetailStatusToggle
        rowType={rowType}
        username={username}
        value={value}
        inlineApiPath={inlineApiPath}
      />
    </div>
  );
}

export function StaffHubStateCell({
  username,
  dbCurrentLogin,
  dbLastLogin,
  inDetailPanel = false,
}: {
  username: string;
  dbCurrentLogin?: string;
  dbLastLogin?: string;
  inDetailPanel?: boolean;
}) {
  if (inDetailPanel) {
    return (
      <StaffRealtimeStateCell
        username={username}
        dbCurrentLogin={dbCurrentLogin}
        dbLastLogin={dbLastLogin}
        compact
      />
    );
  }
  return (
    <>
      <div className="sm:hidden">
        <StaffRealtimeStateCell
          username={username}
          dbCurrentLogin={dbCurrentLogin}
          dbLastLogin={dbLastLogin}
          compact
        />
      </div>
      <div className="hidden sm:block">
        <StaffRealtimeStateCell
          username={username}
          dbCurrentLogin={dbCurrentLogin}
          dbLastLogin={dbLastLogin}
        />
      </div>
    </>
  );
}

export function StaffHubTypeCell({ rowType }: { rowType: StaffRowType }) {
  return (
    <>
      <span className="sm:hidden">
        <StaffTypeLetterBadge rowType={rowType} />
      </span>
      <span className="hidden sm:inline-flex">
        <StaffTypeBadge rowType={rowType} />
      </span>
    </>
  );
}
