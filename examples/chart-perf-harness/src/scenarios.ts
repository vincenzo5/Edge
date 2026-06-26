import type { IndicatorConfig } from "@edge/chart-core";
import { generateCandles } from "./generateCandles.js";

export type InteractionKind = "pan-only" | "zoom-only" | "crosshair-only" | "pan-zoom";

export type BrowserScenario = {
  id: string;
  candleCount: number;
  indicators: IndicatorConfig[];
  drawingCount: number;
  interaction?: InteractionKind;
};

const CORE_INDICATORS: IndicatorConfig[] = [
  { id: "perf-ma", name: "MA", pane: "main", inputs: { period: 20 } },
  { id: "perf-ema", name: "EMA", pane: "main", inputs: { period: 20 } },
  { id: "perf-boll", name: "BOLL", pane: "main", inputs: { period: 20, std: 2 } },
  { id: "perf-macd", name: "MACD", pane: "sub", inputs: { fast: 12, slow: 26, signal: 9 } },
  { id: "perf-rsi", name: "RSI", pane: "sub", inputs: { period: 14 } },
  { id: "perf-vol", name: "VOL", pane: "sub" },
];

export const BROWSER_SCENARIOS: BrowserScenario[] = [
  {
    id: "initial-render-10k",
    candleCount: 10_000,
    indicators: [],
    drawingCount: 0,
  },
  {
    id: "initial-render-100k",
    candleCount: 100_000,
    indicators: [],
    drawingCount: 0,
  },
  {
    id: "indicators-100k-core-six",
    candleCount: 100_000,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
  },
  {
    id: "interaction-100k-pan-only",
    candleCount: 100_000,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "pan-only",
  },
  {
    id: "interaction-100k-zoom-only",
    candleCount: 100_000,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "zoom-only",
  },
  {
    id: "interaction-100k-crosshair-only",
    candleCount: 100_000,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "crosshair-only",
  },
  {
    id: "interaction-100k-pan-zoom-sample",
    candleCount: 100_000,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "pan-zoom",
  },
];

export const MICRO_CANDLE_COUNTS = [10_000, 100_000, 1_000_000] as const;

export function candlesForCount(count: number) {
  return generateCandles(count);
}
