/** Shared SVG inner markup for chart toolbar icons (TradingView-style). */

export const ICON_VIEWBOX = "0 0 28 28";

export const ICON_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type ChartIconId =
  | "crosshair"
  | "horizontal-line"
  | "vertical-line"
  | "trend-line"
  | "ray-line"
  | "parallel-channel"
  | "price-channel"
  | "rectangle"
  | "circle"
  | "fib-retracement"
  | "price-line"
  | "text-annotation"
  | "measure"
  | "zoom-in"
  | "magnet"
  | "keep-drawing"
  | "lock-all"
  | "hide-drawings"
  | "trash"
  | "delete";

/** Inner SVG elements (no outer `<svg>` wrapper). */
export const CHART_ICON_MARKUP: Record<ChartIconId, string> = {
  crosshair: `
    <line x1="14" y1="7" x2="14" y2="11"/>
    <line x1="14" y1="17" x2="14" y2="21"/>
    <line x1="7" y1="14" x2="11" y2="14"/>
    <line x1="17" y1="14" x2="21" y2="14"/>
  `,
  "horizontal-line": `
    <line x1="6" y1="14" x2="22" y2="14"/>
    <circle cx="6" cy="14" r="1.75"/>
    <circle cx="22" cy="14" r="1.75"/>
  `,
  "vertical-line": `
    <line x1="14" y1="6" x2="14" y2="22"/>
    <circle cx="14" cy="6" r="1.75"/>
    <circle cx="14" cy="22" r="1.75"/>
  `,
  "trend-line": `
    <line x1="7" y1="21" x2="21" y2="7"/>
    <circle cx="7" cy="21" r="1.75"/>
    <circle cx="21" cy="7" r="1.75"/>
  `,
  "ray-line": `
    <line x1="7" y1="21" x2="21" y2="7"/>
    <circle cx="7" cy="21" r="1.75"/>
    <polyline points="17,7 21,7 21,11"/>
  `,
  "parallel-channel": `
    <line x1="6" y1="18" x2="22" y2="10"/>
    <line x1="6" y1="22" x2="22" y2="14"/>
    <circle cx="6" cy="18" r="1.75"/>
    <circle cx="22" cy="10" r="1.75"/>
  `,
  "price-channel": `
    <line x1="6" y1="10" x2="22" y2="10"/>
    <line x1="6" y1="18" x2="22" y2="18"/>
    <line x1="14" y1="10" x2="14" y2="18"/>
    <circle cx="6" cy="10" r="1.75"/>
    <circle cx="22" cy="18" r="1.75"/>
  `,
  rectangle: `
    <rect x="7" y="9" width="14" height="10" rx="0.5"/>
    <circle cx="7" cy="9" r="1.75"/>
    <circle cx="21" cy="19" r="1.75"/>
  `,
  circle: `
    <circle cx="14" cy="14" r="7"/>
    <circle cx="14" cy="7" r="1.75"/>
    <circle cx="21" cy="14" r="1.75"/>
  `,
  "fib-retracement": `
    <line x1="6" y1="8" x2="22" y2="8"/>
    <line x1="6" y1="12" x2="22" y2="12"/>
    <line x1="6" y1="16" x2="22" y2="16"/>
    <line x1="6" y1="20" x2="22" y2="20"/>
    <circle cx="22" cy="8" r="1.75"/>
    <circle cx="6" cy="20" r="1.75"/>
  `,
  "price-line": `
    <line x1="5" y1="14" x2="23" y2="14" stroke-dasharray="2 2"/>
    <rect x="10" y="11.5" width="8" height="5" rx="1"/>
  `,
  "text-annotation": `
    <path d="M10 8h8M14 8v14" stroke-width="1.5"/>
    <line x1="9.5" y1="8" x2="10.5" y2="8" stroke-width="1.75"/>
    <line x1="17.5" y1="8" x2="18.5" y2="8" stroke-width="1.75"/>
    <line x1="13.5" y1="22" x2="14.5" y2="22" stroke-width="1.75"/>
  `,
  measure: `
    <line x1="7" y1="21" x2="21" y2="7"/>
    <line x1="9.5" y1="18.5" x2="11" y2="17"/>
    <line x1="12" y1="16" x2="13.5" y2="14.5"/>
    <line x1="14.5" y1="13.5" x2="16" y2="12"/>
    <line x1="17" y1="11" x2="18.5" y2="9.5"/>
  `,
  "zoom-in": `
    <circle cx="12" cy="12" r="5.5"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
    <line x1="12" y1="10" x2="12" y2="14"/>
  `,
  magnet: `
    <path d="M9 11v4a5 5 0 0 0 10 0v-4"/>
    <line x1="9" y1="11" x2="9" y2="8"/>
    <line x1="19" y1="11" x2="19" y2="8"/>
    <rect x="7.5" y="6.5" width="3" height="2.5" rx="0.5"/>
    <rect x="17.5" y="6.5" width="3" height="2.5" rx="0.5"/>
  `,
  "keep-drawing": `
    <line x1="8" y1="20" x2="18" y2="10"/>
    <line x1="16" y1="10" x2="18" y2="10"/>
    <line x1="18" y1="10" x2="18" y2="12"/>
    <rect x="15" y="16" width="6" height="5" rx="1"/>
    <path d="M16.5 16v-1.5a1.5 1.5 0 0 1 3 0V16"/>
  `,
  "lock-all": `
    <rect x="10" y="13" width="8" height="7" rx="1"/>
    <path d="M11.5 13v-2a2.5 2.5 0 0 1 5 0v2"/>
    <line x1="10" y1="13" x2="18" y2="13"/>
  `,
  "hide-drawings": `
    <path d="M6 14s3.5-4 8-4 8 4 8 4-3.5 4-8 4-8-4-8-4z"/>
    <circle cx="14" cy="14" r="2"/>
    <line x1="11" y1="19" x2="13" y2="21"/>
    <line x1="13" y1="21" x2="11" y2="23"/>
  `,
  trash: `
    <line x1="10" y1="9" x2="18" y2="9"/>
    <line x1="11" y1="7" x2="17" y2="7"/>
    <path d="M10.5 9l.5 11h6l.5-11"/>
    <line x1="13" y1="12" x2="13" y2="17"/>
    <line x1="15" y1="12" x2="15" y2="17"/>
  `,
  delete: `
    <line x1="10" y1="10" x2="18" y2="18"/>
    <line x1="18" y1="10" x2="10" y2="18"/>
  `,
};

export function toStandaloneSvg(
  id: ChartIconId,
  stroke = "#D1D4DC",
): string {
  const inner = CHART_ICON_MARKUP[id].trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_VIEWBOX}" fill="none" stroke="${stroke}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>\n`;
}
