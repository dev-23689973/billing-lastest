"use client";

import { useTheme } from "@/contexts/ThemeContext";

const CHAMFER = 5;
const STROKE_W = 1.15;

const DARK_BG = "rgba(8, 12, 22, 0.96)";
const LIGHT_BG = "rgba(255, 255, 255, 0.98)";

/** Flat-corner “octagon” frame (chamfered rect) — matches gaming HUD readouts in reference mocks. */
function chamferedPlatePath(x: number, y: number, w: number, h: number, c: number) {
  const X = (n: number) => Math.round(n * 1000) / 1000;
  return [
    `M ${X(x + c)} ${X(y)}`,
    `L ${X(x + w - c)} ${X(y)}`,
    `L ${X(x + w)} ${X(y + c)}`,
    `L ${X(x + w)} ${X(y + h - c)}`,
    `L ${X(x + w - c)} ${X(y + h)}`,
    `L ${X(x + c)} ${X(y + h)}`,
    `L ${X(x)} ${X(y + h - c)}`,
    `L ${X(x)} ${X(y + c)}`,
    "Z",
  ].join(" ");
}

/**
 * Shared HUD labels for User Activity Overview + Credit Flow charts.
 * Light: compact white chips; dark: chamfered neon frame.
 */
export type HudChartCalloutAlign = "start" | "center" | "end";

export function HudChartPointCallout({
  x,
  y,
  value,
  accent,
  mode,
  align = "center",
}: {
  x: number;
  y: number;
  value: number | string;
  accent: string;
  mode: "above" | "below";
  /** Anchor callout on first/last points so labels stay inside the plot. */
  align?: HudChartCalloutAlign;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const text = String(value);
  const padX = isLight ? 7 : 8;
  const h = isLight ? 17 : 18;
  const w = Math.min(58, Math.max(28, padX * 2 + text.length * (isLight ? 5.75 : 6.25)));
  const half = w / 2;
  const tip = isLight ? 4 : 5;
  const gap = isLight ? 5 : 6;
  const boxLeft = align === "start" ? x : align === "end" ? x - w : x - half;
  const textX = align === "start" ? x + half : align === "end" ? x - half : x;

  const fill = isLight ? LIGHT_BG : DARK_BG;
  const textFill = isLight ? "#0f172a" : "#f8fafc";
  const strokeOpacity = isLight ? 0.72 : 0.92;
  const filter = isLight
    ? "drop-shadow(0 1px 2px rgb(15 23 42 / 0.1))"
    : "drop-shadow(0 0 4px rgb(34 211 238 / 0.08))";

  const rim = {
    stroke: accent,
    strokeOpacity,
    strokeWidth: isLight ? 1 : STROKE_W,
    fill,
    filter,
  };

  if (mode === "above") {
    const boxTop = y - gap - tip - h;
    const plate = chamferedPlatePath(boxLeft, boxTop, w, h, CHAMFER);
    const tipX =
      align === "start" ? x + tip : align === "end" ? x - tip : x;

    return (
      <g aria-hidden>
        <path d={plate} {...rim} strokeLinejoin="miter" />
        <polygon
          fill={fill}
          stroke={accent}
          strokeOpacity={strokeOpacity}
          strokeWidth={rim.strokeWidth}
          strokeLinejoin="miter"
          points={
            align === "center"
              ? `${x},${y - gap} ${x - tip},${boxTop + h} ${x + tip},${boxTop + h}`
              : `${tipX},${y - gap} ${boxLeft + (align === "start" ? 0 : w)},${boxTop + h} ${boxLeft + (align === "start" ? w : 0)},${boxTop + h}`
          }
        />
        <text
          x={textX}
          y={boxTop + h / 2 + 5}
          textAnchor="middle"
          fill={textFill}
          fontSize={10}
          fontWeight={700}
          fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
        >
          {text}
        </text>
      </g>
    );
  }

  const boxTop = y + gap + tip;
  const plate = chamferedPlatePath(boxLeft, boxTop, w, h, CHAMFER);
  const tipX =
    align === "start" ? x + tip : align === "end" ? x - tip : x;

  return (
    <g aria-hidden>
      <path d={plate} {...rim} strokeLinejoin="miter" />
      <polygon
        fill={fill}
        stroke={accent}
        strokeOpacity={strokeOpacity}
        strokeWidth={rim.strokeWidth}
        strokeLinejoin="miter"
        points={
          align === "center"
            ? `${x},${y + gap} ${x - tip},${boxTop} ${x + tip},${boxTop}`
            : `${tipX},${y + gap} ${boxLeft + (align === "start" ? 0 : w)},${boxTop} ${boxLeft + (align === "start" ? w : 0)},${boxTop}`
        }
      />
      <text
        x={textX}
        y={boxTop + h / 2 + 5}
        textAnchor="middle"
        fill={textFill}
        fontSize={10}
        fontWeight={700}
        fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
      >
        {text}
      </text>
    </g>
  );
}
