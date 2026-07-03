import type { Theme } from "@/lib/chartConfig";

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

export type EdgeTone = "positive" | "negative" | "neutral";

/** Color and surface tokens synced with `src/app/globals.css` `--edge-*` variables. */
export const edgeTokens = {
  dark: {
    background: "#131722",
    surfaceChart: "#131722",
    surfaceToolbar: "#1e222d",
    surfaceRail: "#131722",
    surfacePanel: "#1e222d",
    surfacePopover: "#242733",
    surfaceHover: "#2a2e39",
    surfaceActive: "#363a45",
    border: "#2a2e39",
    borderSubtle: "#2a2e39",
    borderStrong: "#434651",
    textPrimary: "#d1d4dc",
    textStrong: "#f0f3fa",
    textSecondary: "#787b86",
    textRail: "#bbbdc2",
    textRailActive: "#e8eaee",
    textMuted: "#5d606b",
    accentBlue: "#2962ff",
    accentBlueHover: "#1e53e5",
    positive: "#22ab94",
    negative: "#f23645",
    warning: "#ff9800",
    focus: "#2962ff",
  },
  light: {
    background: "#f8f9fd",
    surfaceChart: "#ffffff",
    surfaceToolbar: "#ffffff",
    surfaceRail: "#ffffff",
    surfacePanel: "#ffffff",
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
    positive: "#089981",
    negative: "#f23645",
    warning: "#ff9800",
    focus: "#2962ff",
  },
} as const;

/** Layout, sizing, and motion tokens synced with `--edge-*` CSS variables. */
export const edgeLayoutTokens = {
  radiusXs: "2px",
  radiusSm: "4px",
  radiusMd: "6px",
  shadowPopover: "var(--edge-shadow-popover)",
  controlHeightSm: "28px",
  controlHeightMd: "36px",
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

export const edgeChartColors: Record<Theme, ChartTokenSet> = {
  light: {
    up: edgeTokens.light.positive,
    down: edgeTokens.light.negative,
    wick: edgeTokens.light.textPrimary,
    grid: edgeTokens.light.borderSubtle,
    text: edgeTokens.light.textSecondary,
    crosshair: edgeTokens.light.textSecondary,
    lastPrice: edgeTokens.light.accentBlue,
    axisBg: edgeTokens.light.surfaceChart,
    axisBorder: edgeTokens.light.border,
  },
  dark: {
    up: edgeTokens.dark.positive,
    down: edgeTokens.dark.negative,
    wick: edgeTokens.dark.textPrimary,
    grid: edgeTokens.dark.borderSubtle,
    text: edgeTokens.dark.textSecondary,
    crosshair: edgeTokens.dark.textSecondary,
    lastPrice: edgeTokens.dark.accentBlue,
    axisBg: edgeTokens.dark.background,
    axisBorder: edgeTokens.dark.border,
  },
};

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
