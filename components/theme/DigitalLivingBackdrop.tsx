"use client";

import dynamic from "next/dynamic";
import { useTheme } from "@/contexts/ThemeContext";
import { type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { LIVING_BACKDROP_PRESETS } from "@/components/theme/livingBackdropPresets";
import { useDeferClientMount } from "@/lib/ui/useDeferClientMount";
import { useMotionPaused, useReducedMotion } from "@/lib/motionLifecycle";

const LivingDotsScene = dynamic(
  () =>
    import("@/components/theme/LivingDotsScene").catch(() => ({
      default: function LivingDotsSceneFallback() {
        return null;
      },
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

const LivingLightBackdropScene = dynamic(
  () =>
    import("@/components/theme/LivingLightBackdropScene").catch(() => ({
      default: function LivingLightBackdropSceneFallback() {
        return null;
      },
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

export function DigitalLivingBackdrop() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const motionPaused = useMotionPaused();

  const variant = theme === "dark" ? "dark" : "light";
  const preset = LIVING_BACKDROP_PRESETS[variant];
  const animate = !reduceMotion && !motionPaused;
  const mountWebgl = useDeferClientMount(!reduceMotion, 2500);

  return (
    <div
      key={variant}
      className={cn(
        "living-backdrop-frame pointer-events-none fixed inset-0 z-0 h-[100dvh] w-full min-w-0 opacity-100",
        variant === "dark" ? "living-backdrop-frame--dark" : "living-backdrop-frame--light",
        animate && "living-backdrop-frame--live",
        motionPaused && "living-backdrop-frame--paused",
      )}
      style={{ backgroundColor: preset.bg }}
      aria-hidden
    >
      {variant === "dark" && mountWebgl ? (
        <LivingDotsScene animate={animate} />
      ) : null}
      {variant === "light" ? (
        <>
          <div className="living-light-mesh" aria-hidden>
            <span className="living-light-mesh-layer living-light-mesh-layer--a">
              <span className="living-light-mesh-layer__blob" />
              <span className="living-light-mesh-layer__breathe" />
            </span>
            <span className="living-light-mesh-layer living-light-mesh-layer--b">
              <span className="living-light-mesh-layer__blob" />
              <span className="living-light-mesh-layer__breathe" />
            </span>
            <span className="living-light-mesh-layer living-light-mesh-layer--c">
              <span className="living-light-mesh-layer__blob" />
              <span className="living-light-mesh-layer__breathe" />
            </span>
            <span className="living-light-mesh-layer living-light-mesh-layer--d">
              <span className="living-light-mesh-layer__blob" />
              <span className="living-light-mesh-layer__breathe" />
            </span>
          </div>
          <div className="living-light-pulse" aria-hidden />
          <div className="living-light-orbit" aria-hidden>
            <span className="living-light-orbit__dot living-light-orbit__dot--1" />
            <span className="living-light-orbit__dot living-light-orbit__dot--2" />
            <span className="living-light-orbit__dot living-light-orbit__dot--3" />
          </div>
          {mountWebgl ? <LivingLightBackdropScene animate={animate} /> : null}
          <div className="living-light-shimmer" aria-hidden />
          <div className="living-light-shimmer living-light-shimmer--delayed" aria-hidden />
          <div className="living-light-flow" aria-hidden />
          <div className="living-light-depth" aria-hidden />
          <div className="living-light-sparkles" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="living-light-sparkle" style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        </>
      ) : null}
      <div className="living-backdrop-wash" aria-hidden />
      <div className="living-backdrop-vignette" aria-hidden />
      {variant === "dark" ? (
        <div className="living-frame-corners" aria-hidden>
          <span className="living-frame-corner living-frame-corner--tl" />
          <span className="living-frame-corner living-frame-corner--tr" />
          <span className="living-frame-corner living-frame-corner--bl" />
          <span className="living-frame-corner living-frame-corner--br" />
        </div>
      ) : null}
    </div>
  );
}
