"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAdminNavShellItems, isAdminNavActive, type AdminNavShellItem } from "@/lib/admin-nav-shell";
import type { PortalBase, PortalNavItem } from "@/lib/portal-nav";
import { getPortalNavItems, isPortalNavActive } from "@/lib/portal-nav";
import { GlobalAnnouncementMobileNavItem } from "@/components/messages/GlobalAnnouncementMobileNavItem";
import { useGlobalAnnouncement } from "@/components/messages/global-announcement-context";
import { FloatingMenuPortal } from "@/components/ui/FloatingMenuPortal";
import {
  mobileNavBarCornerTopLeftClass,
  mobileNavBarCornerTopRightClass,
  mobileNavBarRowClass,
  mobileNavBarShellClass,
  mobileNavIconClass,
  mobileNavInnerClass,
  mobileNavLabelClassActive,
  mobileNavMoreMenuIconClass,
  mobileNavMoreMenuItemClassActive,
  mobileNavMoreMenuPanelClass,
  mobileNavMoreSlotClass,
  mobileNavShortLabel,
  mobileNavSlotClass,
  mobileNavVisibleItemCount,
  splitMobileNavItems,
} from "@/components/layout/mobileNavTab";

type NavItem = AdminNavShellItem | PortalNavItem;

function navItemKey(item: NavItem, portalBase?: PortalBase): string {
  if (portalBase) {
    const href = (item as PortalNavItem).href;
    if (href.includes("check-mac")) return "check-mac";
    if (href.includes("tickets")) return "tickets";
    if (href.includes("message")) return "message";
    if (href.includes("transactions")) return "transactions";
    if (href.includes("dealers")) return "dealers";
    if (href.includes("resellers")) return "resellers";
    if (href.includes("users")) return "users";
    return href.replace(portalBase, "").replace(/^\//, "") || "dashboard";
  }
  return (item as AdminNavShellItem).key;
}

function isNavItemActive(pathname: string, item: NavItem, portalBase?: PortalBase): boolean {
  return portalBase
    ? isPortalNavActive(pathname, item as PortalNavItem)
    : isAdminNavActive(pathname, item as AdminNavShellItem);
}

function MobileNavTabContent({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const short = mobileNavShortLabel(label);
  return (
    <span className={mobileNavInnerClass(active)}>
      <Icon className={mobileNavIconClass} strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className={mobileNavLabelClassActive(active)} title={short !== label ? label : undefined}>
        {short}
      </span>
    </span>
  );
}

function MobileNavLink({
  item,
  portalBase,
  pathname,
}: {
  item: NavItem;
  portalBase?: PortalBase;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = isNavItemActive(pathname, item, portalBase);
  return (
    <Link href={item.href} className={mobileNavSlotClass}>
      <MobileNavTabContent label={item.label} icon={Icon} active={active} />
    </Link>
  );
}

export function AdminMobileNav({ portalBase }: { portalBase?: PortalBase }) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const { hasAnnouncement } = useGlobalAnnouncement();

  const all = useMemo(
    () => (portalBase ? getPortalNavItems(portalBase) : getAdminNavShellItems()),
    [portalBase],
  );

  const extraSlots = hasAnnouncement ? 1 : 0;
  const itemKey = useMemo(() => (item: NavItem) => navItemKey(item, portalBase), [portalBase]);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      setVisibleCount(mobileNavVisibleItemCount(el.clientWidth, all.length, extraSlots));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [all.length, extraSlots]);

  const maxBarItems = visibleCount ?? all.length;
  const { bar: barItems, overflow: overflowItems } = useMemo(
    () => splitMobileNavItems(all, maxBarItems, itemKey),
    [all, maxBarItems, itemKey],
  );
  const showMore = overflowItems.length > 0;
  const moreRouteActive = overflowItems.some((item) => isNavItemActive(pathname, item, portalBase));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!showMore) setMoreOpen(false);
  }, [showMore]);

  return (
    <nav ref={navRef} className={mobileNavBarShellClass} aria-label="Mobile navigation">
      <span className={mobileNavBarCornerTopLeftClass} aria-hidden />
      <span className={mobileNavBarCornerTopRightClass} aria-hidden />
      <div className={mobileNavBarRowClass}>
        <GlobalAnnouncementMobileNavItem />
        {barItems.map((item) => (
          <MobileNavLink
            key={navItemKey(item, portalBase)}
            item={item}
            portalBase={portalBase}
            pathname={pathname}
          />
        ))}

        {showMore ? (
          <div className={cn(mobileNavMoreSlotClass, moreOpen && "bg-background/90 dark:bg-[hsl(222_47%_5%/0.98)]")}>
            <button
              ref={moreTriggerRef}
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-controls="admin-mobile-nav-more"
              id="admin-mobile-nav-more-trigger"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex h-full w-full cursor-pointer touch-manipulation flex-col items-center justify-center"
            >
              <MobileNavTabContent
                label="More"
                icon={MoreHorizontal}
                active={moreOpen || moreRouteActive}
              />
            </button>
            <FloatingMenuPortal
              open={moreOpen}
              onOpenChange={setMoreOpen}
              anchorRef={moreTriggerRef}
              align="end"
              hudCorners
              zIndex={400}
              menuClassName={mobileNavMoreMenuPanelClass}
            >
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item, portalBase);
                return (
                  <Link
                    key={navItemKey(item, portalBase)}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={mobileNavMoreMenuItemClassActive(active)}
                  >
                    <Icon className={mobileNavMoreMenuIconClass} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </FloatingMenuPortal>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
