"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useElementVisible } from "@/lib/motionLifecycle";

const LivingBillingLogoCanvas = dynamic(
  () => import("@/components/theme/LivingBillingLogoCanvas").then((m) => m.LivingBillingLogoCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-[inherit] bg-primary/15" aria-hidden />,
  },
);

export type BillingLogoSize = "sm" | "md" | "lg" | "xl";

const frame: Record<BillingLogoSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

export function LivingBillingLogo({
  size = "sm",
  className,
  haloPulse = false,
}: {
  size?: BillingLogoSize;
  className?: string;
  /** Outer halo pulse (login hero) — kept off the WebGL layer so the canvas is not rescaled every frame. */
  haloPulse?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(frameRef);

  return (
    <div
      ref={frameRef}
      className={cn(
        "living-billing-frame pointer-events-none relative shrink-0 overflow-hidden",
        frame[size],
        className,
      )}
      aria-hidden
    >
      {haloPulse ? (
        <span
          className="living-billing-frame__halo motion-safe:animate-[living-watch-pulse_4s_ease-in-out_infinite]"
          aria-hidden
        />
      ) : null}
      <div className="living-billing-frame__canvas" aria-hidden>
        <LivingBillingLogoCanvas size={size} active={visible} />
      </div>
    </div>
  );
}

