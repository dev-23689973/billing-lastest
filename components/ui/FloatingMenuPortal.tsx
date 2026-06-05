"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { hudBrightDropdownShellClass } from "@/components/admin/managers-toolbar-icon-button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { floatingRowActionMenuPanelClass } from "@/lib/ui/floatingActionMenu";

const GUTTER = 6;
const VIEW_MARGIN = 8;
const DEFAULT_MENU_WIDTH = 180;

/** Cyan-tint row hover for menu items (destructive rows use `text-destructive` + rose hover below). */
const floatingMenuRowHoverClass = cn(
  "[&_[role=menuitem]:not(:disabled):not(.text-destructive)]:rounded-none [&_[role=menuitem]:not(:disabled):not(.text-destructive)]:transition-colors [&_[role=menuitem]:not(:disabled):not(.text-destructive)]:duration-150",
  "[&_[role=menuitem]:not(:disabled):not(.text-destructive):hover]:bg-cyan-500/[0.16] dark:[&_[role=menuitem]:not(:disabled):not(.text-destructive):hover]:bg-cyan-400/[0.14]",
  "[&_[role=menuitem]:not(:disabled):not(.text-destructive):hover]:text-foreground",
  "[&_[role=menuitem]:not(:disabled):not(.text-destructive):focus-visible]:outline-none [&_[role=menuitem]:not(:disabled):not(.text-destructive):focus-visible]:ring-1 [&_[role=menuitem]:not(:disabled):not(.text-destructive):focus-visible]:ring-cyan-400/30 dark:[&_[role=menuitem]:not(:disabled):not(.text-destructive):focus-visible]:ring-cyan-300/25",
  "[&_[role=menuitem].text-destructive:hover]:bg-rose-500/14 [&_[role=menuitem].text-destructive:hover]:text-destructive dark:[&_[role=menuitem].text-destructive:hover]:bg-rose-500/18",
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  /** Panel layout (default: responsive row-action width from `floatingRowActionMenuPanelClass`). */
  menuClassName?: string;
  /** Same L-bracket corners as managers toolbar selects (`SelectContent` `hudCorners`). */
  hudCorners?: boolean;
  /**
   * Horizontal placement vs anchor rect.
   * `end`: menu’s right edge aligns with anchor’s right (default, row “⋯” menus).
   * `start`: menu’s left edge aligns with anchor’s left (e.g. bulk actions at the toolbar start).
   */
  align?: "start" | "end";
  /** Pin menu width to the anchor element width (e.g. Bulk Actions trigger). */
  matchAnchorWidth?: boolean;
  /**
   * When set with `matchAnchorWidth`, width becomes `max(anchor width, menu max-content width)` and
   * the anchor element gets the same inline width so the trigger and menu stay aligned.
   */
  matchAnchorToContentMaxWidth?: boolean;
  /**
   * When `matchAnchorWidth` is true (without `matchAnchorToContentMaxWidth`), use at least this width (px).
   */
  matchAnchorWidthMinPx?: number;
  /** Stacking above modals (e.g. transactions overlay at z-320). */
  zIndex?: number;
};

/**
 * Renders a fixed-position menu in `document.body` so it is not clipped by
 * table/card `overflow-*` ancestors or covered by nearby footers.
 */
export function FloatingMenuPortal({
  open,
  onOpenChange,
  anchorRef,
  menuClassName = floatingRowActionMenuPanelClass,
  children,
  hudCorners = false,
  align = "end",
  matchAnchorWidth = false,
  matchAnchorToContentMaxWidth = false,
  matchAnchorWidthMinPx,
  zIndex = 300,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [positionReady, setPositionReady] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; maxHeight: number; widthPx?: number }>({
    top: 0,
    left: 0,
    maxHeight: 360,
  });

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const menu = menuRef.current;
    const menuBox = menu?.getBoundingClientRect();
    const anchorW = Math.max(1, r.width);
    const measuredMenuW = menuBox?.width || DEFAULT_MENU_WIDTH;
    const minAnchorW =
      matchAnchorWidthMinPx != null && Number.isFinite(matchAnchorWidthMinPx) && matchAnchorWidthMinPx > 0
        ? matchAnchorWidthMinPx
        : undefined;

    let menuW: number;
    if (!matchAnchorWidth) {
      menuW = measuredMenuW;
    } else if (matchAnchorWidth && matchAnchorToContentMaxWidth && menu) {
      const prevInlineW = menu.style.width;
      menu.style.width = "max-content";
      const intrinsic = Math.ceil(menu.getBoundingClientRect().width);
      if (prevInlineW) menu.style.width = prevInlineW;
      else menu.style.removeProperty("width");
      menuW = Math.max(anchorW, intrinsic, minAnchorW ?? 0);
      if (anchorRef.current) {
        anchorRef.current.style.boxSizing = "border-box";
        anchorRef.current.style.width = `${menuW}px`;
      }
    } else {
      menuW = minAnchorW != null ? Math.max(anchorW, minAnchorW) : anchorW;
    }
    const menuH = menu?.scrollHeight || menuBox?.height || 320;
    let left = align === "start" ? r.left : r.right - menuW;
    left = Math.max(VIEW_MARGIN, Math.min(left, window.innerWidth - menuW - VIEW_MARGIN));
    const topBelow = r.bottom + GUTTER;
    const spaceBelow = window.innerHeight - topBelow - VIEW_MARGIN;
    const spaceAbove = r.top - GUTTER - VIEW_MARGIN;
    let openUp = false;
    if (menuH <= spaceBelow) {
      openUp = false;
    } else if (menuH <= spaceAbove) {
      openUp = true;
    } else {
      openUp = spaceAbove > spaceBelow;
    }
    const maxHeight = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const top = openUp
      ? Math.max(VIEW_MARGIN, r.top - GUTTER - Math.min(menuH, maxHeight))
      : topBelow;
    setBox({
      top,
      left,
      maxHeight,
      widthPx: matchAnchorWidth ? menuW : undefined,
    });
    setPositionReady(true);
  }, [anchorRef, align, matchAnchorWidth, matchAnchorToContentMaxWidth, matchAnchorWidthMinPx]);

  useEffect(() => {
    if (open) return;
    if (!matchAnchorToContentMaxWidth) return;
    const a = anchorRef.current;
    if (!a) return;
    a.style.removeProperty("width");
    a.style.removeProperty("box-sizing");
  }, [open, matchAnchorToContentMaxWidth, anchorRef]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPositionReady(false);
      return;
    }
    reposition();
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onResize() {
      reposition();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      reposition();
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (shellRef.current?.contains(t)) return;
      onOpenChange(false);
    }
    // Bubble phase so menu item pointerdown runs before we close (capture would block clicks).
    document.addEventListener("pointerdown", onPointerDown, false);
    return () => document.removeEventListener("pointerdown", onPointerDown, false);
  }, [open, onOpenChange, anchorRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={shellRef}
      role="menu"
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        maxHeight: box.maxHeight,
        zIndex,
        visibility: positionReady ? "visible" : "hidden",
        ...(box.widthPx != null ? { width: box.widthPx } : {}),
      }}
    >
      <div
        ref={menuRef}
        className={cn(
          "box-border flex max-h-[inherit] flex-col overflow-hidden py-0.5 text-xs sm:py-1 sm:text-sm",
          !hudCorners && hudBrightDropdownShellClass,
          floatingMenuRowHoverClass,
          menuClassName,
        )}
      >
        <HudCornerOverlay tone={hudCorners ? "default" : "bright"} />
        <div className="relative z-[1] min-h-0 flex-1 overflow-x-hidden overflow-y-auto thin-scrollbar">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
