"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Visible string (may animate during count-up). */
  text: string;
  /**
   * String used to pick font size (usually the final formatted value).
   * Defaults to `text` so width fits the worst case shown.
   */
  fitText?: string;
  maxPx?: number;
  minPx?: number;
  className?: string;
};

/**
 * Shrinks monospace tabular numerals until they fit the container width.
 */
export function FitTabularText({ text, fitText, maxPx = 40, minPx = 11, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(maxPx);
  const sizingKey = fitText ?? text;

  const fit = useCallback(() => {
    const box = containerRef.current;
    const probe = probeRef.current;
    if (!box || !probe) return;

    const available = box.clientWidth;
    if (available <= 0) return;

    const cap = box.clientWidth >= 200 ? maxPx : Math.min(maxPx, 34);
    probe.textContent = sizingKey;

    let lo = minPx;
    let hi = cap;
    let best = minPx;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      probe.style.fontSize = `${mid}px`;
      if (probe.scrollWidth <= available) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    setFontPx(best);
  }, [sizingKey, maxPx, minPx]);

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  useLayoutEffect(() => {
    const box = containerRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <div ref={containerRef} className="relative z-[1] w-full min-w-0 max-w-full">
      <span
        ref={probeRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 -z-10 whitespace-nowrap opacity-0",
          "font-mono font-bold tabular-nums tracking-tight",
          className,
        )}
      />
      <p
        className={cn("w-full whitespace-nowrap text-center font-mono font-bold tabular-nums tracking-tight", className)}
        style={{ fontSize: fontPx, lineHeight: 1.1 }}
      >
        {text}
      </p>
    </div>
  );
}
