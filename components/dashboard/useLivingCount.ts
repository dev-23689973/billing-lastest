"use client";

import { useEffect, useRef, useState } from "react";

/** After the first Recharts entrance in this tab, skip draw-in on later pages. */
let rechartsEntranceDone = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOut(p: number): number {
  return 1 - (1 - p) ** 2.4;
}

function animateValue(opts: {
  from: number;
  to: number;
  durationMs: number;
  round?: boolean;
  onUpdate: (v: number) => void;
}): () => void {
  const { from, to, durationMs, round, onUpdate } = opts;
  if (from === to) {
    onUpdate(to);
    return () => {};
  }
  let raf = 0;
  const start = performance.now();
  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / durationMs);
    const next = from + easeOut(p) * (to - from);
    onUpdate(round ? Math.round(next) : next);
    if (p < 1) raf = requestAnimationFrame(tick);
    else onUpdate(to);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? prefersReducedMotion() : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}

/** Eased float; starts at target on mount — only tweens when target changes (no 0-reset on navigation). */
export function useLivingSmooth(target: number, durationMs = 1100) {
  const [v, setV] = useState(target);
  const valueRef = useRef(target);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      valueRef.current = target;
      setV(target);
      return;
    }

    const from = valueRef.current;
    if (Math.abs(from - target) < 1e-9) {
      setV(target);
      valueRef.current = target;
      return;
    }

    const cleanup = animateValue({
      from,
      to: target,
      durationMs,
      onUpdate: (next) => {
        valueRef.current = next;
        setV(next);
      },
    });

    return () => {
      cleanup();
      valueRef.current = target;
    };
  }, [target, durationMs, reducedMotion]);

  return v;
}

/** Eased count-up; same navigation-safe behavior as {@link useLivingSmooth}. */
export function useLivingCount(target: number, durationMs = 1000) {
  const [n, setN] = useState(target);
  const valueRef = useRef(target);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      valueRef.current = target;
      setN(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    const cleanup = animateValue({
      from,
      to: target,
      durationMs,
      round: true,
      onUpdate: (next) => {
        valueRef.current = next;
        setN(next);
      },
    });

    return () => {
      cleanup();
      valueRef.current = target;
    };
  }, [target, durationMs, reducedMotion]);

  return n;
}

/** Recharts area draw-in once per tab; later route changes show data immediately. */
export function useRechartsEntranceMotion(defaultDuration = 900) {
  const reduceMotion = useReducedMotion();
  const skipEntrance = reduceMotion || rechartsEntranceDone;

  useEffect(() => {
    if (reduceMotion || rechartsEntranceDone) return;
    const id = window.setTimeout(() => {
      rechartsEntranceDone = true;
    }, defaultDuration + 80);
    return () => window.clearTimeout(id);
  }, [reduceMotion, defaultDuration]);

  return {
    isAnimationActive: !skipEntrance,
    animationDuration: skipEntrance ? 0 : defaultDuration,
    animationEasing: "ease-out" as const,
  };
}
