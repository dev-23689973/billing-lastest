"use client";

import { cn } from "@/lib/cn";
import { useTheme } from "@/contexts/ThemeContext";
import type { MessageKpiBeltDetailLine } from "@/lib/messages/messageKpiBeltTypes";

/** Metric table shown when a message KPI belt row is expanded. */
export function MessageKpiHudDetailTable({
  rows,
  title,
  className,
}: {
  rows: MessageKpiBeltDetailLine[];
  title?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (rows.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      {title ? (
        <p
          className={cn(
            "mb-1.5 text-[8px] font-bold uppercase tracking-[0.14em]",
            isLight ? "text-slate-500" : "text-cyan-300/70",
          )}
        >
          {title}
        </p>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-md border",
          isLight
            ? "border-slate-200 bg-white shadow-sm"
            : "border-cyan-500/35 bg-[hsl(222_47%_5%/0.95)] shadow-[0_0_0_1px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]",
        )}
      >
        <table className="w-full border-collapse text-left">
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={cn(i > 0 && (isLight ? "border-t border-slate-100" : "border-t border-white/[0.07]"))}>
                <th
                  scope="row"
                  className={cn(
                    "w-[58%] px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-wide",
                    isLight ? "text-slate-500" : "text-white/42",
                  )}
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    "px-2.5 py-1.5 text-right text-[10px] font-semibold tabular-nums",
                    isLight ? "text-slate-800" : "text-white/88",
                  )}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
