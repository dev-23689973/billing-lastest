/**
 * Staff hierarchy share — compact ribbon labels (no WebGL).
 * 2×2 grid beside the radial chart; stacks to one column on very narrow viewports.
 */

"use client";

import type { LucideIcon } from "lucide-react";
import { BadgePercent, Layers3, Store, Users } from "lucide-react";
import Link from "next/link";

import { hudElevationSoft, hudElevationSoftHover } from "@/components/dashboard/hud/hudDashboardLayout";
import { cn } from "@/lib/cn";
import type { StaffHubFilterHrefs, StaffRoleFilter } from "@/lib/adminStaffHubFilters";

export type StaffHierarchyRibbonsProps = {
  totalStaff: number;
  managers: number;
  resellers: number;
  dealers: number;
  filterHrefs?: StaffHubFilterHrefs;
  activeType?: StaffRoleFilter;
  className?: string;
  hideManagers?: boolean;
  hideResellers?: boolean;
};

const ROLE_COLORS = {
  managers: { fill: "#7c3aed" },
  resellers: { fill: "#06b6d4" },
  dealers: { fill: "#f43f5e" },
} as const;

/** Compact belt labels — full names stay in aria-label / title tooltips. */
const RIBBON_SHORT_TITLE = {
  managers: "MNGR",
  resellers: "RSLR",
  dealers: "DLR",
  total: "TOTL",
} as const;

function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function pctOf(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

function StaffRibbonLabel({
  title,
  primary,
  secondary,
  gradientFrom,
  gradientTo,
  tabColor,
  icon: Icon,
  tailPx = 9,
  href,
  isActive,
  tooltip,
}: {
  title: string;
  primary: string;
  secondary?: string;
  gradientFrom: string;
  gradientTo: string;
  tabColor: string;
  icon: LucideIcon;
  tailPx?: number;
  href?: string;
  isActive?: boolean;
  /** Full label for hover / screen readers when `title` is abbreviated. */
  tooltip?: string;
}) {
  const clipPath = `polygon(0 0, calc(100% - ${tailPx}px) 0, 100% 50%, calc(100% - ${tailPx}px) 100%, 0 100%)`;

  const inner = (
    <div className="flex h-full w-full min-w-0 flex-row items-stretch">
      <div
        className="w-0.5 shrink-0 self-stretch rounded-l-sm shadow-[inset_-1px_0_3px_rgba(0,0,0,0.18)] sm:w-1"
        style={{ backgroundColor: tabColor }}
        aria-hidden
      />
      <div
        className="relative flex min-h-[30px] min-w-0 flex-1 items-center gap-1.5 overflow-visible py-0.5 pl-1.5 pr-3 text-white shadow-[0_2px_8px_rgb(15_23_42/0.14),0_1px_3px_rgb(15_23_42/0.1),inset_0_1px_0_rgba(255,255,255,0.22)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.2)] sm:min-h-[35px] sm:gap-2 sm:pl-2 sm:pr-4 xl:min-h-[35px]"
        style={{
          backgroundImage: `linear-gradient(96deg, ${gradientFrom} 0%, ${gradientTo} 92%)`,
          clipPath,
        }}
      >
        <div className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-0.5 leading-snug">
          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.06em] text-white/95 drop-shadow-sm sm:text-[11px]">
            {title} ·
          </span>
          <span className="min-w-0 truncate font-mono text-[12px] font-bold tabular-nums tracking-tight drop-shadow-sm sm:text-[14px]">
            {primary}
            {secondary ? (
              <span className="hidden font-semibold text-white/85 sm:inline sm:text-[14px]"> {secondary}</span>
            ) : null}
          </span>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-white/95 drop-shadow sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2.1} aria-hidden />
      </div>
    </div>
  );

  const shellClass = cn(
    "block h-full w-full min-w-0 overflow-hidden rounded-md outline-none",
    hudElevationSoft,
    hudElevationSoftHover,
    "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
  );

  const tip = tooltip ?? title;
  const ariaLabel =
    secondary != null && secondary !== ""
      ? `${tip}: ${primary} ${secondary}`
      : `${tip}: ${primary}`;

  if (!href) {
    return (
      <div className={shellClass} title={tip} aria-label={ariaLabel}>
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={shellClass}
      title={tip}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}

export function StaffHierarchyRibbons({
  totalStaff,
  managers,
  resellers,
  dealers,
  filterHrefs,
  activeType,
  className,
  hideManagers = false,
  hideResellers = false,
}: StaffHierarchyRibbonsProps) {
  const mPct = Math.round(pctOf(managers, totalStaff));
  const rPct = Math.round(pctOf(resellers, totalStaff));
  const dPct = Math.round(pctOf(dealers, totalStaff));
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}
      role="img"
      aria-label={`Total staff ${formatInt(totalStaff)}; managers ${formatInt(managers)} (${mPct}%), resellers ${formatInt(resellers)} (${rPct}%), dealers ${formatInt(dealers)} (${dPct}%)`}
    >
      <div className="grid w-full min-w-0 grid-cols-2 items-stretch gap-1 overflow-visible sm:gap-1.5">
          {hideManagers ? null : (
          <StaffRibbonLabel
            title={RIBBON_SHORT_TITLE.managers}
            tooltip="Managers"
            primary={`${mPct}%`}
            secondary={`(${formatInt(managers)})`}
            gradientFrom="#c4b5fd"
            gradientTo="#5b21b6"
            tabColor={ROLE_COLORS.managers.fill}
            icon={Users}
            href={filterHrefs?.manager}
            isActive={activeType === "manager"}
          />
          )}
          {hideResellers ? null : (
          <StaffRibbonLabel
            title={RIBBON_SHORT_TITLE.resellers}
            tooltip="Resellers"
            primary={`${rPct}%`}
            secondary={`(${formatInt(resellers)})`}
            gradientFrom="#67e8f9"
            gradientTo="#0e7490"
            tabColor={ROLE_COLORS.resellers.fill}
            icon={Store}
            href={filterHrefs?.reseller}
            isActive={activeType === "reseller"}
          />
          )}
          <StaffRibbonLabel
            title={RIBBON_SHORT_TITLE.dealers}
            tooltip="Dealers"
            primary={`${dPct}%`}
            secondary={`(${formatInt(dealers)})`}
            gradientFrom="#fda4af"
            gradientTo="#9f1239"
            tabColor={ROLE_COLORS.dealers.fill}
            icon={BadgePercent}
            href={filterHrefs?.dealer}
            isActive={activeType === "dealer"}
          />
          <StaffRibbonLabel
            title={RIBBON_SHORT_TITLE.total}
            tooltip="Total staff"
            primary={formatInt(totalStaff)}
            gradientFrom="#fde68a"
            gradientTo="#b45309"
            tabColor="#f59e0b"
            icon={Layers3}
            tailPx={8}
            href={filterHrefs?.all}
            isActive={!activeType}
          />
      </div>
    </div>
  );
}
