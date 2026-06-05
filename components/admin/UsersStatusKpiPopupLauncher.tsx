"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { PieChart } from "lucide-react";

import { cn } from "@/lib/cn";
import { managersToolbarDropdownPanelClass } from "@/components/admin/managers-toolbar-icon-button";
import type { UsersStatusArcs3DProps } from "@/components/admin/UsersStatusArcs3D";

const UsersStatusArcs3D = dynamic(
  () => import("@/components/admin/UsersStatusArcs3D").then((m) => m.UsersStatusArcs3D),
  { ssr: false, loading: () => <div className="min-h-[8.5rem] w-full" aria-busy aria-label="Loading chart" /> },
);
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";

const SLOT_ID = "admin-users-kpi-slot";

type Props = UsersStatusArcs3DProps;

function useHeaderSlot() {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const resolve = () => document.getElementById(SLOT_ID);
    const el = resolve();
    if (el) {
      setNode(el);
      return;
    }
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const next = resolve();
      if (next) setNode(next);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  return node;
}

function UsersKpiPopdownPanel({
  open,
  anchorRef,
  panelId,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  panelId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 1100, maxH: 720 });
  const [contentReady, setContentReady] = useState(false);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const margin = 10;
    const maxW = Math.min(1100, Math.max(360, window.innerWidth - margin * 2));
    let left = r.left;
    if (left + maxW > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - margin - maxW);
    if (left < margin) left = margin;
    const bottomGap = 12;
    const maxH = Math.max(260, Math.min(860, window.innerHeight - r.bottom - bottomGap));
    setBox({ top: r.bottom + 6, left, width: maxW, maxH });
  }, [anchorRef, open]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setContentReady(true));
    return () => {
      cancelAnimationFrame(id);
      setContentReady(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="region"
      aria-label="User status overview"
      className={cn(
        "relative z-[100] flex min-h-0 flex-col overflow-hidden rounded-none text-foreground shadow-none ring-0",
        managersToolbarDropdownPanelClass,
        "bg-popover/[0.97] dark:bg-[hsl(222_47%_6%/0.92)]",
      )}
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        maxHeight: box.maxH,
      }}
    >
      <HudCornerOverlay tone="default" />
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="thin-scrollbar scrollbar-surface-light dark:scrollbar-surface-dark min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-2.5 [scrollbar-gutter:stable]">
          {contentReady ? children : <div className="min-h-[140px]" aria-busy="true" aria-label="Loading chart" />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UsersKpiHeaderInner({ ...kpi }: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const panelId = `${uid}-users-kpi-panel`;

  return (
    <div ref={anchorRef} className="ml-5 mb-[-3] relative flex min-w-0 items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border-0 bg-transparent py-0.5 pl-0.5 pr-1.5 outline-none ring-0 transition-colors",
          "hover:bg-cyan-500/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-400/35 dark:hover:bg-cyan-400/[0.08]",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        title="Open user status overview"
        aria-label="Open user status overview"
      >
        <span
          className={cn(
            "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 text-slate-100 outline-none ring-0",
            "bg-gradient-to-br from-cyan-600 via-teal-700 to-emerald-900",
            "shadow-[0_1px_2px_rgba(0,0,0,0.45),0_0_12px_rgba(34,211,238,0.2)]",
            "transition-[filter,box-shadow] duration-200 ease-out",
            "group-hover:brightness-[1.05]",
          )}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-transparent via-white/[0.06] to-white/[0.12]"
            aria-hidden
          />
          <PieChart className="relative z-[1] h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span
          className={cn(
            "min-w-0 max-w-[4.25rem] truncate text-left text-[9px] font-bold uppercase leading-none tracking-wide text-cyan-600 sm:max-w-[5.5rem] sm:text-[10px]",
            "drop-shadow-[0_0_10px_rgba(6,182,212,0.35)] dark:text-cyan-300 dark:drop-shadow-[0_0_12px_rgba(103,232,249,0.35)]",
          )}
        >
          Open
        </span>
      </button>

      <UsersKpiPopdownPanel
        open={open}
        anchorRef={anchorRef}
        panelId={panelId}
        onClose={() => setOpen(false)}
      >
        <UsersStatusArcs3D
          {...kpi}
          className="w-full min-w-0"
        />
      </UsersKpiPopdownPanel>
    </div>
  );
}

/** Portals the users KPI trigger into `#admin-users-kpi-slot` in `AdminAppHeader`; opens a non-modal popunder anchored to the button. */
export function UsersStatusKpiPopupLauncher(props: Props) {
  const slot = useHeaderSlot();

  if (!slot) return null;

  return createPortal(<UsersKpiHeaderInner {...props} />, slot);
}
