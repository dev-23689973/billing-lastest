"use client";

import { cn } from "@/lib/cn";
import {
  announcementFlashHeadingStyle,
  ensureAnnouncementFlashHeading,
  type AnnouncementFlashHeading,
} from "@/lib/announcement-flash";

type Props = {
  flash: AnnouncementFlashHeading | null | undefined;
  className?: string;
  id?: string;
  /** Larger presentation for login / announcement modal. */
  variant?: "default" | "hero";
};

/** Shared flash heading — same markup in admin editor and login modal. */
export function AnnouncementFlashHeading({ flash, className, id, variant = "default" }: Props) {
  const normalized = ensureAnnouncementFlashHeading(flash);
  if (!normalized) return null;

  const base = announcementFlashHeadingStyle(normalized);
  const parsedPx = Number.parseInt(base.fontSize, 10);
  const heroStyle =
    variant === "hero"
      ? {
          ...base,
          // Responsive clamp: keep editorial sizing on desktop, but scale down on mobile.
          fontSize: `clamp(18px, 4.2vw, ${Math.max(Number.isFinite(parsedPx) ? parsedPx : 22, 22)}px)`,
          fontWeight: base.fontWeight >= 600 ? base.fontWeight : 700,
          lineHeight: "1.25",
        }
      : base;

  return (
    <h3
      id={id}
      className={cn(
        "announcement-flash-heading text-center outline-none",
        normalized.flash && "announcement-flash-heading--animate",
        variant === "hero" && "announcement-flash-heading--hero",
        className,
      )}
      style={heroStyle}
    >
      {normalized.text}
    </h3>
  );
}
