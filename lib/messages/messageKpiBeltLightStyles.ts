/** Solid label pills — keyed by belt `gradient` (unique per row; `total` differs portal vs STB). */
export const MESSAGE_KPI_BELT_GRADIENT_LIGHT: Record<string, string> = {
  "from-amber-400 via-amber-500 to-yellow-700": "border-amber-600 bg-amber-100 text-amber-950",
  "from-violet-400 via-indigo-500 to-indigo-800": "border-violet-700 bg-violet-100 text-violet-900",
  "from-emerald-400 to-emerald-700": "border-emerald-700 bg-emerald-100 text-emerald-900",
  "from-orange-400 to-orange-700": "border-orange-600 bg-orange-100 text-orange-950",
  "from-sky-400 via-sky-500 to-blue-800": "border-sky-700 bg-sky-100 text-sky-900",
  "from-cyan-400 via-cyan-500 to-teal-800": "border-cyan-700 bg-cyan-100 text-cyan-900",
  "from-amber-400 to-amber-700": "border-amber-600 bg-amber-100 text-amber-950",
  "from-slate-400 to-slate-700": "border-slate-600 bg-slate-100 text-slate-800",
};

export const MESSAGE_KPI_BELT_GRADIENT_ICON_LIGHT: Record<string, string> = {
  "from-amber-400 via-amber-500 to-yellow-700": "text-amber-800",
  "from-violet-400 via-indigo-500 to-indigo-800": "text-violet-800",
  "from-emerald-400 to-emerald-700": "text-emerald-800",
  "from-orange-400 to-orange-700": "text-orange-800",
  "from-sky-400 via-sky-500 to-blue-800": "text-sky-800",
  "from-cyan-400 via-cyan-500 to-teal-800": "text-cyan-800",
  "from-amber-400 to-amber-700": "text-amber-800",
  "from-slate-400 to-slate-700": "text-slate-700",
};

const FALLBACK_LABEL = "border-slate-600 bg-slate-100 text-slate-800";
const FALLBACK_ICON = "text-slate-700";

export function messageKpiBeltLabelLightClass(gradient: string): string {
  return MESSAGE_KPI_BELT_GRADIENT_LIGHT[gradient] ?? FALLBACK_LABEL;
}

export function messageKpiBeltIconLightClass(gradient: string): string {
  return MESSAGE_KPI_BELT_GRADIENT_ICON_LIGHT[gradient] ?? FALLBACK_ICON;
}
