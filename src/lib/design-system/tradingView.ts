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

export type TradingViewTone = "positive" | "negative" | "neutral";

export const tradingViewTokens = {
  dark: {
    background: "#000000",
    surfaceChart: "#000000",
    surfaceToolbar: "#0b0d12",
    surfacePanel: "#111217",
    surfacePopover: "#171a22",
    surfaceHover: "#1f232d",
    surfaceActive: "#2a2e39",
    border: "#1e222d",
    borderSubtle: "#151820",
    borderStrong: "#363a45",
    textPrimary: "#d1d4dc",
    textStrong: "#f0f3fa",
    textSecondary: "#787b86",
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
    textMuted: "#a3a6af",
    accentBlue: "#2962ff",
    accentBlueHover: "#1e53e5",
    positive: "#089981",
    negative: "#f23645",
    warning: "#ff9800",
    focus: "#2962ff",
  },
} as const;

export const tradingViewChartColors: Record<Theme, ChartTokenSet> = {
  light: {
    up: tradingViewTokens.light.positive,
    down: tradingViewTokens.light.negative,
    wick: tradingViewTokens.light.textPrimary,
    grid: tradingViewTokens.light.borderSubtle,
    text: tradingViewTokens.light.textSecondary,
    crosshair: tradingViewTokens.light.textSecondary,
    lastPrice: tradingViewTokens.light.accentBlue,
    axisBg: tradingViewTokens.light.surfaceChart,
    axisBorder: tradingViewTokens.light.border,
  },
  dark: {
    up: tradingViewTokens.dark.positive,
    down: tradingViewTokens.dark.negative,
    wick: tradingViewTokens.dark.textPrimary,
    grid: tradingViewTokens.dark.borderSubtle,
    text: tradingViewTokens.dark.textSecondary,
    crosshair: tradingViewTokens.dark.textSecondary,
    lastPrice: tradingViewTokens.dark.accentBlue,
    axisBg: tradingViewTokens.dark.background,
    axisBorder: tradingViewTokens.dark.border,
  },
};

export function toneTextClass(tone: TradingViewTone): string {
  switch (tone) {
    case "positive":
      return "text-[var(--tv-positive)]";
    case "negative":
      return "text-[var(--tv-negative)]";
    case "neutral":
      return "text-[var(--tv-text-secondary)]";
  }
}

