import type { ReactNode } from "react";

/** Mobile: short label; md+: full label — for embedded list tables with horizontal scroll. */
export function responsiveTableColumnHeader(
  short: string,
  full: string,
  { compact = true, breakpoint = "md" }: { compact?: boolean; breakpoint?: "md" | "lg" } = {},
): ReactNode {
  if (!compact || short === full) return full;
  const shortClass = breakpoint === "lg" ? "lg:hidden" : "md:hidden";
  const fullClass = breakpoint === "lg" ? "hidden lg:inline" : "hidden md:inline";
  return (
    <>
      <span className={shortClass}>{short}</span>
      <span className={fullClass}>{full}</span>
    </>
  );
}
