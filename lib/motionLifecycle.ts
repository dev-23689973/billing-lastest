"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeTabVisible(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

function getTabVisible() {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

/** Document tab is in the foreground. */
export function useTabVisible() {
  return useSyncExternalStore(subscribeTabVisible, getTabVisible, () => true);
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

function isElementHidden(el: Element) {
  if (el.getClientRects().length === 0) return true;
  return window.getComputedStyle(el).display === "none";
}

/** True when the element is visible (not `display:none` / zero area) and intersecting the viewport. */
export function useElementVisible<T extends Element>(
  ref: RefObject<T | null>,
  options?: { disabled?: boolean },
): boolean {
  const disabled = options?.disabled ?? false;
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (disabled) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const commit = (next: boolean) => {
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };

    const measure = (): boolean => {
      if (isElementHidden(el)) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      );
    };

    const scheduleSync = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        commit(measure());
      });
    };

    commit(measure());

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (isElementHidden(el)) {
          commit(false);
          return;
        }
        commit(entry.isIntersecting && entry.intersectionRatio > 0);
      },
      { threshold: [0, 0.01, 0.05] },
    );
    io.observe(el);

    const ro = new ResizeObserver(scheduleSync);
    ro.observe(el);

    window.addEventListener("resize", scheduleSync, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", scheduleSync);
    };
  }, [disabled, ref]);

  return visible;
}

const noopRef = { current: null } as RefObject<Element | null>;

/**
 * Whether R3F/CSS motion should run: tab visible, reduced-motion off, optional element on-screen.
 */
export function useMotionActive(
  ref?: RefObject<Element | null>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const tabVisible = useTabVisible();
  const reduced = useReducedMotion();
  const elementVisible = useElementVisible(ref ?? noopRef, { disabled: !ref });
  return enabled && tabVisible && !reduced && elementVisible;
}

/** Pause decorative CSS animations when the tab is hidden. */
export function useMotionPaused() {
  return !useTabVisible();
}
