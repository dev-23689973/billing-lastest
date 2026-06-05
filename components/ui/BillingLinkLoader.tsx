import { Fragment } from "react";
import { cn } from "@/lib/cn";

const NODE_COUNT = 4;

type Props = {
  /** Accessible status text */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "billing-link-loader--sm",
  md: "billing-link-loader--md",
  lg: "billing-link-loader--lg",
} as const;

/**
 * Chain-link style loader (Daily UI #076 inspired) — pure CSS, no WebGL.
 * Smooth staggered nodes + connectors; avoids Three.js pause/stutter on route load.
 */
export function BillingLinkLoader({ label = "Loading", size = "md", className }: Props) {
  return (
    <div
      className={cn("billing-link-loader", sizeClass[size], className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="billing-link-loader__track" aria-hidden>
        {Array.from({ length: NODE_COUNT }, (_, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <span
                className="billing-link-loader__bridge"
                style={{ animationDelay: `${(i - 1) * 0.14}s` }}
              />
            ) : null}
            <span className="billing-link-loader__ring" style={{ animationDelay: `${i * 0.14}s` }} />
          </Fragment>
        ))}
      </div>
      {label ? <p className="billing-link-loader__label">{label}</p> : null}
    </div>
  );
}
