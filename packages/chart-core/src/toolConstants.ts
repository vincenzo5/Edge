import type { ChartType } from "./series";

/** Canonical chart-type enum shared by app AI tools and @edge/ai-tools-chart. */
export const CHART_TYPE_VALUES = [
  "candle_solid",
  "candle_stroke",
  "ohlc",
  "area",
  "heikin_ashi",
] as const satisfies readonly ChartType[];

/** Starter indicators exposed by both app and portable chart-session tools. */
export const STARTER_INDICATOR_NAMES = ["MA", "EMA", "BOLL", "MACD", "RSI", "VOL"] as const;

export type StarterIndicatorName = (typeof STARTER_INDICATOR_NAMES)[number];
