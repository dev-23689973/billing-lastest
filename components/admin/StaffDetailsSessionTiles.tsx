import { staffDetailsStatTileClass } from "@/components/admin/managers-toolbar-icon-button";
import { cn } from "@/lib/cn";
import { formatStaffIpDisplay, formatStaffLoginTimeCompactDisplay } from "@/lib/staffDisplayFormat";

const valueClass =
  "mt-0.5 whitespace-normal break-words text-xs font-medium leading-snug text-foreground sm:text-sm";

/** Login time + IP grid for manager / reseller / dealer details modals. */
export function StaffDetailsSessionTiles({
  lastLoginTime,
  currentLoginTime,
  lastLoginIp,
  currentLoginIp,
}: {
  lastLoginTime: string;
  currentLoginTime: string;
  lastLoginIp: string;
  currentLoginIp: string;
}) {
  const lastLoginLabel = formatStaffLoginTimeCompactDisplay(lastLoginTime);
  const currentLoginLabel = formatStaffLoginTimeCompactDisplay(currentLoginTime);
  const lastIpLabel = formatStaffIpDisplay(lastLoginIp);
  const currentIpLabel = formatStaffIpDisplay(currentLoginIp);

  return (
    <div className="mb-3 grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-2">
      <div className={staffDetailsStatTileClass}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last login</p>
        <p className={valueClass} title={lastLoginLabel !== "—" ? lastLoginLabel : undefined}>
          {lastLoginLabel}
        </p>
      </div>
      <div className={staffDetailsStatTileClass}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current login</p>
        <p className={valueClass} title={currentLoginLabel !== "—" ? currentLoginLabel : undefined}>
          {currentLoginLabel}
        </p>
      </div>
      <div className={staffDetailsStatTileClass}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last login IP</p>
        <p className={cn(valueClass, "font-mono")} title={lastIpLabel !== "—" ? lastIpLabel : undefined}>
          {lastIpLabel}
        </p>
      </div>
      <div className={staffDetailsStatTileClass}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current login IP</p>
        <p className={cn(valueClass, "font-mono")} title={currentIpLabel !== "—" ? currentIpLabel : undefined}>
          {currentIpLabel}
        </p>
      </div>
    </div>
  );
}
