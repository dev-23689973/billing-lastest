"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  managersToolbarModalBackdropClass,
  managersToolbarModalShellClass,
} from "@/components/admin/managers-toolbar-icon-button";
import { Button, type ButtonProps } from "@/components/ui/button";
import { HudCornerOverlay } from "@/components/ui/HudCornerOverlay";
import { cn } from "@/lib/cn";

type ServerAction = (formData: FormData) => void | Promise<void>;

const PANEL_W = 288;
const GAP = 10;
const VIEW_M = 10;

type Props = {
  action: ServerAction;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Horizontal alignment of the panel relative to the trigger (anchor placement only). */
  align?: "left" | "right";
  className?: string;
  /** Confirm button tone (e.g. primary for “Activate”, destructive for deletes). */
  confirmVariant?: ButtonProps["variant"];
  /** Notified when the confirm panel opens or closes (e.g. close a parent ⋮ menu on open). */
  onPanelOpenChange?: (open: boolean) => void;
  /** When true, the panel starts open (e.g. form rendered outside a menu after picking “Delete”). */
  defaultOpen?: boolean;
  /** Use this element’s screen rect for panel placement instead of the trigger wrapper. */
  positionSourceRef?: RefObject<HTMLElement | null>;
  /**
   * `center` — viewport-centered modal (default when `defaultOpen` is true).
   * `anchor` — popover above the trigger.
   */
  placement?: "anchor" | "center";
  /** Optional visual style variant for the confirm panel. */
  panelStyle?: "default" | "smooth";
  children: React.ReactNode;
  trigger: (onOpen: () => void) => React.ReactNode;
};

/**
 * Confirm destructive / sensitive server actions without `window.confirm`.
 * Portaled with backdrop; detached deletes open centered, inline triggers can anchor to the control.
 */
export function InlineConfirmAction({
  action,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  align = "right",
  className,
  confirmVariant = "destructive",
  onPanelOpenChange,
  defaultOpen = false,
  positionSourceRef,
  placement,
  panelStyle = "default",
  children,
  trigger,
}: Props) {
  const centered = placement === "center" || (placement !== "anchor" && defaultOpen);
  const formId = useId().replace(/:/g, "");
  const formRef = useRef<HTMLFormElement>(null);
  const submitHelperRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const onPanelOpenChangeRef = useRef(onPanelOpenChange);
  onPanelOpenChangeRef.current = onPanelOpenChange;
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(!!defaultOpen);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const openPanel = useCallback(() => {
    setOpen(true);
    onPanelOpenChangeRef.current?.(true);
  }, []);
  const closePanel = useCallback(() => {
    setOpen(false);
    onPanelOpenChangeRef.current?.(false);
  }, []);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    if (centered) return;
    const el = positionSourceRef?.current ?? anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left =
      align === "right"
        ? Math.min(Math.max(VIEW_M, r.right - PANEL_W), window.innerWidth - PANEL_W - VIEW_M)
        : Math.min(Math.max(VIEW_M, r.left), window.innerWidth - PANEL_W - VIEW_M);
    setPos({ left, top: r.top - GAP });
  }, [align, centered, positionSourceRef]);

  useLayoutEffect(() => {
    if (!open || !mounted || centered) return;
    reposition();
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
  }, [open, mounted, reposition, centered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey, true);
    if (!centered) window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (!centered) window.removeEventListener("resize", reposition);
    };
  }, [open, reposition, closePanel, centered]);

  function submitConfirm() {
    const form = formRef.current;
    const sub = submitHelperRef.current;
    if (form) form.requestSubmit();
    else if (sub) sub.click();
  }

  const panelBody = (
    <>
      <p
        id={`${formId}-title`}
        className={cn(
          "text-sm font-semibold tracking-tight text-foreground",
          centered ? "text-base" : panelStyle === "smooth" ? "tracking-tight" : "",
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed text-muted-foreground",
          !centered && panelStyle === "smooth" ? "mt-1.5 text-xs text-[12px]" : "",
          !centered && panelStyle !== "smooth" ? "mt-1.5 text-xs" : "",
        )}
      >
        {description}
      </p>
      <div
        className={cn(
          "mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          centered || panelStyle === "smooth" ? "mt-6 gap-2.5 border-t border-cyan-600/15 pt-4 dark:border-t-cyan-400/10" : "",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            centered
              ? "border-cyan-600/22 bg-background/60 backdrop-blur-sm hover:bg-muted/40 dark:border-cyan-400/14"
              : panelStyle === "smooth"
                ? "border-border/60 bg-background/60 hover:bg-muted/50"
                : "",
          )}
          onClick={() => closePanel()}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={confirmVariant}
          className={cn(panelStyle === "smooth" || centered ? "shadow-sm" : "")}
          onClick={submitConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </>
  );

  const overlay =
    mounted && open
      ? createPortal(
          centered ? (
            <div
              className="fixed inset-0 z-[380] flex items-center justify-center p-4"
              role="presentation"
              onClick={() => closePanel()}
            >
              <div className={cn("absolute inset-0", managersToolbarModalBackdropClass)} aria-hidden />
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={`${formId}-title`}
                className={cn(
                  "relative z-10 w-full max-w-sm overflow-hidden shadow-xl",
                  managersToolbarModalShellClass,
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <HudCornerOverlay tone="bright" />
                <div className="relative z-[1] p-5 sm:p-6">{panelBody}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="fixed inset-0 z-[380] bg-black/45 sm:bg-black/35" aria-hidden onClick={() => closePanel()} />
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={`${formId}-title`}
                className={cn(
                  "fixed z-[390] w-[min(300px,calc(100vw-20px))] rounded-xl p-4",
                  panelStyle === "smooth"
                    ? "border border-border/60 bg-transparent shadow-2xl ring-1 ring-black/[0.06] backdrop-blur-sm dark:ring-white/[0.08]"
                    : "border border-border bg-card shadow-xl ring-1 ring-black/5 dark:ring-white/10",
                )}
                style={{
                  left: pos.left,
                  top: pos.top,
                  transform: "translateY(-100%)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {panelBody}
              </div>
            </>
          ),
          document.body,
        )
      : null;

  const anchorFullWidth = (className ?? "").includes("w-full");

  return (
    <>
      <div className={cn("inline-block", className)}>
        <form ref={formRef} id={formId} action={action}>
          {children}
          <button
            ref={submitHelperRef}
            type="submit"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute h-px w-px overflow-hidden border-0 p-0 opacity-0"
          />
          <div ref={anchorRef} className={cn(anchorFullWidth ? "block w-full" : "inline-block")}>
            {trigger(openPanel)}
          </div>
        </form>
      </div>
      {overlay}
    </>
  );
}
