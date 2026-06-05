import { cn } from "@/lib/cn";

/**
 * Soft elliptical “contact” shadow — sits under a gauge or 3D chart so it reads
 * as resting on the page, not floating in space. Not a card box-shadow.
 */
export function HudGroundShadow({
  className,
  size = "md",
}: {
  className?: string;
  /** `sm` = SVG dial; `md` = compact 3D ring; `lg` = larger chart */
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "bottom-[-1px] h-[9px] w-[94%] blur-[6px]"
      : size === "lg"
        ? "bottom-0 h-[18px] w-[98%] blur-[10px]"
        : "bottom-[-1px] h-[14px] w-[96%] blur-[8px]";

  const lightGradient =
    size === "sm"
      ? "bg-[radial-gradient(ellipse_at_center,rgb(15_23_42/0.2)_0%,rgb(15_23_42/0.08)_42%,rgb(15_23_42/0.03)_62%,transparent_80%)]"
      : size === "lg"
        ? "bg-[radial-gradient(ellipse_at_center,rgb(15_23_42/0.28)_0%,rgb(15_23_42/0.12)_40%,rgb(15_23_42/0.04)_58%,transparent_78%)]"
        : "bg-[radial-gradient(ellipse_at_center,rgb(15_23_42/0.24)_0%,rgb(15_23_42/0.1)_40%,rgb(15_23_42/0.04)_58%,transparent_78%)]";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 z-0 -translate-x-1/2",
        sizeClass,
        className,
      )}
    >
      <div
        className={cn(
          "h-full w-full rounded-[50%]",
          lightGradient,
          "dark:bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.62)_0%,rgb(0_0_0/0.28)_40%,rgb(0_0_0/0.1)_58%,transparent_78%)]",
        )}
      />
    </div>
  );
}
