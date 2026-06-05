"use client";

import { StaffActiveStatusGauges3D } from "@/components/admin/StaffActiveStatusGauges3D";
import { StaffRadialBarChart3D } from "@/components/admin/StaffRadialBarChart3D";
import { StaffHierarchyRibbons } from "@/components/admin/StaffHierarchyRibbons";
import type { StaffHubFilterHrefs, StaffRoleFilter } from "@/lib/adminStaffHubFilters";

/** Below 1666px: stack chart+ribbons (row 1) and role gauges (row 2) to avoid page horizontal scroll. */
const staffHubHudPanelClass = "relative overflow-y-visible bg-transparent";

export type StaffHubKpiCollapsibleProps = {
  totalStaff: number;
  managerTotal: number;
  resellerTotal: number;
  dealerTotal: number;
  managerActive: number;
  managerInactive: number;
  resellerActive: number;
  resellerInactive: number;
  dealerActive: number;
  dealerInactive: number;
  filterHrefs: StaffHubFilterHrefs;
  activeType?: StaffRoleFilter;
  /** Manager portal: hide manager segment in KPI widgets. */
  hideManagers?: boolean;
  /** Reseller portal: hide reseller segment in KPI widgets. */
  hideResellers?: boolean;
};

export function StaffHubKpiCollapsible({
  totalStaff,
  managerTotal,
  resellerTotal,
  dealerTotal,
  managerActive,
  managerInactive,
  resellerActive,
  resellerInactive,
  dealerActive,
  dealerInactive,
  filterHrefs,
  activeType,
  hideManagers = false,
  hideResellers = false,
}: StaffHubKpiCollapsibleProps) {
  return (
    <div className="min-w-0 shrink-0">
      <div className={staffHubHudPanelClass}>
        <div className="relative flex w-full min-w-0 flex-col gap-y-2 overflow-y-visible min-[1666px]:flex-row min-[1666px]:flex-nowrap min-[1666px]:items-start min-[1666px]:justify-start min-[1666px]:gap-6">
          <div className="flex min-w-0 w-full items-center gap-2 overflow-x-auto overflow-y-visible sm:gap-2.5 min-[1666px]:overflow-x-visible">
            <StaffRadialBarChart3D
              className="shrink-0"
              totalStaff={totalStaff}
              managers={hideManagers ? 0 : managerTotal}
              resellers={hideResellers ? 0 : resellerTotal}
              dealers={dealerTotal}
              filterHrefs={filterHrefs}
              activeType={activeType}
              hideManagers={hideManagers}
              hideResellers={hideResellers}
            />
            <StaffHierarchyRibbons
              className="min-w-[9.5rem] flex-1 sm:min-w-[11rem]"
              totalStaff={totalStaff}
              managers={hideManagers ? 0 : managerTotal}
              resellers={hideResellers ? 0 : resellerTotal}
              dealers={dealerTotal}
              filterHrefs={filterHrefs}
              activeType={activeType}
              hideManagers={hideManagers}
              hideResellers={hideResellers}
            />
          </div>
          <div className="min-w-0 w-full min-[1666px]:min-w-[47.5rem] min-[1666px]:flex-1 min-[1666px]:basis-0">
            <StaffActiveStatusGauges3D
              className="@container/staff-gauges min-h-0 w-full min-w-0 sm:min-h-[4.25rem]"
              managerActive={managerActive}
              managerInactive={managerInactive}
              resellerActive={resellerActive}
              resellerInactive={resellerInactive}
              dealerActive={dealerActive}
              dealerInactive={dealerInactive}
              filterHrefs={filterHrefs}
              activeType={activeType}
              hideManagers={hideManagers}
              hideResellers={hideResellers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
