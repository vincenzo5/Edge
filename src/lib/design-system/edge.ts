import type { Theme } from "@/lib/chartConfig";
import type { PaletteId } from "./palettes";
import { DEFAULT_PALETTE, PALETTES } from "./palettes";

type ChartTokenSet = {
  up: string;
  down: string;
  wick: string;
  grid: string;
  text: string;
  crosshair: string;
  lastPrice: string;
  axisBg: string;
  axisBorder: string;
};

export type EdgeColorTokenSet = {
  background: string;
  surfaceChart: string;
  surfaceToolbar: string;
  surfaceRail: string;
  surfacePanel: string;
  surfaceInput: string;
  surfacePopover: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textStrong: string;
  textSecondary: string;
  textRail: string;
  textRailActive: string;
  textMuted: string;
  accentBlue: string;
  accentBlueHover: string;
  accentBlueFill: string;
  textOnAccent: string;
  positive: string;
  negative: string;
  warning: string;
  focus: string;
};

export type EdgeTone = "positive" | "negative" | "neutral";

const midnightLight: EdgeColorTokenSet = {
  background: "#f8f9fd",
  surfaceChart: "#ffffff",
  surfaceToolbar: "#ffffff",
  surfaceRail: "#ffffff",
  surfacePanel: "#ffffff",
  surfaceInput: "#f0f3fa",
  surfacePopover: "#ffffff",
  surfaceHover: "#f0f3fa",
  surfaceActive: "#e0e3eb",
  border: "#e0e3eb",
  borderSubtle: "#eff2f5",
  borderStrong: "#c9ced8",
  textPrimary: "#131722",
  textStrong: "#000000",
  textSecondary: "#787b86",
  textRail: "#bbbdc2",
  textRailActive: "#898b90",
  textMuted: "#a3a6af",
  accentBlue: "#2962ff",
  accentBlueHover: "#1e53e5",
  accentBlueFill: "#1e53e5",
  textOnAccent: "#ffffff",
  positive: "#089981",
  negative: "#f23645",
  warning: "#ff9800",
  focus: "#2962ff",
};

const midnightDark: EdgeColorTokenSet = {
  background: "#080a0f",
  surfaceChart: "#000000",
  surfaceToolbar: "#0d111a",
  surfaceRail: "#080a0f",
  surfacePanel: "#111827",
  surfaceInput: "#0d111a",
  surfacePopover: "#172033",
  surfaceHover: "#1d2940",
  surfaceActive: "#263653",
  border: "#273247",
  borderSubtle: "#171f2e",
  borderStrong: "#3b4b66",
  textPrimary: "#dce4f0",
  textStrong: "#f3f6fc",
  textSecondary: "#9aa8bc",
  textRail: "#8190a6",
  textRailActive: "#f3f6fc",
  textMuted: "#607086",
  accentBlue: "#6c8cff",
  accentBlueHover: "#85a0ff",
  accentBlueFill: "#455fd6",
  textOnAccent: "#f3f6fc",
  positive: "#2dd4a8",
  negative: "#ff5d73",
  warning: "#f6b84a",
  focus: "#6c8cff",
};

const graphiteLight: EdgeColorTokenSet = {
  background: "#f4f4f5",
  surfaceChart: "#ffffff",
  surfaceToolbar: "#ffffff",
  surfaceRail: "#ffffff",
  surfacePanel: "#ffffff",
  surfaceInput: "#f4f4f5",
  surfacePopover: "#ffffff",
  surfaceHover: "#f4f4f5",
  surfaceActive: "#e4e4e7",
  border: "#e4e4e7",
  borderSubtle: "#f4f4f5",
  borderStrong: "#d4d4d8",
  textPrimary: "#18181b",
  textStrong: "#09090b",
  textSecondary: "#71717a",
  textRail: "#a1a1aa",
  textRailActive: "#52525b",
  textMuted: "#a1a1aa",
  accentBlue: "#4a6fa5",
  accentBlueHover: "#3d5f8f",
  accentBlueFill: "#3d5f8f",
  textOnAccent: "#ffffff",
  positive: "#089981",
  negative: "#f23645",
  warning: "#ff9800",
  focus: "#4a6fa5",
};

const graphiteDark: EdgeColorTokenSet = {
  background: "#0b0b0d",
  surfaceChart: "#0a0a0c",
  surfaceToolbar: "#121214",
  surfaceRail: "#0b0b0d",
  surfacePanel: "#18181b",
  surfaceInput: "#121214",
  surfacePopover: "#222225",
  surfaceHover: "#2a2a2e",
  surfaceActive: "#35353a",
  border: "#3f3f46",
  borderSubtle: "#27272a",
  borderStrong: "#52525b",
  textPrimary: "#e4e4e7",
  textStrong: "#fafafa",
  textSecondary: "#a1a1aa",
  textRail: "#71717a",
  textRailActive: "#fafafa",
  textMuted: "#52525b",
  accentBlue: "#7c9fd4",
  accentBlueHover: "#94b4e0",
  accentBlueFill: "#5a7fb8",
  textOnAccent: "#fafafa",
  positive: "#2dd4a8",
  negative: "#ff5d73",
  warning: "#f6b84a",
  focus: "#7c9fd4",
};

const slateLight: EdgeColorTokenSet = {
  background: "#f0f3f7",
  surfaceChart: "#ffffff",
  surfaceToolbar: "#ffffff",
  surfaceRail: "#ffffff",
  surfacePanel: "#ffffff",
  surfaceInput: "#e8eef4",
  surfacePopover: "#ffffff",
  surfaceHover: "#e8eef4",
  surfaceActive: "#d8e2ec",
  border: "#d8e2ec",
  borderSubtle: "#e8eef4",
  borderStrong: "#b8c8d8",
  textPrimary: "#1e293b",
  textStrong: "#0f172a",
  textSecondary: "#64748b",
  textRail: "#94a3b8",
  textRailActive: "#475569",
  textMuted: "#94a3b8",
  accentBlue: "#0e7490",
  accentBlueHover: "#0c637a",
  accentBlueFill: "#0c637a",
  textOnAccent: "#ffffff",
  positive: "#089981",
  negative: "#f23645",
  warning: "#ff9800",
  focus: "#0e7490",
};

const slateDark: EdgeColorTokenSet = {
  background: "#0c1015",
  surfaceChart: "#0f1419",
  surfaceToolbar: "#151b23",
  surfaceRail: "#0c1015",
  surfacePanel: "#1a222d",
  surfaceInput: "#151b23",
  surfacePopover: "#222c3a",
  surfaceHover: "#2a3545",
  surfaceActive: "#334155",
  border: "#3d4f63",
  borderSubtle: "#1e2834",
  borderStrong: "#4a5d73",
  textPrimary: "#d8e2ed",
  textStrong: "#f0f4f8",
  textSecondary: "#94a3b8",
  textRail: "#64748b",
  textRailActive: "#f0f4f8",
  textMuted: "#475569",
  accentBlue: "#5eb8d4",
  accentBlueHover: "#7ecce0",
  accentBlueFill: "#3d9cb8",
  textOnAccent: "#f0f4f8",
  positive: "#2dd4a8",
  negative: "#ff5d73",
  warning: "#f6b84a",
  focus: "#5eb8d4",
};

/** Color and surface tokens synced with `src/app/globals.css` `--edge-*` variables. */
export const edgeTokens: Record<PaletteId, Record<Theme, EdgeColorTokenSet>> = {
  midnight: {
    light: midnightLight,
    dark: midnightDark,
  },
  graphite: {
    light: graphiteLight,
    dark: graphiteDark,
  },
  slate: {
    light: slateLight,
    dark: slateDark,
  },
};

export function getEdgeTokens(palette: PaletteId, theme: Theme): EdgeColorTokenSet {
  return edgeTokens[palette][theme];
}

function chartColorsFromTokens(tokens: EdgeColorTokenSet): ChartTokenSet {
  return {
    up: tokens.positive,
    down: tokens.negative,
    wick: tokens.textPrimary,
    grid: tokens.borderSubtle,
    text: tokens.textSecondary,
    crosshair: tokens.textSecondary,
    lastPrice: tokens.accentBlue,
    axisBg: tokens.surfaceChart,
    axisBorder: tokens.border,
  };
}

export const edgeChartColors: Record<PaletteId, Record<Theme, ChartTokenSet>> = {
  midnight: {
    light: chartColorsFromTokens(midnightLight),
    dark: chartColorsFromTokens(midnightDark),
  },
  graphite: {
    light: chartColorsFromTokens(graphiteLight),
    dark: chartColorsFromTokens(graphiteDark),
  },
  slate: {
    light: chartColorsFromTokens(slateLight),
    dark: chartColorsFromTokens(slateDark),
  },
};

export function getEdgeChartColors(palette: PaletteId, theme: Theme): ChartTokenSet {
  return edgeChartColors[palette][theme];
}

/** @deprecated Use getEdgeTokens(DEFAULT_PALETTE, theme) or pass an explicit palette. */
export const edgeTokensLegacy = edgeTokens[DEFAULT_PALETTE];

/** Layout, sizing, and motion tokens synced with `--edge-*` CSS variables. */
export const edgeLayoutTokens = {
  radiusXs: "2px",
  radiusSm: "4px",
  radiusMd: "6px",
  radiusLg: "8px",
  radiusDialog: "10px",
  shadowPopover: "var(--edge-shadow-popover)",
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space6: "24px",
  textPanelTitleSize: "14px",
  textBodySize: "12px",
  textMetadataSize: "12px",
  textNumericSize: "12px",
  textAnnotationSize: "10px",
  controlHeightCompact: "32px",
  controlHeightStandard: "36px",
  iconRailWidth: "44px",
  iconRailWidthCompact: "40px",
  iconRailButtonSize: "36px",
  iconRailButtonSizeCompact: "32px",
  iconRailIconSize: "22px",
  iconRailIconSizeCompact: "20px",
  menuRowHeight: "32px",
  modalMaxWidthSm: "480px",
  modalMaxWidthMd: "840px",
  modalMaxWidthLg: "1024px",
  motionFast: "120ms",
  motionNormal: "180ms",
} as const;

/** Maps layout token keys to CSS custom property names. */
export function layoutTokenKeyToCssVar(key: keyof typeof edgeLayoutTokens): string {
  const kebab = key
    .replace(/([A-Z])/g, "-$1")
    .replace(/(\d+)/g, "-$1")
    .toLowerCase();
  return `--edge-${kebab}`;
}

/** Layout tokens mirrored in globals.css (subset used for sync tests). */
export const syncedLayoutTokenKeys = [
  "radiusXs",
  "radiusSm",
  "radiusMd",
  "radiusLg",
  "radiusDialog",
  "space1",
  "space2",
  "space3",
  "space4",
  "space6",
  "textPanelTitleSize",
  "textBodySize",
  "textMetadataSize",
  "textNumericSize",
  "textAnnotationSize",
  "controlHeightCompact",
  "controlHeightStandard",
  "motionFast",
  "motionNormal",
] as const satisfies readonly (keyof typeof edgeLayoutTokens)[];

export function toneTextClass(tone: EdgeTone): string {
  switch (tone) {
    case "positive":
      return "text-[var(--edge-positive)]";
    case "negative":
      return "text-[var(--edge-negative)]";
    case "neutral":
      return "text-[var(--edge-text-secondary)]";
  }
}

export function tokenKeyToCssVar(key: string): string {
  return `--edge-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

export { PALETTES, DEFAULT_PALETTE };
export type { PaletteId };
